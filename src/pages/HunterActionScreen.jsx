import React from 'react';
import { Crosshair } from 'lucide-react';

export default function HunterActionScreen({ players, handleHunterShotAction }) {
  return (
    <div className="min-h-screen bg-red-950 text-white p-6 flex flex-col items-center justify-center">
      <Crosshair className="w-16 h-16 mb-4" />
      <h2 className="text-2xl font-bold mb-4">REVENGE!</h2>
      <p className="mb-6 text-center">Select someone to take with you.</p>
      <div className="w-full space-y-2">
        {players
          .filter((p) => p.isAlive)
          .map((p) => (
            <button
              key={p.id}
              onClick={() => handleHunterShotAction(p.id)}
              className="w-full p-4 bg-red-900/50 border border-red-500 rounded-xl font-bold"
            >
              {p.name}
            </button>
          ))}
      </div>
    </div>
  );
}
