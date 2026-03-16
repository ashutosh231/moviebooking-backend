import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import Movie from "./models/movieModel.js";
import { clearCache } from "./middlewares/cache.js";

dotenv.config();

const FILE_NORMAL = path.join("..", "moviebooking-frontend", "src", "assets", "dummymdata.js");
const FILE_FEATURED = path.join("..", "moviebooking-frontend", "src", "assets", "dummymoviedata.js");
const FILE_RELEASE_SOON = path.join("..", "moviebooking-frontend", "src", "assets", "dummyrdata.js");
const FILE_TRAILERS = path.join("..", "moviebooking-frontend", "src", "assets", "trailerdata.js");


function parseMovieObjects(content, requireTrailer = true, movieType = "normal") {
  const movies = [];
  const blockRegex = requireTrailer 
    ? /\{\s*id\s*:\s*\d+,[\s\S]*?trailer\s*:\s*"[^"]*"\s*\}/g
    : /\{\s*id\s*:\s*\d+,[\s\S]*?image\s*:\s*[A-Za-z0-9_]+\s*,?\s*\}/g;
  
  let backupRegex = /\{\s*id\s*:\s*\d+,[\s\S]*?img\s*:\s*[A-Za-z0-9_]+[\s\S]*?trailer\s*:\s*"[^"]*"\s*\}/g;
  
  let matches = content.match(blockRegex) || content.match(backupRegex) || [];
  
  for(let block of matches) {
    try {
      let titleMatch = block.match(/title\s*:\s*"([^"]+)"/);
      let title = titleMatch ? titleMatch[1] : "Unknown";

      let durationMatch = block.match(/duration\s*:\s*"([^"]+)"/);
      let durationStr = durationMatch ? durationMatch[1] : "0h 0m";
      let hMatch = durationStr.match(/(\d+)h/);
      let mMatch = durationStr.match(/(\d+)m/);
      let h = hMatch ? parseInt(hMatch[1]) : 0;
      let m = mMatch ? parseInt(mMatch[1]) : 0;
      let duration = (h * 60) + m;

      let ratingMatch = block.match(/rating\s*:\s*"([^"]+)"/);
      let rating = ratingMatch ? parseFloat(ratingMatch[1]) : 7.5;

      let catMatch = block.match(/category\s*:\s*"([^"]+)"/);
      let category = catMatch ? catMatch[1] : "Action";

      let trailerMatch = block.match(/trailer\s*:\s*"([^"]+)"/);
      let trailerUrl = trailerMatch ? trailerMatch[1] : "";

      let imageMatch = block.match(/(?:image|img)\s*:\s*([A-Za-z0-9_]+)/);
      let imageVar = imageMatch ? imageMatch[1] : null;

      let poster = null;
      if (imageVar) {
         poster = `${imageVar}.png`;
      }

      let synopsisMatch = block.match(/synopsis\s*:\s*"([^"]+)"/);
      let story = synopsisMatch ? synopsisMatch[1] : "A new amazing story.";

      const movieObj = {
        type: movieType,
        movieName: title,
        poster,
        duration: duration || 120,
        rating,
        categories: [category],
        trailerUrl,
        story,
        auditorium: "Audi 1",
        seatPrices: { standard: 200, recliner: 300 },
        slots: [
          { date: "2025-09-24", time: "10:00", ampm: "AM" },
          { date: "2025-09-24", time: "02:00", ampm: "PM" },
          { date: "2025-09-24", time: "08:00", ampm: "PM" }
        ]
      };

      movies.push(movieObj);
    } catch(e) {
      console.log("Error parsing block", e);
    }
  }

  return movies;
}

