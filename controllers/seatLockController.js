// controllers/seatLockController.js
// ---------------------------------------------------------
// Thin req/res handlers for the seat locking feature.
// All business logic lives in seatLockService.js.
// ---------------------------------------------------------

import {
  lockSeats,
  releaseSeats,
  getLockedSeats,
} from "../services/seatLockService.js";

// Helper: build a showId string from request body
// Format: "{movieId}_{showtime}_{auditorium}"
// This uniquely identifies a specific show screening.
function buildShowId({ movieId, showtime, auditorium }) {
  // Use simple string serialization for showtime to avoid date parsing errors
  const show = String(showtime || "unknown").replace(/[^a-zA-Z0-9]/g, "-");
  const audi = String(auditorium || "Audi1").replace(/\s+/g, "");
  const mid = String(movieId || "unknown").replace(/[^a-zA-Z0-9]/g, "-");
  return `${mid}_${show}_${audi}`;
}

/**
 * POST /api/bookings/lock-seats
 * Body: { movieId, showtime, auditorium, seats: ["A1","A2"], userId }
 *
 * Locks the requested seats for 5 minutes.
 * Returns error if any seat is already locked by another user.
 */
export async function lockSeatsController(req, res) {
  try {
    const { movieId, showtime, auditorium, seats } = req.body;

    // req.user is attached by authMiddleware (JWT)
    const userId = String(req.user._id || req.user.id);

    // Validate input
    if (!showtime || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({
        success: false,
        message: "showtime and seats (array) are required",
      });
    }

    const showId = buildShowId({ movieId, showtime, auditorium });
    console.log(`[Diagnostic] Lock Seats Request: showId=${showId}, userId=${userId}, seats=${JSON.stringify(seats)}`);

    const result = await lockSeats(showId, seats, userId);

    if (!result.success) {
      console.log(`[Diagnostic] Lock Seats Conflict: showId=${showId}, userId=${userId}, conflictSeats=${JSON.stringify(result.conflictSeats)}`);
      // Some seats are taken by another user — 409 Conflict
      return res.status(409).json({
        success: false,
        message: "One or more seats are already locked by another user. Please choose different seats.",
        conflictSeats: result.conflictSeats,
      });
    }

    console.log(`[Diagnostic] Lock Seats SUCCESS: showId=${showId}, userId=${userId}, lockedSeats=${JSON.stringify(result.lockedSeats)}`);
    return res.status(200).json({
      success: true,
      message: "Seats locked successfully for 5 minutes",
      showId,
      lockedSeats: result.lockedSeats,
      expiresInSeconds: 300, // 5 minutes — frontend should show a countdown
    });
  } catch (err) {
    console.error("[lockSeatsController] Error:", err.message);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

/**
 * POST /api/bookings/release-seats
 * Body: { movieId, showtime, auditorium, seats: ["A1","A2"] }
 *
 * Releases locks held by the authenticated user.
 * Called when:
 *  - User cancels seat selection
 *  - Payment fails (called from frontend or webhook)
 */
export async function releaseSeatsController(req, res) {
  try {
    const { movieId, showtime, auditorium, seats } = req.body;
    const userId = String(req.user._id || req.user.id);

    if (!showtime || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({
        success: false,
        message: "showtime and seats (array) are required",
      });
    }

    const showId = buildShowId({ movieId, showtime, auditorium });
    await releaseSeats(showId, seats, userId);

    return res.status(200).json({
      success: true,
      message: "Seat locks released",
      showId,
      releasedSeats: seats.map((s) => String(s).toUpperCase()),
    });
  } catch (err) {
    console.error("[releaseSeatsController] Error:", err.message);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

/**
 * GET /api/bookings/locked-seats?movieId=&showtime=&auditorium=&seats=A1,A2,A3
 *
 * Returns lock status for requested seats.
 * Useful for the seat selection UI to show "being selected by someone" indicator.
 * Note: lockedBy shows userId (not name) — keep internal, don't expose to all users.
 */
export async function getLockedSeatsController(req, res) {
  try {
    const { movieId, showtime, auditorium, seats: seatsQuery } = req.query;

    if (!showtime || !seatsQuery) {
      return res.status(400).json({
        success: false,
        message: "showtime and seats query params are required",
      });
    }

    // Seats can be comma-separated: ?seats=A1,A2,B3
    const seats = String(seatsQuery).split(",").map((s) => s.trim()).filter(Boolean);
    const showId = buildShowId({ movieId, showtime, auditorium });

    const lockStatuses = await getLockedSeats(showId, seats);

    // For security: tell client IF a seat is locked, but hide WHO locked it
    const sanitized = lockStatuses.map(({ seatId, lockedBy }) => ({
      seatId,
      isLocked: !!lockedBy,
      isLockedByMe: lockedBy === String(req.user?._id || req.user?.id || ""),
    }));

    return res.status(200).json({
      success: true,
      showId,
      seats: sanitized,
    });
  } catch (err) {
    console.error("[getLockedSeatsController] Error:", err.message);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

export default {
  lockSeatsController,
  releaseSeatsController,
  getLockedSeatsController,
};
