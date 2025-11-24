import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Shield, Eye, Skull, Users, Play, RotateCcw, Check, Fingerprint, Crosshair, Smile, Zap, Heart, Sparkles, Ghost, Hammer, Info, Copy, Crown, Radio } from 'lucide-react';
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc, onSnapshot, arrayUnion, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// --- CONFIGURATION ---
const appId = 'nightfall-game';

/* NIGHTFALL: Multiplayer Edition
   Uses Firestore to sync game state across devices.
*/

const ROLES = {
  // Good
  VILLAGER: { id: 'villager', name: 'Villager', icon: Users, desc: 'Find the wolves. Don\'t die.', alignment: 'good' },
  DOCTOR: { id: 'doctor', name: 'Doctor', icon: Shield, desc: 'Protect one person each night.', alignment: 'good' },
  SEER: { id: 'seer', name: 'Seer', icon: Eye, desc: 'Reveal one player\'s true nature.', alignment: 'good' },
  HUNTER: { id: 'hunter', name: 'Hunter', icon: Crosshair, desc: 'If you die, take someone with you.', alignment: 'good' },
  VIGILANTE: { id: 'vigilante', name: 'Vigilante', icon: Zap, desc: 'You have one bullet to use at night.', alignment: 'good' },
  MAYOR: { id: 'mayor', name: 'Mayor', icon: Crown, desc: 'Your vote counts as 2.', alignment: 'good' },
  LYCAN: { id: 'lycan', name: 'Lycan', icon: Fingerprint, desc: 'You are a Villager, but appear as a WOLF to the Seer.', alignment: 'good' },
  MASON: { id: 'mason', name: 'Mason', icon: Hammer, desc: 'You know who the other Masons are.', alignment: 'good' },

  // Evil
  WEREWOLF: { id: 'werewolf', name: 'Werewolf', icon: Skull, desc: 'Eliminate the villagers at night.', alignment: 'evil' },
  SORCERER: { id: 'sorcerer', name: 'Sorcerer', icon: Sparkles, desc: 'Find the Seer. You win with the Werewolves.', alignment: 'evil' },
  MINION: { id: 'minion', name: 'Minion', icon: Ghost, desc: 'You know the wolves. They don\'t know you.', alignment: 'evil' },

  // Neutral
  JESTER: { id: 'jester', name: 'Jester', icon: Smile, desc: 'Get voted out during the day to win.', alignment: 'neutral' },
  TANNER: { id: 'tanner', name: 'Tanner', icon: Skull, desc: 'You hate your job. Get voted out to win.', alignment: 'neutral' }, // Functionally same as Jester for win con, but different flavor
  CUPID: { id: 'cupid', name: 'Cupid', icon: Heart, desc: 'Link two players. If one dies, both die.', alignment: 'neutral' },

  // Special
  // HOST removed as a role. Host is now a player.
};

const PHASES = {
  LOBBY: 'LOBBY',
  ROLE_REVEAL: 'ROLE_REVEAL',
  NIGHT_INTRO: 'NIGHT_INTRO',
  NIGHT_CUPID: 'NIGHT_CUPID',
  NIGHT_WEREWOLF: 'NIGHT_WEREWOLF',
  NIGHT_MINION: 'NIGHT_MINION',
  NIGHT_SORCERER: 'NIGHT_SORCERER',
  NIGHT_DOCTOR: 'NIGHT_DOCTOR',
  NIGHT_SEER: 'NIGHT_SEER',
  NIGHT_MASON: 'NIGHT_MASON',
  NIGHT_VIGILANTE: 'NIGHT_VIGILANTE',
  HUNTER_ACTION: 'HUNTER_ACTION',
  DAY_REVEAL: 'DAY_REVEAL',
  DAY_VOTE: 'DAY_VOTE',
  GAME_OVER: 'GAME_OVER'
};

// --- UTILS ---
const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

