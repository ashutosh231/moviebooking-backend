// controllers/movieController.js
import {
  createMovieService,
  deleteMovieService,
  getMovieByIdService,
  getMoviesService,
} from "../services/moviesService.js";

import { clearCache } from "../middlewares/cache.js";
import { addNotificationJob } from "../queues/notificationQueue.js";

/* ---------------------- controllers ---------------------- */
export async function createMovie(req, res) {
  try {
    const saved = await createMovieService({
      body: req.body,
      files: req.files,
    });
    // Invalidate movie cache
    await clearCache("cache:/api/movies*");

    // Queue notifications
    addNotificationJob("new-movie", { movie: saved })
      .catch(err => console.warn("New movie job failed:", err.message));

    if (saved.type === "featured") {
      addNotificationJob("featured-movie", { movie: saved })
        .catch(err => console.warn("Featured movie job failed:", err.message));
    }

    return res.status(201).json({ success: true, message: "Movie created", data: saved });
  } catch (err) {

    console.error("createMovie error:", err);
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || "Server error" });
  }
}

export async function getMovies(req, res) {
  try {
    const result = await getMoviesService(req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("getMovies error:", err);
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || "Server error" });
  }
}

export async function getMovieById(req, res) {
  try {
    const { id } = req.params || {};
    const obj = await getMovieByIdService(id);
    return res.json({ success: true, item: obj });
  } catch (err) {
    console.error("getMovieById error:", err);
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || "Server error" });
  }
}

export async function deleteMovie(req, res) {
  try {
    const { id } = req.params || {};
    await deleteMovieService(id);
    // Invalidate movie cache
    await clearCache("cache:/api/movies*");
    return res.json({ success: true, message: "Movie deleted" });
  } catch (err) {
    console.error("deleteMovie error:", err);
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || "Server error" });
  }
}

export default { createMovie, getMovies, getMovieById, deleteMovie };
