import express from "express";
import { registerUser, loginUser } from "../controllers/userController.js";
import { sendOtp, verifyOtpAndRegister } from "../controllers/otpController.js";
import { registerValidation } from "../middlewares/user.validator.js";

const userRouter = express.Router();

// OTP-based registration (2-step)
userRouter.post("/send-otp", sendOtp);
userRouter.post("/verify-otp", verifyOtpAndRegister);

// Direct registration (kept for backward compat)
userRouter.post("/register", registerValidation, registerUser);

userRouter.post("/login", loginUser);

export default userRouter;