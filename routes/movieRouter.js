import express from "express";
import multer from "multer";
import { makeStorage } from "../config/cloudinary.js";
import {
  createMovie,
  getMovies,
  getMovieById,
  deleteMovie,
} from "../controllers/moviesController.js";

const movieRouter = express.Router();

/* ─── Cloudinary storage buckets ──────────────────────────────────── */
const posterStorage    = makeStorage("movieverse/posters");
const trailerStorage   = makeStorage("movieverse/trailers");
const videoStorage     = makeStorage("movieverse/videos");
const thumbnailStorage = makeStorage("movieverse/thumbnails");
const peopleStorage    = makeStorage("movieverse/people");

/* ─── Individual upload instances ─────────────────────────────────── */
const uploadPoster    = multer({ storage: posterStorage });
const uploadTrailer   = multer({ storage: trailerStorage });
const uploadVideo     = multer({ storage: videoStorage });
const uploadThumb     = multer({ storage: thumbnailStorage });
const uploadPeople    = multer({ storage: peopleStorage });

/*
 * Combined middleware: run each multer upload in sequence so each field
 * uses its own Cloudinary folder. multer-storage-cloudinary stores the
 * Cloudinary URL (not a filename) in file.path, so we expose it as
 * file.path for downstream service compatibility. We also set
 * file.filename = file.path so service code that reads file.filename still works.
 */
function cloudinaryMultiUpload(req, res, next) {
  uploadPoster.fields([{ name: "poster", maxCount: 1 }])(req, res, (err1) => {
    if (err1) return next(err1);
    uploadTrailer.fields([{ name: "trailerUrl", maxCount: 1 }])(req, res, (err2) => {
      if (err2) return next(err2);
      uploadVideo.fields([{ name: "videoUrl", maxCount: 1 }])(req, res, (err3) => {
        if (err3) return next(err3);
        uploadThumb.fields([{ name: "ltThumbnail", maxCount: 1 }])(req, res, (err4) => {
          if (err4) return next(err4);
          uploadPeople.fields([
            { name: "castFiles",     maxCount: 20 },
            { name: "directorFiles", maxCount: 20 },
            { name: "producerFiles", maxCount: 20 },
            { name: "ltDirectorFiles", maxCount: 20 },
            { name: "ltProducerFiles", maxCount: 20 },
            { name: "ltSingerFiles",   maxCount: 20 },
          ])(req, res, (err5) => {
            if (err5) return next(err5);
            // Normalise: set file.filename = file.path (Cloudinary secure_url)
            // so the existing service code continues to work unchanged.
            if (req.files) {
              Object.values(req.files).forEach((arr) =>
                arr.forEach((f) => {
                  f.filename = f.path; // Cloudinary URL
                })
              );
            }
            next();
          });
        });
      });
    });
  });
}

movieRouter.post("/", cloudinaryMultiUpload, createMovie);
movieRouter.get("/", getMovies);
movieRouter.get("/:id", getMovieById);
movieRouter.delete("/:id", deleteMovie);

export default movieRouter;
