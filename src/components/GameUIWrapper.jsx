import React from 'react';
import GameHistoryPanel from './GameHistoryPanel';
import ChatBox from './ChatBox';
import ActiveRolesPanel from './ActiveRolesPanel';
import TeammateList from './TeammateList';
import PlayerRoleDisplay from './PlayerRoleDisplay';

export default function GameUIWrapper({ gameState, players, myPlayer, isChatOpen, setIsChatOpen }) {
  return (
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

      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 items-end">
        <PlayerRoleDisplay myPlayer={myPlayer} />
        <GameHistoryPanel
          dayLog={gameState.dayLog}
          voteHistory={gameState.voteHistory}
          players={players}
        />
      </div>

      <div className="absolute top-0 right-0 h-full z-[999]">
        <ChatBox
          roomCode={gameState.code}
          myPlayer={myPlayer}
          playerRole={myPlayer?.role}
          isAlive={myPlayer?.isAlive}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          gameState={gameState}
        />
      </div>
    </>
  );
}
