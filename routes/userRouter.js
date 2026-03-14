import express from "express";
import { registerUser,loginUser } from "../controllers/userController.js";
import { registerValidation } from "../middlewares/user.validator.js";

const userRouter = express.Router();

userRouter.post("/register", registerValidation, registerUser);
userRouter.post("/login", loginUser);

export default userRouter;