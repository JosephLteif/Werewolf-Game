import React from 'react';
import { PHASES } from '../constants';
import { ROLE_IDS } from '../constants/roleIds';

import { roleRegistry } from '../roles/RoleRegistry';

// Import all screen components
import DayRevealScreen from '../pages/DayRevealScreen';
import DayVoteScreen from '../pages/DayVoteScreen';
import DeadScreen from '../pages/DeadScreen';
import HunterActionScreen from '../pages/HunterActionScreen';
import LobbyScreen from '../pages/LobbyScreen';
import MasonNightActionScreen from '../pages/MasonNightActionScreen';
import MinionNightActionScreen from '../pages/MinionNightActionScreen';
import NightActionScreen from '../pages/NightActionScreen';
import NightIntroScreen from '../pages/NightIntroScreen';
import NightWaitingScreen from '../pages/NightWaitingScreen';
import RoleRevealScreen from '../pages/RoleRevealScreen';
import SeerNightActionScreen from '../pages/SeerNightActionScreen';
import SorcererNightActionScreen from '../pages/SorcererNightActionScreen';
import WaitingForHunterScreen from '../pages/WaitingForHunterScreen';
import WerewolfNightActionScreen from '../pages/WerewolfNightActionScreen';

// Import common components for wrapGameContent
import ActiveRolesPanel from '../components/ActiveRolesPanel';
import GameHistoryPanel from '../components/GameHistoryPanel';
import PlayerRoleDisplay from '../components/PlayerRoleDisplay';
import TeammateList from '../components/TeammateList';

const PHASE_COMPONENTS = {
  [PHASES.LOBBY]: LobbyScreen,
  [PHASES.ROLE_REVEAL]: RoleRevealScreen,
  [PHASES.NIGHT_INTRO]: NightIntroScreen,
  [PHASES.NIGHT_DOPPELGANGER]: NightActionScreen, // Generic NightActionScreen
  [PHASES.NIGHT_CUPID]: NightActionScreen, // Generic NightActionScreen
  [PHASES.NIGHT_WEREWOLF]: WerewolfNightActionScreen,
  [PHASES.NIGHT_MINION]: MinionNightActionScreen,
  [PHASES.NIGHT_SORCERER]: SorcererNightActionScreen,
  [PHASES.NIGHT_DOCTOR]: NightActionScreen, // Generic NightActionScreen
  [PHASES.NIGHT_SEER]: SeerNightActionScreen,
  [PHASES.NIGHT_MASON]: MasonNightActionScreen,
  [PHASES.NIGHT_VIGILANTE]: NightActionScreen, // Generic NightActionScreen
  [PHASES.HUNTER_ACTION]: HunterActionScreen, // This will be conditionally rendered with WaitingForHunterScreen
  [PHASES.DAY_REVEAL]: DayRevealScreen,
  [PHASES.DAY_VOTING]: DayVoteScreen,
  [PHASES.GAME_OVER]: DeadScreen,
};

