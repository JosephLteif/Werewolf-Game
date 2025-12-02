import { Check } from 'lucide-react';
import VoterAvatars from '../components/VoterAvatars.jsx';

export default function DayVoteScreen({
  gameState,
  players,
  amAlive,
  castVote,
  lockVote,
  now,
  user,
}) {
  // Calculate vote counts
  const voteCounts = {};
  const alivePlayers = players.filter((p) => p.isAlive);

  // Initialize counts
  alivePlayers.forEach((p) => (voteCounts[p.id] = 0));
  voteCounts['skip'] = 0;

  // Count votes
  Object.values(gameState.votes || {}).forEach((targetId) => {
    if (voteCounts[targetId] !== undefined) {
      voteCounts[targetId]++;
    }
  });

  // Map targetId -> array of voterIds
  const votesByTarget = {};
  Object.entries(gameState.votes || {}).forEach(([voterId, targetId]) => {
    if (!votesByTarget[targetId]) {
      votesByTarget[targetId] = [];
    }
    votesByTarget[targetId].push(voterId);
  });

  const myVote = gameState.votes?.[user.uid];
  const isLocked = gameState.lockedVotes?.includes(user.uid);
  const lockedCount = gameState.lockedVotes?.length || 0;
  const totalPlayers = alivePlayers.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 text-slate-900 p-4 flex flex-col relative">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          {!amAlive && (
            <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-full inline-block mb-4 text-sm font-bold shadow-lg">
              👻 You are dead (Spectating)
            </div>
          )}
          <h2 className="text-3xl font-black text-orange-600 mb-2">Village Vote</h2>
          <p className="text-slate-600 text-sm">Discuss and vote to eliminate a suspect</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-700">
              {lockedCount} / {totalPlayers} Locked
            </span>
          </div>
          {gameState.phaseEndTime && (
            <div className="mt-2 text-2xl font-mono font-black text-orange-500">
              {Math.max(0, Math.ceil((gameState.phaseEndTime - now) / 1000))}s
            </div>
          )}
        </div>

        {/* Player Cards */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {alivePlayers.map((p) => {
            const voteCount = voteCounts[p.id] || 0;
            const votePercentage = totalPlayers > 0 ? (voteCount / totalPlayers) * 100 : 0;
            const isMyVote = myVote === p.id;
            const isPlayerLocked = gameState.lockedVotes?.includes(p.id);

            return (
              <button
                key={p.id}
                onClick={() => amAlive && !isLocked && castVote(p.id)}
                disabled={!amAlive || isLocked}
                className={`w-full relative overflow-hidden rounded-2xl border-2 transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed
                  ${isMyVote ? 'border-orange-500 bg-white' : 'border-slate-200 bg-white hover:border-orange-300'}`}
              >
                {/* Vote Progress Bar */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-orange-200 to-orange-100 transition-all duration-500"
                  style={{ width: `${votePercentage}%` }}
                />

                {/* Content */}
                <div className="relative p-4 flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name[0]}
                  </div>

                  <div className="flex-1 text-left">
                    <div className="font-bold text-lg">
                      {p.name}
                      {p.id === user.uid && (
                        <span className="text-sm text-orange-600 ml-2">(You)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      {voteCount > 0 && (
                        <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">
                          {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                        </span>
                      )}

                      {/* Show avatars of voters */}
                      <VoterAvatars voterIds={votesByTarget[p.id]} players={players} />

                      {isPlayerLocked && (
                        <span className="bg-green-500 text-white px-2 py-0.5 rounded-full font-bold text-[10px]">
                          LOCKED
                        </span>
                      )}
                    </div>
                  </div>

                  {isMyVote && <Check className="w-6 h-6 text-orange-500" />}
                </div>
              </button>
            );
          })}

          {/* Skip Vote Option */}
          <button
            onClick={() => amAlive && !isLocked && castVote('skip')}
            disabled={!amAlive || isLocked}
            className={`w-full p-4 rounded-2xl border-2 border-dashed transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed
              ${myVote === 'skip' ? 'border-slate-500 bg-slate-100' : 'border-slate-300 bg-white hover:border-slate-400'}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600">Skip Elimination</span>
              <div className="flex items-center gap-2">
                {voteCounts['skip'] > 0 && (
                  <span className="bg-slate-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    {voteCounts['skip']}
                  </span>
                )}

                {/* Show avatars of voters for skip */}
                <VoterAvatars voterIds={votesByTarget['skip']} players={players} />

                {myVote === 'skip' && <Check className="w-5 h-5 text-slate-600" />}
              </div>
            </div>
          </button>
        </div>

        {/* Action Bar */}
        {amAlive && (
          <div className="bg-white rounded-2xl shadow-lg p-4 border-2 border-slate-200">
            {!isLocked ? (
              <button
                onClick={lockVote}
                disabled={!myVote}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:from-slate-400 disabled:to-slate-300 text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {myVote ? 'Lock Vote' : 'Select a player first'}
              </button>
            ) : (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold">
                  <Check className="w-5 h-5" />
                  Vote Locked
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Waiting for {totalPlayers - lockedCount}{' '}
                  {totalPlayers - lockedCount === 1 ? 'player' : 'players'}...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
