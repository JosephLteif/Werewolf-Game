import { ROLE_IDS, TANNER_WIN_STRATEGIES } from '../../constants';

export const TannerWinStrategy = {
  id: 'TANNER_WIN',
  priority: 1,
  check: ({ recentDeath, gameSettings, currentWinners }) => {
    // If Tanner is already a winner, don't re-trigger
    if (currentWinners.includes('TANNER')) return null;

    // Check if the recent death was the Tanner and they died by voting
    if (recentDeath && recentDeath.role === ROLE_IDS.TANNER && recentDeath.cause === 'VOTE') {
      const isGameOver = gameSettings.tannerWinStrategy === TANNER_WIN_STRATEGIES.END_GAME;

      return {
        winner: 'TANNER',
        winners: [recentDeath.id],
        isGameOver,
      };
    }

    return null;
  },
};
