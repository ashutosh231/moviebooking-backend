import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import dotenv from "dotenv";
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
    },
  };
};

export const loginService = async (data) => {
  const { email, password } = data || {};
  const user = await User.findOne({
    email: email.toLowerCase().trim()
  });
  const isMatch = await bcrypt.compare(password, user.password);
  if(!isMatch){
    throw new Error("Invalid password");
  }
  const token = mkToken({ id: user._id.toString() });
  return {
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      birthDate: user.birthDate,
    },
  };
};

  