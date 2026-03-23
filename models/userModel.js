import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { 
        type: String,
        required: true 
    },
    username: {
        type: String,
        required: true 
    },
    email: {
        type: String,
        required: true,
        unique: true 
    },
    phone:{
        type: String,
        required: true
    },
    birthDate:{
        type: Date,
        required: true
    },
    password:{
        type: String,
        required: true 
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    onboardingCompleted: {
        type: Boolean,
        default: false
    },
    avatar: {
        type: String,
        default: ""
    },
    preferences: {
        genres: [{ type: String }],
        languages: [{ type: String }],
        watchWith: { type: String, default: "" },
        experience: [{ type: String }],
        showTimings: [{ type: String }],
        priorityFactors: [{ type: String }],
        avoidGenres: [{ type: String }]
    }

  },
  { timestamps: true }
);

const User = mongoose.models.user || mongoose.model("User", userSchema);
export default User;
