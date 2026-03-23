import { validationResult } from "express-validator";
import { registerService, loginService, adminLoginService } from "../services/userService.js";
import User from "../models/userModel.js";
import { deleteFromCloudinary } from "../config/cloudinary.js";



export const registerUser = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }

  try {
    const result = await registerService(req.body);

    res.cookie('token', result.token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
      maxAge: 30 * 24 * 60 * 60 * 1000 
    });


    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: result.user
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const loginUser = async (req, res) => {
    const {email, password} = req.body || {};
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        });
    }
    
    try{
        const result = await loginService(req.body);
        if(!result.user){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        res.cookie('token', result.token, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
          maxAge: 30 * 24 * 60 * 60 * 1000 
        });


        return res.status(200).json({
            success: true,
            message: "User logged in successfully",
            user: result.user
        });
    }
    catch(err){
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    };
};

export const adminLoginUser = async (req, res) => {
    try {
        const result = await adminLoginService(req.body);

        res.cookie('token', result.token, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
          maxAge: 30 * 24 * 60 * 60 * 1000 
        });

        return res.status(200).json({
            success: true,
            message: "Admin logged in successfully",
            token: result.token,
            user: result.user,
        });
    } catch (err) {
        const status = err.status || 400;
        return res.status(status).json({
            success: false,
            message: err.message || "Admin login failed",
        });
    }
};

export const logoutUser = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    return res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const getUserProfile = async (req, res) => {
    try {
        // req.user is attached by authMiddleware
        return res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Error fetching profile"
        });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { fullName, phone, birthDate, preferences, avatar, onboardingCompleted } = req.body;

        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (phone) updateData.phone = phone;
        if (birthDate) updateData.birthDate = birthDate;
        if (avatar) updateData.avatar = avatar;
        if (typeof onboardingCompleted === 'boolean') updateData.onboardingCompleted = onboardingCompleted;
        if (preferences) updateData.preferences = preferences;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-password");

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (err) {
        console.error("updateProfile error detailed:", err);
        return res.status(400).json({
            success: false,
            message: err.message || "Error updating profile"
        });
    }
};

export const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const userId = req.user._id;
        const user = await User.findById(userId);

        // Delete old avatar if it exists on Cloudinary
        if (user.avatar && user.avatar.includes("cloudinary.com")) {
            await deleteFromCloudinary(user.avatar);
        }

        user.avatar = req.file.path; // Cloudinary URL
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Avatar uploaded successfully",
            avatar: user.avatar
        });
    } catch (err) {
        console.error("uploadAvatar error:", err);
        return res.status(500).json({
            success: false,
            message: "Error uploading avatar"
        });
    }
};