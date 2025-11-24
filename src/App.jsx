import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Shield, Eye, Skull, Users, Play, RotateCcw, Check, Fingerprint, Crosshair, Smile, Zap, Heart, Sparkles, Ghost, Hammer, Info, Copy, Crown, Radio } from 'lucide-react';
import { signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, rtdb } from './firebase';
import { ref, update, serverTimestamp } from 'firebase/database';
import { createRoom as createRoomRT, joinRoom as joinRoomRT, subscribeToRoom } from './rooms';
import { ROLES, PHASES } from './constants';
import {
  assignRoles,
  determineFirstNightPhase,
  handleDoppelgangerTransformation,
  handleLoverDeaths
} from './utils/gameLogic';
import { checkWinCondition } from './utils/winConditions';
import { processNightActions, generateDayLog, getNextNightPhase, isTimedNightPhase, updateNightActions } from './services/nightActions';
import { countVotes, determineVotingResult } from './services/voting';
import { NightActionUI } from './components/NightActionUI';
import { DeadScreen } from './components/DeadScreen';
import { RoleInfoModal } from './components/modals/RoleInfoModal';
import { WaitingScreen } from './components/screens/WaitingScreen';
import { NightIntroScreen } from './components/screens/NightIntroScreen';
import { RoleRevealScreen } from './components/screens/RoleRevealScreen';
import { DayRevealScreen } from './components/screens/DayRevealScreen';
import { HunterActionScreen } from './components/screens/HunterActionScreen';

