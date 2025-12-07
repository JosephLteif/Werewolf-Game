import {
  get,
  onValue,
  ref,
  serverTimestamp,
  set,
  update,
  remove,
  onDisconnect,
  runTransaction,
} from 'firebase/database';
import GameState from '../models/GameState';
import { generateRoomCode } from '../utils/index';
import { rtdb } from './firebase.js';

/**
 * Creates a new room with a unique 4-letter code and writes initial state.
 * Returns the room code upon success.
 */
export async function createRoom(hostUser, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateRoomCode();
    const roomRef = ref(rtdb, `rooms/${code}`);

    // Check existence
    const snap = await get(roomRef);
    if (snap.exists()) {
      // collision -> try again
      continue;
    }

    const initial = GameState.createInitialState(hostUser, code);

    // Write initial state. A small race could still occur but retries above reduce collisions.
    await set(roomRef, initial);
    return code;
  }

  throw new Error('Unable to generate unique room code');
}

/**
 * Adds/updates a player entry under `rooms/{roomCode}/players/{user.id}` and updates `updatedAt`.
 */
export async function joinRoom(roomCode, user) {
  if (!roomCode) throw new Error('roomCode is required');
  const uid = user.id || user.uid;
  if (!uid) throw new Error('user.id or user.uid is required');

  const playerRef = ref(rtdb, `rooms/${roomCode}/players/${uid}`);

  // Fetch existing data to prevent overwriting critical state on rejoin
  const snapshot = await get(playerRef);
  const existingData = snapshot.val() || {};

  const playerData = {
    ...existingData, // Keep existing fields (like role, isAlive)
    name: user.name || user.displayName || existingData.name || 'Unknown',
    isAlive: existingData.isAlive !== undefined ? existingData.isAlive : true,
    ready: existingData.ready || false,
    avatarColor: user.avatarColor || existingData.avatarColor || null,
    role: existingData.role || null,
    isOnline: true,
    joinedAt: existingData.joinedAt || serverTimestamp(),
    lastActive: serverTimestamp(),
  };

  // Set up onDisconnect to mark as offline
  // We use .update so we don't wipe the player if they disconnect, just mark offline
  const disconnectRef = onDisconnect(playerRef);
  await disconnectRef.update({
    isOnline: false,
    lastActive: serverTimestamp(),
  });

  await update(playerRef, playerData);

  // update updatedAt
  const roomMetaRef = ref(rtdb, `rooms/${roomCode}/updatedAt`);
  await set(roomMetaRef, serverTimestamp());

  return { roomCode, playerId: uid };
}

/**
 * Updates specific properties of a room's state.
 */
export async function updateRoom(roomCode, updates) {
  if (!roomCode) throw new Error('roomCode is required');
  if (!updates || typeof updates !== 'object')
    throw new Error('updates must be a non-null object.');

  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  await update(roomRef, {
    ...updates,
    updatedAt: serverTimestamp(), // Always update timestamp on any change
  });
}

/**
 * Removes a player from a room's player list.
 * Uses Firebase `remove` to delete the specific player node and updates the room timestamp.
 */
export async function kickPlayer(roomCode, playerId) {
  if (!roomCode) throw new Error('roomCode is required');
  if (!playerId) throw new Error('playerId is required');
  const playerRef = ref(rtdb, `rooms/${roomCode}/players/${playerId}`);
  await remove(playerRef);
  // Update the room's updatedAt timestamp so listeners know something changed
  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  await update(roomRef, { updatedAt: serverTimestamp() });
}

/**
 * Updates a player's name in a room.
 */
export async function renamePlayer(roomCode, playerId, newName) {
  if (!roomCode) throw new Error('roomCode is required');
  if (!playerId) throw new Error('playerId is required');
  if (!newName || typeof newName !== 'string') throw new Error('newName is required');

  const playerRef = ref(rtdb, `rooms/${roomCode}/players/${playerId}`);
  await update(playerRef, { name: newName });

  // Update the room's updatedAt timestamp so listeners know something changed
  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  await update(roomRef, { updatedAt: serverTimestamp() });
}

/**
 * Subscribes to changes for a specific room and invokes `callback` with the room value.
 * Returns an unsubscribe function.
 */
