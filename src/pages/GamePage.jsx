import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PHASES } from '../constants';
import { ACTION_TYPES } from '../constants/actions';
import { useGameEngine } from '../hooks/useGameEngine';
import { PhaseRouter } from '../router/PhaseRouter';
import { useGameState } from '../hooks/useGameState';
import { useAuth } from '../hooks/useAuth';
import { usePresenceNotifications } from '../hooks/usePresenceNotifications';
import { coreGameActions } from '../services/coreGameActions';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import GameUIWrapper from '../components/GameUIWrapper';

export default function GamePage() {
  const { user } = useAuth();
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [joined, setJoined] = useState(true);
  const [showRoleInfo, setShowRoleInfo] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const leaveRoom = useCallback(
    (kickedByHost = false) => {
      setJoined(false);
      navigate('/');
      if (kickedByHost) {
        toast.error('You have been kicked from the room by the host.');
      }
    },
    [navigate, toast]
  );

  const { gameState, isHost } = useGameState(user, roomCode, joined);

  usePresenceNotifications(gameState, user?.uid);

  const players = useMemo(() => (gameState ? gameState.players : []), [gameState]);

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
    submitDeathNote,
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

  const { myPlayer, amAlive, isMyTurn } = useGameEngine(gameState, players, user);

  if (!gameState) {
    return <div>Loading game state...</div>;
  }

  return (
    <>
      {joined && gameState && gameState.phase !== PHASES.LOBBY && (
        <GameUIWrapper
          gameState={gameState}
          players={players}
          myChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
        />
      )}
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
        version={null}
      />
    </>
  );
}
