import React, { useState } from 'react';
import { ROLE_IDS } from '../constants/roleIds';
import { Users, ChevronDown, Info } from 'lucide-react';
import RoleInfoModal from './RoleInfoModal'; // Changed to default import
import RoleRulesModal from './RoleRulesModal'; // New import for rules modal
import { roleRegistry } from '../roles/RoleRegistry';

export default function ActiveRolesPanel({ activeRoles, wolfCount, playerCount }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRoleInfoModalOpen, setIsRoleInfoModalOpen] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showAllRolesModal, setShowAllRolesModal] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  if (!activeRoles) return null;

  // Start with special roles from settings
  const rolesInSession = roleRegistry.getAllRoles().filter((r) => activeRoles[r.id]);

  // Add Werewolf if they are in the game
  if (wolfCount > 0 && !rolesInSession.find((r) => r.id === 'werewolf')) {
    rolesInSession.push(roleRegistry.getRole(ROLE_IDS.WEREWOLF));
  }

  // Calculate if villagers are present
  const activeSpecialRolesCount = Object.entries(activeRoles).filter(
    ([id, isActive]) => isActive && id !== ROLE_IDS.MASON
  ).length;
  const masonCount = activeRoles[ROLE_IDS.MASON] ? 2 : 0;
  const totalRolesNeeded = wolfCount + activeSpecialRolesCount + masonCount;
  const villagersCount = Math.max(0, playerCount - totalRolesNeeded);

  // Add Villager if they are in the game
  if (villagersCount > 0 && !rolesInSession.find((r) => r.id === 'villager')) {
    rolesInSession.push(roleRegistry.getRole(ROLE_IDS.VILLAGER));
  }

  // Sort roles for consistent display (e.g., by alignment)
  rolesInSession.sort((a, b) => {
    const alignmentOrder = { evil: 0, neutral: 1, good: 2 };
    if (alignmentOrder[a.alignment] !== alignmentOrder[b.alignment]) {
      return alignmentOrder[a.alignment] - alignmentOrder[b.alignment];
    }
    return a.name.localeCompare(b.name);
  });

  if (rolesInSession.length === 0) return null;

  const handleOpenRoleInfo = (roleId) => {
    setSelectedRoleId(roleId);
    setIsRoleInfoModalOpen(true);
    setShowRulesModal(false);
    setShowAllRolesModal(false);
  };

  const handleOpenRulesModal = () => {
    setShowRulesModal(true);
    setIsRoleInfoModalOpen(false);
    setShowAllRolesModal(false);
    setSelectedRoleId(null);
  };

  const handleOpenAllRolesModal = () => {
    setShowAllRolesModal(true);
    setIsRoleInfoModalOpen(false);
    setShowRulesModal(false);
    setSelectedRoleId(null);
  };

  const handleCloseModal = () => {
    setIsRoleInfoModalOpen(false);
    setShowRulesModal(false);
    setShowAllRolesModal(false);
    setSelectedRoleId(null);
  };

  return (
    <>
      <div
        className="fixed bottom-4 left-4 bg-slate-900/80 backdrop-blur border border-indigo-500/30 rounded-lg z-40 shadow-lg w-64"
        data-testid="active-roles-panel"
      >
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
            <div className="flex flex-col gap-2 mb-3">
              <button
                onClick={handleOpenRulesModal}
                className="w-full text-left px-3 py-2 rounded-md bg-indigo-700/30 hover:bg-indigo-700/50 text-indigo-200 text-sm font-medium transition-colors"
              >
                View Rules
              </button>
              <button
                onClick={handleOpenAllRolesModal}
                className="w-full text-left px-3 py-2 rounded-md bg-indigo-700/30 hover:bg-indigo-700/50 text-indigo-200 text-sm font-medium transition-colors"
              >
                View All Roles
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {rolesInSession.map((r) => (
                <div key={r.id} className="bg-slate-800 p-2 rounded-lg flex items-center gap-2">
                  {React.createElement(r.icon, { className: 'w-6 h-6 text-indigo-400' })}
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">{r.name}</span>
                    <button
                      onClick={() => handleOpenRoleInfo(r.id)}
                      className="p-1 rounded-full hover:bg-slate-700 transition-colors"
                      aria-label={`View info for ${r.name}`}
                    >
                      <Info className="w-4 h-4 text-indigo-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {showRulesModal && <RoleRulesModal onClose={handleCloseModal} />}
      {isRoleInfoModalOpen && selectedRoleId && (
        <RoleInfoModal selectedRoleId={selectedRoleId} onClose={handleCloseModal} />
      )}
      {showAllRolesModal && (
        <RoleInfoModal showAllRoles={true} onClose={handleCloseModal} />
      )}
    </>
  );
}
