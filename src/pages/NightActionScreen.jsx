import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

export default function NightActionScreen({
  title,
  subtitle,
  color,
  players,
  onAction,
  extras,
  multiSelect,
  maxSelect,
  canSkip,
  phaseEndTime,
}) {
  const [targets, setTargets] = useState([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeLeft = phaseEndTime ? Math.max(0, Math.ceil((phaseEndTime - now) / 1000)) : null;

  const toggleTarget = (id) => {
    if (multiSelect) {
      if (targets.includes(id)) {
        setTargets(targets.filter((t) => t !== id));
      } else if (targets.length < maxSelect) {
        setTargets([...targets, id]);
      }
    } else {
      setTargets([id]);
    }
  };

  const colorThemes = {
    red: {
      bg: 'from-red-950 via-rose-950 to-slate-950',
      cardBg: 'from-red-900/20 to-rose-900/20',
      border: 'border-red-500',
      text: 'text-red-400',
      button: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500',
      glow: 'shadow-red-500/30',
    },
    blue: {
      bg: 'from-blue-950 via-cyan-950 to-slate-950',
      cardBg: 'from-blue-900/20 to-cyan-900/20',
      border: 'border-blue-400',
      text: 'text-blue-400',
      button: 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500',
      glow: 'shadow-blue-500/30',
    },
    purple: {
      bg: 'from-purple-950 via-pink-950 to-slate-950',
      cardBg: 'from-purple-900/20 to-pink-900/20',
      border: 'border-purple-400',
      text: 'text-purple-400',
      button: 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500',
      glow: 'shadow-purple-500/30',
    },
    yellow: {
      bg: 'from-yellow-950 via-amber-950 to-slate-950',
      cardBg: 'from-yellow-900/20 to-amber-900/20',
      border: 'border-yellow-400',
      text: 'text-yellow-400',
      button: 'from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500',
      glow: 'shadow-yellow-500/30',
    },
  };

  const theme = colorThemes[color] || colorThemes.purple;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg} text-slate-100 p-4 flex flex-col`}>
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center mb-8 mt-4">
          <h2 className={`text-4xl font-black ${theme.text} mb-2 drop-shadow-lg`}>{title}</h2>
          <p className="text-slate-400 text-base">{subtitle}</p>
          {timeLeft !== null && (
            <div className={`text-3xl font-mono font-black ${theme.text} mt-2`}>{timeLeft}s</div>
          )}
          {multiSelect && (
            <div className="mt-3 inline-flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-700">
              <span className="text-xs font-bold text-slate-400">
                {targets.length} / {maxSelect} selected
              </span>
            </div>
          )}
        </div>

        {/* Player Cards */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {players.map((p) => {
            const isSelected = targets.includes(p.id);

            return (
              <button
                key={p.id}
                onClick={() => toggleTarget(p.id)}
                className={`w-full relative overflow-hidden rounded-2xl border-2 transition-all shadow-lg hover:shadow-xl
                  ${
                    isSelected
                      ? `bg-gradient-to-r ${theme.cardBg} ${theme.border} ${theme.glow}`
                      : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                  }`}
              >
                <div className="relative p-4 flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name[0]}
                  </div>

                  <div className="flex-1 text-left">
                    <div className="font-bold text-lg">{p.name}</div>
                    {extras && <div className="text-sm">{extras(p)}</div>}
                  </div>

                  {isSelected && <Check className={`w-6 h-6 ${theme.text}`} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-lg p-4 border-2 border-slate-800 space-y-3">
          <button
            disabled={targets.length === 0 || (multiSelect && targets.length < maxSelect)}
            onClick={() => onAction(multiSelect ? targets : targets[0])}
            className={`w-full bg-gradient-to-r ${theme.button} disabled:from-slate-700 disabled:to-slate-600 text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-105`}
          >
            <Check className="w-5 h-5" />
            Confirm Action
          </button>

          {canSkip && (
            <button
              onClick={() => onAction(multiSelect ? [] : null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl transition-all"
            >
              Skip Action
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
