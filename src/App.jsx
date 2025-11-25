import { useState, useEffect } from 'react';
import { Moon, Sun, Shield, Eye, Skull, Users, Play, RotateCcw, Check, Fingerprint, Crosshair, Smile, Zap, Heart, Sparkles, Ghost, Hammer, Info, Copy, Crown, Radio } from 'lucide-react';
import { ref, update, serverTimestamp } from 'firebase/database';
import { ROLES, PHASES } from './constants';
import { createRoom as createRoomRT, joinRoom as joinRoomRT } from './rooms';
import { useAuth } from './hooks/useAuth';
import { useGameState } from './hooks/useGameState';
import { useGameLogic } from './hooks/useGameLogic';
import NightActionScreen from './components/screens/NightActionScreen';
import DeadScreen from './components/screens/DeadScreen';
import LobbyScreen from './components/screens/LobbyScreen';
import RoleRevealScreen from './components/screens/RoleRevealScreen';
import NightIntroScreen from './components/screens/NightIntroScreen';
import DayRevealScreen from './components/screens/DayRevealScreen';
import DayVoteScreen from './components/screens/DayVoteScreen';
import WerewolfNightActionScreen from './components/screens/WerewolfNightActionScreen';
import { rtdb } from "./firebase";


export default function App() {
  const { user, error: authError, resetIdentity } = useAuth();
  // Local User State
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [joined, setJoined] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(null); // Role ID to show info for

  const { gameState, isHost, error: gameError } = useGameState(user, roomCode, joined);

  const players = gameState ? Object.entries(gameState.players || {}).map(([id, p]) => ({ id, ...p })) : [];

  // Local UI State
  const [errorMsg, setErrorMsg] = useState("");
  const [seerMessage, setSeerMessage] = useState(null);
  const [sorcererTarget, setSorcererTarget] = useState(null);

  const [now, setNow] = useState(() => Date.now());

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

  const {
    startGame,
    markReady,
    startNight,
    advanceNight,
    handleHunterShot,
    castVote,
    lockVote,
  } = useGameLogic(gameState, updateGame, players, user, isHost, now);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (authError) {
      setErrorMsg(authError);
    }
  }, [authError]);

  useEffect(() => {
    if (gameError) {
      setErrorMsg(gameError);
    }
  }, [gameError]);


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
      <LobbyScreen
        gameState={gameState}
        isHost={isHost}
        players={players}
        updateGame={updateGame}
        startGame={startGame}
        showRoleInfo={showRoleInfo}
        setShowRoleInfo={setShowRoleInfo}
        user={user}
      />
    );
  }

  // --- ROLE REVEAL ---
  if (gameState.phase === PHASES.ROLE_REVEAL) {
    return (
      <RoleRevealScreen
        myPlayer={myPlayer}
        markReady={markReady}
        players={players}
        roleRevealParticles={roleRevealParticles}
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
      return (
        <DeadScreen
          winner={null}
          winners={gameState?.winners || []}
          isGameOver={false}
          onReset={() => { }}
          isHost={false}
          dayLog={gameState.dayLog}
          players={players}
          lovers={gameState.lovers}
        />
      );
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
        <NightActionScreen
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
        <NightActionScreen
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
        <WerewolfNightActionScreen
          gameState={gameState}
          players={players}
          user={user}
          myPlayer={myPlayer}
          advanceNight={advanceNight}
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
        <NightActionScreen
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
        <NightActionScreen
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
    if (myPlayer.role === ROLES.HUNTER.id && !myPlayer.isAlive && !gameState.dayLog.includes("shot")) {
      return (
        <div className="min-h-screen bg-red-950 text-white p-6 flex flex-col items-center justify-center">
          <Crosshair className="w-16 h-16 mb-4" />
          <h2 className="text-2xl font-bold mb-4">REVENGE!</h2>
          <p className="mb-6 text-center">Select someone to take with you.</p>
          <div className="w-full space-y-2">
            {players.filter(p => p.isAlive).map(p => (
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
      <DayRevealScreen
        myPlayer={myPlayer}
        gameState={gameState}
        isHost={isHost}
        updateGame={updateGame}
        now={now}
      />
    );
  }

  if (gameState.phase === PHASES.DAY_VOTE) {
    return (
      <DayVoteScreen
        myPlayer={myPlayer}
        gameState={gameState}
        players={players}
        amAlive={amAlive}
        castVote={castVote}
        lockVote={lockVote}
        now={now}
        user={user}
      />
    );
  }

  // --- GAME OVER ---
  if (gameState.phase === PHASES.GAME_OVER) {
    return (
      <DeadScreen
        winner={gameState.winner}
        winners={gameState.winners}
        isGameOver={gameState.phase === PHASES.GAME_OVER}
        onReset={() => updateGame({ phase: PHASES.LOBBY, players: gameState.players, dayLog: "", nightActions: {}, votes: {}, lockedVotes: [], winners: [] })}
        isHost={isHost}
        dayLog={gameState.dayLog}
        players={players}
        lovers={gameState.lovers}
      />
    );
  }

  return <div>Loading...</div>;
}