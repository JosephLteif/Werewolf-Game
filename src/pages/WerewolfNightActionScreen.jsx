import React, {useEffect, useState} from 'react';
import {Check, Skull} from 'lucide-react';
import {ROLES} from '../constants';
import VoterAvatars from '../components/VoterAvatars.jsx';

export default function WerewolfNightActionScreen({
  gameState,
  players,
  user,
  advanceNight,
  phaseEndTime,
}) {
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeLeft = phaseEndTime ? Math.max(0, Math.ceil((phaseEndTime - now) / 1000)) : null;

  const alivePlayers = players.filter(p => p.isAlive);
  const votingWerewolves = alivePlayers.filter(p => p.role === ROLES.WEREWOLF.id);
  const totalVotingWerewolves = votingWerewolves.length;
  const confirmedVotesCount = Object.values(gameState.nightActions?.werewolfVotes || {}).length;

  // Combine confirmed and provisional votes, with confirmed taking precedence
  const effectiveWerewolfVotes = {};
  votingWerewolves.forEach(ww => {
    // If a werewolf has a confirmed vote, use that
    if (gameState.nightActions?.werewolfVotes?.[ww.id]) {
      effectiveWerewolfVotes[ww.id] = gameState.nightActions.werewolfVotes[ww.id];
    }
    // Otherwise, if they have a provisional vote, use that
    else if (gameState.nightActions?.werewolfProvisionalVotes?.[ww.id]) {
      effectiveWerewolfVotes[ww.id] = gameState.nightActions.werewolfProvisionalVotes[ww.id];
    }
    // If neither, their effective vote is undefined (or null, which works the same for counting)
  });

  // Calculate werewolf vote counts from effective votes
  const werewolfVoteCounts = {};
  alivePlayers.forEach(p => werewolfVoteCounts[p.id] = 0);

  Object.values(effectiveWerewolfVotes).forEach(targetId => {
    if (targetId && werewolfVoteCounts[targetId] !== undefined) {
      werewolfVoteCounts[targetId]++;
    }
  });

  // Map targetId -> array of voterIds
  const votesByTarget = {};
  Object.entries(effectiveWerewolfVotes).forEach(([voterId, targetId]) => {
    if (!votesByTarget[targetId]) {
      votesByTarget[targetId] = [];
    }
    votesByTarget[targetId].push(voterId);
  });

  const myConfirmedVote = gameState.nightActions?.werewolfVotes?.[user.uid];
  const myVote = myConfirmedVote; // My current effective vote

  const handleCastVote = (targetId) => {
    setSelectedTargetId(targetId);
    advanceNight('werewolfProvisionalVote', { voterId: user.uid, targetId: targetId });
  };

  const confirmVote = () => {
    if (selectedTargetId) {
      advanceNight('werewolfVote', { voterId: user.uid, targetId: selectedTargetId });
    }
  };

  if (myConfirmedVote) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-red-900/30 flex items-center justify-center mb-6 animate-pulse">
            <Check className="w-12 h-12 text-red-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-red-200">Waiting for other Werewolves...</h2>
        <p className="text-red-400/70 text-sm">Your vote has been cast. Waiting for others to confirm.</p>
        <div className="mt-8 flex gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-rose-950 to-slate-950 text-slate-100 p-4 flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center mb-8 mt-4">
          <h2 className="text-4xl font-black text-red-400 mb-2 drop-shadow-lg">Werewolf Hunt</h2>
          <p className="text-slate-400 text-base">Choose your victim. Coordinate with your pack.</p>
          {timeLeft !== null && (
            <div className="text-3xl font-mono font-black text-red-400 mt-2">
              {timeLeft}s
            </div>
          )}
          <div className="mt-3 inline-flex items-center gap-2 bg-white/10 text-red-100 px-4 py-2 rounded-full shadow-sm border border-red-700">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
            <span className="text-xs font-bold">{confirmedVotesCount} / {totalVotingWerewolves} Werewolves Voted</span>
          </div>
        </div>


        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {alivePlayers.map(p => {
              const displayedVoteCount = werewolfVoteCounts[p.id] || 0;

            const votePercentage = totalVotingWerewolves > 0 ? (displayedVoteCount / totalVotingWerewolves) * 100 : 0;
            const isSelectedByMe = selectedTargetId === p.id;
            const hasBeenVotedByMe = myVote === p.id;

            return (
              <button
                key={p.id}
                onClick={() => handleCastVote(p.id)}
                className={`w-full relative overflow-hidden rounded-2xl border-2 transition-all shadow-lg hover:shadow-xl
                  ${isSelectedByMe
                    ? 'border-red-500 bg-red-900/20 shadow-red-500/30'
                    : hasBeenVotedByMe
                      ? 'border-red-500 bg-red-900/20 shadow-red-500/30'
                      : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                  }`}
                disabled={!!myVote} // Disable selection if myVote is already cast
              >
                {/* Vote Progress Bar */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-red-800/30 to-rose-800/30 transition-all duration-500"
                  style={{ width: `${votePercentage}%` }}
                />

                {/* Content */}
                <div className="relative p-4 flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name[0]}
                  </div>

                  <div className="flex-1 text-left">
                    <div className="font-bold text-lg">
                      {p.name}
                      {p.id === user.uid && <span className="text-sm text-red-400 ml-2">(You)</span>}
                    </div>
                    {displayedVoteCount > 0 && (
                      <div className="text-sm text-red-300 flex items-center gap-2">
                        <span>{displayedVoteCount} {displayedVoteCount === 1 ? 'vote' : 'votes'}</span>

                        {/* Show avatars of voters */}
                        <div className="ml-2">
                          <VoterAvatars voterIds={votesByTarget[p.id]} players={players} size="6" borderColor="border-slate-900" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Teammate Indicator (Red Skull) */}
                  {((p.role === ROLES.WEREWOLF.id && p.id !== user.uid)) && (
                    <div className="bg-red-950/50 p-1.5 rounded-full border border-red-900/50" title="Teammate">
                      <Skull className="w-5 h-5 text-red-500" />
                    </div>
                  )}

                  {(isSelectedByMe || hasBeenVotedByMe) && (
                    <Check className="w-6 h-6 text-red-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-lg p-4 border-2 border-slate-800 space-y-3">
          {!myVote ? (
            <button
              disabled={!selectedTargetId} // Disable if no target selected
              onClick={confirmVote}
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-105"
            >
              <Check className="w-5 h-5" />
              {selectedTargetId ? 'Confirm Vote' : 'Select a player first'}
            </button>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 bg-green-900/50 text-green-400 px-4 py-2 rounded-full font-bold">
                <Check className="w-5 h-5" />
                Vote Confirmed
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Waiting for other werewolves to confirm their votes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
