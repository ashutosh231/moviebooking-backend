import mongoose from "mongoose";
import dotenv from "dotenv";
import Movie from "./models/movieModel.js";

dotenv.config();

const dummyMovies = [
  {
    movieName: "Fighter",
    poster: "http://localhost:5173/src/assets/FM1.png",
    duration: 140,
    categories: ["Action"],
    rating: 7.8,
    auditorium: "Audi 1",
    seatPrices: { standard: 250, recliner: 350 },
    story: "High-octane aerial action and a tale of duty and brotherhood set in the world of fighter pilots.",
    directors: [
      { name: "Karan Verma", file: "http://localhost:5173/src/assets/FMD1.png" },
      { name: "Rhea Kapoor", file: "http://localhost:5173/src/assets/FMD2.png" }
    ],
    producers: [{ name: "Zoya Kapoor", file: "http://localhost:5173/src/assets/FMP1.png" }],
    cast: [
      { name: "Arjun Shetty", role: "Lead (Hero)", file: "http://localhost:5173/src/assets/FMC1.png" },
      { name: "Nikita Rao", role: "Lead (Heroine)", file: "http://localhost:5173/src/assets/FMC2.png" },
      { name: "Ramesh Pillai", role: "Wing Commander", file: "http://localhost:5173/src/assets/FMC3.png" }
    ],
    trailerUrl: "https://youtu.be/GJ-wYUcp8Dg?si=bRPDomchYp9awTlU",
    slots: [
      { date: "2025-09-24", time: "10:00", ampm: "AM" },
      { date: "2025-09-24", time: "04:00", ampm: "PM" },
      { date: "2025-09-24", time: "08:00", ampm: "PM" }
    ]
  },
  {
    movieName: "Peddi",
    poster: "http://localhost:5173/src/assets/FM2.png",
    duration: 125,
    categories: ["Comedy", "Drama"],
    rating: 6.9,
    auditorium: "Audi 2",
    seatPrices: { standard: 180, recliner: 280 },
    story: "A family drama with warm humor — traditions, rivalries and a big wedding plan that changes lives.",
    directors: [{ name: "Meera Nair", file: "http://localhost:5173/src/assets/FMD1.png" }],
    producers: [{ name: "S unit Films", file: "http://localhost:5173/src/assets/FMP1.png" }],
    cast: [
      { name: "Vikram Rana", role: "Hero", file: "http://localhost:5173/src/assets/FMC1.png" },
      { name: "Pooja Iyer", role: "Heroine", file: "http://localhost:5173/src/assets/FMC2.png" },
      { name: "Gopal Das", role: "Comic Support", file: "http://localhost:5173/src/assets/FMC3.png" }
    ],
    trailerUrl: "https://youtu.be/77KAnoqpoFw?si=H7pXKwB2ctGlyt3f",
    slots: [
      { date: "2025-09-24", time: "11:00", ampm: "AM" },
      { date: "2025-09-24", time: "02:00", ampm: "PM" }
    ]
  },
  {
    movieName: "Baaghi 4",
    poster: "http://localhost:5173/src/assets/FM3.png",
    duration: 130,
    categories: ["Action", "Thriller"],
    rating: 7.2,
    auditorium: "Audi 3",
    seatPrices: { standard: 220, recliner: 320 },
    story: "A relentless action-packed thriller where an ex-commando takes on powerful adversaries in a fight for justice.",
    directors: [{ name: "Ravi K. Menon", file: "http://localhost:5173/src/assets/FMD1.png" }],
    producers: [{ name: "Blue Oak Productions", file: "http://localhost:5173/src/assets/FMP1.png" }],
    cast: [
      { name: "Karan Malhotra", role: "Lead", file: "http://localhost:5173/src/assets/FMC1.png" },
      { name: "Sana Mirza", role: "Lead Female", file: "http://localhost:5173/src/assets/FMC2.png" },
      { name: "Dilip Sen", role: "Villain", file: "http://localhost:5173/src/assets/FMC3.png" }
    ],
    trailerUrl: "https://youtu.be/58909OjAfeg?si=0eP30razSw0TMNmI",
    slots: [
      { date: "2025-09-24", time: "08:00", ampm: "AM" },
      { date: "2025-09-24", time: "12:00", ampm: "PM" }
    ]
  },
  {
    movieName: "Kantara",
    poster: "http://localhost:5173/src/assets/FM4.png",
    duration: 150,
    categories: ["Action", "Folk"],
    rating: 8.5,
    auditorium: "Audi 1",
    seatPrices: { standard: 240, recliner: 340 },
    story: "A visceral folk-driven tale of land, tradition and survival; raw performances and immersive visuals.",
    directors: [{ name: "Nandu Prakash", file: "http://localhost:5173/src/assets/FMD1.png" }],
    producers: [{ name: "Riverbend Studios", file: "http://localhost:5173/src/assets/FMP1.png" }],
    cast: [
      { name: "Manoj Gowda", role: "Protagonist", file: "http://localhost:5173/src/assets/FMC1.png" },
      { name: "Revathi Shenoy", role: "Lead Female", file: "http://localhost:5173/src/assets/FMC2.png" },
      { name: "Harish Rao", role: "Elder", file: "http://localhost:5173/src/assets/FMC3.png" }
    ],
    trailerUrl: "https://youtu.be/M2OnifMgvps?si=H9rdjvoXrajqMLJl",
    slots: [
      { date: "2025-09-24", time: "10:00", ampm: "AM" },
      { date: "2025-09-24", time: "01:30", ampm: "PM" },
      { date: "2025-09-24", time: "07:30", ampm: "PM" }
    ]
  },
  {
    movieName: "Param Sundari",
    poster: "http://localhost:5173/src/assets/FM5.png",
    duration: 120,
    categories: ["Comedy", "Romance", "Drama"],
    rating: 7.0,
    auditorium: "Audi 2",
    seatPrices: { standard: 200, recliner: 300 },
    story: "A colorful romantic drama about self-discovery, modern love and cultural celebration.",
    directors: [{ name: "Anjali Deshmukh", file: "http://localhost:5173/src/assets/FMD1.png" }],
    producers: [{ name: "Lotus Films", file: "http://localhost:5173/src/assets/FMP1.png" }],
    cast: [
      { name: "Rahul Bhatt", role: "Hero", file: "http://localhost:5173/src/assets/FMC1.png" },
      { name: "Neha Batra", role: "Heroine", file: "http://localhost:5173/src/assets/FMC2.png" },
      { name: "Kishore Lal", role: "Friend", file: "http://localhost:5173/src/assets/FMC3.png" }
    ],
    trailerUrl: "https://youtu.be/fdWnfzsx-ks?si=uLy5KfypNUIiBz74",
    slots: [
      { date: "2025-09-24", time: "10:30", ampm: "AM" },
      { date: "2025-09-24", time: "02:00", ampm: "PM" },
      { date: "2025-09-24", time: "07:30", ampm: "PM" }
    ]
  },
  {
    movieName: "Maalik",
    poster: "http://localhost:5173/src/assets/FM6.png",
    duration: 128,
    categories: ["Action", "Crime", "Thriller"],
    rating: 7.4,
    auditorium: "Audi 3",
    seatPrices: { standard: 210, recliner: 310 },
    story: "A taut crime thriller that follows a small-town cop as he uncovers a deep-rooted conspiracy.",
    directors: [{ name: "Vikram S.", file: "http://localhost:5173/src/assets/FMD1.png" }],
    producers: [{ name: "NorthStar Pictures", file: "http://localhost:5173/src/assets/FMP1.png" }],
    cast: [
      { name: "Aditya Malhotra", role: "Officer", file: "http://localhost:5173/src/assets/FMC1.png" },
      { name: "Ishita Kapoor", role: "Investigator", file: "http://localhost:5173/src/assets/FMC2.png" },
      { name: "Suresh Nair", role: "Antagonist", file: "http://localhost:5173/src/assets/FMC3.png" }
    ],
    trailerUrl: "https://youtu.be/0itY1Fhvnnk?si=kzRlptK14bBSdknj",
    slots: [
      { date: "2025-09-24", time: "09:00", ampm: "AM" },
      { date: "2025-09-24", time: "12:30", ampm: "PM" },
      { date: "2025-09-24", time: "08:00", ampm: "PM" }
    ]
  }
];

const seedMovies = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    await Movie.deleteMany({});
    console.log("Cleared existing movies collection...");

    await Movie.insertMany(dummyMovies);
    console.log("Inserted dummy movies successfully!");

    mongoose.disconnect();
    console.log("Database connection closed.");
  } catch (error) {
    console.error("Error seeding movies:", error);
    process.exit(1);
  }
};

seedMovies();
