import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Shield, Eye, Skull, Users, Play, RotateCcw, Check, Fingerprint, Crosshair, Smile, Zap, Radio, Smartphone, Copy } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, set, update, onValue, runTransaction, get } from 'firebase/database';

// --- CONFIGURATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'nightfall-game';

/* NIGHTFALL: Multiplayer Edition
   Uses Firestore to sync game state across devices.
*/

const ROLES = {
  VILLAGER: { id: 'villager', name: 'Villager', icon: Users, desc: 'Find the wolves. Don\'t die.', alignment: 'good' },
  WEREWOLF: { id: 'werewolf', name: 'Werewolf', icon: Skull, desc: 'Eliminate the villagers at night.', alignment: 'evil' },
  DOCTOR: { id: 'doctor', name: 'Doctor', icon: Shield, desc: 'Protect one person each night.', alignment: 'good' },
  SEER: { id: 'seer', name: 'Seer', icon: Eye, desc: 'Reveal one player\'s true nature.', alignment: 'good' },
  HUNTER: { id: 'hunter', name: 'Hunter', icon: Crosshair, desc: 'If you die, take someone with you.', alignment: 'good' },
  JESTER: { id: 'jester', name: 'Jester', icon: Smile, desc: 'Get voted out during the day to win.', alignment: 'neutral' },
  VIGILANTE: { id: 'vigilante', name: 'Vigilante', icon: Zap, desc: 'You have one bullet to use at night.', alignment: 'good' }
};

