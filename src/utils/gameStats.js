import { TEAMS } from '../constants/teams';
import { roleRegistry } from '../roles/RoleRegistry';

/**
 * Determines if a player is part of an 'evil' team.
 * @param {string} playerId - The ID of the player to check.
 * @param {Array<Object>} players - An array of all player objects.
 * @returns {boolean} - True if the player is evil, false otherwise.
 */
function isEvil(playerId, players) {
  const player = players.find((p) => p.id === playerId);
  if (!player || !player.role) return false; // Should not happen in a valid game state

  const roleInstance = roleRegistry.getRole(player.role.id);
  if (!roleInstance) return false;

  return roleInstance.team === TEAMS.WEREWOLF;
}

/**
 * Analyzes game history and players to provide game statistics and accolades.
 * @param {Array<Object>} history - The game's vote history log.
 * @param {Array<Object>} players - An array of all player objects.
 * @returns {Object} - An object containing accolades and voting matrix.
 */
export function getGameAnalysis(history, players) {
  const accolades = [];
  const votingMatrix = {}; // { [playerId]: [day1VoteTargetId, day2VoteTargetId, ...] }
  const voteCountsForPlayer = {}; // { [playerId]: count } for "The Target"
  const correctVotesByPlayer = {}; // { [playerId]: count } for "Sherlock"

  // Initialize votingMatrix and voteCountsForPlayer for all players
  players.forEach((player) => {
    votingMatrix[player.id] = [];
    voteCountsForPlayer[player.id] = 0;
    correctVotesByPlayer[player.id] = 0;
  });

  history.forEach((dayEntry) => {
    const eliminatedPlayerId =
      dayEntry.outcome !== 'tie' && dayEntry.outcome !== 'skip' ? dayEntry.outcome : null;
    const wasEvilEliminated = eliminatedPlayerId ? isEvil(eliminatedPlayerId, players) : false;

    // Populate votingMatrix and count votes for "The Target"
    Object.entries(dayEntry.votes).forEach(([voterId, targetId]) => {
      if (votingMatrix[voterId]) {
        votingMatrix[voterId].push(targetId);
      }
      if (targetId !== 'skip' && voteCountsForPlayer[targetId] !== undefined) {
        voteCountsForPlayer[targetId]++;
      }

      // Count correct votes for "Sherlock"
      if (wasEvilEliminated && eliminatedPlayerId === targetId) {
        correctVotesByPlayer[voterId]++;
      }
    });

    // For players who didn't vote on a given day, push null or 'no_vote' to maintain array length consistency
    players.forEach((player) => {
      if (!(player.id in dayEntry.votes)) {
        votingMatrix[player.id].push(null); // Represents no vote for that day
      }
    });
  });

  // Calculate "Sherlock" - most accurate voter for evil roles
  let maxCorrectVotes = -1;
  let sherlocks = [];
  Object.entries(correctVotesByPlayer).forEach(([playerId, count]) => {
    if (count > maxCorrectVotes) {
      maxCorrectVotes = count;
      sherlocks = [
        { playerId, accolade: 'Sherlock', description: 'Most accurate voter for evil roles.' },
      ];
    } else if (count === maxCorrectVotes && count > 0) {
      sherlocks.push({
        playerId,
        accolade: 'Sherlock',
        description: 'Most accurate voter for evil roles.',
      });
    }
  });
  accolades.push(...sherlocks);

  // Calculate "The Target" - most voted for player
  let maxTimesVoted = -1;
  let targets = [];
  Object.entries(voteCountsForPlayer).forEach(([playerId, count]) => {
    if (count > maxTimesVoted) {
      maxTimesVoted = count;
      targets = [
        { playerId, accolade: 'The Target', description: 'Most often voted for during the day.' },
      ];
    } else if (count === maxTimesVoted && count > 0) {
      targets.push({
        playerId,
        accolade: 'The Target',
        description: 'Most often voted for during the day.',
      });
    }
  });
  accolades.push(...targets);

  return {
    accolades,
    votingMatrix,
  };
}
