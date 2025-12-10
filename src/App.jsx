import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PHASES } from './constants';
import { ACTION_TYPES } from './constants/actions';
import { useGameEngine } from './hooks/useGameEngine';
import { PhaseRouter } from './router/PhaseRouter';
import { createRoom as createRoomRT, joinRoom as joinRoomRT } from './services/rooms';
import { submitDeathNote } from './services/voting';
import { useGameState } from './hooks/useGameState';
import { useAuth } from './hooks/useAuth';
import { usePresenceNotifications } from './hooks/usePresenceNotifications';
import { coreGameActions } from './services/coreGameActions';
import AuthScreen from './pages/AuthScreen';
import RoomSelectionScreen from './pages/RoomSelectionScreen';
import HomeScreen from './pages/HomeScreen'; // Import HomeScreen
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './context/ToastContext';
import GameUIWrapper from './components/GameUIWrapper';
import { useGlobalStats } from './hooks/useGlobalStats';
import { setupGlobalPresence } from './services/presence';
import { version } from '../package.json';

export default function App() {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [authMethodChosen, setAuthMethodChosen] = useState(false); // New state to track if an auth method has been chosen
  const [showHomeScreen, setShowHomeScreen] = useState(true); // New state for HomeScreen

  const { user } = useAuth();
  const toast = useToast();
  const { onlineUsers, activeRooms } = useGlobalStats();

  useEffect(() => {
    if (user) {
      setupGlobalPresence(user);
      if (user.isAnonymous && !playerName) {
        setPlayerName(`Guest-${user.uid.substring(0, 5)}`);
      } else if (user.displayName && !playerName) {
        setPlayerName(user.displayName);
      }
    }
  }, [user, playerName]);

  const leaveRoom = useCallback(
    (kickedByHost = false) => {
      setJoined(false);
      setRoomCode('');
      setShowHomeScreen(true); // Reset to show home screen on leaving room
      if (kickedByHost) {
        toast.error('You have been kicked from the room by the host.');
      }
    },
    [toast]
  );

  const { gameState, isHost } = useGameState(user, roomCode, joined);

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

  useEffect(() => {
    if (!isHost || !gameState?.phase) return;

    const isWerewolfVote = gameState.phase === PHASES.NIGHT_WEREWOLF;
    const isNightPhase = gameState.phase.startsWith('NIGHT_');
    const isDayVote = gameState.phase === PHASES.DAY_VOTING;

    if (gameState.phaseEndTime && now > gameState.phaseEndTime) {
      if (isWerewolfVote) {
        advanceNightPhase(ACTION_TYPES.NO_ACTION, null);
      } else if (isNightPhase) {
        advanceNightPhase(ACTION_TYPES.NO_ACTION, null);
      } else if (isDayVote) {
        resolveVoting();
      }
    }
  }, [now, gameState?.phase, isHost, advanceNightPhase, gameState?.phaseEndTime, resolveVoting]);

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

  const createRoom = async () => {
    if (!user) return setErrorMsg('Waiting for connection...');
    if (!playerName) return setErrorMsg('Enter your name first!');

    try {
      const color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
      const code = await createRoomRT({ id: user.uid, name: playerName, avatarColor: color });
      setRoomCode(code);
      setJoined(true);
      setShowHomeScreen(false); // Hide home screen after creating room
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
      setShowHomeScreen(false); // Hide home screen after joining room
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to join. ' + (e.message || e));
    }
  };

  const { myPlayer, amAlive, isMyTurn } = useGameEngine(gameState, players, user);

  const transitionVariants = useMemo(() => {
    const variants = [
      {
        initial: { opacity: 0, y: 50 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -50 },
      },
      {
        initial: { opacity: 0, y: -50 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 50 },
      },
      {
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 50 },
      },
      {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 },
      },
      { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    ];

    const phaseNames = Object.keys(PHASES);
    const phaseIndex = phaseNames.indexOf(gameState?.phase);
    const variantIndex = phaseIndex !== -1 ? phaseIndex % variants.length : 0;
    return variants[variantIndex];
  }, [gameState?.phase]);

  let contentToRender;
  // Show AuthScreen if user is null OR if user is anonymous and hasn't chosen an auth method
  if (!user || (user.isAnonymous && !authMethodChosen)) {
    contentToRender = (
      <AuthScreen errorMsg={errorMsg} version={version} setAuthMethodChosen={setAuthMethodChosen} />
    );
  } else if (!joined && showHomeScreen) {
    contentToRender = <HomeScreen onPlayNow={() => setShowHomeScreen(false)} version={version} />;
  } else if (!joined) {
    contentToRender = (
      <RoomSelectionScreen
        playerName={playerName}
        setPlayerName={setPlayerName}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        joinRoom={joinRoom}
        createRoom={createRoom}
        user={user}
        onlineUsers={onlineUsers}
        activeRooms={activeRooms}
        version={version}
      />
    );
  } else if (!gameState) {
    contentToRender = <div>Loading game state...</div>;
  } else {
    contentToRender = (
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
          submitDeathNote,
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
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        version={version}
      />
    );
  }

  return (
    <div className="relative">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {joined && gameState && gameState.phase !== PHASES.LOBBY && (
          <GameUIWrapper
            gameState={gameState}
            players={players}
            myChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
          />
        )}
        <AnimatePresence mode="sync">
          <motion.div
            key={gameState?.phase || 'auth'}
            {...transitionVariants}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`w-full h-full ${isChatOpen ? 'mr-[25rem]' : ''}`}
          >
            {contentToRender}
          </motion.div>
        </AnimatePresence>
      </div>
      {!joined && (
        <div className="fixed bottom-4 left-4 z-50 p-2">
          <a
            href="https://www.buymeacoffee.com/JosephLteif"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Support me 🐺
          </a>
        </div>
      )}
    </div>
  );
}