// --- UTILS ---

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
  const [, setLoading] = useState(true);
  const players = gameState ? Object.entries(gameState.players || {}).map(([id, p]) => ({ id, ...p })) : [];

  // Local UI State
  const [errorMsg, setErrorMsg] = useState("");
  const [seerMessage, setSeerMessage] = useState(null);
  const [sorcererTarget, setSorcererTarget] = useState(null);

  const [now, setNow] = useState(() => Date.now());

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

  // --- RTDB SYNC ---
  useEffect(() => {
    if (!user || !roomCode || !joined) return;

    const unsub = subscribeToRoom(roomCode, (data) => {
      if (data) {
        setGameState(data);
        if (data.hostId === user.uid) setIsHost(true);
        setLoading(false);
      } else {
        setErrorMsg("Room closed or does not exist.");
        setJoined(false);
        setGameState(null);
      }
    });

    return () => {
      try { unsub(); } catch { /* ignore */ }
    };
  }, [user, roomCode, joined]);

  // Ambient particles generated on mount (avoid impure Math.random() during render)
  const [roleRevealParticles, setRoleRevealParticles] = useState(null);
  const [nightIntroStars, setNightIntroStars] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setRoleRevealParticles(Array.from({ length: 15 }).map(() => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        dur: `${3 + Math.random() * 2}s`
      })));
      setNightIntroStars(Array.from({ length: 20 }).map(() => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2}s`,
        dur: `${2 + Math.random() * 2}s`
      })));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // --- ACTIONS ---

  const createRoom = async () => {
    if (!user) return setErrorMsg("Waiting for connection...");
    if (!playerName) return setErrorMsg("Enter your name first!");

    try {
      const color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
      const code = await createRoomRT({ id: user.uid, name: playerName, avatarColor: color });
      setRoomCode(code);
      setIsHost(true);
      setJoined(true);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to create room. " + (e.message || e));
    }
  };

  const joinRoom = async () => {
    if (!user) return setErrorMsg("Waiting for connection...");
    if (!playerName) return setErrorMsg("Enter your name first!");
    if (!roomCode) return setErrorMsg("Enter a room code!");

    const code = roomCode.toUpperCase();
    try {
      await joinRoomRT(code, { id: user.uid, name: playerName, avatarColor: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)` });
      setRoomCode(code);
      setJoined(true);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to join. " + (e.message || e));
    }
  };

  const updateGame = async (updates) => {
    if (!user || !roomCode) return;

    const payload = { ...updates };

    // If callers pass players as an array, convert to object map keyed by id
    if (payload.players && Array.isArray(payload.players)) {
      const playersMap = {};
      payload.players.forEach(p => {
        playersMap[p.id] = p;
      });
      payload.players = playersMap;
    }

    payload.updatedAt = serverTimestamp();

    // Remove any undefined values — Realtime DB update() rejects undefined
    Object.keys(payload).forEach(k => {
      if (payload[k] === undefined) delete payload[k];
    });

    await update(ref(rtdb, `rooms/${roomCode}`), payload);
  };



  // --- GAME LOGIC ---

  const startGame = async () => {
    if (!isHost) return;

    // Use service to assign roles
    const newPlayers = assignRoles(players, gameState.settings);

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
    const newPlayers = players.map(p =>
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
    // Use service to determine first night phase
    const firstPhase = determineFirstNightPhase(players, gameState);

    await updateGame({
      phase: firstPhase,
      phaseEndTime: now + (gameState.settings.actionWaitTime * 1000),
      nightActions: { wolfTarget: null, doctorProtect: null, vigilanteTarget: null, sorcererCheck: null, cupidLinks: [] }
    });
  };

  // --- HELPER: NEXT PHASE CALCULATOR ---
  async function advanceNight(actionType, actionValue) {
    // Use service to update night actions
    const newActions = updateNightActions(gameState.nightActions, actionType, actionValue);

    // Use service to calculate next phase
    const nextPhase = getNextNightPhase(gameState.phase, players, gameState, newActions);

    if (nextPhase === 'RESOLVE') {
      resolveNight(newActions);
    } else {
      // If we just finished Cupid, save lovers
      let updates = { nightActions: newActions, phase: nextPhase };

      // Set timer for next phase if it's a timed action phase
      if (isTimedNightPhase(nextPhase)) {
        updates.phaseEndTime = now + (gameState.settings.actionWaitTime * 1000);
      } else {
        updates.phaseEndTime = null; // Clear timer for non-timed phases
      }

      if (gameState.phase === PHASES.NIGHT_CUPID && newActions.cupidLinks?.length === 2) {
        updates.lovers = newActions.cupidLinks;
      }
      if (gameState.phase === PHASES.NIGHT_DOPPELGANGER && newActions.doppelgangerCopy) {
        updates.doppelgangerTarget = newActions.doppelgangerCopy;
      }
      await updateGame(updates);
    }
  }

  const resolveNight = async (finalActions) => {
    // Use service to process night actions
    const { newPlayers, deaths } = processNightActions(finalActions, players, gameState);

    // Check Hunter
    const hunterDied = deaths.find(p => p.role === ROLES.HUNTER.id);
    let nextPhase = PHASES.DAY_REVEAL;
    const log = generateDayLog(deaths);

    if (hunterDied) {
      const hunterLog = log + " The Hunter died and seeks revenge!";
      nextPhase = PHASES.HUNTER_ACTION;
      await updateGame({
        players: newPlayers,
        dayLog: hunterLog,
        phase: nextPhase,
        nightActions: finalActions,
        lovers: finalActions.cupidLinks && finalActions.cupidLinks.length === 2 ? finalActions.cupidLinks : gameState.lovers,
        doppelgangerTarget: finalActions.doppelgangerCopy || gameState.doppelgangerTarget
      });
    } else {
      const winResult = checkWinCondition(newPlayers, gameState.lovers, gameState.winners);
      if (winResult) {
        updateGame({ players: newPlayers, ...winResult, phase: PHASES.GAME_OVER });
        return;
      }

      await updateGame({
        players: newPlayers,
        dayLog: log,
        phase: nextPhase,
        nightActions: finalActions,
        lovers: finalActions.cupidLinks && finalActions.cupidLinks.length === 2 ? finalActions.cupidLinks : gameState.lovers,
        doppelgangerTarget: finalActions.doppelgangerCopy || gameState.doppelgangerTarget
      });
    }
  };



  const handleHunterShot = async (targetId) => {
    let newPlayers = [...players];
    const victim = newPlayers.find(p => p.id === targetId);
    victim.isAlive = false;

    // Handle Doppelganger and Lover deaths
    handleDoppelgangerTransformation(newPlayers, gameState.doppelgangerTarget, victim.id);
    handleLoverDeaths(newPlayers, gameState.lovers);
    
    // Combine deaths
    newPlayers = newPlayers.filter(p => p.isAlive);


    let log = gameState.dayLog + ` The Hunter shot ${victim.name}!`;

    const winResult = checkWinCondition(newPlayers, gameState.lovers, gameState.winners);
    if (winResult) {
      updateGame({ players: newPlayers, dayLog: log, ...winResult, phase: PHASES.GAME_OVER });
      return;
    }

    const wasNightDeath = gameState.dayLog.includes("died");

    await updateGame({
      players: newPlayers,
      dayLog: log,
      phase: wasNightDeath ? PHASES.DAY_REVEAL : PHASES.NIGHT_INTRO
    });
  };



  // --- NEW VOTING SYSTEM ---
  const castVote = async (targetId) => {
    // Can't vote if already locked
    if ((gameState.lockedVotes || []).includes(user.uid)) return;

    const votes = gameState.votes || {};
    const newVotes = { ...votes, [user.uid]: targetId };
    await updateGame({ votes: newVotes });
  };

  const lockVote = async () => {
    // Can't lock if no vote cast
    if (!gameState.votes?.[user.uid]) return;

    // Can't lock if already locked
    const lockedVotes = gameState.lockedVotes || [];
    if (lockedVotes.includes(user.uid)) return;

    const newLockedVotes = [...lockedVotes, user.uid];
    await updateGame({ lockedVotes: newLockedVotes });

    // Check if everyone has locked
    const alivePlayers = players.filter(p => p.isAlive);
    if (newLockedVotes.length === alivePlayers.length) {
      // Trigger resolution
      resolveVoting();
    }
  };

  async function resolveVoting() {
    const voteCounts = countVotes(gameState.votes, players);
    const { type, victims } = determineVotingResult(voteCounts);

    if (type === 'no_elimination') {
      await updateGame({
        dayLog: "No one was eliminated.",
        phase: PHASES.NIGHT_INTRO,
        votes: {},
        lockedVotes: []
      });
      return;
    }

    const targetId = victims[0];
    let newPlayers = [...players];
    const victim = newPlayers.find(p => p.id === targetId);
    victim.isAlive = false;

    // Jester/Tanner Win
    if (victim.role === ROLES.JESTER.id || victim.role === ROLES.TANNER.id) {
      const winnerRole = victim.role === ROLES.JESTER.id ? 'JESTER' : 'TANNER';
      const currentWinners = gameState.winners || [];

      // Add to winners but continue game
      await updateGame({
        players: newPlayers,
        winners: [...currentWinners, winnerRole],
        dayLog: `${victim.name} was voted out. They were the ${ROLES[victim.role.toUpperCase()].name}!`,
        phase: PHASES.NIGHT_INTRO, // Continue game
        votes: {},
        lockedVotes: []
      });
      return;
    }

    // Handle Doppelganger and Lover deaths
    handleDoppelgangerTransformation(newPlayers, gameState.doppelgangerTarget, victim.id);
    handleLoverDeaths(newPlayers, gameState.lovers);
    
    newPlayers = newPlayers.filter(p => p.isAlive);

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

    const winResult = checkWinCondition(newPlayers, gameState.lovers, gameState.winners);
    if (winResult) {
      updateGame({
        players: newPlayers,
        dayLog: `${victim.name} was voted out.`,
        ...winResult,
        phase: PHASES.GAME_OVER,
        votes: {},
        lockedVotes: []
      });
      return;
    }

    await updateGame({
      players: newPlayers,
      dayLog: `${victim.name} was voted out.`,
      phase: PHASES.NIGHT_INTRO,
      votes: {},
      lockedVotes: []
    });
  };

  // --- TIMER CHECK (HOST ONLY) ---
  const advanceNightRef = useRef(null);
  const resolveVotingRef = useRef(null);

  useEffect(() => {
    advanceNightRef.current = advanceNight;
    resolveVotingRef.current = resolveVoting;
  });

  useEffect(() => {
    if (!isHost || !gameState || !gameState.phaseEndTime) return;

    if (now > gameState.phaseEndTime) {
      // Time's up!
      if (gameState.phase === PHASES.DAY_VOTE) {
        resolveVotingRef.current && resolveVotingRef.current();
      } else if ([PHASES.NIGHT_WEREWOLF, PHASES.NIGHT_DOCTOR, PHASES.NIGHT_SEER, PHASES.NIGHT_SORCERER, PHASES.NIGHT_VIGILANTE, PHASES.NIGHT_CUPID, PHASES.NIGHT_DOPPELGANGER].includes(gameState.phase)) {
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

        advanceNightRef.current && advanceNightRef.current(actionKey, value);
      } else if ([PHASES.NIGHT_MINION, PHASES.NIGHT_MASON, PHASES.NIGHT_INTRO, PHASES.ROLE_REVEAL, PHASES.DAY_REVEAL].includes(gameState.phase)) {
        // Info phases - just move on? 
        // Actually, ROLE_REVEAL and DAY_REVEAL usually wait for user input or host.
        // Let's only auto-advance the Action phases for now as requested.
      }
    }
  }, [now, isHost, gameState]);

  // --- RENDER HELPERS ---
  const myPlayer = players.find(p => p.id === user?.uid);
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
            <button onClick={() => setShowRoleInfo('RULES')} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 py-3 rounded-lg font-bold flex items-center justify-center gap-2">
              <Info className="w-4 h-4" /> Rule Book
            </button>
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
          <div className="flex flex-col items-end gap-1">
            {isHost && <div className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded text-xs font-bold">HOST</div>}
            <button onClick={() => setShowRoleInfo('RULES')} className="text-slate-500 hover:text-slate-300 flex items-center gap-1 text-xs font-bold">
              <Info className="w-3 h-3" /> Rules
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto mb-6">
          <h3 className="text-slate-500 font-bold mb-3 flex justify-between">
            <span>Players</span>
            <span>{players.length}</span>
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {players.map(p => (
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

          <div className="space-y-4">
            {['good', 'evil', 'neutral'].map(alignment => (
              <div key={alignment}>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2 tracking-widest">{alignment} Roles</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.values(ROLES).filter(r => r.selectable !== false && r.id !== 'werewolf' && r.id !== 'villager' && r.alignment === alignment).map(r => {
                    const isActive = gameState.settings.activeRoles[r.id];
                    const alignmentColors = {
                      good: 'bg-blue-600 border-blue-500',
                      evil: 'bg-red-600 border-red-500',
                      neutral: 'bg-purple-600 border-purple-500'
                    };
                    const activeColor = alignmentColors[r.alignment];

                    return (
                      <button
                        key={r.id}
                        onClick={() => isHost ? updateGame({ settings: { ...gameState.settings, activeRoles: { ...gameState.settings.activeRoles, [r.id]: !isActive } } }) : setShowRoleInfo(r.id)}
                        className={`px-3 py-2 rounded text-xs font-bold border transition-all flex items-center gap-2 relative group
                               ${isActive ? `${activeColor} text-white` : 'bg-slate-900 border-slate-700 text-slate-500'}
                               ${!isHost ? 'cursor-help opacity-80' : 'hover:opacity-80'}
                          `}
                      >
                        <r.icon className="w-3 h-3" />
                        {r.name}
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${isActive ? 'bg-white/20' : 'bg-slate-800'}`}>
                          {r.weight > 0 ? '+' : ''}{r.weight}
                        </span>
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
              </div>
            ))}
          </div>

          {/* Game Balance - Visible to All Players */}
          {(() => {
            const activeSpecialRolesCount = Object.entries(gameState.settings.activeRoles)
              .filter(([id, isActive]) => isActive && id !== ROLES.MASON.id).length;
            const masonCount = gameState.settings.activeRoles[ROLES.MASON.id] ? 2 : 0;
            const totalRolesNeeded = gameState.settings.wolfCount + activeSpecialRolesCount + masonCount;
            const playersCount = players.length;

            // Calculate balance weight
            let balanceWeight = 0;

            // Add werewolf weights
            balanceWeight += gameState.settings.wolfCount * ROLES.WEREWOLF.weight;

            // Add active role weights
            Object.entries(gameState.settings.activeRoles).forEach(([roleId, isActive]) => {
              if (isActive) {
                const role = Object.values(ROLES).find(r => r.id === roleId);
                if (role) {
                  // Mason comes in pairs
                  if (roleId === ROLES.MASON.id) {
                    balanceWeight += role.weight * 2;
                  } else {
                    balanceWeight += role.weight;
                  }
                }
              }
            });

            // Add villager weights for remaining slots
            const villagersCount = Math.max(0, playersCount - totalRolesNeeded);
            balanceWeight += villagersCount * ROLES.VILLAGER.weight;

            // Balance assessment
            let balanceColor = 'text-green-400';
            let balanceText = 'Balanced';
            if (balanceWeight > 5) {
              balanceColor = 'text-blue-400';
              balanceText = 'Village Favored';
            } else if (balanceWeight < -5) {
              balanceColor = 'text-red-400';
              balanceText = 'Wolves Favored';
            } else if (balanceWeight > 0) {
              balanceColor = 'text-cyan-400';
              balanceText = 'Slight Village Advantage';
            } else if (balanceWeight < 0) {
              balanceColor = 'text-orange-400';
              balanceText = 'Slight Wolf Advantage';
            }

            // Validation Checks (for host)
            const hasEnoughPlayers = playersCount >= totalRolesNeeded && playersCount >= 3;
            const isBalanced = gameState.settings.wolfCount < playersCount / 2;
            const isValid = hasEnoughPlayers && isBalanced;

            return (
              <div className="space-y-2">
                {/* Balance Indicator */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-500 font-bold uppercase">Game Balance</span>
                    <span className={`text-xs font-bold ${balanceColor}`}>{balanceText}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${balanceWeight >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, Math.abs(balanceWeight) * 5)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-mono font-bold ${balanceColor}`}>
                      {balanceWeight > 0 ? '+' : ''}{balanceWeight}
                    </span>
                  </div>

                  {/* Role Breakdown */}
                  <div className="mt-3 pt-3 border-t border-slate-700 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Werewolves</span>
                      <span className="font-mono text-slate-300">
                        {gameState.settings.wolfCount} × {ROLES.WEREWOLF.weight} = {gameState.settings.wolfCount * ROLES.WEREWOLF.weight}
                      </span>
                    </div>

                    {Object.entries(gameState.settings.activeRoles)
                      .filter(([, isActive]) => isActive)
                      .map(([roleId]) => {
                        const role = Object.values(ROLES).find(r => r.id === roleId);
                        if (!role) return null;
                        const count = roleId === ROLES.MASON.id ? 2 : 1;
                        const totalWeight = role.weight * count;
                        return (
                          <div key={roleId} className="flex justify-between items-center">
                            <span className="text-slate-400">{role.name}{count > 1 ? 's' : ''}</span>
                            <span className="font-mono text-slate-300">
                              {count} × {role.weight > 0 ? '+' : ''}{role.weight} = {totalWeight > 0 ? '+' : ''}{totalWeight}
                            </span>
                          </div>
                        );
                      })}

                    {villagersCount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Villagers</span>
                        <span className="font-mono text-slate-300">
                          {villagersCount} × +{ROLES.VILLAGER.weight} = +{villagersCount * ROLES.VILLAGER.weight}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-700 font-bold">
                      <span className="text-slate-300">Total</span>
                      <span className={`font-mono ${balanceColor}`}>
                        {balanceWeight > 0 ? '+' : ''}{balanceWeight}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Host-Only Controls */}
                {isHost && (
                  <>
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
                  </>
                )}
              </div>
            );
          })()}
        </div>

        {!isHost && <div className="text-center text-slate-500 animate-pulse mt-4">Waiting for host to start...</div>}

        {/* Role Info / Rules Modal */}
        <RoleInfoModal 
          showRoleInfo={showRoleInfo}
          onClose={() => setShowRoleInfo(null)}
        />
      </div>
    );
  }


  // --- ROLE REVEAL ---
  if (gameState.phase === PHASES.ROLE_REVEAL) {
    if (!myPlayer) return <div>Loading...</div>;

    return (
      <RoleRevealScreen
        myPlayer={myPlayer}
        markReady={markReady}
        players={players}
        roleRevealParticles={roleRevealParticles}
        ROLES={ROLES}
      />
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
    (gameState.phase === PHASES.NIGHT_VIGILANTE && myPlayer.role === ROLES.VIGILANTE.id) ||
    (gameState.phase === PHASES.NIGHT_DOPPELGANGER && myPlayer.role === ROLES.DOPPELGANGER.id)
  );

  if ([PHASES.NIGHT_INTRO, PHASES.NIGHT_CUPID, PHASES.NIGHT_WEREWOLF, PHASES.NIGHT_MINION, PHASES.NIGHT_SORCERER, PHASES.NIGHT_DOCTOR, PHASES.NIGHT_SEER, PHASES.NIGHT_MASON, PHASES.NIGHT_VIGILANTE, PHASES.NIGHT_DOPPELGANGER].includes(gameState.phase)) {

    // NIGHT INTRO
    if (gameState.phase === PHASES.NIGHT_INTRO) {
      return <NightIntroScreen isHost={isHost} startNight={startNight} nightIntroStars={nightIntroStars} />;
    }

    // WAITING SCREEN (If not my turn OR I am dead)
    if (!amAlive) {
      return <DeadScreen winners={gameState?.winners || []} />;
    }

    if (!isMyTurn) {
      return <WaitingScreen />;
    }

    // ACTIVE ROLES UI

    // CUPID
    if (gameState.phase === PHASES.NIGHT_CUPID) {
      return (
        <NightActionUI
          title="Cupid" subtitle="Choose TWO lovers." color="purple"
          players={players.filter(p => p.isAlive && p.id !== user.uid)}
          onAction={(ids) => advanceNight('cupidLinks', ids)}
          myPlayer={myPlayer}
          multiSelect={true}
          maxSelect={2}
          phaseEndTime={gameState.phaseEndTime}
        />
      );
    }

    // DOPPELGANGER
    if (gameState.phase === PHASES.NIGHT_DOPPELGANGER) {
      return (
        <NightActionUI
          title="Doppelgänger" subtitle="Choose a player to copy if they die." color="slate"
          players={players.filter(p => p.isAlive && p.id !== user.uid)}
          onAction={(id) => advanceNight('doppelgangerCopy', id)}
          myPlayer={myPlayer}
          phaseEndTime={gameState.phaseEndTime}
        />
      );
    }

    // WEREWOLF
    if (gameState.phase === PHASES.NIGHT_WEREWOLF) {
      return (
        <NightActionUI
          title="Werewolf" subtitle="Choose a victim together." color="red"
          players={players.filter(p => p.isAlive)}
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
        <div className="min-h-screen bg-gradient-to-br from-red-950 via-rose-950 to-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center text-center relative">
          {myPlayer && (
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-red-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 z-50 shadow-lg">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: myPlayer.avatarColor }}>
                {myPlayer.name[0]}
              </div>
              <span className="text-xs font-bold text-red-200">{myPlayer.name}</span>
            </div>
          )}
          <div className="max-w-md w-full">
            <div className="mb-8">
              <Ghost className="w-24 h-24 text-red-400 mx-auto mb-4 drop-shadow-lg" />
              <h2 className="text-4xl font-black text-red-400 mb-2">Your Allies</h2>
              <p className="text-slate-400">The Werewolves are...</p>
            </div>
            <div className="space-y-3 mb-8">
              {players.filter(p => p.role === ROLES.WEREWOLF.id).map(p => (
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
        <div className="min-h-screen bg-gradient-to-br from-purple-950 via-pink-950 to-slate-950 text-slate-100 p-4 flex flex-col relative">
          {myPlayer && (
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-purple-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 z-50 shadow-lg">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: myPlayer.avatarColor }}>
                {myPlayer.name[0]}
              </div>
              <span className="text-xs font-bold text-purple-200">{myPlayer.name}</span>
            </div>
          )}
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
                  onClick={() => {
                    setSeerMessage(null);
                    advanceNight('sorcererCheck', sorcererTarget);
                    setSorcererTarget(null);
                  }}
                  className="w-full max-w-md bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 py-4 rounded-2xl font-bold shadow-lg transition-all hover:scale-105"
                >
                  Continue
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {players.filter(p => p.isAlive && p.id !== user.uid).map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        const isSeer = p.role === ROLES.SEER.id;
                        setSeerMessage(`${p.name} is ${isSeer ? 'THE SEER' : 'NOT the Seer'}.`);
                        setSorcererTarget(p.id);
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
          players={players.filter(p => p.isAlive)}
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
        <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 text-slate-100 p-4 flex flex-col relative">
          {myPlayer && (
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-purple-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 z-50 shadow-lg">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: myPlayer.avatarColor }}>
                {myPlayer.name[0]}
              </div>
              <span className="text-xs font-bold text-purple-200">{myPlayer.name}</span>
            </div>
          )}
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
                  {players.filter(p => p.isAlive && p.id !== user.uid).map(p => (
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
        <div className="min-h-screen bg-gradient-to-br from-blue-950 via-cyan-950 to-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center text-center relative">
          {myPlayer && (
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-blue-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 z-50 shadow-lg">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: myPlayer.avatarColor }}>
                {myPlayer.name[0]}
              </div>
              <span className="text-xs font-bold text-blue-200">{myPlayer.name}</span>
            </div>
          )}
          <div className="max-w-md w-full">
            <div className="mb-8">
              <Hammer className="w-24 h-24 text-blue-400 mx-auto mb-4 drop-shadow-lg" />
              <h2 className="text-4xl font-black text-blue-400 mb-2">Fellow Masons</h2>
              <p className="text-slate-400">Your trusted allies</p>
            </div>
            <div className="space-y-3 mb-8">
              {players.filter(p => p.role === ROLES.MASON.id && p.id !== user.uid).length > 0 ? (
                players.filter(p => p.role === ROLES.MASON.id && p.id !== user.uid).map(p => (
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
          players={players.filter(p => p.isAlive)}
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
    const isHunter = myPlayer.role === ROLES.HUNTER.id && !myPlayer.isAlive && !gameState.dayLog.includes("shot");
    return (
      <HunterActionScreen
        players={players}
        handleHunterShot={handleHunterShot}
        myPlayer={myPlayer}
        isHunter={isHunter}
      />
    );
  }

  // --- DAY PHASES ---
  if (gameState.phase === PHASES.DAY_REVEAL) {
    return (
      <DayRevealScreen
        gameState={gameState}
        isHost={isHost}
        updateGame={updateGame}
        myPlayer={myPlayer}
        now={now}
      />
    );
  }

  if (gameState.phase === PHASES.DAY_VOTE) {
    // if (!amAlive) return <DeadScreen winner={null} dayLog={gameState.dayLog} />; // Removed to allow viewing voting

    // Calculate vote counts
    const voteCounts = countVotes(gameState.votes, players);
    const alivePlayers = players.filter(p => p.isAlive);

    const myVote = gameState.votes?.[user.uid];
    const isLocked = gameState.lockedVotes?.includes(user.uid);
    const lockedCount = gameState.lockedVotes?.length || 0;
    const totalPlayers = alivePlayers.length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 text-slate-900 p-4 flex flex-col relative">
        {myPlayer && (
          <div className="absolute top-4 right-4 bg-white/80 backdrop-blur border border-orange-200 px-3 py-1.5 rounded-full flex items-center gap-2 z-50 shadow-lg">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: myPlayer.avatarColor }}>
              {myPlayer.name[0]}
            </div>
            <span className="text-xs font-bold text-slate-600">{myPlayer.name}</span>
          </div>
        )}
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="text-center mb-6">
            {!amAlive && (
              <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-full inline-block mb-4 text-sm font-bold shadow-lg">
                👻 You are dead (Spectating)
              </div>
            )}
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
                  onClick={() => amAlive && !isLocked && castVote(p.id)}
                  disabled={!amAlive || isLocked}
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
                      <div className="font-bold text-lg">
                        {p.name}
                        {p.id === user.uid && <span className="text-sm text-orange-600 ml-2">(You)</span>}
                      </div>
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
              onClick={() => amAlive && !isLocked && castVote('skip')}
              disabled={!amAlive || isLocked}
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
          {amAlive && (
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
          )}
        </div>
      </div>
    );
  }

  // --- GAME OVER ---
  if (gameState.phase === PHASES.GAME_OVER) {
    return (
      <DeadScreen
        winners={gameState.winners}
        isGameOver={gameState.phase === PHASES.GAME_OVER}
        onReset={() => updateGame({ phase: PHASES.LOBBY, players: [], dayLog: "", nightActions: {}, votes: {}, lockedVotes: [], winners: [] })}
        isHost={isHost}
        dayLog={gameState.dayLog}
        players={players}
        lovers={gameState.lovers}
      />
    );
  }

  return <div>Loading...</div>;
}