import { ROLE_IDS, TEAMS, CUPID_FATES } from '../../constants';

export const LoversWinStrategy = {
  id: 'LOVERS_WIN',
  priority: 5,
  check: ({ alivePlayers, lovers, players, gameSettings }) => {
    if (!lovers || lovers.length !== 2) return null;

    const [lover1Id, lover2Id] = lovers;
    const lover1 = players.find((p) => p.id === lover1Id);
    const lover2 = players.find((p) => p.id === lover2Id);
    const cupidPlayer = players.find((p) => p.role === ROLE_IDS.CUPID);

    if (lover1 && lover2 && lover1.isAlive && lover2.isAlive) {
      // Check for "Forbidden Love" (Wolf + Villager) - they would have TEAMS.LOVERS alignment
      // Or just generally if they are on the LOVERS team (which implies forbidden love usually)
      if (lover1.alignment === TEAMS.LOVERS && lover2.alignment === TEAMS.LOVERS) {
        // "Couple Win": Last two players alive are the lovers
        if (alivePlayers.length === 2) {
          return {
            winner: 'LOVERS',
            winners: ['LOVERS'],
            isGameOver: true,
          };
        }

        // "Throuple Win": Last three players alive are the two lovers + Cupid (if Cupid is Third Wheel)
        if (
          gameSettings.cupidFateOption === CUPID_FATES.THIRD_WHEEL &&
          cupidPlayer &&
          cupidPlayer.isAlive &&
          alivePlayers.length === 3
        ) {
          return {
            winner: 'LOVERS',
            winners: ['LOVERS', 'CUPID'],
            isGameOver: true,
          };
        }
      }
    }

    return null;
  },
};
