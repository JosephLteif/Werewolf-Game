import React from 'react';
import { Eye } from 'lucide-react';
import { ROLE_IDS } from '../constants/roleIds';

export default function SeerNightActionScreen({
  players,
  user,
  advanceNightPhase,
  gameState,
  seerMessage,
  setSeerMessage,
  now,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 text-slate-100 p-4 flex flex-col relative">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        <div className="text-center mb-8 mt-4">
          <Eye className="w-16 h-16 text-purple-400 mx-auto mb-4 drop-shadow-lg" />
          <h2 className="text-4xl font-black text-purple-400 mb-2">Seer's Vision</h2>
          <p className="text-slate-400">Reveal the truth...</p>
        </div>

        {seerMessage ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-2 border-purple-500 p-8 rounded-2xl mb-8 max-w-md shadow-lg shadow-purple-500/30">
              <p className="text-2xl font-bold">{seerMessage}</p>
            </div>
            <button
              onClick={() => {
                setSeerMessage(null);
                advanceNightPhase(null, null);
              }}
              className="w-full max-w-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-4 rounded-2xl font-bold shadow-lg transition-all hover:scale-105"
            >
              Continue
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {players
                .filter((p) => p.isAlive && p.id !== user.uid)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const isEvil = p.role === ROLE_IDS.WEREWOLF || p.role === ROLE_IDS.LYCAN;
                      setSeerMessage(`${p.name} is ${isEvil ? 'EVIL' : 'GOOD'}.`);
                    }}
                    className="w-full p-4 bg-slate-900/50 rounded-2xl text-left font-bold border-2 border-slate-700 hover:border-purple-500 transition-all shadow-lg hover:shadow-xl flex items-center gap-4"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: p.avatarColor }}
                    >
                      {p.name[0]}
                    </div>
                    <span className="text-lg">{p.name}</span>
                  </button>
                ))}
            </div>
            <div className="text-center text-purple-400 font-mono font-bold text-2xl">
              {gameState.phaseEndTime
                ? Math.max(0, Math.ceil((gameState.phaseEndTime - now) / 1000)) + 's'
                : ''}
            </div>
            <button
              onClick={() => advanceNightPhase(null, null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl mt-2"
            >
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
}
