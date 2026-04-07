import express from "express";
import { registerUser, loginUser, adminLoginUser, getUserProfile, updateUserProfile, uploadAvatar, logoutUser, googleLogin } from "../controllers/userController.js";
import { sendOtp, verifyOtpAndRegister, forgotPassword, resetPassword } from "../controllers/otpController.js";
import { registerValidation } from "../middlewares/user.validator.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import authMiddleware from "../middlewares/auth.js";
import multer from "multer";
import { makeStorage } from "../config/cloudinary.js";

const userRouter = express.Router();

const avatarStorage = makeStorage("movieverse/avatars");
const upload = multer({ storage: avatarStorage });

// Profile Management
userRouter.get("/profile", authMiddleware, getUserProfile);
userRouter.put("/profile", authMiddleware, updateUserProfile);
userRouter.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);



// OTP-based registration (2-step)
userRouter.post("/send-otp", authLimiter, sendOtp);
userRouter.post("/verify-otp", authLimiter, verifyOtpAndRegister);

// Password Reset Flow
userRouter.post("/forgot-password", authLimiter, forgotPassword);
userRouter.post("/reset-password", authLimiter, resetPassword);

// Direct registration (kept for backward compat)
userRouter.post("/register", authLimiter, registerValidation, registerUser);

userRouter.post("/login", authLimiter, loginUser);
userRouter.post("/google", authLimiter, googleLogin);
userRouter.post("/admin-login", authLimiter, adminLoginUser);
userRouter.post("/logout", logoutUser);

export default userRouter;