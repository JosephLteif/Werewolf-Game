import { useState, useEffect } from 'react';
import { subscribeToGlobalStats } from '../services/presence';

export function useGlobalStats() {
  const [stats, setStats] = useState({ onlineUsers: 0, activeRooms: 0 });

  useEffect(() => {
    const unsubscribe = subscribeToGlobalStats(setStats);
    return () => unsubscribe();
  }, []);

  return stats;
}
