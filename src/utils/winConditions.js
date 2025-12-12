import { TEAMS } from '../constants';
import { roleRegistry } from '../roles/RoleRegistry';
import { ROLE_IDS } from '../constants/roleIds';

/**
 * Checks if the game has ended and determines the winner
 * Returns the winning team(s) or null if game continues
 */
import { TheFoolWinStrategy } from '../strategies/winConditions/TheFoolWinStrategy';
import { LoversWinStrategy } from '../strategies/winConditions/LoversWinStrategy';
import { Teams } from '../models/Team';

const STRATEGIES = [TheFoolWinStrategy, LoversWinStrategy].sort((a, b) => a.priority - b.priority);

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
    roleRegistry: roleRegistry,
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

  // Polymorphic Team Checks
  // Identify active teams from alive players
  const activeTeams = new Set();
  alivePlayers.forEach((p) => {
    const role = roleRegistry.getRole(p.role);
    if (role && role.team) {
      // role.team is a Team object
      activeTeams.add(role.team);
    }
    // Also check if player has a specific team override (though usually handled by role)
    // If p.team is stored as ID, we might need to map it back to Team object if possible,
    // but for now we rely on Role's team which is the standard.
  });

  // Also include teams that might not have alive players but could still win?
  // Usually win conditions depend on alive players.
  // We should definitely check VILLAGER and WEREWOLF teams if they are present in the game.
  // Since we moved logic to Teams.VILLAGER and Teams.WEREWOLF, we can just check them explicitly
  // or iterate through all defined Teams if we want to be fully generic.
  // For now, let's check the standard teams + any active ones.

  const teamsToCheck = [Teams.VILLAGER, Teams.WEREWOLF];
  // Add any other teams found on players that are not in the default list?
  activeTeams.forEach((t) => {
    if (!teamsToCheck.includes(t)) {
      teamsToCheck.push(t);
    }
  });

  for (const team of teamsToCheck) {
    if (team.checkWin(context)) {
      // Map Team object back to string ID expected by the game
      // The game uses 'VILLAGERS' and 'WEREWOLVES' as winner strings in some places,
      // but 'village' and 'werewolf' as IDs.
      // The strategies returned 'VILLAGERS' and 'WEREWOLVES'.
      // We should probably standardize this.
      // Existing code expects 'VILLAGERS' and 'WEREWOLVES'.

      let winnerId = team.id;
      if (team.id === TEAMS.VILLAGE) winnerId = 'VILLAGERS';
      if (team.id === TEAMS.WEREWOLF) winnerId = 'WEREWOLVES';

      if (!accumulatedWinners.includes(winnerId)) {
        accumulatedWinners.push(winnerId);
        hasNewWinners = true;
        gameOverTriggered = true; // Most team wins end the game
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
    VILLAGERS: TEAMS.VILLAGE,
    WEREWOLVES: TEAMS.WEREWOLF,
    LOVERS: TEAMS.LOVERS,
    THE_FOOL: TEAMS.NEUTRAL,
  };

  // Normalize winners to include both display strings and team IDs
  const normalizedWinners = winners.flatMap((w) => {
    const teamId = winnerToTeamMapping[w];
    return teamId ? [w, teamId] : [w];
  });

  // Direct win by player ID (e.g., for The Fool)
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
    return !(
      player.role === ROLE_IDS.SORCERER &&
      playerTeamId === TEAMS.WEREWOLF &&
      !player.foundSeer
    );
  }

  // Delegate to role's checkWin for any specific, complex win conditions not covered above.
  // This allows roles to override the default team-based win if necessary.
  return role.checkWin(player, normalizedWinners, { lovers, settings: gameSettings });
}
