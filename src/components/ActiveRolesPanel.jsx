import React, { useState } from 'react';
import { ROLES } from '../constants';
import { Users, ChevronDown } from 'lucide-react';

export default function ActiveRolesPanel({ activeRoles, wolfCount, playerCount }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!activeRoles) return null;

  // Start with special roles from settings
  const rolesInSession = Object.values(ROLES).filter(r => activeRoles[r.id]);

  // Add Werewolf if they are in the game
  if (wolfCount > 0 && !rolesInSession.find(r => r.id === 'werewolf')) {
    rolesInSession.push(ROLES.WEREWOLF);
  }

  // Calculate if villagers are present
  const activeSpecialRolesCount = Object.entries(activeRoles)
    .filter(([id, isActive]) => isActive && id !== ROLES.MASON.id).length;
  const masonCount = activeRoles[ROLES.MASON.id] ? 2 : 0;
  const totalRolesNeeded = wolfCount + activeSpecialRolesCount + masonCount;
  const villagersCount = Math.max(0, playerCount - totalRolesNeeded);

  // Add Villager if they are in the game
  if (villagersCount > 0 && !rolesInSession.find(r => r.id === 'villager')) {
    rolesInSession.push(ROLES.VILLAGER);
  }

  // Sort roles for consistent display (e.g., by alignment)
  rolesInSession.sort((a, b) => {
    const alignmentOrder = { 'evil': 0, 'neutral': 1, 'good': 2 };
    if (alignmentOrder[a.alignment] !== alignmentOrder[b.alignment]) {
      return alignmentOrder[a.alignment] - alignmentOrder[b.alignment];
    }
    return a.name.localeCompare(b.name);
  });


  if (rolesInSession.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-slate-900/80 backdrop-blur border border-indigo-500/30 rounded-lg z-40 shadow-lg w-64">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-indigo-200">Roles in Session</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-indigo-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="p-3 border-t border-indigo-500/30">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {rolesInSession.map(r => (
              <div key={r.id} className="bg-slate-800 p-2 rounded-lg flex items-center gap-2">
                {React.createElement(r.icon, { className: "w-6 h-6 text-indigo-400" })}
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-200">{r.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
