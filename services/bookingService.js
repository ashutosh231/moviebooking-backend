import mongoose from "mongoose";
import crypto from "crypto";
import Booking from "../models/bookingModel.js";
import Movie from "../models/movieModel.js";
import Razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RECLINER_ROWS = new Set(["D", "E"]);
const BLOCKING_STATUSES = ["pending", "paid", "confirmed", "active", "upcoming"];

/* ---------- Helpers ---------- */

const createHttpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

function getRazorpayOrThrow() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET)
    throw createHttpError(500, "Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in env");
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

function normalizeShowtimeToMinute(input) {
  let d = new Date(input);
  if (isNaN(d.getTime())) {
    try { d = new Date(decodeURIComponent(String(input))); } catch { d = new Date(String(input)); }
  }
  if (isNaN(d.getTime())) throw createHttpError(400, "Invalid showtime");
  d.setSeconds(0, 0);
  return d;
}

function buildMovieMatchClause(movieId, movieName) {
  const push = (arr, obj) => { if (obj && Object.keys(obj).length) arr.push(obj); };
  const clauses = [];

  if (movieId) {
    const mid = String(movieId).trim();
    if (mid) {
      if (mongoose.Types.ObjectId.isValid(mid)) {
        push(clauses, { "movie.id": new mongoose.Types.ObjectId(mid) });
        push(clauses, { movieId: new mongoose.Types.ObjectId(mid) });
      }
      push(clauses, { "movie.id": mid });
      push(clauses, { movieId: mid });
    }
  }

  if (movieName) {
    const mname = String(movieName).trim();
    if (mname) {
      push(clauses, { "movie.title": mname });
      push(clauses, { movieName: mname });
      push(clauses, { "movie.movieName": mname });
    }
  }

  const seen = new Set();
  const unique = [];
  for (const c of clauses) {
    const k = JSON.stringify(c);
    if (!seen.has(k)) { seen.add(k); unique.push(c); }
  }
  return unique;
}

function computeTotalPaiseFromSeats(movie = {}, seats = [], options = {}) {
  const allowClientPrice = options.allowClientPrice === true;
  const standardRupee = Number(movie?.seatPrices?.standard ?? movie?.price ?? 0) || 0;
  const standardPaise = Math.round(standardRupee * 100);
  const reclinerDefined = typeof movie?.seatPrices?.recliner !== "undefined" && movie?.seatPrices?.recliner !== null;
  const reclinerPaise = reclinerDefined
    ? Math.round(Number(movie.seatPrices.recliner) * 100)
    : Math.round(standardPaise * 1.5);

  let total = 0;
  for (const s of seats) {
    if (!s) continue;
    if (allowClientPrice && typeof s === "object" && s.price !== undefined && s.price !== null) {
      const p = Number(s.price);
      if (!Number.isNaN(p) && p >= 0) { total += Math.round(p * 100); continue; }
    }
    let seatId = typeof s === "string" ? s : String(s.seatId || s.id || s.name || "");
    seatId = String(seatId).trim();
    if (!seatId) continue;
    const row = seatId.charAt(0).toUpperCase();
    total += RECLINER_ROWS.has(row) ? reclinerPaise : standardPaise;
  }
  return Math.max(0, Math.round(total));
}

function normalizeSeatsFromInput(rawSeats = [], seatIdsFromBody = [], movie = {}) {
  const normalized = [];
  const deriveServerPrice = (row) => {
    const isRecliner = RECLINER_ROWS.has(row);
    const base = Number(movie?.seatPrices?.standard ?? movie?.price ?? 0);
    if (isRecliner) return Number(movie?.seatPrices?.recliner ?? Math.round(base * 1.5));
    return base;
  };

  if (Array.isArray(rawSeats) && rawSeats.length > 0) {
    if (typeof rawSeats[0] === "object") {
      for (const s of rawSeats) {
        const seatIdVal = String(s.seatId || s.id || s).trim().toUpperCase();
        if (!seatIdVal) continue;
        const row = seatIdVal.charAt(0).toUpperCase();
        const type = s.type || (RECLINER_ROWS.has(row) ? "recliner" : "standard");
        let price = 0;
        if (s.price !== undefined && s.price !== null) {
          const p = Number(s.price);
          if (!Number.isNaN(p) && p >= 0) price = p;
        } else price = deriveServerPrice(row);
        normalized.push({ seatId: seatIdVal, type, price });
      }
    } else {
      for (const sid of rawSeats) {
        const seatIdVal = String(sid).trim().toUpperCase();
        if (!seatIdVal) continue;
        const row = seatIdVal.charAt(0).toUpperCase();
        const type = RECLINER_ROWS.has(row) ? "recliner" : "standard";
        normalized.push({ seatId: seatIdVal, type, price: deriveServerPrice(row) });
      }
    }
  } else if (Array.isArray(seatIdsFromBody) && seatIdsFromBody.length > 0) {
    for (const sid of seatIdsFromBody) {
      const seatIdVal = String(sid).trim().toUpperCase();
      if (!seatIdVal) continue;
      const row = seatIdVal.charAt(0).toUpperCase();
      const type = RECLINER_ROWS.has(row) ? "recliner" : "standard";
      normalized.push({ seatId: seatIdVal, type, price: deriveServerPrice(row) });
    }
  }
  return normalized;
}

