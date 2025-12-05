import { ALIGNMENTS } from '../../constants/alignments';
import { roleRegistry } from '../../roles/RoleRegistry';
import { TEAMS } from '../../constants';

export const WerewolfWinStrategy = {
  id: 'WEREWOLF_WIN',
  priority: 10,
  check: ({ alivePlayers, currentWinners }) => {
    if (currentWinners.includes('LOVERS')) return null;

    // Calculate active wolves - check both role ID and team alignment
    // This handles Doppelgangers who have transformed into werewolves
    const activeWolves = alivePlayers.filter((p) => {
      // Direct werewolf role
      if (p.role === 'werewolf') return true;

      // Check if player has werewolf team through transformation (e.g., Doppelganger)
      const role = roleRegistry.getRole(p.role);
      const playerTeam = p.team || role?.team;
      return playerTeam === TEAMS.WEREWOLF || playerTeam?.id === TEAMS.WEREWOLF;
    }).length;

    // Count good players based on their role's alignment
    const good = alivePlayers.filter((p) => {
      const role = roleRegistry.getRole(p.role);
      return role && role.alignment === ALIGNMENTS.GOOD;
    }).length;

    // Werewolves Win: Equal or more werewolves than good players
    if (activeWolves >= good && activeWolves > 0) {
      return {
        winner: 'WEREWOLVES',
        winners: ['WEREWOLVES'],
        isGameOver: true,
      };
    }

    return null;
  },
};

