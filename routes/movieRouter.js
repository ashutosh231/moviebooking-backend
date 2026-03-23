import express from "express";
import multer from "multer";
import { makeStorage } from "../config/cloudinary.js";
import {
  createMovie,
  updateMovie,
  getMovies,
  getMovieById,
  deleteMovie,
} from "../controllers/moviesController.js";

const movieRouter = express.Router();

/* ─── Single Cloudinary storage for all movie uploads ─────────────── */
const movieStorage = makeStorage("movieverse/uploads");

/*
 * Single multer instance handling ALL file fields in one pass.
 * Chaining multiple multer instances fails because each one fully
 * consumes the multipart stream — the second one gets "Unexpected end of form".
 */
const uploadAll = multer({ storage: movieStorage });

function cloudinaryMultiUpload(req, res, next) {
  uploadAll.fields([
    { name: "poster", maxCount: 1 },
    { name: "trailerUrl", maxCount: 1 },
    { name: "videoUrl", maxCount: 1 },
    { name: "ltThumbnail", maxCount: 1 },
    { name: "castFiles", maxCount: 20 },
    { name: "directorFiles", maxCount: 20 },
    { name: "producerFiles", maxCount: 20 },
    { name: "ltDirectorFiles", maxCount: 20 },
    { name: "ltProducerFiles", maxCount: 20 },
    { name: "ltSingerFiles", maxCount: 20 },
  ])(req, res, (err) => {
    if (err) return next(err);
    // Normalise: set file.filename = file.path (Cloudinary secure_url)
    if (req.files) {
      Object.values(req.files).forEach((arr) =>
        arr.forEach((f) => {
          f.filename = f.path; // Cloudinary URL
        })
      );
    }
    next();
  });
}

import { cacheMiddleware } from "../middlewares/cache.js";

movieRouter.post("/", cloudinaryMultiUpload, createMovie);
movieRouter.put("/:id", cloudinaryMultiUpload, updateMovie);
movieRouter.get("/", cacheMiddleware(3600), getMovies); // Cache movie list for 1 hour
movieRouter.get("/:id", cacheMiddleware(3600), getMovieById); // Cache individual movie details for 1 hour
movieRouter.delete("/:id", deleteMovie);

export default movieRouter;
