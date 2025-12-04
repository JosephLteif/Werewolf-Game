import { TEAMS } from '../constants';
import { roleRegistry } from '../roles/RoleRegistry';
import { ROLE_IDS } from '../constants/roleIds';

/**
 * Checks if the game has ended and determines the winner
 * Returns the winning team(s) or null if game continues
 */
import { TannerWinStrategy } from '../strategies/winConditions/TannerWinStrategy';
import { LoversWinStrategy } from '../strategies/winConditions/LoversWinStrategy';
import { VillageWinStrategy } from '../strategies/winConditions/VillageWinStrategy';
import { WerewolfWinStrategy } from '../strategies/winConditions/WerewolfWinStrategy';

const STRATEGIES = [
  TannerWinStrategy,
  LoversWinStrategy,
  VillageWinStrategy,
  WerewolfWinStrategy,
].sort((a, b) => a.priority - b.priority);

/**
 * Checks if the game has ended and determines the winner
 * Returns the winning team(s) or null if game continues
 */
export function checkWinCondition(
  players,
  lovers,
  currentWinners = [],
  gameSettings,
  recentDeathContext = null
) {
  const alivePlayers = players.filter((p) => p.isAlive);
  let accumulatedWinners = [...currentWinners];
  let gameOverTriggered = false;
  let hasNewWinners = false;

  const context = {
    players,
    alivePlayers,
    lovers,
    gameSettings,
    currentWinners: accumulatedWinners,
    recentDeath: recentDeathContext,
  };

  for (const strategy of STRATEGIES) {
    const result = strategy.check(context);

    if (result) {
      if (result.winners) {
        result.winners.forEach((w) => {
          if (!accumulatedWinners.includes(w)) {
            accumulatedWinners.push(w);
            hasNewWinners = true;
          }
        });
      }

      if (result.isGameOver) {
        gameOverTriggered = true;
      }
    }
  }

  if (gameOverTriggered) {
    return {
      winners: accumulatedWinners,
      isGameOver: true,
    };
  }

  if (hasNewWinners) {
    return {
      winners: accumulatedWinners,
      isGameOver: false,
    };
  }

  return null;
}

/**
 * Determines if a player is a winner based on the winning teams.
 * Delegates the check to the player's role for polymorphic behavior.
 */
export function isPlayerWinner(player, winners, lovers, gameSettings) {
  if (!winners || winners.length === 0) return false;

  // Direct win by player ID (e.g., for Tanner)
  if (winners.includes(player.id)) return true;

  // The "Lovers" win is a global condition that can override normal team alignment.
  if (winners.includes('LOVERS') && lovers?.includes(player.id)) {
    return true;
  }

  // Check if player's specific role ID is among the winners
  if (winners.includes(player.role)) {
    // Special condition for Sorcerer: only wins with Werewolves if they found the Seer
    return !(player.role === ROLE_IDS.SORCERER && !player.foundSeer);

  }

  const role = roleRegistry.getRole(player.role);
  if (!role) {
    // Fallback for unknown roles: check team alignment only.
    // If player has a dynamic alignment (e.g., from Cupid) use that, otherwise use default team.
    const teamId = player.alignment || player.team?.id;
    return teamId ? winners.includes(teamId) : false;
  }

  // If player has a dynamic alignment (e.g., from Cupid) use that, otherwise use role's default team ID.
  const playerTeamId = player.alignment || role.team?.id;

  // Check if the player's team or alignment is among the winners
  if (playerTeamId && winners.includes(playerTeamId)) {
    // Special condition for Sorcerer if Werewolves won as a team but Sorcerer didn't find the Seer
    return !(player.role === ROLE_IDS.SORCERER && playerTeamId === TEAMS.WEREWOLF && !player.foundSeer);

  }

  // Delegate to role's checkWin for any specific, complex win conditions not covered above.
  // This allows roles to override the default team-based win if necessary.
  return role.checkWin(player, winners, { lovers, settings: gameSettings });
}
