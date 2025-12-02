import React from 'react';
import { Check } from 'lucide-react';

export default function PlayerReadyChip({ player }) {
  return (
    <div
      key={player.id}
      className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all duration-200
        ${
          player.ready
            ? 'bg-green-600/30 text-green-200 border border-green-500'
            : 'bg-slate-700/30 text-slate-400 border border-slate-600 opacity-60'
        }`}
    >
      {player.name}
      {player.ready && <Check className="w-4 h-4 text-green-400" />}
    </div>
  );
}
