import { useRef, useEffect, useState } from 'react'; // Added useRef, useEffect, useState
import { Check } from 'lucide-react';
import PlayerReadyChip from '../components/PlayerReadyChip';
import { roleRegistry } from '../roles/RoleRegistry.js';

export default function RoleRevealScreen({ myPlayer, markReady, players, roleRevealParticles }) {
  if (!myPlayer) return <div>Loading...</div>;
  const MyRole = roleRegistry.getRole(myPlayer.role);

  const cardRef = useRef(null);
  const [transformStyle, setTransformStyle] = useState({});
  const [sheenStyle, setSheenStyle] = useState({ opacity: 0 });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const { left, top, width, height } = card.getBoundingClientRect();

      const centerX = left + width / 2;
      const centerY = top + height / 2;

      // Calculate position relative to center, normalized to -1 to 1
      const offsetX = (clientX - centerX) / (width / 2);
      const offsetY = (clientY - centerY) / (height / 2);

      // Tilt angles (adjust multipliers for desired effect)
      const rotateX = -offsetY * 10; // Max 10 degrees up/down
      const rotateY = offsetX * 10; // Max 10 degrees left/right
      const scale = 1.03; // Slight scale up

      setTransformStyle({
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
        transition: 'none', // Disable transition during mouse move for responsiveness
      });
    };

    const handleMouseLeave = () => {
      setTransformStyle({
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
        transition: 'transform 0.3s ease-out', // Smooth reset
      });
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const alignmentColors = {
    good: {
      bg: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-400',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/50',
    },
    evil: {
      bg: 'from-red-500/20 to-rose-500/20',
      border: 'border-red-400',
      text: 'text-red-500',
      glow: 'shadow-red-500/50',
    },
    neutral: {
      bg: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-400',
      text: 'text-purple-400',
      glow: 'shadow-purple-500/50',
    },
  };

  const colors = alignmentColors[MyRole.alignment] || alignmentColors.good;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
      {/* Ambient particles */}
      <div className="absolute inset-0 opacity-20">
        {roleRevealParticles &&
          roleRevealParticles.map((p, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 ${colors.text} rounded-full animate-pulse`}
              style={{
                top: p.top,
                left: p.left,
                animationDelay: p.delay,
                animationDuration: p.dur,
              }}
            />
          ))}
      </div>

      <div className="relative z-10 max-w-md w-full group [perspective:1000px]">
        <h2 className="text-3xl font-black text-slate-400 mb-12 tracking-wide">Your Role Is...</h2>

        <div
          ref={cardRef} // Added ref
          className={`bg-gradient-to-br ${colors.bg} backdrop-blur-sm border-2 ${colors.border} p-10 rounded-3xl w-full mb-10 flex flex-col items-center gap-6 shadow-2xl ${colors.glow} relative overflow-hidden
          will-change-transform [transform-style:preserve-3d]`} // Modified classes
          style={transformStyle} // Added dynamic style
        >
          {/* Glow effect */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50 blur-xl`}
          ></div>

          <div className="relative z-30">
            <MyRole.icon className={`w-32 h-32 ${colors.text} drop-shadow-2xl`} />
          </div>
          <div className={`text-4xl font-black ${colors.text} relative z-30`}>{MyRole.name}</div>
          <p className="text-slate-300 text-base leading-relaxed relative z-30">
            {MyRole.description}
          </p>

          {/* Alignment badge */}
          <div
            className={`px-4 py-2 rounded-full ${colors.border} border ${colors.text} text-xs font-bold uppercase tracking-wider relative z-30`}
          >
            {MyRole.alignment}
          </div>
        </div>

        {!myPlayer.ready ? (
          <button
            onClick={markReady}
            className={`w-full bg-gradient-to-r ${colors.bg} hover:opacity-80 ${colors.border} border-2 ${colors.text} font-bold py-5 rounded-2xl shadow-lg transition-all hover:scale-105`}
          >
            I Understand
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3 text-green-400">
              <Check className="w-6 h-6" />
              <span className="font-bold">Ready!</span>
            </div>
            <p className="text-slate-500 text-sm">Waiting for others...</p>
          </div>
        )}

        <div className="mt-8 text-sm text-slate-600">
          <span className="font-bold text-slate-400">{players.filter((p) => p.ready).length}</span>{' '}
          / {players.length} ready
        </div>

        {/* Player Ready State Chips */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
          {players.map((player) => (
            <PlayerReadyChip key={player.id} player={player} />
          ))}
        </div>
      </div>
    </div>
  );
}
