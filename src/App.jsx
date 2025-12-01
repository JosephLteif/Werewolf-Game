import { useState, useEffect, useCallback, useMemo } from 'react';
import { PHASES } from './constants';
import { createRoom as createRoomRT, joinRoom as joinRoomRT } from './services/rooms';
import { useGameState } from './hooks/useGameState';
import { useAuth } from './hooks/useAuth'; // Import useAuth
import { coreGameActions } from './services/coreGameActions';
import NightActionScreen from './pages/NightActionScreen';
import DeadScreen from './pages/DeadScreen';
import LobbyScreen from './pages/LobbyScreen';
import RoleRevealScreen from './pages/RoleRevealScreen';
import NightIntroScreen from './pages/NightIntroScreen';
import DayRevealScreen from './pages/DayRevealScreen';
import DayVoteScreen from './pages/DayVoteScreen';
import WerewolfNightActionScreen from './pages/WerewolfNightActionScreen';
import NightWaitingScreen from './pages/NightWaitingScreen';
import MinionNightActionScreen from './pages/MinionNightActionScreen';
import SorcererNightActionScreen from './pages/SorcererNightActionScreen';
import SeerNightActionScreen from './pages/SeerNightActionScreen';
import MasonNightActionScreen from './pages/MasonNightActionScreen';
import HunterActionScreen from './pages/HunterActionScreen';
import WaitingForHunterScreen from './pages/WaitingForHunterScreen';
import PlayerRoleDisplay from './components/PlayerRoleDisplay';
import ActiveRolesPanel from './components/ActiveRolesPanel';
import GameHistoryModal from './components/GameHistoryModal'; // Import GameHistoryModal
import { ROLE_IDS } from './constants/roleIds';
import TeammateList from './components/TeammateList';

import AuthScreen from './pages/AuthScreen';
import { History } from 'lucide-react'; // Import History icon
import { motion, AnimatePresence } from 'framer-motion'; // Added Framer Motion imports

