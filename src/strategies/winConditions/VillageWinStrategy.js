import { ROLE_IDS } from '../../constants/roleIds';
import { roleRegistry } from '../../roles/RoleRegistry';
import { TEAMS } from '../../constants';

export const VillageWinStrategy = {
  id: 'VILLAGE_WIN',
  priority: 10,
  check: ({ alivePlayers, currentWinners }) => {
    if (currentWinners.includes('LOVERS')) return null;

    // Calculate active wolves - check both role ID and team alignment
    // This handles Shapeshifters who have transformed into werewolves
    const activeWolves = alivePlayers.filter((p) => {
      // Direct werewolf role
      if (p.role === ROLE_IDS.WEREWOLF) return true;

      // Check if player has werewolf team through transformation (e.g., Shapeshifter)
      const role = roleRegistry.getRole(p.role);
      const playerTeam = p.team || role?.team;
      return playerTeam === TEAMS.WEREWOLF || playerTeam?.id === TEAMS.WEREWOLF;
    }).length;

    // Villagers Win: No werewolves left
    if (activeWolves === 0) {
      return {
        winner: 'VILLAGERS',
        winners: ['VILLAGERS'],
        isGameOver: true,
      };
    }

    return null;
  },
};
