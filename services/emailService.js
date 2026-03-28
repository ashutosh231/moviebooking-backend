import transporter, { FROM_ADDRESS } from "../config/mailer.js";
import {
  otpEmailTemplate,
  bookingConfirmationTemplate,
  bookingCancellationTemplate,
  movieAnnouncementTemplate,
} from "../config/emailTemplates.js";

/**
 * Send the OTP verification email.
 */
export async function sendOtpEmail({ to, name, otp }) {
  const html = otpEmailTemplate({ name, otp });
  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: `${otp} — Your CineVerse verification code`,
    html,
  });
}

/**
 * Send booking confirmation email after successful payment.
 */
export async function sendBookingConfirmationEmail({ to, name, booking }) {
  const html = bookingConfirmationTemplate({ name, booking });
  const movieTitle = booking?.movie?.title || booking?.movie?.movieName || "your movie";
  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: `🎬 Booking Confirmed — ${movieTitle} | CineVerse`,
    html,
  });
}

/**
 * Send booking cancellation email.
 */
export async function sendBookingCancellationEmail({ to, name, booking, reason }) {
  const html = bookingCancellationTemplate({ name, booking, reason });
  const movieTitle = booking?.movie?.title || booking?.movie?.movieName || "your movie";
  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: `⚠️ Booking Cancelled — ${movieTitle} | CineVerse`,
    html,
  });
}

/**
 * Send a notification about a new or featured movie to a user.
 */
export async function sendMovieNotificationEmail({ to, name, movie, isFeatured = false }) {
  const html = movieAnnouncementTemplate({ name, movie, isFeatured });
  const movieTitle = movie.movieName || movie.title || "New Release";
  const prefix = isFeatured ? "⭐ Featured" : "🔥 New Movie";

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: `${prefix}: ${movieTitle} is now at CineVerse!`,
    html,
  });
}

