import mongoose from "mongoose";

const cinemaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  facilities: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries (e.g., finding nearby cinemas)
cinemaSchema.index({ location: '2dsphere' });

export default mongoose.models.Cinema || mongoose.model("Cinema", cinemaSchema);
