import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import userRouter from './routes/userRouter.js';
import movieRouter from './routes/movieRouter.js';
import bookingRouter from './routes/bookingRouter.js';
import path from 'path';
const app = express();
dotenv.config();
const PORT = process.env.PORT || 4000;
//Middlewares

app.use(cors());
app.use(express.json());//To parse URL-encoded data
app.use(express.urlencoded({ extended: true }));//To parse JSON data
//DB

connectDB();
//Routes
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'))); // Serve static files from the uploads directory
app.use('/api/auth', userRouter);
app.use('/api/movies', movieRouter);
app.use("/api/bookings", bookingRouter);

app.get('/', (req, res) => {
    res.send('API is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});