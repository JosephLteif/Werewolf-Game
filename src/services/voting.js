import { PHASES, ROLE_IDS } from '../constants';
import { checkWinCondition } from '../utils/winConditions';
import { findPlayerById } from '../utils/playersUtils';
import { handleDoppelgangerTransformation } from '../utils/gameLogic';
import { roleRegistry } from '../roles/RoleRegistry';

/**
 * Voting Service
 * Handles all voting-related logic including vote counting and resolution
 */

/**
 * Count votes with role-specific vote weights.
 */
export function countVotes(votes, players, gameState) {
  const voteCounts = {};

  Object.entries(votes || {}).forEach(([voterId, targetId]) => {
    const voter = players.find((p) => p.id === voterId);
    if (voter && voter.isAlive) {
      const role = roleRegistry.getRole(voter.role);
      const weight = role ? role.getVoteWeight(gameState) : 1;
      voteCounts[targetId] = (voteCounts[targetId] || 0) + weight;
    }
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

  // Handle no votes, a tie, a skip vote, or if the highest vote count is 0

  if (victims.length !== 1 || victims[0] === 'skip' || maxVotes === 0) {
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

// This function determines if a Hunter's death triggers a special phase.
// It returns the special phase (e.g., PHASES.HUNTER_ACTION) or null if no special phase.
const handleHunterVoteDeath = (victim) => {
  if (victim.role === ROLE_IDS.HUNTER) {
    return PHASES.HUNTER_ACTION;
  }
  return null;
};

export const resolveDayVoting = async (gameState, players) => {
  const lockedVotes = gameState.lockedVotes || [];
  const votesToCount = {};
  lockedVotes.forEach((voterId) => {
    if (gameState.votes[voterId]) {
      votesToCount[voterId] = gameState.votes[voterId];
    }
  });

  const voteCounts = countVotes(votesToCount, players, gameState);
  const { type, victims } = determineVotingResult(voteCounts);

  console.log('resolveDayVoting - voteCounts:', voteCounts);
  console.log('resolveDayVoting - type:', type);
  console.log('resolveDayVoting - victims:', victims);

  if (type === 'no_elimination') {
    const logMessage = voteCounts.skip > 0 ? 'No one was eliminated.' : 'The vote was a tie!';
    await gameState.update({ phase: PHASES.NIGHT_INTRO, votes: {}, lockedVotes: [] });
    await gameState.addDayLog(logMessage);
    return;
  }

  const victimId = victims[0];
  let newPlayers = JSON.parse(JSON.stringify(players));
  const victim = findPlayerById(newPlayers, victimId);

  if (victim) {
    victim.isAlive = false;
    await gameState.addDayLog(`${victim.name} was lynched. They are writing their last will...`);
  } else {
    console.error('Voted victim not found:', victimId);
    return;
  }

  newPlayers = handleDoppelgangerTransformation(
    newPlayers,
    gameState.doppelgangerPlayerId || gameState.nightActions?.doppelgangerPlayerId,
    gameState.nightActions?.doppelgangerCopy,
    victim.id
  );

  handleLoverDeathOnVote(victim, newPlayers, gameState);

  const hunterDeathPhase = handleHunterVoteDeath(victim);
  let nextPhase = hunterDeathPhase || PHASES.NIGHT_INTRO;

  const winResult = checkWinCondition(
    newPlayers,
    gameState.lovers,
    gameState.winners,
    gameState.settings,
    {
      ...victim,
      cause: 'VOTE',
    }
  );

  if (winResult && winResult.isGameOver) {
    await gameState.update({
      players: newPlayers,
      phase: PHASES.GAME_OVER,
      ...winResult,
    });
    return;
  }

  await gameState.update({
    players: newPlayers,
    phase: PHASES.DEATH_NOTE_INPUT,
    playerAwaitingDeathNote: victim.id,
    nextPhaseAfterDeathNote: nextPhase,
    votes: {},
    lockedVotes: [],
    winners: winResult ? winResult.winners : gameState.winners,
  });
};

export const submitDeathNote = async (gameState, playerId, message) => {
  // Ensure the message is trimmed and within the character limit
  const sanitizedMessage = (message || '').trim().substring(0, 50);

  // Get the next phase from the stored game state, defaulting to NIGHT_INTRO if not set
  const nextPhase = gameState.nextPhaseAfterDeathNote || PHASES.NIGHT_INTRO;

  const currentDeathNotes = gameState.deathNotes || {};
  const updatedDeathNotes = {
    ...currentDeathNotes,
    [playerId]: sanitizedMessage,
  };

  await gameState.update({
    deathNotes: updatedDeathNotes,
    playerAwaitingDeathNote: null, // Clear the player awaiting the note
    nextPhaseAfterDeathNote: null, // Clear the stored next phase
    phase: nextPhase, // Transition to the next phase
  });

  const victimPlayer = gameState.players.find((p) => p.id === playerId);
  if (victimPlayer) {
    const logMessage = sanitizedMessage
      ? `${victimPlayer.name}'s last will: "${sanitizedMessage}"`
      : `${victimPlayer.name} chose not to leave a last will.`;
    await gameState.addDayLog(logMessage);
  }
};
