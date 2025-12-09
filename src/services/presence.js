import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { rtdb } from './firebase';

export function setupGlobalPresence(user) {
  if (!user) {
    console.warn('setupGlobalPresence called with no user.');
    return;
  }

  const userStatusRef = ref(rtdb, `/onlineUsers/${user.uid}`);
  console.log('setupGlobalPresence: Setting up presence for user:', user.uid, 'Path:', `/onlineUsers/${user.uid}`);

  const isOnline = {
    isOnline: true,
    lastActive: serverTimestamp(),
  };

  const isOffline = {
    isOnline: false,
    lastActive: serverTimestamp(),
  };

  onValue(ref(rtdb, '.info/connected'), (snapshot) => {
    if (snapshot.val() === true) {
      set(userStatusRef, isOnline) // Set online immediately on connection
        .then(() => {
          onDisconnect(userStatusRef) // Register onDisconnect afterwards
            .set(isOffline);
        });
    }
  });
}

export function subscribeToGlobalStats(callback) {
  const onlineUsersRef = ref(rtdb, '/onlineUsers');
  const roomsRef = ref(rtdb, '/rooms');

  let onlineUsersCount = 0;
  let activeRoomsCount = 0;

  const updateCallback = () => {
    callback({ onlineUsers: onlineUsersCount, activeRooms: activeRoomsCount });
  };

  const unsubscribeOnlineUsers = onValue(onlineUsersRef, (snapshot) => {
    const users = snapshot.val();
    onlineUsersCount = 0;
    if (users) {
      Object.values(users).forEach(user => {
        if (user.isOnline) {
          onlineUsersCount++;
        }
      });
    }
    updateCallback();
  });

  const unsubscribeActiveRooms = onValue(roomsRef, (snapshot) => {
    activeRoomsCount = snapshot.val() ? Object.keys(snapshot.val()).length : 0;
    updateCallback();
  });

  return () => {
    unsubscribeOnlineUsers();
    unsubscribeActiveRooms();
  };
}
