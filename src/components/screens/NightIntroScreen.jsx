
import { Moon } from 'lucide-react';

export default function NightIntroScreen({ isHost, startNight, nightIntroStars }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Animated stars background */}
      <div className="absolute inset-0 opacity-30">
        {nightIntroStars && nightIntroStars.map((s, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              top: s.top,
              left: s.left,
              animationDelay: s.delay,
              animationDuration: s.dur
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <Moon className="w-32 h-32 mb-8 text-indigo-300 animate-pulse drop-shadow-[0_0_30px_rgba(165,180,252,0.5)]" />
        <h2 className="text-5xl font-black mb-4 bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200 bg-clip-text text-transparent">Night Falls</h2>
        <p className="text-indigo-300 mb-12 text-lg">The village sleeps... but evil awakens</p>
        {isHost && (
          <button
            onClick={startNight}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-900/50 transition-all hover:scale-105"
          >
            Begin Night
          </button>
        )}
      </div>
    </div>
  );
}
