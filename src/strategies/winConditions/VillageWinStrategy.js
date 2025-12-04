import { ALIGNMENTS } from '../../constants/alignments';
import { ROLE_IDS } from '../../constants/roleIds';

export const VillageWinStrategy = {
  id: 'VILLAGE_WIN',
  priority: 10,
  check: ({ alivePlayers, currentWinners }) => {
    if (currentWinners.includes('LOVERS')) return null;

    // Calculate active wolves
    const activeWolves = alivePlayers.filter((p) => p.role === ROLE_IDS.WEREWOLF).length;

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
