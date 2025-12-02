import { ALIGNMENTS } from '../../constants/alignments';
import { roleRegistry } from '../../roles/RoleRegistry';

export const WerewolfWinStrategy = {
  id: 'WEREWOLF_WIN',
  priority: 10,
  check: ({ alivePlayers, currentWinners }) => {
    if (currentWinners.includes('LOVERS')) return null;

    // Calculate active wolves and good players
    const activeWolves = alivePlayers.filter((p) => p.role === 'werewolf').length;
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
