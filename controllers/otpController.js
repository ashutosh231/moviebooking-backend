// controllers/otpController.js
import Otp from "../models/otpModel.js";
import { registerService } from "../services/userService.js";
import { sendOtpEmail } from "../services/emailService.js";
import { validationResult } from "express-validator";

/* Generate a secure 6-digit OTP */
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * POST /api/auth/send-otp
 * Body: { name, email, password }
 * Generates OTP, stores it, sends email.
 */
export async function sendOtp(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { fullName, email } = req.body || {};
  if (!email) return res.status(400).json({ success: false, message: "Email is required" });

  try {
    const otp = generateOtp();

    // Remove any previous OTP for this email
    await Otp.deleteMany({ email: email.toLowerCase() });

    // Save new OTP (expires in 10 min via TTL index)
    await Otp.create({ email: email.toLowerCase(), otp });

    // Send email
    await sendOtpEmail({ to: email, name: fullName || "Movie Fan", otp });

    return res.status(200).json({
      success: true,
      message: `OTP sent to ${email}. Valid for 10 minutes.`,
    });
  } catch (err) {
    console.error("sendOtp error:", err);
    return res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
  }
}

/**
 * POST /api/auth/verify-otp
 * Body: { name, email, password, otp }
 * Verifies OTP and registers user if valid.
 */
export async function verifyOtpAndRegister(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { email, otp } = req.body || {};

  if (!otp) return res.status(400).json({ success: false, message: "OTP is required" });

  try {
    // Find latest OTP for this email
    const record = await Otp.findOne({ email: email.toLowerCase() }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ success: false, message: "OTP expired or not requested. Please request a new OTP." });
    }

    if (record.otp !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: "Incorrect OTP. Please try again." });
    }

    // OTP valid — delete record and register user
    await Otp.deleteMany({ email: email.toLowerCase() });

    const result = await registerService(req.body);

    return res.status(201).json({
      success: true,
      message: "Email verified and account created successfully!",
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    console.error("verifyOtpAndRegister error:", err);
    return res.status(400).json({ success: false, message: err.message || "Registration failed" });
  }
}
