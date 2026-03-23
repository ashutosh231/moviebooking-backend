import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import userRouter from './routes/userRouter.js';
import movieRouter from './routes/movieRouter.js';
import bookingRouter from './routes/bookingRouter.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { setIO } from './services/socketService.js';
import './workers/notificationWorker.js'; // Start the BullMQ worker background process

dotenv.config();

const app = express();
const httpServer = createServer(app); // wrap Express with Node http.Server

const PORT = process.env.PORT || 4000;

// Allowed origins for CORS (Express + Socket.io)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
];

// ── Express Middlewares ───────────────────────────────────
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Socket.io ─────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
});

// Register io globally so seatLockService can emit events
setIO(io);

io.on('connection', (socket) => {
  // Client sends join-show with { showId } to subscribe to seat events for that screening
  socket.on('join-show', ({ showId }) => {
    if (showId) {
      socket.join(showId);
      console.log(`[Socket] ${socket.id} joined show room: ${showId}`);
    }
  });

  socket.on('leave-show', ({ showId }) => {
    if (showId) socket.leave(showId);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] ${socket.id} disconnected`);
  });
});

// ── DB ────────────────────────────────────────────────────
connectDB();

// ── Routes ────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/auth', userRouter);
app.use('/api/movies', movieRouter);
app.use('/api/bookings', bookingRouter);

app.get('/', (_req, res) => res.send('API is running'));

// ── Start ─────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});