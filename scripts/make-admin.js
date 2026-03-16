/**
 * make-admin.js
 * 
 * Run this script once to promote a user to admin:
 *   node scripts/make-admin.js admin@example.com
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
const email = process.argv[2];

if (!email) {
    console.error("❌  Usage: node scripts/make-admin.js <email>");
    process.exit(1);
}

await mongoose.connect(MONGO_URI);
const db = mongoose.connection.db;
const result = await db.collection("users").updateOne(
    { email: email.toLowerCase().trim() },
    { $set: { role: "admin" } }
);

if (result.matchedCount === 0) {
    console.error(`❌  No user found with email: ${email}`);
} else {
    console.log(`✅  User ${email} has been promoted to admin!`);
}

await mongoose.disconnect();
process.exit(0);
