/**
 * migrate-to-cloudinary.js
 *
 * Uploads all local dummy movie images (FM*.png, M*.png) from the frontend
 * assets folder to Cloudinary, then updates any Movie documents in MongoDB
 * that still have local `http://localhost:4000/uploads/...` poster URLs,
 * replacing them with Cloudinary URLs.
 *
 * Usage: node migrate-to-cloudinary.js
 */

import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Path to frontend assets ────────────────────────────────────────────────
const ASSETS_DIR = path.join(__dirname, "../moviebooking-frontend/src/assets");
const FOLDER     = "movieverse/posters";

// ─── Upload a single file ────────────────────────────────────────────────────
async function uploadFile(filePath) {
  const name = path.basename(filePath, path.extname(filePath));
  const result = await cloudinary.uploader.upload(filePath, {
    folder:        FOLDER,
    public_id:     name,
    overwrite:     false,   // skip if already uploaded
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });
  return result.secure_url;
}

// ─── Collect image files ─────────────────────────────────────────────────────
function getImageFiles() {
  return fs
    .readdirSync(ASSETS_DIR)
    .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .map((f) => path.join(ASSETS_DIR, f));
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔗 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);

  const files = getImageFiles();
  console.log(`📂 Found ${files.length} image files in assets/`);

  // Map: original filename (e.g. "FM1") → Cloudinary URL
  const urlMap = {};

  for (const filePath of files) {
    const name = path.basename(filePath);
    try {
      const url = await uploadFile(filePath);
      urlMap[name] = url;
      console.log(`  ✅ ${name} → ${url}`);
    } catch (err) {
      console.warn(`  ⚠️  ${name} upload failed:`, err.message || err);
    }
  }

  // ─── Update MongoDB Movie documents ─────────────────────────────────────
  const { default: Movie } = await import("./models/movieModel.js");
  const movies = await Movie.find({});
  console.log(`\n🎬 Checking ${movies.length} movie documents for local poster URLs...`);

  let updated = 0;
  for (const movie of movies) {
    let changed = false;

    // poster
    if (movie.poster && movie.poster.startsWith("http://localhost")) {
      const filename = movie.poster.split("/uploads/").pop();
      const cloudUrl = urlMap[filename] || null;
      if (cloudUrl) {
        movie.poster = cloudUrl;
        changed = true;
        console.log(`  📽  Updated poster for "${movie.movieName}": ${cloudUrl}`);
      }
    }

    // latest trailer thumbnail
    if (movie.latestTrailer?.thumbnail && movie.latestTrailer.thumbnail.startsWith("http://localhost")) {
      const filename = movie.latestTrailer.thumbnail.split("/uploads/").pop();
      const cloudUrl = urlMap[filename] || null;
      if (cloudUrl) {
        movie.latestTrailer.thumbnail = cloudUrl;
        changed = true;
      }
    }

    if (changed) {
      await movie.save();
      updated++;
    }
  }

  console.log(`\n✅ Done! Uploaded ${Object.keys(urlMap).length} images. Updated ${updated} DB records.`);
  console.log("\n📋 Full URL map (save for reference):");
  Object.entries(urlMap).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