export default function App() {
  // Local User State
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [joined, setJoined] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(null); // Role ID to show info for

  // Synced Game State
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Local UI State
  const [errorMsg, setErrorMsg] = useState("");
  const [seerMessage, setSeerMessage] = useState(null);
  const [selectedVote, setSelectedVote] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // --- AUTH & INIT ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth failed:", err);
        if (err.code === 'auth/admin-restricted-operation') {
          setErrorMsg("Enable 'Anonymous' sign-in in Firebase Console > Authentication > Sign-in method.");
        } else {
          setErrorMsg("Auth Error: " + err.message);
        }
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
  }, []);

  const resetIdentity = async () => {
    await signOut(auth);
    window.location.reload();
  };

  // --- FIRESTORE SYNC ---
  useEffect(() => {
    if (!user || !roomCode || !joined) return;

    // Use specific path for permissions: /artifacts/{appId}/public/data/rooms/{roomCode}
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', `room_${roomCode}`);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameState(data);

        // Check if I am host
        if (data.hostId === user.uid) setIsHost(true);

        // Auto-clear loading when data arrives
        setLoading(false);
      } else {
        setErrorMsg("Room closed or does not exist.");
        setJoined(false);
        setGameState(null);
      }
    }, (err) => {
      console.error("Sync error:", err);
      setErrorMsg("Connection lost or permission denied.");
    });

    return () => unsubscribe();
  }, [user, roomCode, joined]);

  // --- ACTIONS ---

  const createRoom = async () => {
    if (!user) return setErrorMsg("Waiting for connection...");
    if (!playerName) return setErrorMsg("Enter your name first!");

    const code = generateRoomCode();
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', `room_${code}`);

    const initialState = {
      code,
      hostId: user.uid,
      phase: PHASES.LOBBY,
      players: [{
        id: user.uid,
        name: playerName,
        role: null, // Host is just a player now
        isAlive: true,
        ready: false,
        avatarColor: `hsl(${Math.random() * 360}, 70%, 60%)`
      }],
      nightActions: { wolfTarget: null, doctorProtect: null, vigilanteTarget: null, sorcererCheck: null, cupidLinks: [] },
      vigilanteAmmo: {}, // Map of userId -> ammo count
      lovers: [], // Array of 2 userIds
      votes: {}, // Map of userId -> targetId (or 'skip')
      lockedVotes: [], // Array of userIds who have locked their vote
      dayLog: "Waiting for game to start...",
      settings: {
        wolfCount: 1,
        activeRoles: {
          [ROLES.DOCTOR.id]: true,
          [ROLES.SEER.id]: true,
          [ROLES.HUNTER.id]: false,
          [ROLES.JESTER.id]: false,
          [ROLES.VIGILANTE.id]: false,
          [ROLES.MAYOR.id]: false,
          [ROLES.LYCAN.id]: false,
          [ROLES.SORCERER.id]: false,
          [ROLES.TANNER.id]: false,
          [ROLES.CUPID.id]: false,
          [ROLES.MINION.id]: false,
          [ROLES.MASON.id]: false
        },
        actionWaitTime: 30,
        votingWaitTime: 60
      },
      winner: null,
      updatedAt: Date.now()
    };

    try {
      await setDoc(roomRef, initialState);
      setRoomCode(code);
      setIsHost(true);
      setJoined(true);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to create room. Permissions error.");
    }
  };

  const joinRoom = async () => {
    if (!user) return setErrorMsg("Waiting for connection...");
    if (!playerName) return setErrorMsg("Enter your name first!");
    if (!roomCode) return setErrorMsg("Enter a room code!");

    const code = roomCode.toUpperCase();
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', `room_${code}`);

    try {
      const snap = await getDoc(roomRef);

      if (!snap.exists()) return setErrorMsg("Room not found!");
      const data = snap.data();

      if (data.phase !== PHASES.LOBBY && !data.players.some(p => p.id === user.uid)) {
        return setErrorMsg("Game already in progress!");
      }

      // Add player if not exists
      if (!data.players.some(p => p.id === user.uid)) {
        const newPlayer = {
          id: user.uid,
          name: playerName,
          role: null,
          isAlive: true,
          ready: false,
          avatarColor: `hsl(${Math.random() * 360}, 70%, 60%)`
        };
        await updateDoc(roomRef, {
          players: arrayUnion(newPlayer)
        });
      }

      setRoomCode(code);
      setJoined(true);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to join. Permissions error.");
    }
  };

  const updateGame = async (updates) => {
    if (!user || !roomCode) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', `room_${roomCode}`);
    await updateDoc(roomRef, { ...updates, updatedAt: Date.now() });
  };

  // --- TIMER CHECK (HOST ONLY) ---
  useEffect(() => {
    if (!isHost || !gameState || !gameState.phaseEndTime) return;

    if (now > gameState.phaseEndTime) {
      // Time's up!
      if (gameState.phase === PHASES.DAY_VOTE) {
        resolveVoting();
      } else if ([PHASES.NIGHT_WEREWOLF, PHASES.NIGHT_DOCTOR, PHASES.NIGHT_SEER, PHASES.NIGHT_SORCERER, PHASES.NIGHT_VIGILANTE, PHASES.NIGHT_CUPID].includes(gameState.phase)) {
        // For night actions, timeout means skipping/advancing with null
        // We need to know WHICH action to skip.
        // This is a bit tricky because advanceNight takes specific arguments.
        // But we can infer the action based on the phase.

        let actionKey = null;
        if (gameState.phase === PHASES.NIGHT_WEREWOLF) actionKey = 'wolfTarget';
        if (gameState.phase === PHASES.NIGHT_DOCTOR) actionKey = 'doctorProtect';
        if (gameState.phase === PHASES.NIGHT_SEER) actionKey = null; // Seer just views
        if (gameState.phase === PHASES.NIGHT_SORCERER) actionKey = null; // Sorcerer just views
        if (gameState.phase === PHASES.NIGHT_VIGILANTE) actionKey = 'vigilanteTarget';
        if (gameState.phase === PHASES.NIGHT_CUPID) actionKey = 'cupidLinks';

        // Special handling for Cupid who needs an array
        const value = actionKey === 'cupidLinks' ? [] : null;

        advanceNight(actionKey, value);
      } else if ([PHASES.NIGHT_MINION, PHASES.NIGHT_MASON, PHASES.NIGHT_INTRO, PHASES.ROLE_REVEAL, PHASES.DAY_REVEAL].includes(gameState.phase)) {
        // Info phases - just move on? 
        // Actually, ROLE_REVEAL and DAY_REVEAL usually wait for user input or host.
        // Let's only auto-advance the Action phases for now as requested.
      }
    }
  }, [now, isHost, gameState]);

  // --- GAME LOGIC ---

  const startGame = async () => {
    if (!isHost) return;
    const { players, settings } = gameState;

    // Assign Roles - Include EVERYONE (Host is a player)
    const activePlayers = [...players];

    // Assign Roles
    let deck = [];
    for (let i = 0; i < settings.wolfCount; i++) deck.push(ROLES.WEREWOLF.id);

    // Add selected special roles
    if (settings.activeRoles[ROLES.DOCTOR.id]) deck.push(ROLES.DOCTOR.id);
    if (settings.activeRoles[ROLES.SEER.id]) deck.push(ROLES.SEER.id);
    if (settings.activeRoles[ROLES.HUNTER.id]) deck.push(ROLES.HUNTER.id);
    if (settings.activeRoles[ROLES.JESTER.id]) deck.push(ROLES.JESTER.id);
    if (settings.activeRoles[ROLES.VIGILANTE.id]) deck.push(ROLES.VIGILANTE.id);
    if (settings.activeRoles[ROLES.SORCERER.id]) deck.push(ROLES.SORCERER.id);
    if (settings.activeRoles[ROLES.MINION.id]) deck.push(ROLES.MINION.id);
    if (settings.activeRoles[ROLES.CUPID.id]) deck.push(ROLES.CUPID.id);
    if (settings.activeRoles[ROLES.MAYOR.id]) deck.push(ROLES.MAYOR.id);
    if (settings.activeRoles[ROLES.MASON.id]) { deck.push(ROLES.MASON.id); deck.push(ROLES.MASON.id); } // Masons come in pairs usually, or at least 2

    // Fill rest with Villagers
    while (deck.length < activePlayers.length) deck.push(ROLES.VILLAGER.id);

    // Shuffle
    deck = deck.sort(() => Math.random() - 0.5);

    // Assign to players
    const newPlayers = players.map(p => {
      // If we have more roles than players (unlikely if logic is right), just villager
      // If we have more players than roles (deck filled with villagers), pop one
      const role = deck.pop() || ROLES.VILLAGER.id;
      return {
        ...p,
        role,
        isAlive: true,
        ready: false
      };
    });

    // Init Vigilante Ammo
    const vigAmmo = {};
    newPlayers.forEach(p => {
      if (p.role === ROLES.VIGILANTE.id) vigAmmo[p.id] = 1;
    });

    await updateGame({
      players: newPlayers,
      vigilanteAmmo: vigAmmo,
      lovers: [], // Reset lovers
      phase: PHASES.ROLE_REVEAL,
      dayLog: "Night is approaching..."
    });
  };

  const markReady = async () => {
    const newPlayers = gameState.players.map(p =>
      p.id === user.uid ? { ...p, ready: true } : p
    );

    // If everyone is ready, move to Night
    const allReady = newPlayers.every(p => p.ready || !p.isAlive);

    await updateGame({
      players: newPlayers,
      phase: allReady ? PHASES.NIGHT_INTRO : gameState.phase
    });
  };

  const startNight = async () => {
    // Determine first night phase
    const hasCupid = gameState.players.some(p => p.role === ROLES.CUPID.id && p.isAlive);
    const hasLovers = gameState.lovers && gameState.lovers.length > 0;

    let firstPhase = PHASES.NIGHT_WEREWOLF;
    if (hasCupid && !hasLovers) {
      firstPhase = PHASES.NIGHT_CUPID;
    }

    await updateGame({
      phase: firstPhase,
      phaseEndTime: Date.now() + (gameState.settings.actionWaitTime * 1000),
      nightActions: { wolfTarget: null, doctorProtect: null, vigilanteTarget: null, sorcererCheck: null, cupidLinks: [] }
    });
  };

  // --- HELPER: NEXT PHASE CALCULATOR ---
  const advanceNight = async (actionType, actionValue) => {
    const newActions = { ...gameState.nightActions };
    if (actionType) {
      if (actionType === 'cupidLinks') {
        // Accumulate lovers
        const current = newActions.cupidLinks || [];
        if (current.includes(actionValue)) {
          newActions.cupidLinks = current.filter(id => id !== actionValue);
        } else if (current.length < 2) {
          newActions.cupidLinks = [...current, actionValue];
        }
        // If we don't have 2 yet, just update state and return (don't advance phase)
        // Actually, the UI handles the selection, we only call advanceNight when CONFIRMING
        // So actionValue here should be the FINAL array
        newActions.cupidLinks = actionValue;
      } else {
        newActions[actionType] = actionValue;
      }
    }

    // Calculate Next Phase
    const sequence = [
      PHASES.NIGHT_CUPID,
      PHASES.NIGHT_WEREWOLF,
      PHASES.NIGHT_MINION,
      PHASES.NIGHT_SORCERER,
      PHASES.NIGHT_DOCTOR,
      PHASES.NIGHT_SEER,
      PHASES.NIGHT_MASON,
      PHASES.NIGHT_VIGILANTE
    ];

    let currentIdx = sequence.indexOf(gameState.phase);
    let nextPhase = 'RESOLVE';

    // Find next valid phase
    for (let i = currentIdx + 1; i < sequence.length; i++) {
      const p = sequence[i];
      const hasRole = (rid) => gameState.players.some(pl => pl.role === rid && pl.isAlive);

      // Cupid only acts once (first night if lovers not set)
      if (p === PHASES.NIGHT_CUPID && (gameState.lovers && gameState.lovers.length > 0)) continue;

      if (p === PHASES.NIGHT_CUPID && hasRole(ROLES.CUPID.id) && (!gameState.lovers || gameState.lovers.length === 0)) { nextPhase = p; break; }
      if (p === PHASES.NIGHT_WEREWOLF) { nextPhase = p; break; } // Wolves always wake up
      if (p === PHASES.NIGHT_MINION && hasRole(ROLES.MINION.id)) { nextPhase = p; break; }
      if (p === PHASES.NIGHT_SORCERER && hasRole(ROLES.SORCERER.id)) { nextPhase = p; break; }
      if (p === PHASES.NIGHT_DOCTOR && hasRole(ROLES.DOCTOR.id)) { nextPhase = p; break; }
      if (p === PHASES.NIGHT_SEER && hasRole(ROLES.SEER.id)) { nextPhase = p; break; }
      if (p === PHASES.NIGHT_MASON && hasRole(ROLES.MASON.id)) { nextPhase = p; break; }
      if (p === PHASES.NIGHT_VIGILANTE && hasRole(ROLES.VIGILANTE.id)) { nextPhase = p; break; }
    }

    if (nextPhase === 'RESOLVE') {
      resolveNight(newActions);
    } else {
      // If we just finished Cupid, save lovers
      let updates = { nightActions: newActions, phase: nextPhase };

      // Set timer for next phase if it's an action phase
      if ([PHASES.NIGHT_WEREWOLF, PHASES.NIGHT_DOCTOR, PHASES.NIGHT_SEER, PHASES.NIGHT_SORCERER, PHASES.NIGHT_VIGILANTE, PHASES.NIGHT_CUPID].includes(nextPhase)) {
        updates.phaseEndTime = Date.now() + (gameState.settings.actionWaitTime * 1000);
      } else {
        updates.phaseEndTime = null; // Clear timer for non-timed phases
      }

      if (gameState.phase === PHASES.NIGHT_CUPID && newActions.cupidLinks?.length === 2) {
        updates.lovers = newActions.cupidLinks;
      }
      await updateGame(updates);
    }
  };

  const resolveNight = async (finalActions) => {
    let newPlayers = [...gameState.players];
    let deaths = [];

    // Wolf Kill
    if (finalActions.wolfTarget && finalActions.wolfTarget !== finalActions.doctorProtect) {
      const victim = newPlayers.find(p => p.id === finalActions.wolfTarget);
      if (victim) {
        victim.isAlive = false;
        deaths.push(victim);
      }
    }

    // Vigilante Shot
    if (finalActions.vigilanteTarget) {
      const victim = newPlayers.find(p => p.id === finalActions.vigilanteTarget);
      if (victim && victim.id !== finalActions.doctorProtect && victim.isAlive) {
        victim.isAlive = false;
        deaths.push(victim);
      }
    }

    // Handle Cupid Links (Lovers Pact)
    // If any lover died, the other dies too.
    // We need to loop because a lover dying might kill another lover (if we had chains, but here just pairs)
    let loversDied = true;
    while (loversDied) {
      loversDied = false;
      if (gameState.lovers && gameState.lovers.length === 2) {
        const [l1Id, l2Id] = gameState.lovers;
        const l1 = newPlayers.find(p => p.id === l1Id);
        const l2 = newPlayers.find(p => p.id === l2Id);

        if (l1 && l2) {
          if (!l1.isAlive && l2.isAlive) {
            l2.isAlive = false;
            deaths.push(l2);
            loversDied = true;
          } else if (!l2.isAlive && l1.isAlive) {
            l1.isAlive = false;
            deaths.push(l1);
            loversDied = true;
          }
        }
      }
    }

    // Check Hunter
    const hunterDied = deaths.find(p => p.role === ROLES.HUNTER.id);
    let nextPhase = PHASES.DAY_REVEAL;
    let log = deaths.length > 0 ? `${deaths.map(d => d.name).join(', ')} died.` : "No one died.";

    if (hunterDied) {
      log += " The Hunter died and seeks revenge!";
      nextPhase = PHASES.HUNTER_ACTION;
    } else {
      if (checkWin(newPlayers)) return;
    }

    await updateGame({
      players: newPlayers,
      dayLog: log,
      phase: nextPhase,
      nightActions: finalActions,
      lovers: finalActions.cupidLinks && finalActions.cupidLinks.length === 2 ? finalActions.cupidLinks : gameState.lovers
    });
  };

  const handleVote = async (targetId) => {
    if (targetId === null) {
      await updateGame({
        dayLog: "No one was hanged.",
        phase: PHASES.NIGHT_INTRO
      });
      return;
    }

    let newPlayers = [...gameState.players];
    const victim = newPlayers.find(p => p.id === targetId);
    victim.isAlive = false;

    // Jester/Tanner Win
    if (victim.role === ROLES.JESTER.id || victim.role === ROLES.TANNER.id) {
      await updateGame({
        players: newPlayers,
        winner: victim.role === ROLES.JESTER.id ? 'JESTER' : 'TANNER',
        phase: PHASES.GAME_OVER
      });
      return;
    }

    // Lovers Check
    if (gameState.lovers && gameState.lovers.includes(victim.id)) {
      const otherLoverId = gameState.lovers.find(id => id !== victim.id);
      const otherLover = newPlayers.find(p => p.id === otherLoverId);
      if (otherLover && otherLover.isAlive) {
        otherLover.isAlive = false;
        // We don't log it explicitly as "Heartbreak" in this simple version, but they die.
      }
    }

    // Hunter Vote Death
    if (victim.role === ROLES.HUNTER.id) {
      await updateGame({
        players: newPlayers,
        dayLog: `${victim.name} (Hunter) was voted out!`,
        phase: PHASES.HUNTER_ACTION
      });
      return;
    }

    if (checkWin(newPlayers)) return;

    await updateGame({
      players: newPlayers,
      dayLog: `${victim.name} was voted out.`,
      phase: PHASES.NIGHT_INTRO
    });
  };

  const handleHunterShot = async (targetId) => {
    let newPlayers = [...gameState.players];
    const victim = newPlayers.find(p => p.id === targetId);
    victim.isAlive = false;

    // Lovers Check for Hunter Shot
    if (gameState.lovers && gameState.lovers.includes(victim.id)) {
      const otherLoverId = gameState.lovers.find(id => id !== victim.id);
      const otherLover = newPlayers.find(p => p.id === otherLoverId);
      if (otherLover && otherLover.isAlive) {
        otherLover.isAlive = false;
      }
    }

    let log = gameState.dayLog + ` The Hunter shot ${victim.name}!`;

    if (checkWin(newPlayers)) return;

    const wasNightDeath = gameState.dayLog.includes("died");

    await updateGame({
      players: newPlayers,
      dayLog: log,
      phase: wasNightDeath ? PHASES.DAY_REVEAL : PHASES.NIGHT_INTRO
    });
  };

  const checkWin = (currentPlayers) => {
    // Host is now a player, so we don't filter them out.
    const activePlayers = currentPlayers;

    const activeWolves = activePlayers.filter(p => p.isAlive && p.role === ROLES.WEREWOLF.id).length;
    const good = activePlayers.filter(p => p.isAlive && p.role !== ROLES.WEREWOLF.id && p.role !== ROLES.JESTER.id).length;

    // Lovers Win: Only lovers alive
    if (gameState.lovers && gameState.lovers.length === 2) {
      const loversAlive = activePlayers.filter(p => gameState.lovers.includes(p.id) && p.isAlive).length === 2;
      const othersAlive = activePlayers.filter(p => !gameState.lovers.includes(p.id) && p.isAlive).length;
      if (loversAlive && othersAlive === 0) {
        updateGame({ players: currentPlayers, winner: 'LOVERS', phase: PHASES.GAME_OVER });
        return true;
      }
    }

    if (activeWolves === 0) {
      updateGame({ players: currentPlayers, winner: 'VILLAGERS', phase: PHASES.GAME_OVER });
      return true;
    }
    if (activeWolves >= good) {
      updateGame({ players: currentPlayers, winner: 'WEREWOLVES', phase: PHASES.GAME_OVER });
      return true;
    }
    return false;
  };

  // --- NEW VOTING SYSTEM ---
  const castVote = async (targetId) => {
    // Can't vote if already locked
    if (gameState.lockedVotes.includes(user.uid)) return;

    const newVotes = { ...gameState.votes, [user.uid]: targetId };
    await updateGame({ votes: newVotes });
  };

  const lockVote = async () => {
    // Can't lock if no vote cast
    if (!gameState.votes[user.uid]) return;

    // Can't lock if already locked
    if (gameState.lockedVotes.includes(user.uid)) return;

    const newLockedVotes = [...gameState.lockedVotes, user.uid];
    await updateGame({ lockedVotes: newLockedVotes });

    // Check if everyone has locked
    const alivePlayers = gameState.players.filter(p => p.isAlive);
    if (newLockedVotes.length === alivePlayers.length) {
      // Trigger resolution
      resolveVoting();
    }
  };

  const resolveVoting = async () => {
    // Count votes
    const voteCounts = {};
    Object.entries(gameState.votes).forEach(([voterId, targetId]) => {
      const voter = gameState.players.find(p => p.id === voterId);
      const weight = (voter && voter.role === ROLES.MAYOR.id && voter.isAlive) ? 2 : 1;
      voteCounts[targetId] = (voteCounts[targetId] || 0) + weight;
    });

    // Find max votes
    let maxVotes = 0;
    let victims = [];
    Object.entries(voteCounts).forEach(([targetId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        victims = [targetId];
      } else if (count === maxVotes) {
        victims.push(targetId);
      }
    });

    // Handle tie or skip
    if (victims.length > 1 || victims[0] === 'skip') {
      await updateGame({
        dayLog: "No one was eliminated.",
        phase: PHASES.NIGHT_INTRO,
        votes: {},
        lockedVotes: []
      });
      return;
    }

    const targetId = victims[0];
    let newPlayers = [...gameState.players];
    const victim = newPlayers.find(p => p.id === targetId);
    victim.isAlive = false;

    // Jester/Tanner Win
    if (victim.role === ROLES.JESTER.id || victim.role === ROLES.TANNER.id) {
      await updateGame({
        players: newPlayers,
        winner: victim.role === ROLES.JESTER.id ? 'JESTER' : 'TANNER',
        phase: PHASES.GAME_OVER,
        votes: {},
        lockedVotes: []
      });
      return;
    }

    // Lovers Check
    if (gameState.lovers && gameState.lovers.includes(victim.id)) {
      const otherLoverId = gameState.lovers.find(id => id !== victim.id);
      const otherLover = newPlayers.find(p => p.id === otherLoverId);
      if (otherLover && otherLover.isAlive) {
        otherLover.isAlive = false;
      }
    }

    // Hunter Vote Death
    if (victim.role === ROLES.HUNTER.id) {
      await updateGame({
        players: newPlayers,
        dayLog: `${victim.name} (Hunter) was voted out!`,
        phase: PHASES.HUNTER_ACTION,
        votes: {},
        lockedVotes: []
      });
      return;
    }

    if (checkWin(newPlayers)) return;

    await updateGame({
      players: newPlayers,
      dayLog: `${victim.name} was voted out.`,
      phase: PHASES.NIGHT_INTRO,
      votes: {},
      lockedVotes: []
    });
  };

  // --- RENDER HELPERS ---
  const myPlayer = gameState?.players?.find(p => p.id === user?.uid);
  const amAlive = myPlayer?.isAlive;

  if (!joined || !gameState) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-indigo-500 flex items-center justify-center gap-3">
            <Moon className="w-12 h-12" /> NIGHTFALL
          </h1>
          <p className="text-slate-400">Local Multiplayer • Join Room</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700 space-y-4">
          {errorMsg && <div className="bg-red-900/50 text-red-200 p-3 rounded text-sm text-center">{errorMsg}</div>}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Your Name</label>
            <input
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Wolfie"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
            />
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white uppercase tracking-widest text-center font-mono placeholder:normal-case placeholder:tracking-normal"
                placeholder="Room Code"
                maxLength={4}
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
              />
              <button onClick={joinRoom} disabled={!user} className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-6 font-bold rounded-lg">Join</button>
            </div>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-700"></div>
              <span className="flex-shrink mx-4 text-slate-600 text-xs">OR</span>
              <div className="flex-grow border-t border-slate-700"></div>
            </div>
            <button onClick={createRoom} disabled={!user} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-3 rounded-lg font-bold">Create New Room</button>
          </div>

          {user && (
            <div className="text-center pt-2">
              <div className="text-xs text-slate-600 mb-1">ID: {user.uid.slice(0, 6)}...</div>
              <button onClick={resetIdentity} className="text-xs text-red-400 hover:text-red-300 underline">Reset Identity</button>
              <div className="text-[10px] text-slate-600 mt-2">Tip: Use Incognito windows to test multiple players.</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- LOBBY PHASE ---
  if (gameState.phase === PHASES.LOBBY) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col">
        <header className="flex justify-between items-center mb-6">
          <div>
            <div className="text-xs text-slate-500 uppercase">Room Code</div>
            <div className="text-3xl font-mono font-black text-indigo-400 tracking-widest flex items-center gap-2">
              {gameState.code}
              <button onClick={() => { navigator.clipboard.writeText(gameState.code); alert('Copied!'); }}><Copy className="w-4 h-4 text-slate-600 hover:text-white" /></button>
            </div>
          </div>
          {isHost && <div className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded text-xs font-bold">HOST</div>}
        </header>

        <div className="flex-1 overflow-y-auto mb-6">
          <h3 className="text-slate-500 font-bold mb-3 flex justify-between">
            <span>Players</span>
            <span>{gameState.players.length}</span>
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {gameState.players.map(p => (
              <div key={p.id} className="bg-slate-800 p-4 rounded-xl flex items-center gap-3 border border-slate-700">
                <span className="font-bold text-lg">{p.name}</span>
                {p.id === user.uid && <span className="text-sm font-bold text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded ml-2">(You)</span>}
                {p.id === gameState.hostId && <span className="text-xs text-slate-500 font-bold ml-auto border border-slate-600 px-2 py-1 rounded">HOST</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Settings Panel - Visible to ALL, Editable by HOST */}
        <div className="space-y-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h3 className="text-slate-500 font-bold flex items-center gap-2">
            <Info className="w-4 h-4" /> Game Settings
            {!isHost && <span className="text-xs font-normal text-slate-600 ml-auto">(Host Only)</span>}
          </h3>

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-400">Action Timer (s)</span>
            <div className="flex items-center gap-3 bg-slate-900 rounded p-1">
              {isHost && <button onClick={() => updateGame({ settings: { ...gameState.settings, actionWaitTime: Math.max(10, gameState.settings.actionWaitTime - 5) } })} className="w-8 h-8 hover:bg-slate-700 rounded">-</button>}
              <span className="font-mono px-2 w-8 text-center">{gameState.settings.actionWaitTime}</span>
              {isHost && <button onClick={() => updateGame({ settings: { ...gameState.settings, actionWaitTime: gameState.settings.actionWaitTime + 5 } })} className="w-8 h-8 hover:bg-slate-700 rounded">+</button>}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-400">Voting Timer (s)</span>
            <div className="flex items-center gap-3 bg-slate-900 rounded p-1">
              {isHost && <button onClick={() => updateGame({ settings: { ...gameState.settings, votingWaitTime: Math.max(10, gameState.settings.votingWaitTime - 10) } })} className="w-8 h-8 hover:bg-slate-700 rounded">-</button>}
              <span className="font-mono px-2 w-8 text-center">{gameState.settings.votingWaitTime}</span>
              {isHost && <button onClick={() => updateGame({ settings: { ...gameState.settings, votingWaitTime: gameState.settings.votingWaitTime + 10 } })} className="w-8 h-8 hover:bg-slate-700 rounded">+</button>}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-red-400">Wolf Count</span>
            <div className="flex items-center gap-3 bg-slate-900 rounded p-1">
              {isHost && <button onClick={() => updateGame({ settings: { ...gameState.settings, wolfCount: Math.max(1, gameState.settings.wolfCount - 1) } })} className="w-8 h-8 hover:bg-slate-700 rounded">-</button>}
              <span className="font-mono px-2">{gameState.settings.wolfCount}</span>
              {isHost && <button onClick={() => updateGame({ settings: { ...gameState.settings, wolfCount: gameState.settings.wolfCount + 1 } })} className="w-8 h-8 hover:bg-slate-700 rounded">+</button>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.values(ROLES).filter(r => r.id !== 'villager' && r.id !== 'werewolf').map(r => {
              const isActive = gameState.settings.activeRoles[r.id];
              return (
                <button
                  key={r.id}
                  onClick={() => isHost ? updateGame({ settings: { ...gameState.settings, activeRoles: { ...gameState.settings.activeRoles, [r.id]: !isActive } } }) : setShowRoleInfo(r.id)}
                  className={`px-3 py-2 rounded text-xs font-bold border transition-all flex items-center gap-2 relative group
                         ${isActive ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'}
                         ${!isHost ? 'cursor-help opacity-80' : 'hover:opacity-80'}
                    `}
                >
                  <r.icon className="w-3 h-3" />
                  {r.name}
                  {isHost && (
                    <div
                      onClick={(e) => { e.stopPropagation(); setShowRoleInfo(r.id); }}
                      className="ml-1 p-1 hover:bg-white/20 rounded-full cursor-help"
                    >
                      <Info className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {isHost && (() => {
            const activeSpecialRolesCount = Object.entries(gameState.settings.activeRoles)
              .filter(([id, isActive]) => isActive && id !== ROLES.MASON.id).length;
            const masonCount = gameState.settings.activeRoles[ROLES.MASON.id] ? 2 : 0;
            const totalRolesNeeded = gameState.settings.wolfCount + activeSpecialRolesCount + masonCount;
            const playersCount = gameState.players.length;

            // Validation Checks
            const hasEnoughPlayers = playersCount >= totalRolesNeeded && playersCount >= 3;
            const isBalanced = gameState.settings.wolfCount < playersCount / 2;
            const isValid = hasEnoughPlayers && isBalanced;

            return (
              <div className="space-y-2">
                {!hasEnoughPlayers && (
                  <div className="text-red-400 text-xs text-center font-bold">
                    Need {Math.max(3, totalRolesNeeded)} players (Have {playersCount})
                  </div>
                )}
                {!isBalanced && (
                  <div className="text-red-400 text-xs text-center font-bold">
                    Too many wolves! (Must be &lt; {Math.ceil(playersCount / 2)})
                  </div>
                )}
                <button
                  onClick={startGame}
                  disabled={!isValid}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-900/20"
                >
                  Start Game
                </button>
              </div>
            );
          })()}
        </div>

        {!isHost && <div className="text-center text-slate-500 animate-pulse mt-4">Waiting for host to start...</div>}

        {/* Role Info Modal */}
        {showRoleInfo && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50" onClick={() => setShowRoleInfo(null)}>
            <div className="bg-slate-800 p-6 rounded-2xl max-w-sm w-full border border-slate-700" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-4 mb-4">
                {React.createElement(Object.values(ROLES).find(r => r.id === showRoleInfo).icon, { className: "w-12 h-12 text-indigo-400" })}
                <h3 className="text-2xl font-bold">{Object.values(ROLES).find(r => r.id === showRoleInfo).name}</h3>
              </div>
              <p className="text-slate-300 mb-6">{Object.values(ROLES).find(r => r.id === showRoleInfo).desc}</p>
              <button onClick={() => setShowRoleInfo(null)} className="w-full bg-slate-700 py-3 rounded-xl font-bold">Close</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- ROLE REVEAL ---
  if (gameState.phase === PHASES.ROLE_REVEAL) {
    if (!myPlayer) return <div>Loading...</div>;
    const MyRole = ROLES[myPlayer.role.toUpperCase()];

    const alignmentColors = {
      good: { bg: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-400', text: 'text-blue-400', glow: 'shadow-blue-500/50' },
      evil: { bg: 'from-red-500/20 to-rose-500/20', border: 'border-red-400', text: 'text-red-500', glow: 'shadow-red-500/50' },
      neutral: { bg: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-400', text: 'text-purple-400', glow: 'shadow-purple-500/50' }
    };

    const colors = alignmentColors[MyRole.alignment] || alignmentColors.good;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Ambient particles */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 ${colors.text} rounded-full animate-pulse`}
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-md w-full">
          <h2 className="text-3xl font-black text-slate-400 mb-12 tracking-wide">Your Role Is...</h2>

          <div className={`bg-gradient-to-br ${colors.bg} backdrop-blur-sm border-2 ${colors.border} p-10 rounded-3xl w-full mb-10 flex flex-col items-center gap-6 shadow-2xl ${colors.glow} relative overflow-hidden`}>
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50 blur-xl`}></div>

            <div className="relative">
              <MyRole.icon className={`w-32 h-32 ${colors.text} drop-shadow-2xl`} />
            </div>
            <div className={`text-4xl font-black ${colors.text} relative`}>{MyRole.name}</div>
            <p className="text-slate-300 text-base leading-relaxed relative">{MyRole.desc}</p>

            {/* Alignment badge */}
            <div className={`px-4 py-2 rounded-full ${colors.border} border ${colors.text} text-xs font-bold uppercase tracking-wider relative`}>
              {MyRole.alignment}
            </div>
          </div>

          {!myPlayer.ready ? (
            <button
              onClick={markReady}
              className={`w-full bg-gradient-to-r ${colors.bg} hover:opacity-80 ${colors.border} border-2 ${colors.text} font-bold py-5 rounded-2xl shadow-lg transition-all hover:scale-105`}
            >
              I Understand
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 text-green-400">
                <Check className="w-6 h-6" />
                <span className="font-bold">Ready!</span>
              </div>
              <p className="text-slate-500 text-sm">Waiting for others...</p>
            </div>
          )}

          <div className="mt-8 text-sm text-slate-600">
            <span className="font-bold text-slate-400">{gameState.players.filter(p => p.ready).length}</span> / {gameState.players.length} ready
          </div>
        </div>
      </div>
    );
  }

  // --- NIGHT PHASE (GENERIC WAIT SCREEN) ---
  const isMyTurn = (
    (gameState.phase === PHASES.NIGHT_CUPID && myPlayer.role === ROLES.CUPID.id) ||
    (gameState.phase === PHASES.NIGHT_WEREWOLF && myPlayer.role === ROLES.WEREWOLF.id) ||
    (gameState.phase === PHASES.NIGHT_MINION && myPlayer.role === ROLES.MINION.id) ||
    (gameState.phase === PHASES.NIGHT_SORCERER && myPlayer.role === ROLES.SORCERER.id) ||
    (gameState.phase === PHASES.NIGHT_DOCTOR && myPlayer.role === ROLES.DOCTOR.id) ||
    (gameState.phase === PHASES.NIGHT_SEER && myPlayer.role === ROLES.SEER.id) ||
    (gameState.phase === PHASES.NIGHT_MASON && myPlayer.role === ROLES.MASON.id) ||
    (gameState.phase === PHASES.NIGHT_VIGILANTE && myPlayer.role === ROLES.VIGILANTE.id)
  );

  if ([PHASES.NIGHT_INTRO, PHASES.NIGHT_CUPID, PHASES.NIGHT_WEREWOLF, PHASES.NIGHT_MINION, PHASES.NIGHT_SORCERER, PHASES.NIGHT_DOCTOR, PHASES.NIGHT_SEER, PHASES.NIGHT_MASON, PHASES.NIGHT_VIGILANTE].includes(gameState.phase)) {

    // NIGHT INTRO
    if (gameState.phase === PHASES.NIGHT_INTRO) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
          {/* Animated stars background */}
          <div className="absolute inset-0 opacity-30">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>

          <div className="relative z-10">
            <Moon className="w-32 h-32 mb-8 text-indigo-300 animate-pulse drop-shadow-[0_0_30px_rgba(165,180,252,0.5)]" />
            <h2 className="text-5xl font-black mb-4 bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200 bg-clip-text text-transparent">Night Falls</h2>
            <p className="text-indigo-300 mb-12 text-lg">The village sleeps... but evil awakens</p>
            {isHost && (
              <button
                onClick={startNight}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-900/50 transition-all hover:scale-105"
              >
                Begin Night
              </button>
            )}
          </div>
        </div>
      )
    }

    // WAITING SCREEN (If not my turn OR I am dead)
    if (!amAlive) {
      return <DeadScreen winner={null} />;
    }

    if (!isMyTurn) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-indigo-900/30 flex items-center justify-center mb-6 animate-pulse">
              <Moon className="w-12 h-12 text-indigo-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3 text-indigo-200">You are sleeping...</h2>
          <p className="text-indigo-400/70 text-sm">Someone is taking their turn</p>
          <div className="mt-8 flex gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      );
    }

    // ACTIVE ROLES UI

    // CUPID
    if (gameState.phase === PHASES.NIGHT_CUPID) {
      return (
        <NightActionUI
          title="Cupid" subtitle="Choose TWO lovers." color="purple"
          players={gameState.players.filter(p => p.isAlive && p.id !== user.uid)}
          onAction={(ids) => advanceNight('cupidLovers', ids)}
          myPlayer={myPlayer}
          multiSelect={true}
          maxSelect={2}
          phaseEndTime={gameState.phaseEndTime}
        />
      );
    }

    // WEREWOLF
    if (gameState.phase === PHASES.NIGHT_WEREWOLF) {
      return (
        <NightActionUI
          title="Werewolf" subtitle="Choose a victim together." color="red"
          players={gameState.players.filter(p => p.isAlive)}
          onAction={(id) => advanceNight('wolfTarget', id)}
          myPlayer={myPlayer}
          extras={(p) => p.role === ROLES.WEREWOLF.id && <span className="text-xs text-red-500 font-bold ml-2">(ALLY)</span>}
          phaseEndTime={gameState.phaseEndTime}
        />
      );
    }

    // MINION
    if (gameState.phase === PHASES.NIGHT_MINION) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-950 via-rose-950 to-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center text-center">
          <div className="max-w-md w-full">
            <div className="mb-8">
              <Ghost className="w-24 h-24 text-red-400 mx-auto mb-4 drop-shadow-lg" />
              <h2 className="text-4xl font-black text-red-400 mb-2">Your Allies</h2>
              <p className="text-slate-400">The Werewolves are...</p>
            </div>
            <div className="space-y-3 mb-8">
              {gameState.players.filter(p => p.role === ROLES.WEREWOLF.id).map(p => (
                <div key={p.id} className="bg-gradient-to-r from-red-900/30 to-rose-900/30 border-2 border-red-500 p-5 rounded-2xl font-bold text-lg shadow-lg shadow-red-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: p.avatarColor }}>
                      {p.name[0]}
                    </div>
                    {p.name}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => advanceNight(null, null)} className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 px-8 py-4 rounded-2xl font-bold shadow-lg transition-all hover:scale-105">I Understand</button>
          </div>
        </div>
      );
    }

    // SORCERER
    if (gameState.phase === PHASES.NIGHT_SORCERER) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-950 via-pink-950 to-slate-950 text-slate-100 p-4 flex flex-col">
          <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
            <div className="text-center mb-8 mt-4">
              <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4 drop-shadow-lg" />
              <h2 className="text-4xl font-black text-purple-400 mb-2">Sorcerer's Gaze</h2>
              <p className="text-slate-400">Seek the Seer...</p>
            </div>

            {seerMessage ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-2 border-purple-500 p-8 rounded-2xl mb-8 max-w-md shadow-lg shadow-purple-500/30">
                  <p className="text-2xl font-bold">{seerMessage}</p>
                </div>
                <button
                  onClick={() => { setSeerMessage(null); advanceNight(null, null); }}
                  className="w-full max-w-md bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 py-4 rounded-2xl font-bold shadow-lg transition-all hover:scale-105"
                >
                  Continue
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {gameState.players.filter(p => p.isAlive && p.id !== user.uid).map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        const isSeer = p.role === ROLES.SEER.id;
                        setSeerMessage(`${p.name} is ${isSeer ? 'THE SEER' : 'NOT the Seer'}.`);
                      }}
                      className="w-full p-4 bg-slate-900/50 rounded-2xl text-left font-bold border-2 border-slate-700 hover:border-purple-500 transition-all shadow-lg hover:shadow-xl flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: p.avatarColor }}>
                        {p.name[0]}
                      </div>
                      <span className="text-lg">{p.name}</span>
                    </button>
                  ))}
                </div>
                <div className="text-center text-purple-400 font-mono font-bold text-2xl">
                  {gameState.phaseEndTime ? Math.max(0, Math.ceil((gameState.phaseEndTime - now) / 1000)) + 's' : ''}
                </div>
                <button onClick={() => advanceNight(null, null)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl mt-2">Skip</button>
              </>
            )}
          </div>
        </div>
      );
    }

    // DOCTOR
    if (gameState.phase === PHASES.NIGHT_DOCTOR) {
      return (
        <NightActionUI
          title="Doctor" subtitle="Protect someone." color="blue"
          players={gameState.players.filter(p => p.isAlive)}
          onAction={(id) => advanceNight('doctorProtect', id)}
          myPlayer={myPlayer}
          canSkip={true}
          phaseEndTime={gameState.phaseEndTime}
        />
      );
    }
    // SEER
    if (gameState.phase === PHASES.NIGHT_SEER) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 text-slate-100 p-4 flex flex-col">
          <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
            <div className="text-center mb-8 mt-4">
              <Eye className="w-16 h-16 text-purple-400 mx-auto mb-4 drop-shadow-lg" />
              <h2 className="text-4xl font-black text-purple-400 mb-2">Seer's Vision</h2>
              <p className="text-slate-400">Reveal the truth...</p>
            </div>

            {seerMessage ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-2 border-purple-500 p-8 rounded-2xl mb-8 max-w-md shadow-lg shadow-purple-500/30">
                  <p className="text-2xl font-bold">{seerMessage}</p>
                </div>
                <button
                  onClick={() => { setSeerMessage(null); advanceNight(null, null); }}
                  className="w-full max-w-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-4 rounded-2xl font-bold shadow-lg transition-all hover:scale-105"
                >
                  Continue
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {gameState.players.filter(p => p.isAlive && p.id !== user.uid).map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        const isEvil = p.role === ROLES.WEREWOLF.id || p.role === ROLES.LYCAN.id;
                        setSeerMessage(`${p.name} is ${isEvil ? 'EVIL' : 'GOOD'}.`);
                      }}
                      className="w-full p-4 bg-slate-900/50 rounded-2xl text-left font-bold border-2 border-slate-700 hover:border-purple-500 transition-all shadow-lg hover:shadow-xl flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: p.avatarColor }}>
                        {p.name[0]}
                      </div>
                      <span className="text-lg">{p.name}</span>
                    </button>
                  ))}
                </div>
                <div className="text-center text-purple-400 font-mono font-bold text-2xl mt-2">
                  {gameState.phaseEndTime ? Math.max(0, Math.ceil((gameState.phaseEndTime - now) / 1000)) + 's' : ''}
                </div>
                <button onClick={() => advanceNight(null, null)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl mt-2">Skip</button>
              </>
            )}
          </div>
        </div>
      );
    }

    // MASON
    if (gameState.phase === PHASES.NIGHT_MASON) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-950 via-cyan-950 to-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center text-center">
          <div className="max-w-md w-full">
            <div className="mb-8">
              <Hammer className="w-24 h-24 text-blue-400 mx-auto mb-4 drop-shadow-lg" />
              <h2 className="text-4xl font-black text-blue-400 mb-2">Fellow Masons</h2>
              <p className="text-slate-400">Your trusted allies</p>
            </div>
            <div className="space-y-3 mb-8">
              {gameState.players.filter(p => p.role === ROLES.MASON.id && p.id !== user.uid).length > 0 ? (
                gameState.players.filter(p => p.role === ROLES.MASON.id && p.id !== user.uid).map(p => (
                  <div key={p.id} className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-2 border-blue-500 p-5 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: p.avatarColor }}>
                        {p.name[0]}
                      </div>
                      {p.name}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 italic bg-slate-900/50 p-6 rounded-2xl border border-slate-700">You are the only Mason.</div>
              )}
            </div>
            <button onClick={() => advanceNight(null, null)} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-8 py-4 rounded-2xl font-bold shadow-lg transition-all hover:scale-105">I Understand</button>
          </div>
        </div>
      );
    }
    // VIGILANTE
    if (gameState.phase === PHASES.NIGHT_VIGILANTE) {
      const ammo = gameState.vigilanteAmmo[user.uid] || 0;
      return (
        <NightActionUI
          title={`Vigilante (${ammo} ammo)`}
          subtitle={ammo > 0 ? "Choose your target carefully." : "You're out of ammo."}
          color="yellow"
          players={gameState.players.filter(p => p.isAlive)}
          onAction={(id) => {
            if (ammo > 0 && id) {
              updateGame({ vigilanteAmmo: { ...gameState.vigilanteAmmo, [user.uid]: 0 } });
              advanceNight('vigilanteTarget', id);
            } else {
              advanceNight('vigilanteTarget', null);
            }
          }}
          myPlayer={myPlayer}
          canSkip={true}
          phaseEndTime={gameState.phaseEndTime}
        />
      );
    }
  }

  // --- HUNTER ACTION ---
  if (gameState.phase === PHASES.HUNTER_ACTION) {
    if (myPlayer.role === ROLES.HUNTER.id && !myPlayer.isAlive && !gameState.dayLog.includes("shot")) {
      return (
        <div className="min-h-screen bg-red-950 text-white p-6 flex flex-col items-center justify-center">
          <Crosshair className="w-16 h-16 mb-4" />
          <h2 className="text-2xl font-bold mb-4">REVENGE!</h2>
          <p className="mb-6 text-center">Select someone to take with you.</p>
          <div className="w-full space-y-2">
            {gameState.players.filter(p => p.isAlive).map(p => (
              <button key={p.id} onClick={() => handleHunterShot(p.id)} className="w-full p-4 bg-red-900/50 border border-red-500 rounded-xl font-bold">
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )
    }
    return <div className="min-h-screen bg-slate-900 text-slate-400 flex items-center justify-center p-6 text-center">Waiting for Hunter...</div>;
  }

  // --- DAY PHASES ---
  if (gameState.phase === PHASES.DAY_REVEAL) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Animated sun rays */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-1 bg-gradient-to-b from-orange-400 to-transparent origin-top"
              style={{
                height: '50%',
                transform: `rotate(${i * 30}deg) translateY(-50%)`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          <div className="relative mb-8">
            <div className="absolute inset-0 blur-2xl bg-orange-300 opacity-30 rounded-full"></div>
            <Sun className="relative w-32 h-32 text-orange-500 animate-spin-slow drop-shadow-lg" />
          </div>
          <h2 className="text-5xl font-black mb-6 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent">Morning Breaks</h2>
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl mb-10 max-w-md border-2 border-orange-200">
            <p className="text-xl font-bold leading-relaxed text-slate-800">{gameState.dayLog}</p>
          </div>
          {isHost ? (
            <button
              onClick={() => updateGame({ phase: PHASES.DAY_VOTE, votes: {}, lockedVotes: [], phaseEndTime: Date.now() + (gameState.settings.votingWaitTime * 1000) })}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-orange-900/30 transition-all hover:scale-105"
            >
              Start Voting
            </button>
          ) : (
            <div className="text-slate-500 text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              Waiting for host...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState.phase === PHASES.DAY_VOTE) {
    if (!amAlive) return <DeadScreen winner={null} dayLog={gameState.dayLog} />;

    // Calculate vote counts
    const voteCounts = {};
    const alivePlayers = gameState.players.filter(p => p.isAlive);

    // Initialize counts
    alivePlayers.forEach(p => voteCounts[p.id] = 0);
    voteCounts['skip'] = 0;

    // Count votes
    // Count votes
    Object.values(gameState.votes || {}).forEach(targetId => {
      if (voteCounts[targetId] !== undefined) {
        voteCounts[targetId]++;
      }
    });

    const myVote = gameState.votes?.[user.uid];
    const isLocked = gameState.lockedVotes?.includes(user.uid);
    const lockedCount = gameState.lockedVotes?.length || 0;
    const totalPlayers = alivePlayers.length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 text-slate-900 p-4 flex flex-col">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-black text-orange-600 mb-2">Village Vote</h2>
            <p className="text-slate-600 text-sm">Discuss and vote to eliminate a suspect</p>
            <div className="mt-3 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-700">{lockedCount} / {totalPlayers} Locked</span>
            </div>
            {gameState.phaseEndTime && (
              <div className="mt-2 text-2xl font-mono font-black text-orange-500">
                {Math.max(0, Math.ceil((gameState.phaseEndTime - now) / 1000))}s
              </div>
            )}
          </div>

          {/* Player Cards */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {alivePlayers.map(p => {
              const voteCount = voteCounts[p.id] || 0;
              const votePercentage = totalPlayers > 0 ? (voteCount / totalPlayers) * 100 : 0;
              const isMyVote = myVote === p.id;
              const isPlayerLocked = gameState.lockedVotes?.includes(p.id);

              return (
                <button
                  key={p.id}
                  onClick={() => !isLocked && castVote(p.id)}
                  disabled={isLocked}
                  className={`w-full relative overflow-hidden rounded-2xl border-2 transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed
                    ${isMyVote ? 'border-orange-500 bg-white' : 'border-slate-200 bg-white hover:border-orange-300'}`}
                >
                  {/* Vote Progress Bar */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-orange-200 to-orange-100 transition-all duration-500"
                    style={{ width: `${votePercentage}%` }}
                  />

                  {/* Content */}
                  <div className="relative p-4 flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                      style={{ backgroundColor: p.avatarColor }}
                    >
                      {p.name[0]}
                    </div>

                    <div className="flex-1 text-left">
                      <div className="font-bold text-lg">{p.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        {voteCount > 0 && (
                          <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">
                            {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                          </span>
                        )}
                        {isPlayerLocked && (
                          <span className="bg-green-500 text-white px-2 py-0.5 rounded-full font-bold text-[10px]">
                            LOCKED
                          </span>
                        )}
                      </div>
                    </div>

                    {isMyVote && (
                      <Check className="w-6 h-6 text-orange-500" />
                    )}
                  </div>
                </button>
              );
            })}

            {/* Skip Vote Option */}
            <button
              onClick={() => !isLocked && castVote('skip')}
              disabled={isLocked}
              className={`w-full p-4 rounded-2xl border-2 border-dashed transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed
                ${myVote === 'skip' ? 'border-slate-500 bg-slate-100' : 'border-slate-300 bg-white hover:border-slate-400'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">Skip Elimination</span>
                <div className="flex items-center gap-2">
                  {voteCounts['skip'] > 0 && (
                    <span className="bg-slate-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      {voteCounts['skip']}
                    </span>
                  )}
                  {myVote === 'skip' && <Check className="w-5 h-5 text-slate-600" />}
                </div>
              </div>
            </button>
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-2xl shadow-lg p-4 border-2 border-slate-200">
            {!isLocked ? (
              <button
                onClick={lockVote}
                disabled={!myVote}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:from-slate-400 disabled:to-slate-300 text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {myVote ? 'Lock Vote' : 'Select a player first'}
              </button>
            ) : (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold">
                  <Check className="w-5 h-5" />
                  Vote Locked
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Waiting for {totalPlayers - lockedCount} {totalPlayers - lockedCount === 1 ? 'player' : 'players'}...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- GAME OVER ---
  if (gameState.phase === PHASES.GAME_OVER) {
    return <DeadScreen winner={gameState.winner} isGameOver={true} onReset={() => updateGame({ phase: PHASES.LOBBY, winner: null, dayLog: "", players: gameState.players.map(p => ({ ...p, isAlive: true, role: null, ready: false })) })} isHost={isHost} />;
  }

  return <div>Loading...</div>;
}

// --- SUBCOMPONENTS ---

function NightActionUI({ title, subtitle, color, players, onAction, myPlayer, extras, multiSelect, maxSelect, canSkip, phaseEndTime }) {
  const [targets, setTargets] = useState([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeLeft = phaseEndTime ? Math.max(0, Math.ceil((phaseEndTime - now) / 1000)) : null;

  const toggleTarget = (id) => {
    if (multiSelect) {
      if (targets.includes(id)) {
        setTargets(targets.filter(t => t !== id));
      } else if (targets.length < maxSelect) {
        setTargets([...targets, id]);
      }
    } else {
      setTargets([id]);
    }
  };

  const colorThemes = {
    red: {
      bg: 'from-red-950 via-rose-950 to-slate-950',
      cardBg: 'from-red-900/20 to-rose-900/20',
      border: 'border-red-500',
      text: 'text-red-400',
      button: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500',
      glow: 'shadow-red-500/30'
    },
    blue: {
      bg: 'from-blue-950 via-cyan-950 to-slate-950',
      cardBg: 'from-blue-900/20 to-cyan-900/20',
      border: 'border-blue-400',
      text: 'text-blue-400',
      button: 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500',
      glow: 'shadow-blue-500/30'
    },
    purple: {
      bg: 'from-purple-950 via-pink-950 to-slate-950',
      cardBg: 'from-purple-900/20 to-pink-900/20',
      border: 'border-purple-400',
      text: 'text-purple-400',
      button: 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500',
      glow: 'shadow-purple-500/30'
    },
    yellow: {
      bg: 'from-yellow-950 via-amber-950 to-slate-950',
      cardBg: 'from-yellow-900/20 to-amber-900/20',
      border: 'border-yellow-400',
      text: 'text-yellow-400',
      button: 'from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500',
      glow: 'shadow-yellow-500/30'
    }
  };

  const theme = colorThemes[color] || colorThemes.purple;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg} text-slate-100 p-4 flex flex-col`}>
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center mb-8 mt-4">
          <h2 className={`text-4xl font-black ${theme.text} mb-2 drop-shadow-lg`}>{title}</h2>
          <p className="text-slate-400 text-base">{subtitle}</p>
          {timeLeft !== null && (
            <div className={`text-3xl font-mono font-black ${theme.text} mt-2`}>
              {timeLeft}s
            </div>
          )}
          {multiSelect && (
            <div className="mt-3 inline-flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-700">
              <span className="text-xs font-bold text-slate-400">
                {targets.length} / {maxSelect} selected
              </span>
            </div>
          )}
        </div>

        {/* Player Cards */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {players.map(p => {
            const isSelected = targets.includes(p.id);

            return (
              <button
                key={p.id}
                onClick={() => toggleTarget(p.id)}
                className={`w-full relative overflow-hidden rounded-2xl border-2 transition-all shadow-lg hover:shadow-xl
                  ${isSelected
                    ? `bg-gradient-to-r ${theme.cardBg} ${theme.border} ${theme.glow}`
                    : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                  }`}
              >
                <div className="relative p-4 flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name[0]}
                  </div>

                  <div className="flex-1 text-left">
                    <div className="font-bold text-lg">{p.name}</div>
                    {extras && <div className="text-sm">{extras(p)}</div>}
                  </div>

                  {isSelected && (
                    <Check className={`w-6 h-6 ${theme.text}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-lg p-4 border-2 border-slate-800 space-y-3">
          <button
            disabled={targets.length === 0 || (multiSelect && targets.length < maxSelect)}
            onClick={() => onAction(multiSelect ? targets : targets[0])}
            className={`w-full bg-gradient-to-r ${theme.button} disabled:from-slate-700 disabled:to-slate-600 text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-105`}
          >
            <Check className="w-5 h-5" />
            Confirm Action
          </button>

          {canSkip && (
            <button
              onClick={() => onAction(multiSelect ? [] : null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl transition-all"
            >
              Skip Action
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DeadScreen({ winner, isGameOver, onReset, isHost }) {
  const winnerColors = {
    VILLAGERS: { bg: 'from-blue-600 to-cyan-600', text: 'text-blue-400' },
    WEREWOLVES: { bg: 'from-red-600 to-rose-600', text: 'text-red-400' },
    JESTER: { bg: 'from-purple-600 to-pink-600', text: 'text-purple-400' },
    TANNER: { bg: 'from-amber-600 to-orange-600', text: 'text-amber-400' },
    LOVERS: { bg: 'from-pink-600 to-rose-600', text: 'text-pink-400' }
  };

  const colors = isGameOver && winner ? winnerColors[winner] : { bg: 'from-slate-700 to-slate-800', text: 'text-slate-400' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Ambient background */}
      {isGameOver && (
        <div className="absolute inset-0 opacity-10">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 ${colors.text} rounded-full animate-pulse`}
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10">
        {isGameOver ? (
          <>
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center mb-8 shadow-2xl animate-pulse`}>
              <Skull className="w-16 h-16 text-white" />
            </div>
            <h2 className={`text-6xl font-black mb-4 bg-gradient-to-r ${colors.bg} bg-clip-text text-transparent`}>
              {winner} WIN!
            </h2>
            <p className="text-slate-400 mb-12 text-xl">Game Over</p>
          </>
        ) : (
          <>
            <Skull className="w-24 h-24 text-slate-600 mb-6 opacity-50" />
            <h2 className="text-4xl font-black mb-3 text-slate-300">YOU ARE DEAD</h2>
            <p className="text-slate-500 mb-8">You can watch, but don't speak.</p>
          </>
        )}

        {isHost && isGameOver && (
          <button
            onClick={onReset}
            className={`bg-gradient-to-r ${colors.bg} hover:opacity-80 text-white px-10 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-lg transition-all hover:scale-105`}
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}