const PHASES = {
  LOBBY: 'LOBBY',
  ROLE_REVEAL: 'ROLE_REVEAL',
  NIGHT_INTRO: 'NIGHT_INTRO',
  NIGHT_WEREWOLF: 'NIGHT_WEREWOLF',
  NIGHT_DOCTOR: 'NIGHT_DOCTOR',
  NIGHT_SEER: 'NIGHT_SEER',
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
  
  // Synced Game State
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Local UI State
  const [errorMsg, setErrorMsg] = useState("");
  const [seerMessage, setSeerMessage] = useState(null);
  const [selectedVote, setSelectedVote] = useState(null);

  // Normalized players array (Realtime DB may store players as an object map)
  const players = gameState && gameState.players
    ? (Array.isArray(gameState.players) ? gameState.players : Object.keys(gameState.players).map(k => ({ id: k, ...gameState.players[k] })))
    : [];

  // --- AUTH & INIT ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth failed:", err);
        // Fallback attempt
        await signInAnonymously(auth).catch(e => console.error("Anon auth failed", e));
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
  }, []);

  // --- FIRESTORE SYNC ---
  useEffect(() => {
    if (!user || !roomCode || !joined) return;

    // Use specific path for permissions: /artifacts/{appId}/public/data/rooms/{roomCode}
    const roomRef = ref(db, `artifacts/${appId}/public/data/rooms/room_${roomCode}`);
    const unsubscribe = onValue(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
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
    const roomRef = ref(db, `artifacts/${appId}/public/data/rooms/room_${code}`);
    
    const initialState = {
      code,
      hostId: user.uid,
      phase: PHASES.LOBBY,
      players: [{
        id: user.uid,
        name: playerName,
        role: null,
        isAlive: true,
        ready: false, // for role reveal
        avatarColor: `hsl(${Math.random() * 360}, 70%, 60%)`
      }],
      nightActions: { wolfTarget: null, doctorProtect: null, vigilanteTarget: null },
      vigilanteAmmo: {}, // Map of userId -> ammo count
      dayLog: "Waiting for game to start...",
      settings: {
        wolfCount: 1,
        activeRoles: { [ROLES.DOCTOR.id]: true, [ROLES.SEER.id]: true, [ROLES.HUNTER.id]: false, [ROLES.JESTER.id]: false, [ROLES.VIGILANTE.id]: false }
      },
      winner: null,
      updatedAt: Date.now()
    };

    try {
      await set(roomRef, initialState);
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
    const roomRef = ref(db, `artifacts/${appId}/public/data/rooms/room_${code}`);

    try {
      const snap = await get(roomRef);

      if (!snap.exists()) return setErrorMsg("Room not found!");
      const data = snap.val();

      if (data.phase !== PHASES.LOBBY && !data.players.some(p => p.id === user.uid)) {
        return setErrorMsg("Game already in progress!");
      }

      // Add player if not exists (use transaction to avoid races)
      if (!data.players.some(p => p.id === user.uid)) {
        const newPlayer = {
          id: user.uid,
          name: playerName,
          role: null,
          isAlive: true,
          ready: false,
          avatarColor: `hsl(${Math.random() * 360}, 70%, 60%)`
        };

        await runTransaction(roomRef, (current) => {
          if (current === null) return current; // room disappeared
          if (!current.players) current.players = [];
          if (current.players.some(p => p.id === newPlayer.id)) return current;
          current.players = [...current.players, newPlayer];
          return current;
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
    const roomRef = ref(db, `artifacts/${appId}/public/data/rooms/room_${roomCode}`);
    await update(roomRef, { ...updates, updatedAt: Date.now() });
  };

  // --- GAME LOGIC (Host Only typically triggers these, but we keep it shared for simplicity) ---

  const startGame = async () => {
    if (!isHost) return;
    const settings = gameState.settings;
    
    // Assign Roles
    let deck = [];
    for (let i = 0; i < settings.wolfCount; i++) deck.push(ROLES.WEREWOLF.id);
    if (settings.activeRoles[ROLES.DOCTOR.id]) deck.push(ROLES.DOCTOR.id);
    if (settings.activeRoles[ROLES.SEER.id]) deck.push(ROLES.SEER.id);
    if (settings.activeRoles[ROLES.HUNTER.id]) deck.push(ROLES.HUNTER.id);
    if (settings.activeRoles[ROLES.JESTER.id]) deck.push(ROLES.JESTER.id);
    if (settings.activeRoles[ROLES.VIGILANTE.id]) deck.push(ROLES.VIGILANTE.id);
    
    while (deck.length < players.length) deck.push(ROLES.VILLAGER.id);
    deck = deck.sort(() => Math.random() - 0.5);

    const newPlayers = players.map((p, i) => ({
      ...p,
      role: deck[i],
      isAlive: true,
      ready: false
    }));

    // Init Vigilante Ammo
    const vigAmmo = {};
    newPlayers.forEach(p => {
      if (p.role === ROLES.VIGILANTE.id) vigAmmo[p.id] = 1;
    });

    await updateGame({
      players: newPlayers,
      vigilanteAmmo: vigAmmo,
      phase: PHASES.ROLE_REVEAL,
      dayLog: "Night is approaching..."
    });
  };

  const markReady = async () => {
    const newPlayers = players.map(p => 
      p.id === user.uid ? { ...p, ready: true } : p
    );
    
    // If everyone is ready, move to Night
    const allReady = newPlayers.every(p => p.ready || !p.isAlive); // Check isAlive just in case
    
    await updateGame({
      players: newPlayers,
      phase: allReady ? PHASES.NIGHT_INTRO : gameState.phase
    });
  };

  const startNight = async () => {
    await updateGame({
      phase: PHASES.NIGHT_WEREWOLF,
      nightActions: { wolfTarget: null, doctorProtect: null, vigilanteTarget: null }
    });
  };

  // --- HELPER: NEXT PHASE CALCULATOR ---
  const advanceNight = async (actionType, actionValue) => {
    // Optimistic Update locally? No, trust DB.
    // Construct new Actions object
    const newActions = { ...gameState.nightActions };
    if (actionType) newActions[actionType] = actionValue;
    
    // Calculate Next Phase
    const sequence = [
      PHASES.NIGHT_WEREWOLF,
      PHASES.NIGHT_DOCTOR,
      PHASES.NIGHT_SEER,
      PHASES.NIGHT_VIGILANTE
    ];

    let currentIdx = sequence.indexOf(gameState.phase);
    let nextPhase = 'RESOLVE';

    // Find next valid phase
    for (let i = currentIdx + 1; i < sequence.length; i++) {
      const p = sequence[i];
      const hasRole = (rid) => players.some(pl => pl.role === rid && pl.isAlive);
      
      if (p === PHASES.NIGHT_DOCTOR && hasRole(ROLES.DOCTOR.id)) { nextPhase = p; break; }
      if (p === PHASES.NIGHT_SEER && hasRole(ROLES.SEER.id)) { nextPhase = p; break; }
      if (p === PHASES.NIGHT_VIGILANTE && hasRole(ROLES.VIGILANTE.id)) { nextPhase = p; break; }
    }

    if (nextPhase === 'RESOLVE') {
      resolveNight(newActions);
    } else {
      await updateGame({
        nightActions: newActions,
        phase: nextPhase
      });
    }
  };

  const resolveNight = async (finalActions) => {
    let newPlayers = [...players];
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
       // Vigilante ammo logic should be handled when shooting, but assuming ammo was checked
       if (victim && victim.id !== finalActions.doctorProtect && victim.isAlive) {
         victim.isAlive = false;
         deaths.push(victim);
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
      if (checkWin(newPlayers)) return; // checkWin handles the state update
    }

    await updateGame({
      players: newPlayers,
      dayLog: log,
      phase: nextPhase,
      nightActions: finalActions
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

    let newPlayers = [...players];
    const victim = newPlayers.find(p => p.id === targetId);
    victim.isAlive = false;

    // Jester Win
    if (victim.role === ROLES.JESTER.id) {
       await updateGame({
         players: newPlayers,
         winner: 'JESTER',
         phase: PHASES.GAME_OVER
       });
       return;
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
    let newPlayers = [...players];
    const victim = newPlayers.find(p => p.id === targetId);
    victim.isAlive = false;

    let log = gameState.dayLog + ` The Hunter shot ${victim.name}!`;
    
    if (checkWin(newPlayers)) return;

    // Return to loop
    // Heuristic: If we are in HUNTER_ACTION, we decide next based on prior context.
    // If coming from Day Vote, go to Night. If coming from Night, go to Day Reveal.
    // Simplifying: Always go to Day Reveal if possible to see results, or Night if day is done.
    // Actually, if Hunter dies at night -> Day Reveal is next standard phase.
    // If Hunter dies at Day -> Night is next.
    
    // We'll default to Night Intro unless we were just starting the day... 
    // Let's just go to Day Reveal (morning) to show the carnage if it was night, or Night Intro if it was a vote.
    // We can check if dayLog contains "died."
    
    const wasNightDeath = gameState.dayLog.includes("died");
    
    await updateGame({
      players: newPlayers,
      dayLog: log,
      phase: wasNightDeath ? PHASES.DAY_REVEAL : PHASES.NIGHT_INTRO
    });
  };

  const checkWin = (currentPlayers) => {
    const wolves = currentPlayers.filter(p => p.isAlive && p.role === ROLES.WEREWOLF.id).length;
    const good = currentPlayers.filter(p => p.isAlive && p.role !== ROLES.WEREWOLF.id && p.role !== ROLES.JESTER.id).length;

    if (wolves === 0) {
      updateGame({ players: currentPlayers, winner: 'VILLAGERS', phase: PHASES.GAME_OVER });
      return true;
    }
    if (wolves >= good) {
      updateGame({ players: currentPlayers, winner: 'WEREWOLVES', phase: PHASES.GAME_OVER });
      return true;
    }
    return false;
  };

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
           </div>
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
               <button onClick={() => { navigator.clipboard.writeText(gameState.code); alert('Copied!'); }}><Copy className="w-4 h-4 text-slate-600 hover:text-white"/></button>
             </div>
           </div>
           {isHost && <div className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded text-xs font-bold">HOST</div>}
        </header>

        <div className="flex-1 overflow-y-auto mb-6">
           <h3 className="text-slate-500 font-bold mb-3 flex justify-between">
             <span>Players</span>
               <span>{players.length}</span>
           </h3>
           <div className="grid grid-cols-2 gap-3">
             {players.map(p => (
               <div key={p.id} className="bg-slate-800 p-3 rounded-xl flex items-center gap-3 border border-slate-700">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-900 text-xs" style={{backgroundColor: p.avatarColor}}>
                    {p.name[0]}
                  </div>
                  <span className="truncate">{p.name}</span>
                  {p.id === user.uid && <span className="text-xs text-slate-500">(You)</span>}
               </div>
             ))}
           </div>
        </div>
        
        {isHost ? (
          <div className="space-y-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
             <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-red-400">Wolf Count</span>
                <div className="flex items-center gap-3 bg-slate-900 rounded p-1">
                   <button onClick={() => updateGame({ settings: {...gameState.settings, wolfCount: Math.max(1, gameState.settings.wolfCount - 1)}})} className="w-8 h-8 hover:bg-slate-700 rounded">-</button>
                   <span className="font-mono">{gameState.settings.wolfCount}</span>
                   <button onClick={() => updateGame({ settings: {...gameState.settings, wolfCount: gameState.settings.wolfCount + 1}})} className="w-8 h-8 hover:bg-slate-700 rounded">+</button>
                </div>
             </div>
             <div className="flex flex-wrap gap-2">
               {[ROLES.DOCTOR, ROLES.SEER, ROLES.HUNTER, ROLES.JESTER, ROLES.VIGILANTE].map(r => (
                 <button 
                   key={r.id}
                   onClick={() => updateGame({ settings: {...gameState.settings, activeRoles: {...gameState.settings.activeRoles, [r.id]: !gameState.settings.activeRoles[r.id]}}})}
                   className={`px-3 py-2 rounded text-xs font-bold border transition-all ${gameState.settings.activeRoles[r.id] ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                 >
                   {r.name}
                 </button>
               ))}
             </div>
             <button onClick={startGame} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-900/20">Start Game</button>
          </div>
        ) : (
          <div className="text-center text-slate-500 animate-pulse">Waiting for host to start...</div>
        )}
      </div>
    );
  }

  // --- ROLE REVEAL ---
  if (gameState.phase === PHASES.ROLE_REVEAL) {
    if (!myPlayer) return <div>Loading...</div>; // Should not happen
    const MyRole = ROLES[myPlayer.role.toUpperCase()];

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-slate-500 mb-8">Your Role Is...</h2>
        
        <div className="bg-slate-800 border-2 border-slate-700 p-8 rounded-2xl w-full max-w-xs mb-8 flex flex-col items-center gap-4 shadow-2xl">
           <MyRole.icon className={`w-24 h-24 ${MyRole.alignment === 'good' ? 'text-blue-400' : (MyRole.alignment === 'neutral' ? 'text-purple-400' : 'text-red-500')}`} />
           <div className="text-3xl font-black">{MyRole.name}</div>
           <p className="text-slate-400 text-sm">{MyRole.desc}</p>
        </div>

        {!myPlayer.ready ? (
          <button onClick={markReady} className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl">
             I Understand
          </button>
        ) : (
           <div className="text-slate-500 flex items-center gap-2">
             <Check className="w-5 h-5" /> Waiting for others...
           </div>
        )}
        
          <div className="mt-8 text-xs text-slate-600">
            {players.filter(p => p.ready).length} / {players.length} ready
        </div>
      </div>
    );
  }

  // --- NIGHT PHASE (GENERIC WAIT SCREEN) ---
  const isMyTurn = (
    (gameState.phase === PHASES.NIGHT_WEREWOLF && myPlayer.role === ROLES.WEREWOLF.id) ||
    (gameState.phase === PHASES.NIGHT_DOCTOR && myPlayer.role === ROLES.DOCTOR.id) ||
    (gameState.phase === PHASES.NIGHT_SEER && myPlayer.role === ROLES.SEER.id) ||
    (gameState.phase === PHASES.NIGHT_VIGILANTE && myPlayer.role === ROLES.VIGILANTE.id)
  );

  if ([PHASES.NIGHT_INTRO, PHASES.NIGHT_WEREWOLF, PHASES.NIGHT_DOCTOR, PHASES.NIGHT_SEER, PHASES.NIGHT_VIGILANTE].includes(gameState.phase)) {
    // HOST SCREEN (If host is dead or just managing)
    // Actually, Host plays too. If Host is dead, they just watch.
    
    // NIGHT INTRO
    if (gameState.phase === PHASES.NIGHT_INTRO) {
       return (
         <div className="min-h-screen bg-slate-950 text-indigo-200 flex flex-col items-center justify-center p-6 text-center">
            <Moon className="w-24 h-24 mb-6 animate-pulse" />
            <h2 className="text-3xl font-black mb-2">Night Falls</h2>
            <p className="text-slate-500 mb-8">Close your eyes if you are not active.</p>
            {isHost && (
              <button onClick={startNight} className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold">Begin Night</button>
            )}
         </div>
       )
    }

    // WAITING SCREEN (If not my turn OR I am dead)
    if (!amAlive) {
       return <DeadScreen winner={null} />;
    }
    
    if (!isMyTurn) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center p-6 text-center">
           <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 animate-bounce">
             <Moon className="w-8 h-8 text-indigo-500" />
           </div>
           <h2 className="text-xl font-bold mb-2">You are sleeping...</h2>
           <p className="text-sm">Someone is taking their turn.</p>
        </div>
      );
    }

    // ACTIVE ROLES UI
    // WEREWOLF
    if (gameState.phase === PHASES.NIGHT_WEREWOLF) {
      return (
        <NightActionUI 
          title="Werewolf" subtitle="Choose a victim together." color="red"
          players={gameState.players.filter(p => p.isAlive)}
          onAction={(id) => advanceNight('wolfTarget', id)}
          myPlayer={myPlayer}
          extras={(p) => p.role === ROLES.WEREWOLF.id && <span className="text-xs text-red-500 font-bold ml-2">(ALLY)</span>}
        />
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
        />
      );
    }
    // SEER
    if (gameState.phase === PHASES.NIGHT_SEER) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col">
           <h2 className="text-center text-purple-400 font-bold uppercase tracking-widest text-sm mb-6">Seer Eye</h2>
           {seerMessage ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="text-2xl font-bold mb-8 p-6 bg-slate-800 rounded-xl border border-purple-500">{seerMessage}</div>
                <button onClick={() => { setSeerMessage(null); advanceNight(null, null); }} className="w-full bg-purple-600 py-4 rounded-xl font-bold">Done</button>
             </div>
           ) : (
             <div className="space-y-3">
               {gameState.players.filter(p => p.isAlive).map(p => (
                 <button key={p.id} onClick={() => {
                    const isEvil = p.role === ROLES.WEREWOLF.id;
                    setSeerMessage(`${p.name} is ${isEvil ? 'EVIL' : 'GOOD'}.`);
                 }} className="w-full p-4 bg-slate-800 rounded-xl text-left font-bold border border-slate-700 hover:border-purple-500">
                    {p.name}
                 </button>
               ))}
             </div>
           )}
        </div>
      );
    }
    // VIGILANTE
    if (gameState.phase === PHASES.NIGHT_VIGILANTE) {
       const ammo = gameState.vigilanteAmmo[user.uid] || 0;
       return (
         <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col">
            <h2 className="text-center text-yellow-400 font-bold uppercase tracking-widest text-sm mb-6">Vigilante ({ammo} ammo)</h2>
            <div className="flex-1 space-y-3">
               {gameState.players.filter(p => p.isAlive).map(p => (
                 <button key={p.id} onClick={() => {
                   if (ammo > 0) {
                      updateGame({ vigilanteAmmo: { ...gameState.vigilanteAmmo, [user.uid]: 0 } });
                      advanceNight('vigilanteTarget', p.id);
                   }
                 }} disabled={ammo <= 0} className="w-full p-4 bg-slate-800 rounded-xl text-left font-bold border border-slate-700 hover:border-yellow-500 disabled:opacity-50">
                    {p.name}
                 </button>
               ))}
            </div>
            <button onClick={() => advanceNight('vigilanteTarget', null)} className="mt-4 bg-slate-700 py-4 rounded-xl font-bold w-full">Hold Fire</button>
         </div>
       );
    }
  }

  // --- HUNTER ACTION ---
  if (gameState.phase === PHASES.HUNTER_ACTION) {
     if (myPlayer.role === ROLES.HUNTER.id && !myPlayer.isAlive && !gameState.dayLog.includes("shot")) {
        // Checking "includes shot" is a hacky way to ensure we don't show this after the shot
        // A better way is checking if the hunter has already acted in a separate state field, but this works for simple logic
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
       <div className="min-h-screen bg-amber-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center">
          <Sun className="w-24 h-24 text-orange-500 mb-6 animate-spin-slow" />
          <h2 className="text-3xl font-black mb-4">Morning</h2>
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8 max-w-sm">
             <p className="text-lg font-medium leading-relaxed">{gameState.dayLog}</p>
          </div>
          {isHost ? (
            <button onClick={() => updateGame({ phase: PHASES.DAY_VOTE })} className="bg-orange-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg">Start Voting</button>
          ) : (
            <div className="text-slate-500 text-sm animate-pulse">Waiting for host...</div>
          )}
       </div>
     );
  }

  if (gameState.phase === PHASES.DAY_VOTE) {
    if (!amAlive) return <DeadScreen winner={null} dayLog={gameState.dayLog} />;

    return (
      <div className="min-h-screen bg-amber-50 text-slate-900 p-6 flex flex-col">
         <h2 className="text-center text-orange-600 font-bold uppercase tracking-widest text-sm mb-6">Vote to Eliminate</h2>
         
         <div className="flex-1 space-y-3 overflow-y-auto mb-4">
            {gameState.players.filter(p => p.isAlive).map(p => (
              <button 
                key={p.id}
                onClick={() => setSelectedVote(p.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 text-left font-bold
                   ${selectedVote === p.id ? 'bg-orange-100 border-orange-500' : 'bg-white border-slate-200'}
                `}
              >
                 <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white" style={{backgroundColor: p.avatarColor}}>{p.name[0]}</div>
                 {p.name}
                 {selectedVote === p.id && <Fingerprint className="ml-auto text-orange-500 w-5 h-5"/>}
              </button>
            ))}
            <button onClick={() => setSelectedVote('skip')} className={`w-full p-4 rounded-xl border-2 border-dashed font-bold text-slate-500 ${selectedVote === 'skip' ? 'bg-slate-200 border-slate-400' : ''}`}>
               Skip Vote
            </button>
         </div>
         
         {/* Only HOST confirms the final decision in this simple version to avoid complex vote tallying logic issues */}
         {isHost ? (
            <button disabled={!selectedVote} onClick={() => handleVote(selectedVote === 'skip' ? null : selectedVote)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold disabled:opacity-50">
               Confirm Execution (Host)
            </button>
         ) : (
            <div className="text-center text-sm text-slate-500 p-4 bg-orange-100 rounded-lg">
               Discuss! The Host will input the final village decision.
            </div>
         )}
      </div>
    );
  }

  // --- GAME OVER ---
  if (gameState.phase === PHASES.GAME_OVER) {
     return <DeadScreen winner={gameState.winner} isGameOver={true} onReset={() => updateGame({ phase: PHASES.LOBBY, winner: null, dayLog: "", players: gameState.players.map(p => ({...p, isAlive: true, role: null, ready: false})) })} isHost={isHost} />;
  }

  return <div>Loading...</div>;
}

// --- SUBCOMPONENTS ---

function NightActionUI({ title, subtitle, color, players, onAction, myPlayer, extras }) {
  const [target, setTarget] = useState(null);
  const colorClasses = {
    red: 'text-red-500 border-red-500 bg-red-600',
    blue: 'text-blue-400 border-blue-400 bg-blue-600',
    purple: 'text-purple-400 border-purple-400 bg-purple-600',
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col">
       <div className="text-center mb-6">
         <h2 className={`font-bold uppercase tracking-widest text-sm mb-2 ${colorClasses[color].split(' ')[0]}`}>{title}</h2>
         <p className="text-slate-400 text-sm">{subtitle}</p>
       </div>
       
       <div className="flex-1 space-y-3 overflow-y-auto">
          {players.map(p => (
            <button 
              key={p.id}
              onClick={() => setTarget(p.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 text-left font-bold
                ${target === p.id ? `bg-slate-800 ${colorClasses[color].split(' ')[1]}` : 'bg-slate-800/50 border-slate-700'}
              `}
            >
               <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-slate-900" style={{backgroundColor: p.avatarColor}}>{p.name[0]}</div>
               {p.name}
               {extras && extras(p)}
            </button>
          ))}
       </div>

       <button 
         disabled={!target}
         onClick={() => onAction(target)}
         className={`w-full py-4 rounded-xl font-bold mt-4 text-white disabled:opacity-50 ${colorClasses[color].split(' ')[2]}`}
       >
         Confirm Action
       </button>
    </div>
  );
}

function DeadScreen({ winner, isGameOver, onReset, isHost }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <Skull className="w-20 h-20 text-slate-700 mb-6" />
      <h2 className="text-3xl font-black mb-2">{isGameOver ? (winner + " WIN!") : "YOU ARE DEAD"}</h2>
      <p className="text-slate-500 mb-8">{isGameOver ? "Game Over" : "You can watch, but don't speak."}</p>
      
      {isHost && isGameOver && (
        <button onClick={onReset} className="bg-white text-slate-900 px-8 py-3 rounded-full font-bold flex items-center gap-2">
           <RotateCcw className="w-4 h-4"/> Play Again
        </button>
      )}
    </div>
  );
}