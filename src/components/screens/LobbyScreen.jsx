import React from 'react';
import { Info, Copy } from 'lucide-react';
import { ROLES } from '../../constants';

export default function LobbyScreen({ gameState, isHost, players, updateGame, startGame, setShowRoleInfo, showRoleInfo, user }) {
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
      {showRoleInfo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50" onClick={() => setShowRoleInfo()}>
          <div className="bg-slate-800 p-6 rounded-2xl max-w-md w-full border border-slate-700 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {showRoleInfo === 'RULES' ? (
              <>
                <h3 className="text-2xl font-black text-indigo-400 mb-4 flex items-center gap-2">
                  <Info className="w-6 h-6" /> Rule Book
                </h3>
                <div className="space-y-4 text-slate-300 text-sm">
                  <section>
                    <h4 className="font-bold text-white mb-1">Objective</h4>
                    <p>Villagers must find and eliminate all Werewolves. Werewolves must eliminate Villagers until they equal or outnumber them.</p>
                  </section>
                  <section>
                    <h4 className="font-bold text-white mb-1">Game Flow</h4>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong className="text-indigo-300">Night:</strong> Special roles wake up secretly to perform actions (kill, heal, investigate).</li>
                      <li><strong className="text-orange-300">Day:</strong> Everyone wakes up. Deaths are revealed. Players discuss and vote to eliminate a suspect.</li>
                    </ul>
                  </section>
                  <section>
                    <h4 className="font-bold text-white mb-1">Voting</h4>
                    <p>Majority vote eliminates a player. In case of a tie, no one dies.</p>
                  </section>
                  <section>
                    <h4 className="font-bold text-white mb-1">Winning</h4>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong className="text-blue-400">Villagers:</strong> Kill all Wolves.</li>
                      <li><strong className="text-red-400">Werewolves:</strong> Equal/outnumber Villagers.</li>
                      <li><strong className="text-purple-400">Jester/Tanner:</strong> Get voted out.</li>
                      <li><strong className="text-pink-400">Lovers:</strong> Be the last two alive.</li>
                    </ul>
                  </section>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4">
                  {React.createElement(Object.values(ROLES).find(r => r.id === showRoleInfo).icon, { className: "w-12 h-12 text-indigo-400" })}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{Object.values(ROLES).find(r => r.id === showRoleInfo).name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 uppercase font-bold">{Object.values(ROLES).find(r => r.id === showRoleInfo).alignment}</span>
                      <span className="text-xs text-slate-600">•</span>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        Weight: {Object.values(ROLES).find(r => r.id === showRoleInfo).weight > 0 ? '+' : ''}{Object.values(ROLES).find(r => r.id === showRoleInfo).weight}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-slate-300 mb-6">{Object.values(ROLES).find(r => r.id === showRoleInfo).desc}</p>
              </>
            )}
            <button onClick={() => setShowRoleInfo(null)} className="w-full bg-slate-700 hover:bg-slate-600 mt-6 py-3 rounded-xl font-bold transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