/* ---------- Service Functions ---------- */

export async function createBookingService({ user, body }) {
  const movieId = body.movieId || null;
  const movieName = body.movieName || body.movie?.title || "";
  const auditorium = body.audi || body.auditorium || "Audi 1";
  const rawSeats = Array.isArray(body.seats) ? body.seats.filter(Boolean) : [];
  const seatIdsFromBody = Array.isArray(body.seatIds) ? body.seatIds.filter(Boolean) : [];
  const customer = String(body.customer || (user && (user.name || user.fullName)) || "Guest");
  const email = String(body.email || (user && user.email) || "");
  const paymentMethod = String(body.paymentMethod || "card").toLowerCase();
  const currency = String(body.currency || "inr").toLowerCase();

  if (!body.showtime || (rawSeats.length === 0 && seatIdsFromBody.length === 0) || !email) {
    throw createHttpError(400, "Missing required fields (showtime/seats/email)");
  }

  const showtime = normalizeShowtimeToMinute(body.showtime);

  // best-effort movie load
  let movie = null;
  if (movieId && mongoose.Types.ObjectId.isValid(String(movieId))) {
    movie = await Movie.findById(movieId).lean().exec().catch(() => null);
  } else if (movieName) {
    movie = await Movie.findOne({ $or: [{ title: movieName }, { movieName }] }).lean().exec().catch(() => null);
  }

  const normalizedSeats = normalizeSeatsFromInput(rawSeats, seatIdsFromBody, movie);
  if (normalizedSeats.length === 0) throw createHttpError(400, "No valid seats provided");

  const totalPaise = computeTotalPaiseFromSeats(movie, normalizedSeats, { allowClientPrice: true });
  if (!totalPaise || totalPaise <= 0) throw createHttpError(400, "Computed amount is zero");
  const totalMain = Number((totalPaise / 100).toFixed(2));

  // conflict detection (minute window)
  const startWindow = new Date(showtime);
  const endWindow = new Date(startWindow.getTime() + 60 * 1000);
  const conflictQuery = {
    showtime: { $gte: startWindow, $lt: endWindow },
    auditorium,
    status: { $in: BLOCKING_STATUSES }
  };
  const movieClauses = buildMovieMatchClause(movieId, movieName);
  if (movieClauses.length > 0) conflictQuery.$or = movieClauses;

  const existingBookings = await Booking.find(conflictQuery, { seats: 1 }).lean().exec();
  const occupiedSeats = new Set();
  for (const b of existingBookings || []) {
    const seats = Array.isArray(b.seats) ? b.seats : [];
    for (const seat of seats) {
      const seatId = typeof seat === "string"
        ? seat.trim().toUpperCase()
        : (seat?.seatId || seat?.id || "").toString().trim().toUpperCase();
      if (seatId) occupiedSeats.add(seatId);
    }
  }

  const seatIdList = Array.from(new Set(normalizedSeats.map(s => s.seatId)));

  // movie snapshot
  const movieSnapshot = movie
    ? {
      id: movie._id,
      title: movie.movieName || movie.title || "",
      poster: movie.poster || movie.thumbnail || "",
      category: Array.isArray(movie.categories) ? movie.categories[0] || "" : movie.category || "",
      durationMins: movie.duration || movie.runtime || 0,
      rating: movie.rating || null
    }
    : {
      id: movieId && mongoose.Types.ObjectId.isValid(String(movieId)) ? new mongoose.Types.ObjectId(movieId) : undefined,
      title: movieName || "",
      poster: "",
      category: "",
      durationMins: 0
    };

  const doc = {
    userId: user && user._id ? new mongoose.Types.ObjectId(user._id) : undefined,
    customer,
    movie: movieSnapshot,
    movieId: movieSnapshot.id,
    movieName: movieSnapshot.title,
    showtime,
    auditorium,
    seats: normalizedSeats,
    basePrice: movie?.seatPrices?.standard ?? movie?.price ?? 0,
    amount: totalMain,
    amountPaise: totalPaise,
    currency: (currency || "INR").toUpperCase(),
    status: paymentMethod === "card" ? "pending" : "confirmed",
    paymentStatus: paymentMethod === "card" ? "pending" : "paid",
    paymentMethod,
    meta: { rawRequest: { seatIds: seatIdList, clientSeats: rawSeats } }
  };

  const booking = await Booking.create(doc);

  // If card payment, create Razorpay order
  if (paymentMethod === "card") {
    const razorpay = getRazorpayOrThrow();

    try {
      const order = await razorpay.orders.create({
        amount: totalPaise,
        currency: (currency || "inr").toUpperCase(),
        receipt: String(booking._id),
        notes: {
          bookingId: String(booking._id),
          seats: JSON.stringify(seatIdList),
          auditorium,
          showtime: showtime.toISOString()
        }
      });

      await Booking.findByIdAndUpdate(booking._id, {
        paymentSessionId: order.id,
        razorpayOrder: { orderId: order.id }
      }).exec();

      return {
        isPending: true,
        booking: { id: booking._id, status: booking.status, amount: doc.amount, amountPaise: doc.amountPaise, currency: doc.currency },
        payment: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: RAZORPAY_KEY_ID
        }
      };
    } catch (razorpayErr) {
      await Booking.findByIdAndDelete(booking._id).catch(() => { });
      throw createHttpError(500, `Failed to create Razorpay order: ${razorpayErr.message || razorpayErr}`);
    }
  }

  return {
    isPending: false,
    booking: { id: booking._id, status: booking.status, amount: booking.amount, amountPaise: booking.amountPaise, currency: booking.currency }
  };
}

