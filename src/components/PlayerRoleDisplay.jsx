import React from 'react';
import { roleRegistry } from '../roles/RoleRegistry';

export default function PlayerRoleDisplay({ myPlayer }) {
  if (!myPlayer) return null;

  const role = roleRegistry.getRole(myPlayer.role); // Assuming myPlayer.role is the ID, e.g., 'WEREWOLF'

  return (
    <div
      className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-indigo-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 z-50 shadow-lg"
      data-testid="player-role-display"
    >
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: myPlayer.avatarColor }}
      >
        {myPlayer.name[0]}
      </div>
      <span className="text-xs font-bold text-indigo-200">{myPlayer.name}</span>
      {role && (
        <>
          <span className="text-xs text-slate-600">•</span>
          {React.createElement(role.icon, { className: 'w-3 h-3 text-indigo-400' })}
          <span className="text-xs font-bold text-indigo-400">{role.name}</span>
        </>
      )}
    </div>
  );
}
