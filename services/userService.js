import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import dotenv from "dotenv";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRES_IN = "24h";

const mkToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

export const registerService = async (data) => {
  const { fullName, username, email, phone, birthDate, password } = data || {};

  // uniqueness
  const existingByEmail = await User.findOne({
    email: email.toLowerCase().trim(),
  });
  if (existingByEmail) {
    throw new Error("Email already in use");
  }

  const existingByUsername = await User.findOne({
    username: username.trim().toLowerCase(),
  });
  if (existingByUsername) {
    throw new Error("Username already taken");
  }

  // hash
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    fullName: fullName,
    username: username,
    email: email,
    phone: phone,
    birthDate: new Date(birthDate),
    password: hashedPassword,
  });

  const token = mkToken({ id: newUser._id });

  return {
    token,
    user: {
      id: newUser._id,
      fullName: newUser.fullName,
      username: newUser.username,
      email: newUser.email,
      phone: newUser.phone,
      birthDate: newUser.birthDate,
      avatar: newUser.avatar,
      onboardingCompleted: newUser.onboardingCompleted,
    },

  };
};

export const loginService = async (data) => {
  const { email, password } = data || {};
  const user = await User.findOne({
    email: email.toLowerCase().trim()
  });
  if (!user) throw new Error("Invalid email or password");
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid password");
  }
  // Include role in the token so frontend can detect admin users
  const token = mkToken({ id: user._id.toString(), role: user.role || "user" });//
  return {
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      birthDate: user.birthDate,
      role: user.role || "user",
      avatar: user.avatar,
      onboardingCompleted: user.onboardingCompleted,
    },

  };
};

export const adminLoginService = async (data) => {
  const { email, password } = data || {};
  const user = await User.findOne({
    email: email.toLowerCase().trim()
  });
  if (!user) throw new Error("Invalid email or password");
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid email or password");
  if (user.role !== "admin") {
    throw Object.assign(new Error("Access denied. Admin privileges required."), { status: 403 });
  }
  const token = mkToken({ id: user._id.toString(), role: "admin" });
  return {
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: "admin",
      avatar: user.avatar,
    },

  };
};

export const googleLoginService = async (token) => {
  if (!token) throw new Error("No token provided");

  // Verify the Google/Firebase ID token using Firebase Identity Toolkit public endpoint
  let googleUser;
  try {
    const res = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`,
      { idToken: token }
    );
    if (!res.data.users || res.data.users.length === 0) {
      throw new Error("Invalid Google token");
    }
    googleUser = res.data.users[0];
  } catch (err) {
    throw new Error("Invalid Google token");
  }

  const { email, displayName, photoUrl } = googleUser;
  const name = displayName;
  const picture = photoUrl;

  if (!email) throw new Error("Google account has no email");

  // Find user by email
  let user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    // Automatically register if not found
    const hashedPassword = await bcrypt.hash(uuidv4(), 10);
    user = await User.create({
      fullName: name || "User",
      username: `user_${uuidv4().substring(0, 8)}`,
      email: email,
      phone: "0000000000", // Default as not provided by Google
      birthDate: new Date(), // Default
      password: hashedPassword,
      avatar: picture || "",
    });
  } else if (!user.avatar && picture) {
    // Optionally update missing avatar
    user.avatar = picture;
    await user.save();
  }

  // Reuse mkToken defined above in this file!
  const jwtToken = jwt.sign({ id: user._id.toString(), role: user.role || "user" }, process.env.JWT_SECRET, { expiresIn: "24h" });

  return {
    token: jwtToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      birthDate: user.birthDate,
      role: user.role || "user",
      avatar: user.avatar,
      onboardingCompleted: user.onboardingCompleted,
    },
  };
};