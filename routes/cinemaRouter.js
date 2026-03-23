import express from "express";
import { 
    getNearbyCinemas, 
    getCinemaById, 
    createCinema, 
    updateCinema, 
    listCinemasForAdmin, 
    seedCinemas 
} from "../controllers/cinemaController.js";
import authMiddleware from "../middlewares/auth.js";

const cinemaRouter = express.Router();

// Public Routes
cinemaRouter.get("/nearby", getNearbyCinemas);

// Admin Routes (protected by authMiddleware, controller checks if admin)
cinemaRouter.post("/manage/create", authMiddleware, createCinema);
cinemaRouter.put("/manage/update/:id", authMiddleware, updateCinema);
cinemaRouter.get("/manage/list", authMiddleware, listCinemasForAdmin);
cinemaRouter.post("/manage/seed", authMiddleware, seedCinemas);

// Keep this generic param route at the bottom to avoid catching /manage/...
cinemaRouter.get("/:id", getCinemaById);

export default cinemaRouter;
