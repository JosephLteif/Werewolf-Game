import React from 'react';
import { Info } from 'lucide-react';
import { roleRegistry } from '../roles/RoleRegistry.js';

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

export default function RoleInfoModal({ selectedRoleId, showAllRoles, onClose }) {
  if (!selectedRoleId && !showAllRoles) return null;

  const role = selectedRoleId ? roleRegistry.getRole(selectedRoleId) : null;

  const colors = role ? alignmentColors[role.alignment] : null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50"
      onClick={onClose}
      data-testid="role-info-modal-backdrop"
    >
      <div
        className="bg-slate-800 p-6 rounded-2xl max-w-md w-full border border-slate-700 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {showAllRoles && (
          <>
            <h3 className="text-2xl font-black text-indigo-400 mb-4 flex items-center gap-2">
              <Info className="w-6 h-6" /> All Available Roles
            </h3>
            <div className="space-y-4">
              {roleRegistry
                .getAllRoles()
                .filter((r) => r.selectable !== false)
                .map((r) => (
                  <div
                    key={r.id}
                    className="bg-slate-900 p-3 rounded-xl flex items-center gap-3 border border-slate-700"
                  >
                    {React.createElement(r.icon, { className: 'w-8 h-8 text-indigo-400' })}
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-200">{r.name}</h4>
                      <p className="text-xs text-slate-400">{r.description}</p>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
        {!showAllRoles && role && (
          <>
            <div className="flex items-center gap-4 mb-4">
              {React.createElement(role.icon, {
                className: `w-12 h-12 ${colors ? colors.text : 'text-white'}`,
              })}
              <div className="flex-1">
                <h3 className={`text-2xl font-bold ${colors ? colors.text : 'text-white'}`}>
                  {role.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500 uppercase font-bold">
                    {role.alignment}
                  </span>
                  <span className="text-xs text-slate-600">•</span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Weight: {role.weight > 0 ? '+' : ''}
                    {role.weight}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-slate-300 mb-6">{role.description}</p>
          </>
        )}
        <button
          onClick={onClose}
          className="w-full bg-slate-700 hover:bg-slate-600 mt-6 py-3 rounded-xl font-bold transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
