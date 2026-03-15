// services/emailService.js
import transporter, { FROM_ADDRESS } from "../config/mailer.js";
import { otpEmailTemplate, bookingConfirmationTemplate } from "../config/emailTemplates.js";

/**
 * Send the OTP verification email.
 */
export async function sendOtpEmail({ to, name, otp }) {
  const html = otpEmailTemplate({ name, otp });
  await transporter.sendMail({
    from:    FROM_ADDRESS,
    to,
    subject: `${otp} — Your CineVerse verification code`,
    html,
  });
}

/**
 * Send booking confirmation email after successful payment.
 * @param {string} to  - recipient email
 * @param {string} name - customer name
 * @param {object} booking - populated booking document (plain object)
 */
export async function sendBookingConfirmationEmail({ to, name, booking }) {
  const html = bookingConfirmationTemplate({ name, booking });
  const movieTitle = booking?.movie?.title || booking?.movie?.movieName || "your movie";
  await transporter.sendMail({
    from:    FROM_ADDRESS,
    to,
    subject: `🎬 Booking Confirmed — ${movieTitle} | CineVerse`,
    html,
  });
}
