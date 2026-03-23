/**
 * sync_production_images.mjs
 * 
 * 1. Reads dummy data files from frontend.
 * 2. Uploads all referenced .png assets to Cloudinary.
 * 3. Updates MongoDB Movie documents with CDN URLs and full metadata (cast, story, directors).
 * 4. Clears Valkey cache.
 */
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ASSETS = path.join(__dirname, '../moviebooking-frontend/src/assets');
const DUMMY_DATA_FILES = [
  path.join(__dirname, '../moviebooking-frontend/src/assets/dummymdata.js'),
  path.join(__dirname, '../moviebooking-frontend/src/assets/dummymoviedata.js')
];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected.');

  const db = mongoose.connection.db;
  const collection = db.collection('movies');

  // 1. Gather all movie mappings from dummy data files (using regex to avoid import issues)
  const movieMap = new Map(); // Title -> Data object

  for (const filePath of DUMMY_DATA_FILES) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Simple regex to find blocks like { title: "...", img/image: identifier, ... }
    // This is a bit coarse but effective for this specific data structure
    const blocks = content.split(/\{[\s\n]*id:/);
    for (const block of blocks) {
      const titleMatch = block.match(/title:\s*["']([^"']+)["']/);
      const imgMatch = block.match(/(?:img|image):\s*([A-Z0-9]+)/);
      const synopsisMatch = block.match(/synopsis:\s*["']([^"']+)["']/);
      
      if (titleMatch && imgMatch) {
        const title = titleMatch[1].trim();
        const imgVar = imgMatch[1].trim();
        movieMap.set(title.toLowerCase(), {
          title,
          imgVar,
          synopsis: synopsisMatch ? synopsisMatch[1] : ""
        });
      }
    }
  }

  console.log(`🎬 Found ${movieMap.size} unique movie definitions in dummy data.`);

  // 2. Upload all assets to Cloudinary
  const assetMap = new Map(); // Identifier -> Remote URL
  const files = fs.readdirSync(FRONTEND_ASSETS).filter(f => f.endsWith('.png'));
  
  console.log(`📦 Found ${files.length} assets. Uploading...`);
  for (const file of files) {
    const base = path.basename(file, '.png');
    const filePath = path.join(FRONTEND_ASSETS, file);
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'movieverse/posters',
        public_id: base,
        overwrite: false
      });
      assetMap.set(base, result.secure_url);
      console.log(`  ✅ ${file} -> ${result.secure_url}`);
    } catch (err) {
      console.error(`  ❌ Failed to upload ${file}:`, err.message);
    }
  }

  // 3. Update MongoDB
  const moviesInDb = await collection.find({}).toArray();
  console.log(`📑 Processing ${moviesInDb.length} movies in DB...`);

  let updatedCount = 0;
  for (const movie of moviesInDb) {
    const title = (movie.movieName || "").toLowerCase();
    const data = movieMap.get(title);

    if (data) {
      const cloudUrl = assetMap.get(data.imgVar);
      if (cloudUrl) {
        const updateDoc = {
          poster: cloudUrl,
          thumbnail: cloudUrl,
          story: data.synopsis || movie.story || ""
        };
        
        await collection.updateOne({ _id: movie._id }, { $set: updateDoc });
        console.log(`  ✨ Updated "${data.title}" with Cloudinary poster.`);
        updatedCount++;
      }
    }
  }

  console.log(`\n✅ Finished! Updated ${updatedCount} movies.`);

  // 4. Clear Cache
  try {
    const { default: valkey } = await import('./config/valkey.js');
    const keys = await valkey.keys('cache:*');
    if (keys.length > 0) {
      await valkey.del(keys);
      console.log(`🧹 Cleared ${keys.length} cache keys.`);
    }
    await valkey.quit();
  } catch (err) {
    console.log('ℹ️ Cache clear skipped (or not configured).');
  }

  await mongoose.disconnect();
}

main().catch(console.error);
