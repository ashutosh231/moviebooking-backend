import express from 'express';
import { chatWithAI } from '../controllers/aiController.js';
import authMiddleware from '../middlewares/auth.js';

const aiRouter = express.Router();

/**
 * Route: POST /api/ai/chat
 * Logic: Sends user messages to NVIDIA AI Assistant
 * Middleware: Optional (uncomment authMiddleware if you want only logged-in users to use AI)
 */
aiRouter.post('/chat', chatWithAI);

export default aiRouter;
