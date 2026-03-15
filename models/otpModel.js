// models/otpModel.js
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  otp:   { type: String, required: true },
  // auto-expire: MongoDB TTL index removes document 10 minutes after createdAt
  createdAt: { type: Date, default: Date.now, expires: 600 },
});

export default mongoose.models.Otp || mongoose.model("Otp", otpSchema);
