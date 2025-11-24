import React from 'react';
import { Moon } from 'lucide-react';

export function WaitingScreen() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative">
                <div className="w-24 h-24 rounded-full bg-indigo-900/30 flex items-center justify-center mb-6 animate-pulse">
                    <Moon className="w-12 h-12 text-indigo-400" />
                </div>
            </div>
            <h2 className="text-2xl font-bold mb-3 text-indigo-200">You are sleeping...</h2>
            <p className="text-indigo-400/70 text-sm">Someone is taking their turn</p>
            <div className="mt-8 flex gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
        </div>
    );
}
