import { PHASES, ROLE_IDS, TANNER_WIN_STRATEGIES } from '../constants';
import { checkWinCondition } from '../utils/winConditions';
import { findPlayerById } from '../utils/playersUtils';
import { handleDoppelgangerTransformation } from '../utils/gameLogic';

/**
 * Voting Service
 * Handles all voting-related logic including vote counting and resolution
 */

/**
 * Count votes with Mayor's double vote weight
 */
export function countVotes(votes, players) {
  const voteCounts = {};

  Object.entries(votes || {}).forEach(([voterId, targetId]) => {
    const voter = players.find((p) => p.id === voterId);
    const weight = voter && voter.role === ROLE_IDS.MAYOR && voter.isAlive ? 2 : 1;
    voteCounts[targetId] = (voteCounts[targetId] || 0) + weight;
  });

  return voteCounts;
}

/**
 * Determine voting result (victim or tie/skip)
 */
export function determineVotingResult(voteCounts) {
  let maxVotes = 0;
  let victims = [];

  Object.entries(voteCounts).forEach(([targetId, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      victims = [targetId];
    } else if (count === maxVotes) {
      victims.push(targetId);
    }
  });

  // Handle no votes, a tie, or a skip vote
  if (victims.length !== 1 || victims[0] === 'skip') {
    return { type: 'no_elimination', victims };
  }

  return { type: 'elimination', victims };
}

/**
 * Calculate vote percentage for UI display
 */
export function calculateVotePercentage(voteCount, totalPlayers) {
  return totalPlayers > 0 ? (voteCount / totalPlayers) * 100 : 0;
}

/**
 * Check if all alive players have locked their votes
 */
export function allVotesLocked(lockedVotes, alivePlayers) {
  return lockedVotes.length === alivePlayers.length;
}

// New functions for day voting

export const castPlayerVote = async (gameState, user, targetId) => {
  // Can't vote if already locked

  if ((gameState.lockedVotes || []).includes(user.uid)) return;

  const votes = gameState.votes || {};

  const newVotes = { ...votes, [user.uid]: targetId };

  await gameState.update({ votes: newVotes });
};

export const lockPlayerVote = async (gameState, players, user) => {
  // Can't lock if no vote cast

  if (!gameState.votes?.[user.uid]) return;

  // Can't lock if already locked

  const lockedVotes = gameState.lockedVotes || [];

  if (lockedVotes.includes(user.uid)) return;

  const newLockedVotes = [...lockedVotes, user.uid];

  await gameState.update({ lockedVotes: newLockedVotes });

  // Check if everyone has locked

  const alivePlayers = players.filter((p) => p.isAlive);

  if (newLockedVotes.length === alivePlayers.length) {
    // Trigger resolution

    await resolveDayVoting(gameState, players);
  }
};

const handleLoverDeathOnVote = (victim, newPlayers, gameState) => {
  if (gameState.lovers && gameState.lovers.includes(victim.id)) {
    const otherLoverId = gameState.lovers.find((id) => id !== victim.id);
    const otherLover = findPlayerById(newPlayers, otherLoverId);

    if (otherLover && otherLover.isAlive) {
      otherLover.isAlive = false;
    }
  }
};

const handleHunterVoteDeath = async (victim, newPlayers, gameState) => {
  await gameState.update({
    players: newPlayers,
    phase: PHASES.HUNTER_ACTION,
    votes: {},
    lockedVotes: [],
  });
  await gameState.addDayLog(`${victim.name} (Hunter) was voted out!`);

  return true;
};

export const resolveDayVoting = async (gameState, players) => {
  const lockedVoterIds = gameState.lockedVotes || [];
  const votesToCount = Object.entries(gameState.votes || {}).reduce((acc, [voterId, targetId]) => {
    if (lockedVoterIds.includes(voterId)) {
      acc[voterId] = targetId;
    }

    return acc;
  }, {});

  const voteCounts = countVotes(votesToCount, players);

  const { type, victims } = determineVotingResult(voteCounts);

  if (type === 'no_elimination') {
    const logMessage = victims.length > 1 ? 'The vote was a tie!' : 'No one was eliminated.';
    await gameState.update({
      phase: PHASES.NIGHT_INTRO,
      votes: {},
      lockedVotes: [],
    });
    await gameState.addDayLog(logMessage);
    return;
  }

  const targetId = victims[0];

  let newPlayers = [...players];

  const victim = findPlayerById(newPlayers, targetId);

  if (victim) {
    victim.isAlive = false;
  } else {
    console.error('Voted victim not found:', targetId);

    return;
  }

  // Tanner Win logic is now handled in checkWinCondition via TannerWinStrategy

  // Doppelgänger Transformation (Voting Death)

  newPlayers = handleDoppelgangerTransformation(
    newPlayers,
    gameState.doppelgangerPlayerId,
    gameState.doppelgangerTarget,
    victim.id
  );

  // Lovers Check

  handleLoverDeathOnVote(victim, newPlayers, gameState);

  // Hunter Vote Death

  if (victim.role === ROLE_IDS.HUNTER) {
    if (await handleHunterVoteDeath(victim, newPlayers, gameState)) return;
  }

  const winResult = checkWinCondition(
    newPlayers,
    gameState.lovers,
    gameState.winners,
    gameState.settings,
    { ...victim, cause: 'VOTE' }
  );

  if (winResult) {
    if (winResult.isGameOver) {
      await gameState.update({
        players: newPlayers,
        ...winResult,
        phase: PHASES.GAME_OVER,
      });
      await gameState.addDayLog(`${victim.name} was lynched.`);

      return;
    } else if (winResult.winners) {
      // Game continues but we have new winners (e.g. Tanner)
      await gameState.update({
        winners: winResult.winners,
      });
    }
  }

  await gameState.update({
    players: newPlayers,
    phase: PHASES.NIGHT_INTRO,
    votes: {},
    lockedVotes: [],
  });
  await gameState.addDayLog(`${victim.name} was lynched.`);
};
