import { ROLE_IDS, THE_FOOL_WIN_STRATEGIES } from '../../constants';

export const TheFoolWinStrategy = {
  id: 'THE_FOOL_WIN',
  priority: 1,
  check: ({ recentDeath, gameSettings, currentWinners }) => {
    // If The Fool is already a winner, don't re-trigger
    if (currentWinners.includes('THE_FOOL')) return null;

    // Check if the recent death was The Fool and they died by voting
    if (recentDeath && recentDeath.role === ROLE_IDS.THE_FOOL && recentDeath.cause === 'VOTE') {
      const isGameOver = gameSettings.theFoolWinStrategy === THE_FOOL_WIN_STRATEGIES.END_GAME;

      return {
        winner: 'THE_FOOL',
        winners: ['THE_FOOL'],
        isGameOver,
      };
    }

    return null;
  },
};
