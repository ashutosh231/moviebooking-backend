import Cinema from "../models/cinemaModel.js";

// Helper for admin verification
const isAdmin = (req) => req.user && req.user.role === "admin";

// @route GET /api/cinemas/nearby
export const getNearbyCinemas = async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: "Latitude and longitude are required" });
        }

        const cinemas = await Cinema.find({
            isActive: true,
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: 50000 // 50 km radius approx
                }
            }
        });

        res.status(200).json({ success: true, count: cinemas.length, data: cinemas });
    } catch (error) {
        console.error("Error in getNearbyCinemas:", error);
        res.status(500).json({ success: false, message: "Failed to fetch nearby cinemas" });
    }
};

// @route GET /api/cinemas/:id
export const getCinemaById = async (req, res) => {
    try {
        const cinema = await Cinema.findById(req.params.id);
        if (!cinema) {
            return res.status(404).json({ success: false, message: "Cinema not found" });
        }
        res.status(200).json({ success: true, data: cinema });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching cinema details" });
    }
};

// ADMIN ROUTES
export const createCinema = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Super admin access required" });

        const { name, address, city, state, pincode, lat, lng, facilities, isActive } = req.body;
        
        const cinema = new Cinema({
            name, address, city, state, pincode,
            location: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
            facilities: facilities || [],
            isActive: isActive !== undefined ? isActive : true,
            createdBy: req.user._id
        });

        await cinema.save();
        res.status(201).json({ success: true, data: cinema });
    } catch (error) {
        console.error("createCinema error:", error);
        res.status(500).json({ success: false, message: "Failed to create cinema" });
    }
};

export const updateCinema = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Super admin access required" });

        const cinema = await Cinema.findById(req.params.id);
        if (!cinema) return res.status(404).json({ success: false, message: "Cinema not found" });

        const { name, address, city, state, pincode, lat, lng, facilities, isActive } = req.body;

        if (name) cinema.name = name;
        if (address) cinema.address = address;
        if (city) cinema.city = city;
        if (state) cinema.state = state;
        if (pincode) cinema.pincode = pincode;
        if (lat && lng) cinema.location.coordinates = [parseFloat(lng), parseFloat(lat)];
        if (facilities) cinema.facilities = facilities;
        if (isActive !== undefined) cinema.isActive = isActive;

        await cinema.save();
        res.status(200).json({ success: true, data: cinema });
    } catch (error) {
        console.error("updateCinema error:", error);
        res.status(500).json({ success: false, message: "Failed to update cinema" });
    }
};

export const listCinemasForAdmin = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Super admin access required" });

        const cinemas = await Cinema.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: cinemas.length, data: cinemas });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error listing cinemas" });
    }
};

export const seedCinemas = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Super admin access required for seeding" });
        
        // Only run if empty
        const count = await Cinema.countDocuments();
        if (count > 0) return res.status(400).json({ success: false, message: "Cinemas already seeded" });

        const dummyCinemas = [
            {
                name: "PVR Infinity Mall", address: "Link Road, Andheri West", city: "Mumbai", state: "Maharashtra", pincode: "400053",
                location: { type: "Point", coordinates: [72.8327, 19.1436] }, facilities: ["Dolby Atmos", "Recliner Seats"], isActive: true, createdBy: req.user._id
            },
            {
                name: "INOX Phoenix Marketcity", address: "LBS Marg, Kurla", city: "Mumbai", state: "Maharashtra", pincode: "400070",
                location: { type: "Point", coordinates: [72.8889, 19.0867] }, facilities: ["IMAX", "Laser Projection"], isActive: true, createdBy: req.user._id
            },
            {
                name: "Cinepolis DLF Place", address: "Saket District Centre", city: "New Delhi", state: "Delhi", pincode: "110017",
                location: { type: "Point", coordinates: [77.2197, 28.5284] }, facilities: ["4DX", "Dolby Atmos"], isActive: true, createdBy: req.user._id
            },
            {
                name: "PVR Forum Mall", address: "Koramangala", city: "Bengaluru", state: "Karnataka", pincode: "560095",
                location: { type: "Point", coordinates: [77.6111, 12.9351] }, facilities: ["PlayZone", "Recliner Seats"], isActive: true, createdBy: req.user._id
            }
        ];

        await Cinema.insertMany(dummyCinemas);
        res.status(201).json({ success: true, message: "Seeded dummy cinemas successfully" });
    } catch (error) {
        console.error("seed error:", error);
        res.status(500).json({ success: false, message: "Failed to seed cinemas" });
    }
};
