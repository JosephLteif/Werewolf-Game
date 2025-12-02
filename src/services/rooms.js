import { get, onValue, ref, serverTimestamp, set, update } from 'firebase/database';
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
  const playerData = {
    name: user.name || user.displayName || '',
    isAlive: true,
    ready: false,
    avatarColor: user.avatarColor || null,
    role: null,
  };

  await set(playerRef, playerData);

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
};
