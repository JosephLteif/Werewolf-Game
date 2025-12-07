import { X, History, User } from 'lucide-react';
import React from 'react';

export default function VoteHistoryModal({ isOpen, onClose, voteHistory, players }) {
  if (!isOpen) return null;

  // Helper to get player name by ID
  const getPlayerName = (id) => {
    const player = players.find((p) => p.id === id);
    return player ? player.name : 'Unknown';
  };

  const getPlayerAvatarColor = (id) => {
    const player = players.find((p) => p.id === id);
    return player ? player.avatarColor : '#ccc';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
              <History className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Vote History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!voteHistory || voteHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No voting history yet.</p>
            </div>
          ) : (
            [...voteHistory].reverse().map((entry, index) => (
              <div
                key={index}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                {/* Day Header */}
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">
                    Day {entry.day}
                  </span>
                  <span
                    className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                      entry.outcome === 'skip' || entry.outcome === 'tie'
                        ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}
                  >
                    {entry.outcome === 'skip'
                      ? 'Skipped'
                      : entry.outcome === 'tie'
                        ? 'Tie - No Elimination'
                        : `${entry.victimName} Eliminated`}
                  </span>
                </div>

                {/* Votes List */}
                <div className="p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Group votes by target */}
                    {Object.entries(
                      Object.entries(entry.votes).reduce((acc, [voterId, targetId]) => {
                        if (!acc[targetId]) acc[targetId] = [];
                        acc[targetId].push(voterId);
                        return acc;
                      }, {})
                    ).map(([targetId, voterIds]) => (
                      <div
                        key={targetId}
                        className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-700 shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                          {targetId === 'skip' ? (
                            <span className="font-bold text-slate-500 text-sm">Skip Vote</span>
                          ) : (
                            <>
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: getPlayerAvatarColor(targetId) }}
                              >
                                {getPlayerName(targetId)[0]}
                              </div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                {getPlayerName(targetId)}
                              </span>
                            </>
                          )}
                          <span className="ml-auto text-xs font-bold text-slate-400">
                            {voterIds.length} {voterIds.length === 1 ? 'vote' : 'votes'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {voterIds.map((voterId) => (
                            <div
                              key={voterId}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-white dark:ring-slate-800"
                              style={{ backgroundColor: getPlayerAvatarColor(voterId) }}
                              title={`${getPlayerName(voterId)} voted for ${targetId === 'skip' ? 'Skip' : getPlayerName(targetId)}`}
                            >
                              {getPlayerName(voterId)[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
