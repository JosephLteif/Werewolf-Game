import { rtdb } from "./firebase";
import {
  ref,
  get,
  set,
  onValue,
  serverTimestamp,
} from "firebase/database";

function generateRoomCode(length = 4) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function defaultSettings() {
  return {
    actionWaitTime: 30,
    votingWaitTime: 60,
    wolfCount: 1,
    activeRoles: {
      cupid: false,
      doctor: false,
      hunter: false,
      seer: false,
      villager: false,
      // add other roles as needed
    },
  };
}

function initialRoomState(hostUser, code) {
  const hostId = hostUser.id || hostUser.uid || "host";
  const playerObj = {
    name: hostUser.name || hostUser.displayName || "Host",
    isAlive: true,
    ready: false,
    avatarColor: hostUser.avatarColor || null,
    role: null,
  };

  return {
    code,
    hostId,
    phase: "LOBBY",
    dayLog: "Waiting for game to start...",
    updatedAt: serverTimestamp(),
    settings: defaultSettings(),
    players: {
      [hostId]: playerObj,
    },
    nightActions: {
      doctorProtect: null,
      sorcererCheck: null,
      vigilanteTarget: null,
      wolfTarget: null,
      cupidLinks: [],
    },
    vigilanteAmmo: {},
    lockedVotes: [],
    lovers: [],
    votes: {},
    winner: null,
  };
}

/**
 * Creates a new room with a unique 4-letter code and writes initial state.
 * Returns the room code upon success.
 */
export async function createRoom(hostUser, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateRoomCode(4);
    const roomRef = ref(rtdb, `rooms/${code}`);

    // Check existence
    const snap = await get(roomRef);
    if (snap.exists()) {
      // collision -> try again
      continue;
    }

    const initial = initialRoomState(hostUser, code);

    // Write initial state. A small race could still occur but retries above reduce collisions.
    await set(roomRef, initial);
    return code;
  }

  throw new Error("Unable to generate unique room code");
}

/**
 * Adds/updates a player entry under `rooms/{roomCode}/players/{user.id}` and updates `updatedAt`.
 */
export async function joinRoom(roomCode, user) {
  if (!roomCode) throw new Error("roomCode is required");
  const uid = user.id || user.uid;
  if (!uid) throw new Error("user.id or user.uid is required");

  const playerRef = ref(rtdb, `rooms/${roomCode}/players/${uid}`);
  const playerData = {
    name: user.name || user.displayName || "",
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
 * Subscribes to changes for a specific room and invokes `callback` with the room value.
 * Returns an unsubscribe function.
 */
export function subscribeToRoom(roomCode, callback) {
  if (!roomCode) throw new Error("roomCode is required");
  if (typeof callback !== "function") throw new Error("callback must be a function");

  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  const unsub = onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });

  return unsub;
}

export default {
  createRoom,
  joinRoom,
  subscribeToRoom,
};
