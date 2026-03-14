import { validationResult } from "express-validator";
import { registerService,loginService } from "../services/userService.js";

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

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token: result.token,
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

        return res.status(200).json({
            success: true,
            message: "User logged in successfully",
            token: result.token,
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