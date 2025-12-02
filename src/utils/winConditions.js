import { TEAMS, CUPID_FATES } from '../constants';
import { roleRegistry } from '../roles/RoleRegistry';
import { ROLE_IDS } from '../constants/roleIds';
import { Teams } from '../models/Team'; // Explicitly import Teams
import { ALIGNMENTS } from '../constants/alignments';

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
 * Returns true if the player satisfies any win condition.
 */
export function isPlayerWinner(player, winners, lovers, gameSettings) {
  if (!winners || winners.length === 0) return false;

  // Direct win by player ID (e.g., custom winner IDs)
  if (winners.includes(player.id)) return true;

  const playerRole = roleRegistry.getRole(player.role);
  const teamId = player.alignment || playerRole?.team?.id;

  // Tanner win
  if (winners.includes('TANNER') && player.role === ROLE_IDS.TANNER) {
    return true;
  }
  // Lovers win
  if (winners.includes('LOVERS')) {
    if (lovers && lovers.includes(player.id)) return true;
    if (
      gameSettings.cupidFateOption === CUPID_FATES.THIRD_WHEEL &&
      player.role === ROLE_IDS.CUPID
    ) {
      return true;
    }
  }

  // Villagers win
  if (winners.includes('VILLAGERS') && teamId === Teams.VILLAGER.id) {
    return true;
  }

  // Werewolves win
  if (winners.includes('WEREWOLVES')) {
    // Sorcerer wins only if they have found the Seer
    if (playerRole && playerRole.id === ROLE_IDS.SORCERER) {
      return !!player.foundSeer;
    }
    // Any other werewolf team member wins
    if (teamId === Teams.WEREWOLF.id) {
      return true;
    }
  }

  // Cupid win (explicit)
  if (winners.includes('CUPID') && player.role === ROLE_IDS.CUPID) {
    return true;
  }

  return false;
}
