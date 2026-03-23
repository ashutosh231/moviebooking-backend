// services/socketService.js
// ---------------------------------------------------------
// Holds a singleton reference to the socket.io server instance.
// We use a module-level variable so any service can import and
// emit events without circular dependency issues.
// ---------------------------------------------------------

let _io = null;

/** Called once from server.js after socket.io is initialized */
export function setIO(ioInstance) {
  _io = ioInstance;
}

/** Returns the io instance (may be null if not yet init'd) */
export function getIO() {
  return _io;
}

/**
 * Broadcast a seat-locked event to all clients watching this show.
 * Room name = showId so only relevant seat pickers receive it.
 */
export function broadcastSeatsLocked(showId, seats, lockedByUserId) {
  if (!_io) return;
  _io.to(showId).emit("seat-locked", { showId, seats, lockedByUserId });
}

/**
 * Broadcast a seat-released event to all clients watching this show.
 */
export function broadcastSeatsReleased(showId, seats) {
  if (!_io) return;
  _io.to(showId).emit("seat-released", { showId, seats });
}
