// queues/notificationQueue.js
import { Queue } from "bullmq";
import connection from "../config/bullConfig.js";

const NOTIFICATION_QUEUE_NAME = "notification-queue";

/**
 * Initialize the Notification Queue
 */
export const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: "exponential",
      delay: 5000, // Wait 5s before first retry, then 10s, 20s...
    },
    removeOnComplete: true, // Clean up successful jobs
    removeOnFail: false,   // Keep failed jobs for debugging
  },
});

/**
 * Helper to add jobs to the notification queue
 * @param {string} type - job type (e.g., 'booking-confirmation')
 * @param {object} data - payload for the worker
 */
export const addNotificationJob = async (type, data) => {
  try {
    const job = await notificationQueue.add(type, data);
    console.log(`[Queue] Job added: ${type} (ID: ${job.id})`);
    return job;
  } catch (error) {
    console.error(`[Queue] Failed to add job: ${type}`, error);
    throw error;
  }
};
