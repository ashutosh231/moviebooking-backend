import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 2525, // Testing alternate port
  secure: false, 
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

async function test() {
  try {
    console.log("Verifying connection to Brevo on port 2525...");
    await transporter.verify();
    console.log("SUCCESS! Connected to Brevo on port 2525.");
  } catch (err) {
    console.error("FAILED to connect to Brevo on port 2525:", err.message);
  }
}
test();
