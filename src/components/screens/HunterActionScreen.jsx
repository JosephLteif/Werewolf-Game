import React from 'react';
import { Crosshair } from 'lucide-react';

export function HunterActionScreen({ players, handleHunterShot, myPlayer, isHunter }) {
    if (isHunter) {
        return (
            <div className="min-h-screen bg-red-950 text-white p-6 flex flex-col items-center justify-center">
                <Crosshair className="w-16 h-16 mb-4" />
                <h2 className="text-2xl font-bold mb-4">REVENGE!</h2>
                <p className="mb-6 text-center">Select someone to take with you.</p>
                <div className="w-full max-w-md space-y-2">
                    {players.filter(p => p.isAlive).map(p => (
                        <button
                            key={p.id}
                            onClick={() => handleHunterShot(p.id)}
                            className="w-full p-4 bg-red-900/50 border border-red-500 rounded-xl font-bold hover:bg-red-900 transition-all flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: p.avatarColor }}>
                                {p.name[0]}
                            </div>
                            {p.name}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-400 flex items-center justify-center p-6 text-center">
            <div>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                    <Crosshair className="w-8 h-8" />
                </div>
                <p className="text-lg">Waiting for Hunter...</p>
            </div>
        </div>
    );
}
