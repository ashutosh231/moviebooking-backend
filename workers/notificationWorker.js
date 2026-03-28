// workers/notificationWorker.js
import { Worker } from "bullmq";
import connection from "../config/bullConfig.js";
import * as emailService from "../services/emailService.js";
import User from "../models/userModel.js";


const NOTIFICATION_QUEUE_NAME = "notification-queue";


/**
 * Worker to process notification jobs
 */
const worker = new Worker(
  NOTIFICATION_QUEUE_NAME,
  async (job) => {
    const { name, data } = job;
    console.log(`[Worker] Processing job: ${name} (ID: ${job.id})`);

    try {
      switch (name) {
        case "booking-confirmation":
          console.log(`[Worker] Sending confirmation for ${data.booking?.movie?.title}. Poster URL: ${data.booking?.movie?.poster}`);
          await emailService.sendBookingConfirmationEmail({
            to: data.to,
            name: data.userName,
            booking: data.booking,
          });
          break;


        case "booking-cancellation":
          await emailService.sendBookingCancellationEmail({
            to: data.to,
            name: data.userName,
            booking: data.booking,
            reason: data.reason || "",
          });
          break;

        case "new-movie":
        case "featured-movie":
          // Fetch all users to notify
          // Note: In a massive production app, you might want to stream this or use a more targeted list
          const users = await User.find({}, "email fullName");
          const isFeatured = name === "featured-movie";
          
          console.log(`[Worker] Sending ${name} notification to ${users.length} users...`);
          
          // Send emails in batches or concurrently (with some limit)
          const emailPromises = users.map((u) =>
            emailService.sendMovieNotificationEmail({
              to: u.email,
              name: u.fullName || "Movie Fan",
              movie: data.movie,
              isFeatured,
            }).catch(err => console.error(`Failed to notify ${u.email}:`, err.message))
          );
          
          await Promise.all(emailPromises);
          break;

        case "generate-ticket":
          // For now, this is bundled into the confirmation email logic, 
          // but we can add specialized PDF generation here if needed.
          console.log(`[Worker] Ticket generation logic for booking: ${data.bookingId}`);
          break;

        default:
          console.warn(`[Worker] Unknown job type: ${name}`);
      }
    } catch (error) {
      console.error(`[Worker] Error processing job ${name}:`, error);
      throw error; // Throw so BullMQ can retry
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 jobs simultaneously
  }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job completed: ${job.name} (ID: ${job.id})`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job failed: ${job.name} (ID: ${job.id})`, err);
});

console.log(`[Worker] Notification worker started and listening on ${NOTIFICATION_QUEUE_NAME}...`);

export default worker;
