// config/mailer.js — Nodemailer transporter via Brevo SMTP
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
  port: parseInt(process.env.BREVO_SMTP_PORT || "587", 10),
  secure: false, // TLS on 587
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

export const FROM_ADDRESS = `"${process.env.BREVO_FROM_NAME || "CineVerse"}" <${process.env.BREVO_FROM_EMAIL}>`;

export default transporter;
