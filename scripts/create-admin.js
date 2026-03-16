/**
 * create-admin.js
 * Creates a new admin user directly in the database.
 *
 * Usage:
 *   node scripts/create-admin.js
 *
 * You can change the values below before running.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// ════════════════════════════════════════════════
//   ✏️  EDIT THESE CREDENTIALS BEFORE RUNNING
// ════════════════════════════════════════════════
const ADMIN_FULL_NAME = "Admin User";
const ADMIN_USERNAME  = "movieverse_admin";
const ADMIN_EMAIL     = "admin@movieverse.com";
const ADMIN_PASSWORD  = "Admin@123";          // ← change this!
const ADMIN_PHONE     = "9999999999";
const ADMIN_BIRTHDATE = "1990-01-01";
// ════════════════════════════════════════════════

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
if (!MONGO_URI) {
    console.error("❌  MONGO_URI not found in .env");
    process.exit(1);
}

await mongoose.connect(MONGO_URI);
const db = mongoose.connection.db;

// Check if user already exists
const existing = await db.collection("users").findOne({ email: ADMIN_EMAIL });
if (existing) {
    if (existing.role === "admin") {
        console.log(`ℹ️  Admin already exists: ${ADMIN_EMAIL}`);
    } else {
        // Promote existing user to admin
        await db.collection("users").updateOne(
            { email: ADMIN_EMAIL },
            { $set: { role: "admin" } }
        );
        console.log(`✅  Existing user ${ADMIN_EMAIL} promoted to admin!`);
    }
} else {
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await db.collection("users").insertOne({
        fullName:  ADMIN_FULL_NAME,
        username:  ADMIN_USERNAME,
        email:     ADMIN_EMAIL,
        password:  hashed,
        phone:     ADMIN_PHONE,
        birthDate: new Date(ADMIN_BIRTHDATE),
        role:      "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    console.log(`✅  Admin user created successfully!`);
}

console.log(`
══════════════════════════════════════
  Admin Credentials
  Email    : ${ADMIN_EMAIL}
  Password : ${ADMIN_PASSWORD}
══════════════════════════════════════
`);

await mongoose.disconnect();
process.exit(0);