export function PhaseRouter({
  gameState,
  players,
  user,
  isHost,
  myPlayer,
  amAlive,
  isMyTurn,
  actions,
  leaveRoom,
  nightIntroStars,
  roleRevealParticles,
  showRoleInfo,
  setShowRoleInfo,
  seerMessage,
  setSeerMessage,
  sorcererTarget,
  setSorcererTarget,
  now,
}) {
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
          <GameHistoryPanel dayLog={gameState.dayLog} />
        </div>
      )}
      <PlayerRoleDisplay myPlayer={myPlayer} />
      {children}
    </>
  );

  if (!gameState) {
    return <div>Loading game state...</div>;
  }

  const CurrentComponent = PHASE_COMPONENTS[gameState.phase];

  // Logic for Night phases and Hunter Action phase
  if (
    [
      PHASES.NIGHT_INTRO,
      PHASES.NIGHT_DOPPELGANGER,
      PHASES.NIGHT_CUPID,
      PHASES.NIGHT_WEREWOLF,
      PHASES.NIGHT_MINION,
      PHASES.NIGHT_SORCERER,
      PHASES.NIGHT_DOCTOR,
      PHASES.NIGHT_SEER,
      PHASES.NIGHT_MASON,
      PHASES.NIGHT_VIGILANTE,
    ].includes(gameState.phase)
  ) {
    if (gameState.phase === PHASES.NIGHT_INTRO) {
      return wrapGameContent(
        <NightIntroScreen
          isHost={isHost}
          startNight={actions.startNightPhase}
          nightIntroStars={nightIntroStars}
        />
      );
    } else if (!amAlive) {
      return wrapGameContent(
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
      return wrapGameContent(<NightWaitingScreen />);
    } else {
      const role = myPlayer?.role ? roleRegistry.getRole(myPlayer.role) : null;
      // Specific Night Action Screens
      switch (gameState.phase) {
        case PHASES.NIGHT_CUPID: {
          const config = role.getNightScreenConfig();
          return wrapGameContent(
            <NightActionScreen
              {...config}
              players={players.filter(
                (p) =>
                  p.isAlive && (gameState.settings.cupidCanChooseSelf ? true : p.id !== user.uid)
              )}
              onAction={(ids) => actions.advanceNightPhase('cupidLinks', ids)}
              phaseEndTime={gameState.phaseEndTime}
            />
          );
        }
        case PHASES.NIGHT_DOPPELGANGER: {
          const config = role.getNightScreenConfig();
          return wrapGameContent(
            <NightActionScreen
              {...config}
              players={players.filter((p) => p.isAlive && p.id !== user.uid)}
              onAction={(id) => actions.advanceNightPhase('doppelgangerCopy', id)}
              phaseEndTime={gameState.phaseEndTime}
            />
          );
        }
        case PHASES.NIGHT_WEREWOLF:
          return wrapGameContent(
            <WerewolfNightActionScreen
              gameState={gameState}
              players={players}
              user={user}
              myPlayer={myPlayer}
              advanceNight={actions.advanceNightPhase}
              phaseEndTime={gameState.phaseEndTime}
            />
          );
        case PHASES.NIGHT_MINION:
          return wrapGameContent(
            <MinionNightActionScreen
              players={players}
              advanceNightPhase={actions.advanceNightPhase}
            />
          );
        case PHASES.NIGHT_SORCERER:
          return wrapGameContent(
            <SorcererNightActionScreen
              players={players}
              user={user}
              advanceNightPhase={actions.advanceNightPhase}
              gameState={gameState}
              seerMessage={seerMessage}
              setSeerMessage={setSeerMessage}
              sorcererTarget={sorcererTarget}
              setSorcererTarget={setSorcererTarget}
              now={now}
            />
          );
        case PHASES.NIGHT_DOCTOR: {
          const config = role.getNightScreenConfig();
          return wrapGameContent(
            <NightActionScreen
              {...config}
              players={players.filter((p) => p.isAlive)}
              onAction={(id) => actions.advanceNightPhase('doctorProtect', id)}
              phaseEndTime={gameState.phaseEndTime}
            />
          );
        }
        case PHASES.NIGHT_SEER:
          return wrapGameContent(
            <SeerNightActionScreen
              players={players}
              user={user}
              advanceNightPhase={actions.advanceNightPhase}
              gameState={gameState}
              seerMessage={seerMessage}
              setSeerMessage={setSeerMessage}
              now={now}
            />
          );
        case PHASES.NIGHT_MASON:
          return wrapGameContent(
            <MasonNightActionScreen
              players={players}
              user={user}
              gameState={gameState}
              advanceNightPhase={actions.advanceNightPhase}
            />
          );
        case PHASES.NIGHT_VIGILANTE: {
          const ammo = gameState.vigilanteAmmo?.[user.uid] || 0;
          const config = role.getNightScreenConfig({ ammo });
          return wrapGameContent(
            <NightActionScreen
              {...config}
              players={players.filter((p) => p.isAlive && (ammo > 0 ? true : p.id !== user.uid))}
              onAction={(id) => {
                if (ammo > 0 && id) {
                  const newVigilanteAmmo = { ...gameState.vigilanteAmmo, [user.uid]: 0 };
                  actions.advanceNightPhase('vigilanteTarget', id, newVigilanteAmmo);
                } else {
                  actions.advanceNightPhase('vigilanteTarget', null);
                }
              }}
              phaseEndTime={gameState.phaseEndTime}
            />
          );
        }
        default:
          return wrapGameContent(
            CurrentComponent ? (
              <CurrentComponent
                gameState={gameState}
                isHost={isHost}
                players={players}
                user={user}
                myPlayer={myPlayer}
                amAlive={amAlive}
                isMyTurn={isMyTurn}
                leaveRoom={leaveRoom}
                nightIntroStars={nightIntroStars}
                roleRevealParticles={roleRevealParticles}
                showRoleInfo={showRoleInfo}
                setShowRoleInfo={setShowRoleInfo}
                now={now}
                // actions
                startGame={actions.startGame}
                markReady={actions.markReady}
                handleHunterShotAction={actions.handleHunterShotAction}
                castVote={actions.castVote}
                lockVote={actions.lockVote}
                resolveVoting={actions.resolveVoting}
                advanceNightPhase={actions.advanceNightPhase}
              />
            ) : (
              <div>Unknown phase: {gameState.phase}</div>
            )
          );
      }
    }
  } else if (gameState.phase === PHASES.HUNTER_ACTION) {
    if (
      myPlayer?.role === ROLE_IDS.HUNTER &&
      !myPlayer?.isAlive &&
      !gameState.dayLog.some((logEntry) => logEntry.includes('shot'))
    ) {
      return wrapGameContent(
        <HunterActionScreen
          players={players}
          handleHunterShotAction={actions.handleHunterShotAction}
        />
      );
    } else {
      return wrapGameContent(<WaitingForHunterScreen />);
    }
  } else if (gameState.phase === PHASES.GAME_OVER) {
    return wrapGameContent(
      <DeadScreen
        winner={
          gameState.winners && gameState.winners.length > 0
            ? gameState.winners.length > 1
              ? 'MULTIPLE'
              : gameState.winners[0]
            : null
        }
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
  } else if (CurrentComponent) {
    // For other phases like LOBBY, ROLE_REVEAL, DAY_REVEAL, DAY_VOTING
    const componentProps = {
      gameState,
      isHost,
      players,
      user,
      myPlayer,
      amAlive,
      isMyTurn,
      leaveRoom,
      nightIntroStars,
      roleRevealParticles,
      showRoleInfo,
      setShowRoleInfo,
      now,
      // actions
      startGame: actions.startGame,
      markReady: actions.markReady,
      handleHunterShotAction: actions.handleHunterShotAction,
      castVote: actions.castVote,
      lockVote: actions.lockVote,
      resolveVoting: actions.resolveVoting,
      advanceNightPhase: actions.advanceNightPhase,
    };

    if ([PHASES.LOBBY, PHASES.ROLE_REVEAL].includes(gameState.phase)) {
      return <CurrentComponent {...componentProps} />;
    } else {
      return wrapGameContent(<CurrentComponent {...componentProps} />);
    }
  } else {
    return <div>Unknown phase or component not found: {gameState.phase}</div>;
  }
}
