import { useState } from 'react';
import { ROLE_IDS } from '../constants/roleIds';
import { roleRegistry } from '../roles/RoleRegistry';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';

export default function TeammateList({ players, myPlayer, gameState }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!myPlayer || !players) return null;

  if (!myPlayer || !players) return null;

  const currentRole = roleRegistry.getRole(myPlayer.role);
  const relevantPlayers = currentRole
    ? currentRole.getVisibleTeammates(myPlayer, players, gameState)
    : [];

  // Title Logic - Keeping it simple based on role or fallback
  let title = 'Allies';
  if (myPlayer.role === ROLE_IDS.WEREWOLF) title = 'Pack & Allies';
  else if (myPlayer.role === ROLE_IDS.FANATIC) title = 'My Leader';
  else if (myPlayer.role === ROLE_IDS.TWIN) title = 'Your Twin';
  else if (myPlayer.role === ROLE_IDS.CUPID) title = 'Lovers'; // Cupid Logic handling below

  // 4. Cupid Logic (See Lovers) - Keeping this here as Cupid might not have getVisibleTeammates implemented perfectly or as a safeguard
  // Actually, let's append Cupid logic to relevantPlayers if not already handled by Role.js logic (which we assume isn't strictly yet for Cupid)
  if (myPlayer.role === ROLE_IDS.CUPID && gameState.lovers) {
    const lovers = players.filter((p) => gameState.lovers.includes(p.id));
    // Avoid duplicates if Cupid role implementation eventually handles this
    lovers.forEach((l) => {
      if (!relevantPlayers.find((rp) => rp.id === l.id)) {
        relevantPlayers.push(l);
      }
    });
  }

  const amILover = gameState.lovers?.includes(myPlayer.id);
  let partner = null;
  if (amILover) {
    partner = players.find((p) => gameState.lovers.includes(p.id) && p.id !== myPlayer.id);
  }

  // If I have no relevant role-based players AND no partner, don't show anything.
  if (relevantPlayers.length === 0 && !partner) return null;

  return (
    <div className="fixed top-4 left-4 z-50 max-w-[200px]" data-testid="teammate-list">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl shadow-xl overflow-hidden transition-all">
        {/* Header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Users className="w-3 h-3" />
            <span>Allies</span>
          </div>
          {isCollapsed ? (
            <ChevronDown className="w-3 h-3 text-slate-400" />
          ) : (
            <ChevronUp className="w-3 h-3 text-slate-400" />
          )}
        </button>

        {/* Content */}
        {!isCollapsed && (
          <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
            {/* Role-based Teammates */}
            {relevantPlayers.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase px-1">{title}</div>
                {relevantPlayers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: p.avatarColor }}
                    >
                      {p.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {!p.isAlive
                          ? '💀 Dead'
                          : p.role === ROLE_IDS.MINION
                                                      ? 'Fanatic'
                                                      : p.role === ROLE_IDS.WEREWOLF                              ? 'Werewolf'
                              : 'Ally'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lover Partner */}
            {partner && (
              <div className="space-y-1 pt-1">
                <div className="text-[10px] font-bold text-pink-400 uppercase px-1">My Lover</div>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-pink-900/20 border border-pink-500/30">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: partner.avatarColor }}
                  >
                    {partner.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-pink-200 truncate">{partner.name}</div>
                    <div className="text-[10px] text-pink-400/70 truncate">
                      {!partner.isAlive ? '💀 Dead' : 'Partner'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