function parseTrailers(content) {
  const movies = [];
  // Parse trailerdata.js format
  const blockRegex = /\{\s*id\s*:\s*\d+,[\s\S]*?videoUrl\s*:\s*"[^"]*"[\s\S]*?\},/g;
  let matches = content.match(blockRegex) || [];

  for(let block of matches) {
    try {
      let titleMatch = block.match(/title\s*:\s*"([^"]+)"/);
      let title = titleMatch ? titleMatch[1] : "Unknown";

      let genreMatch = block.match(/genre\s*:\s*"([^"]+)"/);
      let genres = genreMatch ? genreMatch[1].split(',').map(s=>s.trim()) : [];

      let durationMatch = block.match(/duration\s*:\s*"([^"]+)"/);
      let durationStr = durationMatch ? durationMatch[1] : "0h 0m";
      let hMatch = durationStr.match(/(\d+)h/);
      let mMatch = durationStr.match(/(\d+)m/);
      let h = hMatch ? parseInt(hMatch[1]) : 0;
      let m = mMatch ? parseInt(mMatch[1]) : 0;

      let yearMatch = block.match(/year\s*:\s*"([^"]+)"/);
      let year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

      let descMatch = block.match(/description\s*:\s*"([^"]+)"/);
      let desc = descMatch ? descMatch[1] : "";

      let videoUrlMatch = block.match(/videoUrl\s*:\s*"([^"]+)"/);
      let videoUrl = videoUrlMatch ? videoUrlMatch[1] : "";

      let imageMatch = block.match(/thumbnail\s*:\s*([A-Za-z0-9_]+)/);
      let imageVar = imageMatch ? imageMatch[1] : null;
      let thumbnail = imageVar ? `${imageVar}.png` : null;

      // Extract credits safely
      let directorMatch = block.match(/director:\s*{\s*name:\s*"([^"]+)"/);
      let producerMatch = block.match(/producer:\s*{\s*name:\s*"([^"]+)"/);
      let singerMatch = block.match(/singer:\s*{\s*name:\s*"([^"]+)"/);

      let directors = directorMatch ? [{ name: directorMatch[1] }] : [];
      let producers = producerMatch ? [{ name: producerMatch[1] }] : [];
      let singers = singerMatch ? [{ name: singerMatch[1] }] : [];

      const latestTrailerObj = {
        title,
        genres,
        duration: { hours: h, minutes: m },
        year,
        rating: 8.0,
        description: desc,
        thumbnail, // will be resolved via getImageUrl -> API_BASE/uploads/
        videoId: videoUrl,
        directors,
        producers,
        singers
      };

      movies.push({
        type: "latestTrailers",
        movieName: title, 
        latestTrailer: latestTrailerObj
      });
    } catch(e) {
       console.log("Error parsing trailer block", e);
    }
  }

  return movies;
}

const seedMovies = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    let allMovies = [];

    // Parse dummymdata.js (Normal)
    if (fs.existsSync(FILE_NORMAL)) {
        console.log("Reading " + FILE_NORMAL);
        const content1 = fs.readFileSync(FILE_NORMAL, "utf-8");
        const parsed1 = parseMovieObjects(content1, true, "normal");
        allMovies = allMovies.concat(parsed1);
        console.log(`Extracted ${parsed1.length} movies from normal data`);
    }

    // Parse dummymoviedata.js (Featured)
    if (fs.existsSync(FILE_FEATURED)) {
        console.log("Reading " + FILE_FEATURED);
        const content2 = fs.readFileSync(FILE_FEATURED, "utf-8");
        const parsed2 = parseMovieObjects(content2, true, "featured");
        allMovies = allMovies.concat(parsed2);
        console.log(`Extracted ${parsed2.length} movies from featured data`);
    }

    // Parse dummyrdata.js (Release Soon)
    if (fs.existsSync(FILE_RELEASE_SOON)) {
        console.log("Reading " + FILE_RELEASE_SOON);
        const content3 = fs.readFileSync(FILE_RELEASE_SOON, "utf-8");
        const parsed3 = parseMovieObjects(content3, false, "releaseSoon");
        allMovies = allMovies.concat(parsed3);
        console.log(`Extracted ${parsed3.length} movies from release soon data`);
    }

    // Parse trailerdata.js (Latest Trailers)
    if (fs.existsSync(FILE_TRAILERS)) {
        console.log("Reading " + FILE_TRAILERS);
        const content4 = fs.readFileSync(FILE_TRAILERS, "utf-8");
        const parsed4 = parseTrailers(content4);
        allMovies = allMovies.concat(parsed4);
        console.log(`Extracted ${parsed4.length} movies from trailers data`);
    }

    await Movie.deleteMany({});
    console.log("Cleared existing movies collection...");

    if (allMovies.length > 0) {
      await Movie.insertMany(allMovies);
      console.log(`Inserted ${allMovies.length} total dummy movies successfully!`);
    }

    await clearCache("cache:/api/movies*");
    console.log("Cleared Valkey Cache");

    mongoose.disconnect();
    console.log("Database connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding movies:", error);
    process.exit(1);
  }
};

seedMovies();
