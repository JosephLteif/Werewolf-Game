import React from 'react';
import { Ghost } from 'lucide-react';
import { ROLE_IDS } from '../constants/roleIds';

export default function MinionNightActionScreen({ players, advanceNightPhase }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-rose-950 to-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center text-center relative">
      <div className="max-w-md w-full">
        <div className="mb-8">
          <Ghost className="w-24 h-24 text-red-400 mx-auto mb-4 drop-shadow-lg" />
          <h2 className="text-4xl font-black text-red-400 mb-2">Your Allies</h2>
          <p className="text-slate-400">The Werewolves are...</p>
        </div>
        <div className="space-y-3 mb-8">
          {players.filter(p => p.role === ROLE_IDS.WEREWOLF).map(p => (
            <div key={p.id} className="bg-gradient-to-r from-red-900/30 to-rose-900/30 border-2 border-red-500 p-5 rounded-2xl font-bold text-lg shadow-lg shadow-red-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: p.avatarColor }}>
                  {p.name[0]}
                </div>
                {p.name}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => advanceNightPhase(null, null)} className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 px-8 py-4 rounded-2xl font-bold shadow-lg transition-all hover:scale-105">I Understand</button>
      </div>
    </div>
  );
}