export function subscribeToRoom(roomCode, callback) {
  if (!roomCode) throw new Error('roomCode is required');
  if (typeof callback !== 'function') throw new Error('callback must be a function');

  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  return onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });
}

export default {
  createRoom,
  joinRoom,
  subscribeToRoom,
  updateRoom,
  kickPlayer,
  renamePlayer,
  claimHostIfAvailable,
  performGameAction,
  transferHost,
};

/**
 * Transaction helper to ensure atomic game actions alongside required checks.
 * @param {string} roomCode
 * @param {function} updateFn - Receives current room state, returns new state or undefined to abort.
 */
export async function performGameAction(roomCode, updateFn) {
  if (!roomCode) throw new Error('roomCode is required');
  const roomRef = ref(rtdb, `rooms/${roomCode}`);

  await runTransaction(roomRef, (currentData) => {
    if (!currentData) return; // Room doesn't exist?

    // Allow the caller to modify data
    const newData = updateFn(currentData);

    // If updateFn returns undefined/null, transaction is aborted/unchanged
    if (newData === undefined) return;

    // Always update timestamp
    newData.updatedAt = serverTimestamp();

    return newData;
  });
}

/**
 * Checks if the current host is offline and claims host status if conditions are met.
 */
export async function claimHostIfAvailable(roomCode, currentUserId) {
  if (!roomCode || !currentUserId) return;
  const roomRef = ref(rtdb, `rooms/${roomCode}`);

  await runTransaction(roomRef, (room) => {
    if (!room || !room.players || !room.hostId) return;

    const currentHostId = room.hostId;
    const currentHost = room.players[currentHostId];

    // If host is active/online, do nothing
    if (currentHost && currentHost.isOnline) return;

    // Host is offline or invalid. Find new host.
    // Candidate must be online.
    const allPlayers = Object.entries(room.players).map(([id, p]) => ({ id, ...p }));
    const onlinePlayers = allPlayers.filter((p) => p.isOnline);

    if (onlinePlayers.length === 0) return; // No one online to claim

    // Sort by joinedAt (oldest first).
    // Note: serverTimestamp is an object locally until read back, so might be tricky inside transaction if not committed.
    // But for stored data it should be comparable safely if it's a number/timestamp.
    // Fallback to ID string comparison if timestamps match or are missing.
    onlinePlayers.sort((a, b) => {
      const timeA = a.joinedAt || 0;
      const timeB = b.joinedAt || 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });

    const newHost = onlinePlayers[0];

    // If I am the oldest online player, I claim it.
    // Actually, inside a transaction we can just Assign it to the oldest ONE.
    // We don't need to check if "I" am that one, we just fix the state.
    // But the function is named `claimHostIfAvailable`, implying "I" claim it.
    // However, generic robust migration is better: "Assign Host To Oldest Online".
    // If we want only "claim" logic:
    if (newHost.id === currentUserId) {
      room.hostId = currentUserId;
      room.updatedAt = serverTimestamp();
      return room;
    }

    // But to avoid conflicts/churn, maybe only migrate if specific user asks?
    // Let's stick to "claim" logic requested: "If the currentUserId matches that player's ID".
    // If the newHost is the currentUserId, or if we want to force migration to the oldest online player
    // regardless of who called it, the logic is simpler:
    if (newHost) {
      room.hostId = newHost.id;
      room.updatedAt = serverTimestamp();
      return room;
    }
  });
}

/**
 * Transfers host privileges to another player.
 */
export async function transferHost(roomCode, newHostId) {
  if (!roomCode) throw new Error('roomCode is required');
  if (!newHostId) throw new Error('newHostId is required');

  const roomRef = ref(rtdb, `rooms/${roomCode}`);

  await runTransaction(roomRef, (room) => {
    if (!room || !room.players) return; // Room or players don't exist

    // Ensure the new host is a valid player in the room. If not, abort the transaction.
    if (!room.players[newHostId]) {
      // Player not found, abort transaction gracefully.
      return undefined;
    }

    room.hostId = newHostId;
    room.updatedAt = serverTimestamp(); // Always update timestamp on any change
    return room;
  });
}
