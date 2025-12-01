import { TEAMS, CUPID_FATES } from '../constants';
import { roleRegistry } from '../roles/RoleRegistry';
import { ROLE_IDS } from '../constants/roleIds';
import { Teams } from '../models/Team'; // Explicitly import Teams
import { ALIGNMENTS } from '../constants/alignments';

/**
 * Checks if the game has ended and determines the winner
 * Returns the winning team(s) or null if game continues
 */
export function checkWinCondition(players, lovers, currentWinners = [], gameSettings) {
  const alivePlayers = players.filter((p) => p.isAlive);

  // Calculate active wolves and good players based on their roles
  // These counts now include players who are part of Forbidden Love, as they still
  // contribute to their original team's win condition if the Lovers don't win.
  const activeWolves = alivePlayers.filter((p) => p.role === 'werewolf').length;
  const good = alivePlayers.filter((p) => {
    const role = roleRegistry.getRole(p.role);
    return role && role.alignment === ALIGNMENTS.GOOD;
  }).length;

  // Cupid/Lovers Win condition
  if (lovers && lovers.length === 2) {
    const [lover1Id, lover2Id] = lovers;
    const lover1 = players.find((p) => p.id === lover1Id);
    const lover2 = players.find((p) => p.id === lover2Id);
    const cupidPlayer = players.find((p) => p.role === ROLE_IDS.CUPID);

    if (lover1 && lover2 && lover1.isAlive && lover2.isAlive) {
      // Check for "Forbidden Love" (Wolf + Villager) - they would have TEAMS.LOVERS alignment
      if (lover1.alignment === TEAMS.LOVERS && lover2.alignment === TEAMS.LOVERS) {
        // "Couple Win": Last two players alive are the lovers
        if (alivePlayers.length === 2) {
          return { winner: 'LOVERS', winners: [...currentWinners, 'LOVERS'], isGameOver: true };
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
            winners: [...currentWinners, 'LOVERS', 'CUPID'],
            isGameOver: true,
          };
        }
      }
    }
  }

  // Villagers Win: No werewolves left among non-lover alive players
  if (activeWolves === 0) {
    return {
      winner: 'VILLAGERS',
      winners: [...currentWinners, 'VILLAGERS'],
      isGameOver: true,
    };
  }

  // Werewolves Win: Equal or more werewolves than good players among non-lover alive players
  if (activeWolves >= good) {
    return {
      winner: 'WEREWOLVES',
      winners: [...currentWinners, 'WEREWOLVES'],
      isGameOver: true,
    };
  }

  return null;
}

/**
 * Determines if a player is a winner based on the winning teams
 */
export function isPlayerWinner(player, winners, lovers, gameSettings) {
  if (!winners || winners.length === 0) return false;

  if (winners.includes(player.id)) return true;

  let isWinner = false;

  // Lovers Team Win
  if (winners.includes('LOVERS')) {
    if (lovers && lovers.includes(player.id)) {
      isWinner = true;
    }
    // If Cupid is 'THIRD_WHEEL', they also win with the Lovers
    if (
      gameSettings.cupidFateOption === CUPID_FATES.THIRD_WHEEL &&
      player.role === ROLE_IDS.CUPID
    ) {
      isWinner = true;
    }
  }

  const playerRole = roleRegistry.getRole(player.role);
  const teamId = player.alignment || playerRole?.team?.id;

  if (winners.includes('VILLAGERS') && teamId === Teams.VILLAGER.id) {
    isWinner = true;
  }

  if (winners.includes('WEREWOLVES')) {
    if (playerRole && playerRole.id === ROLE_IDS.SORCERER) {
      if (player.foundSeer) {
        isWinner = true;
      }
    } else if (teamId === Teams.WEREWOLF.id) {
      isWinner = true;
    }
  }

  // Cupid wins only if explicitly part of winning team (e.g., 'CUPID' is in winners for throuple) AND not selfless
  if (winners.includes('CUPID') && player.role === ROLE_IDS.CUPID) {
    isWinner = true;
  }

  return isWinner;
}
