// controllers/otpController.js
import valkey from "../config/valkey.js";
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
 * Generates OTP, stores it in Valkey, sends email.
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
    const cacheKey = `otp:${email.toLowerCase()}`;

    // Replace the old OTP in Valkey with a firm 600-second (10 min) expiration
    await valkey.setex(cacheKey, 600, otp);

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
 * Verifies OTP from Valkey and registers user if valid.
 */
export async function verifyOtpAndRegister(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { email, otp } = req.body || {};

  if (!otp) return res.status(400).json({ success: false, message: "OTP is required" });

  try {
    const cacheKey = `otp:${email.toLowerCase()}`;
    
    // Fetch OTP directly from Valkey cache memory
    const cachedOtp = await valkey.get(cacheKey);

    if (!cachedOtp) {
      return res.status(400).json({ success: false, message: "OTP expired or not requested. Please request a new OTP." });
    }

    if (cachedOtp !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: "Incorrect OTP. Please try again." });
    }

    // OTP is valid — delete from Valkey instantly and register user
    await valkey.del(cacheKey);

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

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Generates OTP for password reset, stores in Valkey, sends email.
 */
export async function forgotPassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ success: false, message: "Email is required" });

  try {
    // Dynamically import User model to check existence
    const User = (await import("../models/userModel.js")).default;
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "No account found with that email address." });
    }

    const otp = generateOtp();
    const cacheKey = `reset_otp:${email.toLowerCase()}`;

    // 10 minute expiration
    await valkey.setex(cacheKey, 600, otp);

    // Send email
    await sendOtpEmail({ to: email, name: existingUser.fullName || "User", otp });

    return res.status(200).json({
      success: true,
      message: `Password reset OTP sent to ${email}.`,
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ success: false, message: "Failed to process request." });
  }
}

/**
 * POST /api/auth/reset-password
 * Body: { email, otp, newPassword }
 * Verifies OTP and resets the user's password directly in the DB.
 */
export async function resetPassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { email, otp, newPassword } = req.body || {};
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: "Email, OTP, and new password are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
  }

  try {
    const cacheKey = `reset_otp:${email.toLowerCase()}`;
    const cachedOtp = await valkey.get(cacheKey);

    if (!cachedOtp) {
      return res.status(400).json({ success: false, message: "OTP expired or not requested." });
    }

    if (cachedOtp !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: "Incorrect OTP." });
    }

    // Load User and bcrypt
    const User = (await import("../models/userModel.js")).default;
    const bcrypt = (await import("bcryptjs")).default;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    existingUser.password = hashedPassword;
    await existingUser.save();

    // Destroy OTP after successful use
    await valkey.del(cacheKey);

    return res.status(200).json({
      success: true,
      message: "Password has been successfully reset. You can now log in.",
    });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ success: false, message: "Failed to reset password." });
  }
}
