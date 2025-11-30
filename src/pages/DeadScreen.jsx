import { useState, useEffect } from 'react';
import { ROLE_IDS } from '../constants/roleIds';
import { roleRegistry } from '../roles/RoleRegistry.js';
import { isPlayerWinner } from '../utils/winConditions';
import { Skull, RotateCcw } from 'lucide-react';

export default function DeadScreen({
  winner,
  winners = [],
  isGameOver,
  onReset,
  isHost,
  dayLog,
  players,
  lovers,
  gameSettings, // Add gameSettings to props
}) {
  const winnerColors = {
    VILLAGERS: { bg: 'from-blue-600 to-cyan-600', text: 'text-blue-400', alignment: 'good' },
    WEREWOLVES: { bg: 'from-red-600 to-rose-600', text: 'text-red-400', alignment: 'evil' },
    LOVERS: { bg: 'from-pink-600 to-rose-600', text: 'text-pink-400', alignment: 'neutral' },
    CUPID: { bg: 'from-pink-500 to-red-500', text: 'text-pink-300', alignment: 'neutral' },
    TANNER: { bg: 'from-amber-600 to-orange-600', text: 'text-amber-400', alignment: 'neutral' }, // Add Tanner
    WINNER: { bg: 'from-slate-700 to-slate-800', text: 'text-slate-400' }, // Generic winner
  };

  const colors =
    isGameOver
      ? winnerColors[winner] || winnerColors.WINNER // Use winner prop, fall back to generic
      : { bg: 'from-slate-700 to-slate-800', text: 'text-slate-400' };

  // Filter winners
  const winningPlayers = players
    ? players.filter((p) => isPlayerWinner(p, winners, lovers, gameSettings))
    : [];
  const [deadParticles, setDeadParticles] = useState(null);
  useEffect(() => {
    if (!isGameOver) return;
    const t = setTimeout(() => {
      setDeadParticles(
        Array.from({ length: 30 }).map(() => ({
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          delay: `${Math.random() * 3}s`,
          dur: `${2 + Math.random() * 3}s`,
        }))
      );
    }, 0);
    return () => clearTimeout(t);
  }, [isGameOver]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Ambient background */}
      {isGameOver && (
        <div className="absolute inset-0 opacity-10">
          {deadParticles &&
            deadParticles.map((p, i) => (
              <div
                key={i}
                className={`absolute w-1 h-1 ${colors.text} rounded-full animate-pulse`}
                style={{
                  top: p.top,
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.dur,
                }}
              />
            ))}
        </div>
      )}

      <div className="relative z-10 max-w-md w-full">
        {isGameOver ? (
          <>
            <div
              className={`w-32 h-32 rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center mb-8 shadow-2xl animate-pulse mx-auto`}
            >
              <Skull className="w-16 h-16 text-white" />
            </div>
            <h2
              className={`text-6xl font-black mb-4 bg-gradient-to-r ${colors.bg} bg-clip-text text-transparent`}
            >
              {winner} WIN!
            </h2>
            <p className="text-slate-400 mb-8 text-xl">Game Over</p>

            {winningPlayers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-4">
                  Winning Players
                </h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {winningPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-2 rounded-full"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: p.avatarColor }}
                      >
                        {p.name[0]}
                      </div>
                      <span className="font-bold text-sm">{p.name}</span>
                      <span className="text-xs text-slate-500">
                        ({(p.role === ROLE_IDS.TANNER && winners.includes(p.id)) ? 'Tanner' : roleRegistry.getRole(p.role)?.name || p.role})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <Skull className="w-24 h-24 text-slate-600 mb-6 opacity-50 mx-auto" />
            <h2 className="text-4xl font-black mb-3 text-slate-300">YOU ARE DEAD</h2>
            <p className="text-slate-500 mb-8">You can watch, but don't speak.</p>

            {dayLog && (
              <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl backdrop-blur-sm">
                <h3 className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-widest">
                  Latest News
                </h3>
                <p className="text-slate-200 font-medium leading-relaxed">{dayLog}</p>
              </div>
            )}
          </>
        )}

        {isHost && isGameOver && (
          <button
            onClick={onReset}
            className={`bg-gradient-to-r ${colors.bg} hover:opacity-80 text-white px-10 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-lg transition-all hover:scale-105 mx-auto`}
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}
