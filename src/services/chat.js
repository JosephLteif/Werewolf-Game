import { rtdb } from './firebase';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';

/**
 * Subscribes to a specific chat channel in a given room.
 * @param {string} roomCode - The code of the game room.
 * @param {string} channel - The chat channel ('global', 'wolf', 'dead').
 * @param {function} callback - Callback function to receive new messages.
 * @returns {function} An unsubscribe function.
 */
export const subscribeToChat = (roomCode, channel, callback) => {
  const chatRef = ref(rtdb, `rooms/${roomCode}/chat/${channel}`);
  const unsubscribe = onValue(chatRef, (snapshot) => {
    const messages = [];
    snapshot.forEach((childSnapshot) => {
      messages.push({
        id: childSnapshot.key,
        ...childSnapshot.val(),
      });
    });
    callback(messages);
  });
  return unsubscribe;
};

/**
 * Sends a message to a specific chat channel in a given room.
 * @param {string} roomCode - The code of the game room.
 * @param {string} channel - The chat channel ('global', 'wolf', 'dead').
 * @param {object} messageObj - The message object containing senderId, senderName, text.
 */
export const sendChatMessage = async (roomCode, channel, messageObj) => {
  const chatRef = ref(rtdb, `rooms/${roomCode}/chat/${channel}`);
  try {
    await push(chatRef, {
      ...messageObj,
      timestamp: serverTimestamp(), // Firebase server timestamp
    });
  } catch (error) {
    console.error(`Failed to send message to ${channel} channel in room ${roomCode}:`, error);
    throw error;
  }
};
