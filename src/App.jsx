import { useState, useEffect, useCallback, useMemo } from 'react';
import { PHASES } from './constants';
import { ACTION_TYPES } from './constants/actions';
import { useGameEngine } from './hooks/useGameEngine';
import { PhaseRouter } from './router/PhaseRouter';
import { createRoom as createRoomRT, joinRoom as joinRoomRT } from './services/rooms';
import { useGameState } from './hooks/useGameState';
import { useAuth } from './hooks/useAuth'; // Import useAuth
import { usePresenceNotifications } from './hooks/usePresenceNotifications';
import { coreGameActions } from './services/coreGameActions';
import AuthScreen from './pages/AuthScreen';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './context/ToastContext'; // Import useToast

export default function App() {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(null); // Role ID to show info for
  const [isChatOpen, setIsChatOpen] = useState(false); // State for chat open/close

  const { user } = useAuth();
  const toast = useToast(); // Initialize useToast

  const leaveRoom = useCallback(
    (kickedByHost = false) => {
      setJoined(false);
      setRoomCode('');
      if (kickedByHost) {
        toast.error('You have been kicked from the room by the host.');
      }
    },
    [toast]
  );

  const { gameState, isHost } = useGameState(user, roomCode, joined);

  // Enable presence notifications
  usePresenceNotifications(gameState, user?.uid);


  const players = useMemo(() => (gameState ? gameState.players : []), [gameState]);

  const [errorMsg, setErrorMsg] = useState('');
  const [seerMessage, setSeerMessage] = useState(null);
  const [sorcererTarget, setSorcererTarget] = useState(null);

  const [now, setNow] = useState(() => Date.now());

  const {
    startGame,
    markReady,
    startNightPhase,
    advanceNightPhase,
    handleHunterShotAction,
    castVote,
    lockVote,
    resolveVoting,
  } = useMemo(
    () => coreGameActions(gameState, players, user, isHost, now),
    [gameState, players, user, isHost, now]
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Host-only effect to advance phase on timer expiry
  useEffect(() => {
    if (!isHost || !gameState?.phase) return;

    const isWerewolfVote = gameState.phase === PHASES.NIGHT_WEREWOLF;
    const isNightPhase = gameState.phase.startsWith('NIGHT_');
    const isDayVote = gameState.phase === PHASES.DAY_VOTING;

    if (gameState.phaseEndTime && now > gameState.phaseEndTime) {
      if (isWerewolfVote) {
        advanceNightPhase(ACTION_TYPES.NO_ACTION, null);
      } else if (isNightPhase) {
        // Timeout for any night action
        advanceNightPhase(ACTION_TYPES.NO_ACTION, null);
      } else if (isDayVote) {
        // Timeout for day voting
        resolveVoting();
      }
    }
  }, [now, gameState?.phase, isHost, advanceNightPhase, gameState?.phaseEndTime, resolveVoting]);

  // Ambient particles generated on mount (avoid impure Math.random() during render)
  const [roleRevealParticles, setRoleRevealParticles] = useState(null);
  const [nightIntroStars, setNightIntroStars] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setRoleRevealParticles(
        Array.from({ length: 15 }).map(() => ({
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          delay: `${Math.random() * 3}s`,
          dur: `${3 + Math.random() * 2}s`,
        }))
      );
      setNightIntroStars(
        Array.from({ length: 20 }).map(() => ({
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          delay: `${Math.random() * 2}s`,
          dur: `${2 + Math.random() * 2}s`,
        }))
      );
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // --- ACTIONS ---

  const createRoom = async () => {
    if (!user) return setErrorMsg('Waiting for connection...');
    if (!playerName) return setErrorMsg('Enter your name first!');

    try {
      const color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
      const code = await createRoomRT({ id: user.uid, name: playerName, avatarColor: color });
      setRoomCode(code);
      setJoined(true);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to create room. ' + (e.message || e));
    }
  };

  const joinRoom = async () => {
    if (!user) return setErrorMsg('Waiting for connection...');
    if (!playerName) return setErrorMsg('Enter your name first!');
    if (!roomCode) return setErrorMsg('Enter a room code!');

    const code = roomCode.toUpperCase();
    try {
      await joinRoomRT(code, {
        id: user.uid,
        name: playerName,
        avatarColor: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
      });
      setRoomCode(code);
      setJoined(true);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to join. ' + (e.message || e));
    }
  };

  const { myPlayer, amAlive, isMyTurn } = useGameEngine(gameState, players, user);

  const transitionVariants = useMemo(() => {
    const variants = [
      // Slide from bottom
      {
        initial: { opacity: 0, y: 50 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -50 },
      },
      // Slide from top
      {
        initial: { opacity: 0, y: -50 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 50 },
      },
      // Slide from left
      {
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 50 },
      },
      // Slide from right
      {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 },
      },
      // Simple fade (no slide)
      { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    ];

    const phaseNames = Object.keys(PHASES);
    const phaseIndex = phaseNames.indexOf(gameState?.phase);
    const variantIndex = phaseIndex !== -1 ? phaseIndex % variants.length : 0;
    return variants[variantIndex];
  }, [gameState?.phase]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AnimatePresence mode="sync">
        <motion.div
          key={gameState?.phase || 'auth'}
          {...transitionVariants} // Apply the selected variants
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`w-full h-full ${isChatOpen ? 'mr-[25rem]' : ''}`} // Conditionally apply margin
        >
          {!user || !joined ? (
            <AuthScreen
              playerName={playerName}
              setPlayerName={setPlayerName}
              roomCode={roomCode}
              setRoomCode={setRoomCode}
              joinRoom={joinRoom}
              createRoom={createRoom}
              user={user}
              errorMsg={errorMsg}
            />
          ) : !gameState ? (
            <div>Loading game state...</div>
          ) : (
            <PhaseRouter
              gameState={gameState}
              players={players}
              user={user}
              isHost={isHost}
              myPlayer={myPlayer}
              amAlive={amAlive}
              isMyTurn={isMyTurn}
              actions={{
                startGame,
                markReady,
                startNightPhase,
                advanceNightPhase,
                handleHunterShotAction,
                castVote,
                lockVote,
                resolveVoting,
              }}
              leaveRoom={leaveRoom}
              nightIntroStars={nightIntroStars}
              roleRevealParticles={roleRevealParticles}
              showRoleInfo={showRoleInfo}
              setShowRoleInfo={setShowRoleInfo}
              seerMessage={seerMessage}
              setSeerMessage={setSeerMessage}
              sorcererTarget={sorcererTarget}
              setSorcererTarget={setSorcererTarget}
              now={now}
              isChatOpen={isChatOpen} // Pass isChatOpen
              setIsChatOpen={setIsChatOpen} // Pass setIsChatOpen
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
