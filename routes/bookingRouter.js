// routes/bookingRoutes.js
import express from "express";
import {
  createBooking,
  getBooking,
  listBookings,
  confirmPayment,
  deleteBooking,
  getOccupiedSeats,
  razorpayWebhook,
} from "../controllers/bookingController.js";
import {
  lockSeatsController,
  releaseSeatsController,
  getLockedSeatsController,
} from "../controllers/seatLockController.js";
import authMiddleware from "../middlewares/auth.js";
import { bookingLimiter } from "../middlewares/rateLimiter.js";

const bookingRouter = express.Router();

// ── Existing booking routes ───────────────────────────────
bookingRouter.post("/", authMiddleware, bookingLimiter, createBooking);
bookingRouter.post("/verify-payment", bookingLimiter, confirmPayment);
bookingRouter.post("/webhook/razorpay", razorpayWebhook);
bookingRouter.get("/", authMiddleware, listBookings);
bookingRouter.get("/occupied", getOccupiedSeats,authMiddleware);

// Specific static routes must come BEFORE dynamic routes like "/:id"
bookingRouter.get("/my", authMiddleware, getBooking);
bookingRouter.delete("/:id", authMiddleware, deleteBooking);

// ── Seat Locking routes (Valkey/Upstash) ─────────────────
// POST  /api/bookings/lock-seats      → Lock seats for 5 min
// POST  /api/bookings/release-seats   → Release locks (cancel / payment failed)
// GET   /api/bookings/locked-seats    → Query lock status for seat picker UI
bookingRouter.post("/lock-seats", authMiddleware, lockSeatsController);
bookingRouter.post("/release-seats", authMiddleware, releaseSeatsController);
bookingRouter.get("/locked-seats", authMiddleware, getLockedSeatsController);

export default bookingRouter;
