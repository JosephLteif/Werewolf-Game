import { useState, useEffect, useRef } from 'react'; // Import useState, useEffect, and useRef
import { Info, Copy, ArrowLeft, XCircle, Pencil, Check, X } from 'lucide-react';
import { ROLE_IDS } from '../constants/roleIds';
import { kickPlayer, renamePlayer, transferHost } from '../services/rooms';
import { CUPID_FATES, TANNER_WIN_STRATEGIES } from '../constants';
import RoleInfoModal from '../components/RoleInfoModal';
import RoleRulesModal from '../components/RoleRulesModal'; // Import RoleRulesModal
import ConfirmationModal from '../components/modals/ConfirmationModal'; // Import ConfirmationModal
import { roleRegistry } from '../roles/RoleRegistry';
import { GameValidator } from '../utils/GameValidator';
import { useToast } from '../context/ToastContext';
import ChatBox from '../components/ChatBox';

export default function LobbyScreen({
  gameState,
  isHost,
  players,
  startGame,
  setShowRoleInfo,
  showRoleInfo,
  user,
  leaveRoom,
  isChatOpen, // New prop
  setIsChatOpen, // New prop
}) {
  const [showRulesModal, setShowRulesModal] = useState(false); // State for rules modal
  const [showKickConfirm, setShowKickConfirm] = useState(false); // State for kick confirmation modal
  const [playerToKickId, setPlayerToKickId] = useState(null); // State to store the ID of the player to kick

  const toast = useToast();

  const handleLeaveLobby = async () => {
    // Only kick if the user is still in the players list
    const stillInRoom = players.some((p) => p.id === user.uid);
    if (stillInRoom) {
      await kickPlayer(gameState.code, user.uid);
    }
    leaveRoom();
  };

  const handleKick = (playerId) => {
    setPlayerToKickId(playerId);
    setShowKickConfirm(true);
  };

  const confirmKick = async () => {
    if (playerToKickId) {
      await kickPlayer(gameState.code, playerToKickId);
    }
    setShowKickConfirm(false);
    setPlayerToKickId(null);
  };

  const cancelKick = () => {
    setShowKickConfirm(false);
    setPlayerToKickId(null);
  };

  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editName, setEditName] = useState('');

  const startEditing = (player) => {
    setEditingPlayerId(player.id);
    setEditName(player.name);
  };

  const cancelEditing = () => {
    setEditingPlayerId(null);
    setEditName('');
  };

  const saveName = async (playerId) => {
    if (editName.trim()) {
      await renamePlayer(gameState.code, playerId, editName.trim());
      setEditingPlayerId(null);
      setEditName('');
    }
  };

  // Track if the user has ever been seen in the player list
  const [hasJoined, setHasJoined] = useState(false);
  const kickedByHostRef = useRef(false);

  // Auto self‑eject: if the current user is no longer in the room's player list, leave the lobby
  useEffect(() => {
    const stillInRoom = players.some((p) => p.id === user.uid);
    if (stillInRoom) {
      // User is present – ensure we consider them joined
      setHasJoined(true);
    } else if (hasJoined) {
      // User was previously present but now missing → host kicked them
      kickedByHostRef.current = true;
      leaveRoom(kickedByHostRef.current);
    }
  }, [players, user.uid, hasJoined, leaveRoom]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col">
      <div className="flex flex-1 gap-6">
        <div className="flex flex-col flex-1">
          <header className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button onClick={handleLeaveLobby} className="text-slate-500 hover:text-white">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <div className="text-xs text-slate-500 uppercase">Room Code</div>
                <div className="text-3xl font-mono font-black text-indigo-400 tracking-widest flex items-center gap-2">
                  {gameState.code}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(gameState.code);
                      toast.success('Copied room code to clipboard!');
                    }}
                  >
                    <Copy className="w-4 h-4 text-slate-600 hover:text-white" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {isHost && (
                <div className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded text-xs font-bold">
                  HOST
                </div>
              )}
              <button
                onClick={() => setShowRulesModal(true)} // Open rules modal
                className="text-slate-500 hover:text-slate-300 flex items-center gap-1 text-xs font-bold"
              >
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
              {players.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-800 p-4 rounded-xl flex items-center gap-3 border border-slate-700"
                >
                  {editingPlayerId === p.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white flex-1 focus:outline-none focus:border-indigo-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveName(p.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                      />
                      <button
                        onClick={() => saveName(p.id)}
                        className="text-green-400 hover:text-green-300"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEditing} className="text-red-400 hover:text-red-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-lg">{p.name}</span>
                      {p.id === user.uid && (
                        <span className="text-sm font-bold text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded ml-2">
                          (You)
                        </span>
                      )}
                      {isHost && (
                        <button
                          onClick={() => startEditing(p)}
                          className="text-slate-500 hover:text-indigo-400 ml-2 p-1 hover:bg-slate-700 rounded"
                          title="Rename Player"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                  {isHost && p.id !== user.uid && (
                    <>
                      <button
                        onClick={() => handleKick(p.id)}
                        className="ml-auto text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 px-2 py-1 rounded transition-all"
                      >
                        Kick
                      </button>
                      <button
                        onClick={() => transferHost(gameState.code, p.id)}
                        className="ml-2 text-xs font-bold text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 hover:border-indigo-500/50 px-2 py-1 rounded transition-all"
                      >
                        Make Host
                      </button>
                    </>
                  )}
                  {p.id === gameState.hostId && (
                    <span className="text-xs text-slate-500 font-bold ml-auto border border-slate-600 px-2 py-1 rounded">
                      HOST
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Settings Panel - Visible to ALL, Editable by HOST */}
          <div
            className={`space-y-4 bg-slate-800 p-4 rounded-xl border border-slate-700 ${
              !isHost ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <h3 className="text-slate-500 font-bold flex items-center gap-2">
              <Info className="w-4 h-4" /> Game Settings
              {!isHost && (
                <span className="text-xs font-normal text-slate-600 ml-auto">(Host Only)</span>
              )}
            </h3>

            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-400">Action Timer (s)</span>
              <div className="flex items-center gap-3 bg-slate-900 rounded p-1">
                {isHost && (
                  <button
                    onClick={() =>
                      gameState.update({
                        settings: {
                          ...gameState.settings,
                          actionWaitTime: Math.max(10, gameState.settings.actionWaitTime - 5),
                        },
                      })
                    }
                    className="w-8 h-8 hover:bg-slate-700 rounded"
                  >
                    -
                  </button>
                )}
                <input
                  type="number"
                  value={gameState.settings.actionWaitTime}
                  onChange={(e) =>
                    isHost &&
                    gameState.update({
                      settings: {
                        ...gameState.settings,
                        actionWaitTime: Math.max(10, parseInt(e.target.value) || 0),
                      },
                    })
                  }
                  className="font-mono px-2 w-12 text-center bg-slate-900 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                  disabled={!isHost}
                />
                {isHost && (
                  <button
                    onClick={() =>
                      gameState.update({
                        settings: {
                          ...gameState.settings,
                          actionWaitTime: gameState.settings.actionWaitTime + 5,
                        },
                      })
                    }
                    className="w-8 h-8 hover:bg-slate-700 rounded"
                  >
                    +
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-400">Voting Timer (s)</span>
              <div className="flex items-center gap-3 bg-slate-900 rounded p-1">
                {isHost && (
                  <button
                    onClick={() =>
                      gameState.update({
                        settings: {
                          ...gameState.settings,
                          votingWaitTime: Math.max(10, gameState.settings.votingWaitTime - 10),
                        },
                      })
                    }
                    className="w-8 h-8 hover:bg-slate-700 rounded"
                  >
                    -
                  </button>
                )}
                <input
                  type="number"
                  value={gameState.settings.votingWaitTime}
                  onChange={(e) =>
                    isHost &&
                    gameState.update({
                      settings: {
                        ...gameState.settings,
                        votingWaitTime: Math.max(10, parseInt(e.target.value) || 0),
                      },
                    })
                  }
                  className="font-mono px-2 w-12 text-center bg-slate-900 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                  disabled={!isHost}
                />
                {isHost && (
                  <button
                    onClick={() =>
                      gameState.update({
                        settings: {
                          ...gameState.settings,
                          votingWaitTime: gameState.settings.votingWaitTime + 10,
                        },
                      })
                    }
                    className="w-8 h-8 hover:bg-slate-700 rounded"
                  >
                    +
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-red-400">Wolf Count</span>
              <div className="flex items-center gap-3 bg-slate-900 rounded p-1">
                {isHost && (
                  <button
                    onClick={() =>
                      gameState.update({
                        settings: {
                          ...gameState.settings,
                          wolfCount: Math.max(1, gameState.settings.wolfCount - 1),
                        },
                      })
                    }
                    className="w-8 h-8 hover:bg-slate-700 rounded"
                  >
                    -
                  </button>
                )}
                <input
                  type="number"
                  value={gameState.settings.wolfCount}
                  onChange={(e) =>
                    isHost &&
                    gameState.update({
                      settings: {
                        ...gameState.settings,
                        wolfCount: Math.max(1, parseInt(e.target.value) || 0),
                      },
                    })
                  }
                  className="font-mono px-2 w-12 text-center bg-slate-900 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                  disabled={!isHost}
                />
                {isHost && (
                  <button
                    onClick={() =>
                      gameState.update({
                        settings: {
                          ...gameState.settings,
                          wolfCount: gameState.settings.wolfCount + 1,
                        },
                      })
                    }
                    className="w-8 h-8 hover:bg-slate-700 rounded"
                  >
                    +
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-400">Show Active Roles Panel</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={gameState.settings.showActiveRolesPanel || false}
                  onChange={() =>
                    isHost &&
                    gameState.update({
                      settings: {
                        ...gameState.settings,
                        showActiveRolesPanel: !(gameState.settings.showActiveRolesPanel || false),
                      },
                    })
                  }
                  disabled={!isHost}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {gameState.settings.activeRoles[ROLE_IDS.CUPID] && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-400">Cupid Can Choose Self</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={gameState.settings.cupidCanChooseSelf || false}
                    onChange={() =>
                      isHost &&
                      gameState.update({
                        settings: {
                          ...gameState.settings,
                          cupidCanChooseSelf: !(gameState.settings.cupidCanChooseSelf || false),
                        },
                      })
                    }
                    disabled={!isHost}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            )}

            {gameState.settings.activeRoles[ROLE_IDS.CUPID] && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-400">Cupid Strategy</span>
                <select
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                  value={gameState.settings.cupidFateOption || CUPID_FATES.SELFLESS} // Default to SELFLESS if not set
                  onChange={(e) =>
                    isHost &&
                    gameState.update({
                      settings: { ...gameState.settings, cupidFateOption: e.target.value },
                    })
                  }
                  disabled={!isHost}
                >
                  <option value={CUPID_FATES.SELFLESS}>Selfless (Couple Win)</option>
                  <option value={CUPID_FATES.THIRD_WHEEL}>Third Wheel (Throuple Win)</option>
                </select>
              </div>
            )}

            {gameState.settings.activeRoles[ROLE_IDS.TANNER] && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-400">Tanner Win</span>
                <select
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                  value={
                    gameState.settings.tannerWinStrategy || TANNER_WIN_STRATEGIES.CONTINUE_GAME
                  }
                  onChange={(e) =>
                    isHost &&
                    gameState.update({
                      settings: { ...gameState.settings, tannerWinStrategy: e.target.value },
                    })
                  }
                  disabled={!isHost}
                >
                  <option value={TANNER_WIN_STRATEGIES.CONTINUE_GAME}>Game Continues</option>
                  <option value={TANNER_WIN_STRATEGIES.END_GAME}>Game Ends</option>
                </select>
              </div>
            )}

            <div className="space-y-4">
              {['good', 'evil', 'neutral'].map((alignment) => {
                return (
                  <div key={alignment}>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2 tracking-widest">
                      {alignment} Roles
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {roleRegistry
                        .getAllRoles()
                        .filter((r) => {
                          if (r.selectable === false) return false;
                          if (r.id === 'werewolf' || r.id === 'villager') return false;
                          return r.alignment === alignment;
                        })
                        .map((r) => {
                          const isActive = gameState.settings.activeRoles[r.id];
                          const alignmentColors = {
                            good: 'bg-blue-600 border-blue-500',
                            evil: 'bg-red-600 border-red-500',
                            neutral: 'bg-purple-600 border-purple-500',
                          };
                          const activeColor = alignmentColors[alignment];

                          return (
                            <button
                              key={r.id}
                              onClick={() =>
                                isHost
                                  ? gameState.update({
                                      settings: {
                                        ...gameState.settings,
                                        activeRoles: {
                                          ...gameState.settings.activeRoles,
                                          [r.id]: !isActive,
                                        },
                                      },
                                    })
                                  : setShowRoleInfo(r.id)
                              }
                              className={`px-3 py-2 rounded text-xs font-bold border transition-all flex items-center gap-2 relative group
                                 ${
                                   isActive
                                     ? `${activeColor} text-white`
                                     : 'bg-slate-900 border-slate-700 text-slate-500'
                                 }
                                 ${!isHost ? 'cursor-help opacity-80' : 'hover:opacity-80'}
                            `}
                            >
                              <r.icon className="w-3 h-3" />
                              {r.name}
                              <span
                                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                  isActive ? 'bg-white/20' : 'bg-slate-800'
                                }`}
                              >
                                {r.weight > 0 ? '+' : ''}
                                {r.weight}
                              </span>
                              {isHost && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowRoleInfo(r.id);
                                  }}
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
                );
              })}
            </div>

            {/* Game Balance - Visible to All Players */}
            {(() => {
              // Use GameValidator to get validation results
              const validationResult = GameValidator.validate(players, gameState.settings);
              const { isValid, errors } = validationResult;

              // Calculate balance weight
              let balanceWeight = 0;

              // Add werewolf weights using role weight
              const werewolfWeight = roleRegistry.getRole(ROLE_IDS.WEREWOLF).weight;
              balanceWeight += gameState.settings.wolfCount * werewolfWeight;

              // Add active role weights
              Object.entries(gameState.settings.activeRoles).forEach(([roleId, isActive]) => {
                if (isActive) {
                  const role = roleRegistry.getAllRoles().find((r) => r.id === roleId);
                  if (role) {
                    // Mason comes in pairs
                    if (roleId === ROLE_IDS.MASON) {
                      balanceWeight += role.weight * 2;
                    } else {
                      balanceWeight += role.weight;
                    }
                  }
                }
              });

              // Calculate villagers count
              const activeSpecialRolesCount = Object.entries(gameState.settings.activeRoles).filter(
                ([id, isActive]) => isActive && id !== ROLE_IDS.MASON
              ).length;
              const masonCount = gameState.settings.activeRoles[ROLE_IDS.MASON] ? 2 : 0;
              const totalRolesNeeded =
                gameState.settings.wolfCount + activeSpecialRolesCount + masonCount;
              const playersCount = players.length;
              const villagersCount = Math.max(0, playersCount - totalRolesNeeded);

              balanceWeight += villagersCount * roleRegistry.getRole(ROLE_IDS.VILLAGER).weight;

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

              return (
                <div className="space-y-2">
                  {/* Balance Indicator */}
                  <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-500 font-bold uppercase">
                        Game Balance
                      </span>
                      <span className={`text-xs font-bold ${balanceColor}`}>{balanceText}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            balanceWeight >= 0 ? 'bg-blue-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.abs(balanceWeight) * 5)}%` }}
                        />
                      </div>
                      <span className={`text-sm font-mono font-bold ${balanceColor}`}>
                        {balanceWeight > 0 ? '+' : ''}
                        {balanceWeight}
                      </span>
                    </div>

                    {/* Role Breakdown */}
                    <div className="mt-3 pt-3 border-t border-slate-700 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Werewolves</span>
                        <span className="font-mono text-slate-300">
                          {gameState.settings.wolfCount} ×{' '}
                          {roleRegistry.getRole(ROLE_IDS.WEREWOLF).weight} ={' '}
                          {gameState.settings.wolfCount *
                            roleRegistry.getRole(ROLE_IDS.WEREWOLF).weight}
                        </span>
                      </div>

                      {Object.entries(gameState.settings.activeRoles)
                        .filter(([, isActive]) => isActive)
                        .map(([roleId]) => {
                          const role = roleRegistry.getAllRoles().find((r) => r.id === roleId);
                          if (!role) return null;
                          const count = roleId === ROLE_IDS.MASON ? 2 : 1;
                          const totalWeight = role.weight * count;
                          return (
                            <div key={roleId} className="flex justify-between items-center">
                              <span className="text-slate-400">
                                {role.name}
                                {count > 1 ? 's' : ''}
                              </span>
                              <span className="font-mono text-slate-300">
                                {count} × {role.weight > 0 ? '+' : ''}
                                {role.weight} = {totalWeight > 0 ? '+' : ''}
                                {totalWeight}
                              </span>
                            </div>
                          );
                        })}

                      {villagersCount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Villagers</span>
                          <span className="font-mono text-slate-300">
                            {villagersCount} × +{roleRegistry.getRole(ROLE_IDS.VILLAGER).weight} = +
                            {villagersCount * roleRegistry.getRole(ROLE_IDS.VILLAGER).weight}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-700 font-bold">
                        <span className="text-slate-300">Total</span>
                        <span className={`font-mono ${balanceColor}`}>
                          {balanceWeight > 0 ? '+' : ''}
                          {balanceWeight}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Host-Only Controls */}
                  {isHost && (
                    <>
                      {errors.map((error, index) => (
                        <div key={index} className="text-red-400 text-xs text-center font-bold">
                          {error}
                        </div>
                      ))}
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

          {!isHost && (
            <div className="text-center text-slate-500 animate-pulse mt-4">
              Waiting for host to start...
            </div>
          )}
        </div>
        <div className="h-full">
          <ChatBox
            roomCode={gameState.code}
            myPlayer={players.find((p) => p.id === user.uid)}
            playerRole={null}
            isAlive={true}
            gameState={gameState}
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
          />
        </div>
      </div>

      <RoleInfoModal selectedRoleId={showRoleInfo} onClose={() => setShowRoleInfo(null)} />
      {showRulesModal && <RoleRulesModal onClose={() => setShowRulesModal(false)} />}
      <ConfirmationModal
        isOpen={showKickConfirm}
        message="Are you sure you want to kick this player?"
        onConfirm={confirmKick}
        onCancel={cancelKick}
      />
    </div>
  );
}