export async function getUserBookingsService({ userId, paymentStatus, status }) {
  const q = { userId };

  if (paymentStatus && String(paymentStatus).toLowerCase() !== "all") {
    q.paymentStatus = String(paymentStatus).toLowerCase();
  } else if (status && String(status).toLowerCase() !== "all") {
    q.status = String(status).toLowerCase();
  } else {
    q.paymentStatus = "paid";
  }

  return Booking.find(q).sort({ createdAt: -1 }).lean().exec();
}

export async function listBookingsService({ movieId, page = 1, limit = 100, paymentStatus, status }) {
  const q = {};

  if (movieId) {
    if (mongoose.Types.ObjectId.isValid(String(movieId))) q.movieId = new mongoose.Types.ObjectId(String(movieId));
    else q.movieName = String(movieId);
  }

  if (paymentStatus && String(paymentStatus).toLowerCase() !== "all") {
    q.paymentStatus = String(paymentStatus).toLowerCase();
  } else if (status && String(status).toLowerCase() !== "all") {
    q.status = String(status).toLowerCase();
  } else {
    q.paymentStatus = "paid";
  }

  const pg = Math.max(1, Number(page) || 1);
  const lim = Math.min(1000, Number(limit) || 100);
  const total = await Booking.countDocuments(q).exec();
  const items = await Booking.find(q).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim).lean().exec();
  return { total, page: pg, limit: lim, items };
}

export async function deleteBookingService(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) throw createHttpError(400, "Invalid id");
  const b = await Booking.findByIdAndDelete(id).lean().exec();
  if (!b) throw createHttpError(404, "Booking not found");
}

export async function getOccupiedSeatsService({ movieId, movieName, showtime: showtimeRaw, audi }) {
  if (!showtimeRaw) throw createHttpError(400, "showtime query param required");

  const auditorium = String(audi || "Audi 1");
  const parsed = normalizeShowtimeToMinute(showtimeRaw);

  const start = new Date(parsed);
  const end = new Date(start.getTime() + 60 * 1000);
  const q = { showtime: { $gte: start, $lt: end }, auditorium, status: { $in: BLOCKING_STATUSES } };
  const movieClauses = buildMovieMatchClause(movieId, movieName);
  if (movieClauses.length > 0) q.$or = movieClauses;

  const docs = await Booking.find(q, { seats: 1 }).lean().exec();
  const occupiedSet = new Set();
  for (const d of docs || []) {
    const sarr = Array.isArray(d.seats) ? d.seats : [];
    for (const s of sarr) {
      if (!s) continue;
      let seatId = "";
      if (typeof s === "string") seatId = s.trim().toUpperCase();
      else if (s.seatId) seatId = String(s.seatId).trim().toUpperCase();
      else if (s.id) seatId = String(s.id).trim().toUpperCase();
      else if (s.number) seatId = String(s.number).trim().toUpperCase();
      if (seatId) occupiedSet.add(seatId);
    }
  }
  return [...occupiedSet];
}

export async function verifyPaymentService({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw createHttpError(400, "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required");
  }

  // HMAC SHA256 verification
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw createHttpError(400, "Payment verification failed — invalid signature");
  }

  const booking = await Booking.findOneAndUpdate(
    { paymentSessionId: razorpay_order_id },
    {
      paymentStatus: "paid",
      status: "confirmed",
      paymentIntentId: razorpay_payment_id,
      razorpayOrder: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature
      }
    },
    { new: true }
  ).exec();

  if (!booking) throw createHttpError(404, "Booking not found for this order");
  return booking;
}

export default {
  createBookingService,
  getUserBookingsService,
  listBookingsService,
  deleteBookingService,
  getOccupiedSeatsService,
  verifyPaymentService,
};