export default function App() {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(null); // Role ID to show info for
  const [showHistoryModal, setShowHistoryModal] = useState(false); // State for history modal

  const { user } = useAuth();

  const leaveRoom = useCallback(() => {
    setJoined(false);
    setRoomCode('');
  }, []);

  const { gameState, isHost } = useGameState(user, roomCode, joined);

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
        advanceNightPhase(null, null);
      } else if (isNightPhase) {
        // Timeout for any night action
        advanceNightPhase(null, null);
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

  let currentScreen = null;
  let myPlayer = null;
  let amAlive = false;
  let isMyTurn = false;

  const wrapGameContent = (children) => (
    <>
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
        <TeammateList players={players} myPlayer={myPlayer} gameState={gameState} />
        {gameState?.settings?.showActiveRolesPanel && (
          <ActiveRolesPanel
            activeRoles={gameState.settings.activeRoles}
            wolfCount={gameState.settings.wolfCount}
            playerCount={players.length}
          />
        )}
      </div>

      {gameState?.dayLog && gameState.dayLog.length > 0 && (
        <div className="absolute top-16 right-4 z-50">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-2 rounded-lg bg-slate-900/80 backdrop-blur border border-indigo-500/30 text-indigo-200 text-sm font-medium transition-colors flex items-center gap-2 hover:bg-slate-800"
          >
            <History className="w-4 h-4 text-indigo-400" />
            History
          </button>
        </div>
      )}
      <PlayerRoleDisplay myPlayer={myPlayer} />
      {children}
    </>
  );

  if (!user || !joined) {
    currentScreen = (
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
    );
  } else if (!gameState) {
    currentScreen = <div>Loading game state...</div>;
  } else {
    myPlayer = players.find((p) => p.id === user?.uid);

    amAlive = myPlayer?.isAlive;

    isMyTurn =
      (gameState.phase === PHASES.NIGHT_CUPID && myPlayer?.role === ROLE_IDS.CUPID) ||
      (gameState.phase === PHASES.NIGHT_WEREWOLF && myPlayer?.role === ROLE_IDS.WEREWOLF) ||
      (gameState.phase === PHASES.NIGHT_MINION && myPlayer?.role === ROLE_IDS.MINION) ||
      (gameState.phase === PHASES.NIGHT_SORCERER && myPlayer?.role === ROLE_IDS.SORCERER) ||
      (gameState.phase === PHASES.NIGHT_DOCTOR && myPlayer?.role === ROLE_IDS.DOCTOR) ||
      (gameState.phase === PHASES.NIGHT_SEER && myPlayer?.role === ROLE_IDS.SEER) ||
      (gameState.phase === PHASES.NIGHT_MASON && myPlayer?.role === ROLE_IDS.MASON) ||
      (gameState.phase === PHASES.NIGHT_VIGILANTE && myPlayer?.role === ROLE_IDS.VIGILANTE) ||
      (gameState.phase === PHASES.NIGHT_DOPPELGANGER && myPlayer?.role === ROLE_IDS.DOPPELGANGER);

    if (gameState.phase === PHASES.LOBBY) {
      currentScreen = (
        <LobbyScreen
          gameState={gameState}
          isHost={isHost}
          players={players}
          startGame={startGame}
          showRoleInfo={showRoleInfo}
          setShowRoleInfo={setShowRoleInfo}
          user={user}
          leaveRoom={leaveRoom}
        />
      );
    } else if (gameState.phase === PHASES.ROLE_REVEAL) {
      currentScreen = wrapGameContent(
        <RoleRevealScreen
          myPlayer={myPlayer}
          markReady={markReady}
          players={players}
          roleRevealParticles={roleRevealParticles}
        />
      );
    } else if (
      [
        PHASES.NIGHT_INTRO,

        PHASES.NIGHT_CUPID,

        PHASES.NIGHT_WEREWOLF,

        PHASES.NIGHT_MINION,

        PHASES.NIGHT_SORCERER,

        PHASES.NIGHT_DOCTOR,

        PHASES.NIGHT_SEER,

        PHASES.NIGHT_MASON,

        PHASES.NIGHT_VIGILANTE,

        PHASES.NIGHT_DOPPELGANGER,
      ].includes(gameState.phase)
    ) {
      if (gameState.phase === PHASES.NIGHT_INTRO) {
        currentScreen = wrapGameContent(
          <NightIntroScreen
            isHost={isHost}
            startNight={startNightPhase}
            nightIntroStars={nightIntroStars}
          />
        );
      } else if (!amAlive) {
        currentScreen = wrapGameContent(
          <DeadScreen
            winner={null}
            winners={gameState?.winners || []}
            isGameOver={false}
            onReset={() => {}}
            isHost={false}
            dayLog={gameState.dayLog}
            players={players}
            lovers={gameState.lovers}
            gameSettings={gameState.settings}
          />
        );
      } else if (!isMyTurn) {
        currentScreen = wrapGameContent(<NightWaitingScreen />);
      } else if (gameState.phase === PHASES.NIGHT_CUPID) {
        currentScreen = wrapGameContent(
          <NightActionScreen
            players={players.filter(
              (p) => p.isAlive && (gameState.settings.cupidCanChooseSelf ? true : p.id !== user.uid)
            )}
            onAction={(ids) => advanceNightPhase('cupidLinks', ids)}
            myPlayer={myPlayer}
            multiSelect={true}
            maxSelect={2}
            phaseEndTime={gameState.phaseEndTime}
          />
        );
      } else if (gameState.phase === PHASES.NIGHT_DOPPELGANGER) {
        currentScreen = wrapGameContent(
          <NightActionScreen
            title="Doppelgänger"
            subtitle="Choose a player to copy if they die."
            color="slate"
            players={players.filter((p) => p.isAlive && p.id !== user.uid)}
            onAction={(id) => advanceNightPhase('doppelgangerCopy', id)}
            myPlayer={myPlayer}
            phaseEndTime={gameState.phaseEndTime}
          />
        );
      } else if (gameState.phase === PHASES.NIGHT_WEREWOLF) {
        currentScreen = wrapGameContent(
          <WerewolfNightActionScreen
            gameState={gameState}
            players={players}
            user={user}
            myPlayer={myPlayer}
            advanceNight={advanceNightPhase}
            phaseEndTime={gameState.phaseEndTime}
          />
        );
      } else if (gameState.phase === PHASES.NIGHT_MINION) {
        currentScreen = wrapGameContent(
          <MinionNightActionScreen players={players} advanceNightPhase={advanceNightPhase} />
        );
      } else if (gameState.phase === PHASES.NIGHT_SORCERER) {
        currentScreen = wrapGameContent(
          <SorcererNightActionScreen
            players={players}
            user={user}
            advanceNightPhase={advanceNightPhase}
            gameState={gameState}
            seerMessage={seerMessage}
            setSeerMessage={setSeerMessage}
            sorcererTarget={sorcererTarget}
            setSorcererTarget={setSorcererTarget}
            now={now}
          />
        );
      } else if (gameState.phase === PHASES.NIGHT_DOCTOR) {
        currentScreen = wrapGameContent(
          <NightActionScreen
            title="Doctor"
            subtitle="Protect someone."
            color="blue"
            players={players.filter((p) => p.isAlive)}
            onAction={(id) => advanceNightPhase('doctorProtect', id)}
            myPlayer={myPlayer}
            canSkip={true}
            phaseEndTime={gameState.phaseEndTime}
          />
        );
      } else if (gameState.phase === PHASES.NIGHT_SEER) {
        currentScreen = wrapGameContent(
          <SeerNightActionScreen
            players={players}
            user={user}
            advanceNightPhase={advanceNightPhase}
            gameState={gameState}
            seerMessage={seerMessage}
            setSeerMessage={setSeerMessage}
            now={now}
          />
        );
      } else if (gameState.phase === PHASES.NIGHT_MASON) {
        currentScreen = wrapGameContent(
          <MasonNightActionScreen
            players={players}
            user={user}
            gameState={gameState}
            advanceNightPhase={advanceNightPhase}
          />
        );
      } else if (gameState.phase === PHASES.NIGHT_VIGILANTE) {
        const ammo = gameState.vigilanteAmmo[user.uid] || 0;

        currentScreen = wrapGameContent(
          <NightActionScreen
            title={`Vigilante (${ammo} ammo)`}
            subtitle={ammo > 0 ? 'Choose your target carefully.' : "You're out of ammo."}
            color="yellow"
            players={players.filter((p) => p.isAlive)}
            onAction={(id) => {
              if (ammo > 0 && id) {
                const newVigilanteAmmo = { ...gameState.vigilanteAmmo, [user.uid]: 0 };

                advanceNightPhase('vigilanteTarget', id, newVigilanteAmmo);
              } else {
                advanceNightPhase('vigilanteTarget', null);
              }
            }}
            myPlayer={myPlayer}
            canSkip={true}
            phaseEndTime={gameState.phaseEndTime}
          />
        );
      }
    } else if (gameState.phase === PHASES.HUNTER_ACTION) {
      if (
        myPlayer?.role === ROLE_IDS.HUNTER &&
        !myPlayer?.isAlive &&
        !gameState.dayLog.some((logEntry) => logEntry.includes('shot'))
      ) {
        currentScreen = wrapGameContent(
          <HunterActionScreen players={players} handleHunterShotAction={handleHunterShotAction} />
        );
      } else {
        currentScreen = wrapGameContent(<WaitingForHunterScreen />);
      }
    } else if (gameState.phase === PHASES.DAY_REVEAL) {
      currentScreen = wrapGameContent(
        <DayRevealScreen gameState={gameState} isHost={isHost} now={now} />
      );
    } else if (gameState.phase === PHASES.DAY_VOTING) {
      currentScreen = wrapGameContent(
        <DayVoteScreen
          gameState={gameState}
          players={players}
          amAlive={amAlive}
          castVote={castVote}
          lockVote={lockVote}
          now={now}
          user={user}
        />
      );
    } else if (gameState.phase === PHASES.GAME_OVER) {
      currentScreen = wrapGameContent(
        <DeadScreen
          winner={gameState.winner}
          winners={gameState.winners}
          isGameOver={gameState.phase === PHASES.GAME_OVER}
          onReset={() =>
            gameState.update({
              phase: PHASES.LOBBY,

              players: gameState.players,

              dayLog: [],

              nightActions: {},

              votes: {},

              lockedVotes: [],

              winners: [],
            })
          }
          isHost={isHost}
          dayLog={gameState.dayLog}
          players={players}
          lovers={gameState.lovers}
          gameSettings={gameState.settings}
        />
      );
    } else {
      currentScreen = <div>Loading...</div>;
    }
  }

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

    // Use a simple hash or cycle based on the phase to pick a variant

    const phaseNames = Object.keys(PHASES);

    const phaseIndex = phaseNames.indexOf(gameState?.phase);

    // Use modulo to cycle through variants, ensuring a different variant for each distinct phase,

    // but the same variant for the same phase if it re-occurs (e.g., DayVote -> NightIntro -> DayVote)

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
          className="w-full h-full"
        >
          {currentScreen}
        </motion.div>
      </AnimatePresence>

      {showHistoryModal && gameState && (
        <GameHistoryModal dayLog={gameState.dayLog} onClose={() => setShowHistoryModal(false)} />
      )}
    </div>
  );
}
