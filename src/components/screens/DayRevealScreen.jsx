
import { Sun } from 'lucide-react';
import { PHASES } from '../../constants';

export default function DayRevealScreen({ myPlayer, gameState, isHost, updateGame, now }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Animated sun rays */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-1 bg-gradient-to-b from-orange-400 to-transparent origin-top"
            style={{
              height: '50%',
              transform: `rotate(${i * 30}deg) translateY(-50%)`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <div className="relative mb-8">
          <div className="absolute inset-0 blur-2xl bg-orange-300 opacity-30 rounded-full"></div>
          <Sun className="relative w-32 h-32 text-orange-500 animate-spin-slow drop-shadow-lg" />
        </div>
        <h2 className="text-5xl font-black mb-6 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent">Morning Breaks</h2>
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl mb-10 max-w-md border-2 border-orange-200">
          <p className="text-xl font-bold leading-relaxed text-slate-800">{gameState.dayLog}</p>
        </div>
        {isHost ? (
          <button
            onClick={() => updateGame({ phase: PHASES.DAY_VOTE, votes: {}, lockedVotes: [], phaseEndTime: now + (gameState.settings.votingWaitTime * 1000) })}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-orange-900/30 transition-all hover:scale-105"
          >
            Start Voting
          </button>
        ) : (
          <div className="text-slate-500 text-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            Waiting for host...
          </div>
        )}
      </div>
    </div>
  );
}
