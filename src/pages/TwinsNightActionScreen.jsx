import React from 'react';
import { Users, Check } from 'lucide-react';
import { ROLE_IDS } from '../constants/roleIds';

export default function TwinsNightActionScreen({ players, user, gameState, advanceNightPhase }) {
  if (!user) {
    return null;
  }
  const myTwinReady = gameState.nightActions?.twinsReady?.[user.uid];
  const aliveTwins = players.filter((p) => p.role === ROLE_IDS.TWIN && p.isAlive);
  const twinsReadyCount = Object.keys(gameState.nightActions?.twinsReady || {}).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-cyan-950 to-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center text-center relative">
      <div className="max-w-md w-full">
        <div className="mb-8">
          <Users className="w-24 h-24 text-blue-400 mx-auto mb-4 drop-shadow-lg" />
          <h2 className="text-4xl font-black text-blue-400 mb-2">Your Twin</h2>
          <p className="text-slate-400">Your trusted ally</p>
        </div>
        <div className="space-y-3 mb-8">
          {aliveTwins.filter((p) => p.id !== user.uid).length > 0 ? (
            aliveTwins
              .filter((p) => p.id !== user.uid)
              .map((p) => (
                <div
                  key={p.id}
                  className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-2 border-blue-500 p-5 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: p.avatarColor }}
                    >
                      {p.name[0]}
                    </div>
                    {p.name}
                  </div>
                </div>
              ))
          ) : (
            <div className="text-slate-400 italic bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
              You are the only Twin.
            </div>
          )}
        </div>
        {myTwinReady ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 bg-green-900/50 text-green-400 px-4 py-2 rounded-full font-bold">
              <Check className="w-5 h-5" />
              Waiting for others...
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {twinsReadyCount} / {aliveTwins.length} Twins ready
            </p>
          </div>
        ) : (
          <button
            onClick={() => advanceNightPhase('twinReady', user.uid)}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-8 py-4 rounded-2xl font-bold shadow-lg transition-all hover:scale-105"
          >
            I Understand
          </button>
        )}
      </div>
    </div>
  );
}
