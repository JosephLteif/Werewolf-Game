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

  // Map display winner strings to team IDs for comparison
  const winnerToTeamMapping = {
    'VILLAGERS': TEAMS.VILLAGE,
    'WEREWOLVES': TEAMS.WEREWOLF,
    'LOVERS': TEAMS.LOVERS,
  };

  // Normalize winners to include both display strings and team IDs
  const normalizedWinners = winners.flatMap(w => {
    const teamId = winnerToTeamMapping[w];
    return teamId ? [w, teamId] : [w];
  });

  // Direct win by player ID (e.g., for Tanner)
  if (normalizedWinners.includes(player.id)) return true;

  // The "Lovers" win is a global condition that can override normal team alignment.
  if (normalizedWinners.includes('LOVERS') && lovers?.includes(player.id)) {
    return true;
  }

  // Check if player's specific role ID is among the winners
  if (normalizedWinners.includes(player.role)) {
    // Special condition for Sorcerer: only wins with Werewolves if they found the Seer
    return !(player.role === ROLE_IDS.SORCERER && !player.foundSeer);

  }

  const role = roleRegistry.getRole(player.role);
  if (!role) {
    // Fallback for unknown roles: check team alignment only.
    // player.team could be a Team object or a string ID
    const teamId = player.team?.id || player.team;
    return teamId ? normalizedWinners.includes(teamId) : false;
  }

  // Get the player's team ID - it could be stored directly on player (after transformation)
  // or we get it from the role definition. player.team might be a Team object with .id
  const playerTeamId = player.team?.id || player.team || role.team?.id;

  // Check if the player's team is among the winners
  if (playerTeamId && normalizedWinners.includes(playerTeamId)) {
    // Special condition for Sorcerer if Werewolves won as a team but Sorcerer didn't find the Seer
    return !(player.role === ROLE_IDS.SORCERER && playerTeamId === TEAMS.WEREWOLF && !player.foundSeer);

  }

  // Delegate to role's checkWin for any specific, complex win conditions not covered above.
  // This allows roles to override the default team-based win if necessary.
  return role.checkWin(player, normalizedWinners, { lovers, settings: gameSettings });
}
