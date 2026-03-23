import {
  createBookingService,
  getUserBookingsService,
  listBookingsService,
  deleteBookingService,
  getOccupiedSeatsService,
  verifyPaymentService,
} from "../services/bookingService.js";
import { addNotificationJob } from "../queues/notificationQueue.js";


/* ---------- Controllers (thin req/res layer) ---------- */

export async function createBooking(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required to create booking" });

    const result = await createBookingService({ user: req.user, body: req.body || {} });

    if (result.isPending) {
      return res.status(201).json({
        success: true,
        message: "Booking created (pending payment)",
        booking: result.booking,
        payment: result.payment,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Booking created",
      booking: result.booking,
    });
  } catch (err) {
    console.error("createBooking error:", err && err.stack ? err.stack : err);
    return res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
  }
}

export async function getBooking(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });

    const userId = String(req.user._id || req.user.id);
    const items = await getUserBookingsService({
      userId,
      paymentStatus: req.query.paymentStatus,
      status: req.query.status,
    });

    return res.json({ success: true, items });
  } catch (err) {
    console.error("getBookings error:", err && err.stack ? err.stack : err);
    return res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
  }
}

export async function listBookings(req, res) {
  try {
    const result = await listBookingsService({
      movieId: req.query.movieId,
      page: req.query.page,
      limit: req.query.limit,
      paymentStatus: req.query.paymentStatus,
      status: req.query.status,
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("listBookings error:", err && err.stack ? err.stack : err);
    return res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
  }
}

export async function deleteBooking(req, res) {
  try {
    // 1. Fetch booking before deleting to get user/movie info
    const booking = await deleteBookingService(req.params.id);

    // 2. Queue cancellation email
    const userEmail = booking?.userId?.email || booking?.customer || "";
    const userName  = booking?.userId?.fullName || booking?.customer || "Movie Fan";

    if (userEmail && userEmail.includes("@")) {
       await addNotificationJob('booking-cancellation', {
        to: userEmail,
        userName,
        booking: booking.toObject ? booking.toObject() : booking
      }).catch(err => console.warn("Cancellation job failed:", err.message));
    }

    return res.json({ success: true, message: "Booking deleted" });
  } catch (err) {
    console.error("deleteBooking error:", err && err.stack ? err.stack : err);
    return res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
  }
}

export async function getOccupiedSeats(req, res) {
  try {
    const occupied = await getOccupiedSeatsService({
      movieId: req.query.movieId,
      movieName: req.query.movieName,
      showtime: req.query.showtime,
      audi: req.query.audi || req.query.auditorium,
    });

    return res.json({ success: true, occupied });
  } catch (err) {
    console.error("getOccupiedSeats error:", err && err.stack ? err.stack : err);
    return res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
  }
}

export async function confirmPayment(req, res) {
  try {
    const booking = await verifyPaymentService(req.body);

    // Queue booking confirmation job
    const userEmail = booking?.userId?.email || req.user?.email || req.body.email || booking?.customer || "";
    const userName  = booking?.userId?.fullName || req.user?.name || req.user?.fullName || booking?.customer || "Movie Fan";
    
    if (userEmail && userEmail.includes("@")) {
      await addNotificationJob("booking-confirmation", {
        to: userEmail,
        userName,
        booking: booking.toObject ? booking.toObject() : booking
      }).catch((err) => console.warn("Booking confirmation job failed:", err.message));
    }


    return res.json({ success: true, message: "Payment verified successfully", booking });

  } catch (err) {
    console.error("confirmPayment error:", err && err.stack ? err.stack : err);
    return res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
  }
}


export default {
  createBooking,
  getBooking,
  listBookings,
  deleteBooking,
  getOccupiedSeats,
  confirmPayment,
};
