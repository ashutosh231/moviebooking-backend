import transporter from "./config/mailer.js";

async function test() {
  try {
    console.log("Verifying connection to Brevo...");
    await transporter.verify();
    console.log("SUCCESS! Connected to Brevo.");
  } catch (err) {
    console.error("FAILED to connect to Brevo:", err);
  }
}
test();
