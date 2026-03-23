// services/seatLockService.js
// ---------------------------------------------------------
// Manages temporary seat locks using Upstash Valkey (Redis-compatible).
//
// KEY DESIGN:
//   Key format:  seatlock:{showId}:{seatId}
//   Value:       userId who locked the seat
//   TTL:         LOCK_TTL_SECONDS (default 5 minutes)
//
// RACE CONDITION STRATEGY:
//   We use a Lua script (evaluated atomically on the server) to
//   check-and-set each seat key. This ensures that no two users
//   can claim the same seat between the CHECK and SET step.
//   Single-backend + Lua atomicity = no double booking.
// ---------------------------------------------------------

import valkeyClient from "./valkeyClient.js";
import { broadcastSeatsLocked, broadcastSeatsReleased } from "./socketService.js";

// Lock duration in seconds (5 minutes)
const LOCK_TTL_SECONDS = 5 * 60;

// Helper: build a consistent Redis key for a seat in a show
// showId is composed as "movieId_showtime_auditorium" from the caller.
const buildKey = (showId, seatId) =>
  `seatlock:${showId}:${String(seatId).toUpperCase()}`;

/**
 * Atomic Lua script:
 * - If the key does NOT exist → SET it with userId + EX → return 1 (locked)
 * - If the key already has the SAME userId → refresh TTL → return 2 (renewed)
 * - If the key exists with a DIFFERENT userId → return 0 (already locked by someone else)
 */
const LOCK_SCRIPT = `
local existing = redis.call('GET', KEYS[1])
if existing == false then
  redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
  return 1
elseif existing == ARGV[1] then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  return 2
else
  return 0
end
`;

/**
 * lockSeats
 * Attempts to lock all requested seats for a given show.
 * Returns immediately if ANY seat is already locked by someone else.
 *
 * @param {string} showId    - Unique show identifier (e.g. "movieId_showtime_audi")
 * @param {string[]} seats   - Array of seat IDs (e.g. ["A1", "A2"])
 * @param {string} userId    - The user requesting the lock
 * @returns {{ success: boolean, lockedSeats: string[], conflictSeats: string[] }}
 */
export async function lockSeats(showId, seats, userId) {
  if (!valkeyClient) {
    throw new Error("Valkey client is unavailable. Check VALKEY_URL env variable.");
  }
  if (!showId || !seats?.length || !userId) {
    throw new Error("showId, seats, and userId are required");
  }

  const lockedSeats = [];
  const conflictSeats = [];

  // Process seats sequentially.
  // Lua atomicity ensures no race between CHECK and SET per seat.
  for (const seat of seats) {
    const key = buildKey(showId, seat);
    // eval(script, numkeys, key, ...args)
    const result = await valkeyClient.eval(
      LOCK_SCRIPT,
      1,         // number of KEYS
      key,       // KEYS[1]
      userId,    // ARGV[1]
      LOCK_TTL_SECONDS // ARGV[2]
    );

    if (result === 0) {
      // Seat is locked by another user
      conflictSeats.push(String(seat).toUpperCase());
    } else {
      // result 1 = newly locked, result 2 = renewed by same user
      lockedSeats.push(String(seat).toUpperCase());
    }
  }

  if (conflictSeats.length > 0) {
    // Roll back all locks we just placed in this request
    // (so we don't hold partial locks)
    await releaseSeats(showId, lockedSeats, userId).catch(() => {});
    return { success: false, lockedSeats: [], conflictSeats };
  }

  // Broadcast to all clients watching this show that these seats are now locked
  if (lockedSeats.length > 0) {
    broadcastSeatsLocked(showId, lockedSeats, userId);
  }

  return { success: true, lockedSeats, conflictSeats: [] };
}

/**
 * releaseSeats
 * Releases seat locks ONLY if they belong to the requesting userId.
 * This prevents a user from accidentally releasing another user's lock.
 *
 * @param {string} showId
 * @param {string[]} seats
 * @param {string} userId
 */
export async function releaseSeats(showId, seats, userId) {
  if (!valkeyClient || !seats?.length) return;

  // Lua script: only delete if the value matches our userId
  const RELEASE_SCRIPT = `
    if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('DEL', KEYS[1])
    else
      return 0
    end
  `;

  const pipeline = valkeyClient.pipeline();
  for (const seat of seats) {
    const key = buildKey(showId, seat);
    pipeline.eval(RELEASE_SCRIPT, 1, key, userId);
  }
  const results = await pipeline.exec();

  // Determine which seats were actually released (script returned 1)
  const releasedSeats = [];
  results.forEach((res, index) => {
    // res is [error, result]
    if (!res[0] && res[1] === 1) {
      releasedSeats.push(seats[index]);
    }
  });

  if (releasedSeats.length > 0) {
    broadcastSeatsReleased(showId, releasedSeats);
  }
}

/**
 * confirmAndReleaseLocks
 * After successful payment: release the Valkey locks.
 * The confirmed booking in MongoDB is now the source of truth for seat occupancy.
 *
 * @param {string} showId
 * @param {string[]} seats
 * @param {string} userId
 */
export async function confirmAndReleaseLocks(showId, seats, userId) {
  // Releasing locks after confirmation is intentional:
  // MongoDB booking status = "confirmed" will block re-booking
  // in createBookingService via the BLOCKING_STATUSES check.
  await releaseSeats(showId, seats, userId);
}

/**
 * getLockedSeats
 * Returns which of the given seats are currently locked (and by whom).
 * Useful for the seat picker UI to show "being selected" state.
 *
 * @param {string} showId
 * @param {string[]} seats - if empty, caller should send all seat IDs
 * @returns {Array<{ seatId: string, lockedBy: string|null }>}
 */
export async function getLockedSeats(showId, seats) {
  if (!valkeyClient || !seats?.length) return [];

  const pipeline = valkeyClient.pipeline();
  for (const seat of seats) {
    pipeline.get(buildKey(showId, seat));
  }
  const results = await pipeline.exec();

  return seats.map((seat, i) => ({
    seatId: String(seat).toUpperCase(),
    lockedBy: results[i][1] || null, // [0] = error, [1] = value
  }));
}

export default {
  lockSeats,
  releaseSeats,
  confirmAndReleaseLocks,
  getLockedSeats,
};
