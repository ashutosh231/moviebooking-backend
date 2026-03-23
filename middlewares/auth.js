import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export default async function authMiddleware(req, res, next) {
    // 1. Grab the token from cookies (fallback to Authorization header for flexibility during transition if needed, but primarily cookies)
    let token = req.cookies?.token;
    
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res
            .status(401)
            .json({ success: false, message: 'Not authorized, token missing' });
    }

    // 2. Verify & attach user object
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(payload.id).select('-password'); 
        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: 'User not found' });
        }
        req.user = user;
        next();
    } catch (err) {
        console.error('JWT verification failed:', err);
        return res
            .status(401)
            .json({ success: false, message: 'Token invalid or expired' });
    }
}