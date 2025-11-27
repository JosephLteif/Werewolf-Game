import { ROLES, PHASES } from '../constants';
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
    const voter = players.find(p => p.id === voterId);
    const weight = (voter && voter.role === ROLES.MAYOR.id && voter.isAlive) ? 2 : 1;
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
    return { type: 'no_elimination', victims: [] };
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
export const castPlayerVote = async (gameState, updateGame, user, targetId) => {
  // Can't vote if already locked
  if ((gameState.lockedVotes || []).includes(user.uid)) return;

  const votes = gameState.votes || {};
  const newVotes = { ...votes, [user.uid]: targetId };
  await updateGame({ votes: newVotes });
};

export const lockPlayerVote = async (gameState, updateGame, players, user) => {
  // Can't lock if no vote cast
  if (!gameState.votes?.[user.uid]) return;

  // Can't lock if already locked
  const lockedVotes = gameState.lockedVotes || [];
  if (lockedVotes.includes(user.uid)) return;

  const newLockedVotes = [...lockedVotes, user.uid];
  await updateGame({ lockedVotes: newLockedVotes });

  const newGameState = { ...gameState, lockedVotes: newLockedVotes };

  // Check if everyone has locked
  const alivePlayers = players.filter((p) => p.isAlive);
  if (newLockedVotes.length === alivePlayers.length) {
    // Trigger resolution
    await resolveDayVoting(newGameState, updateGame, players);
  }
};

const handleJesterTannerWin = async (victim, newPlayers, gameState, updateGame) => {
  const winnerRole =
    victim.role === ROLES.JESTER.id ? 'JESTER' : 'TANNER';
  const currentWinners = gameState.winners || [];

  // Add to winners but continue game
  await updateGame({
    players: newPlayers,
    winners: [...currentWinners, winnerRole],
    dayLog: `${victim.name} was voted out. They were the ${ROLES[victim.role.toUpperCase()].name
      }!`,
    phase: PHASES.NIGHT_INTRO, // Continue game
    votes: {},
    lockedVotes: [],
  });
  return true;
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

const handleHunterVoteDeath = async (victim, newPlayers, gameState, updateGame) => {
  await updateGame({
    players: newPlayers,
    dayLog: `${victim.name} (Hunter) was voted out!`,
    phase: PHASES.HUNTER_ACTION,
    votes: {},
    lockedVotes: [],
  });
  return true;
};

export const resolveDayVoting = async (gameState, updateGame, players) => {
  const lockedVoterIds = gameState.lockedVotes || [];
  const votesToCount = Object.entries(gameState.votes || {}).reduce(
    (acc, [voterId, targetId]) => {
      if (lockedVoterIds.includes(voterId)) {
        acc[voterId] = targetId;
      }
      return acc;
    },
    {}
  );

  const voteCounts = countVotes(votesToCount, players);
  const { type, victims } = determineVotingResult(voteCounts);

  if (type === 'no_elimination') {
    await updateGame({
      dayLog: 'No one was eliminated.',
      phase: PHASES.NIGHT_INTRO,
      votes: {},
      lockedVotes: [],
    });
    return;
  }

  const targetId = victims[0];
  let newPlayers = [...players];
  const victim = findPlayerById(newPlayers, targetId);

  if (victim) {
    victim.isAlive = false;
  } else {
    console.error("Voted victim not found:", targetId);
    return;
  }

  // Jester/Tanner Win
  if (victim.role === ROLES.JESTER.id || victim.role === ROLES.TANNER.id) {
    if (await handleJesterTannerWin(victim, newPlayers, gameState, updateGame)) return;
  }

  // Doppelgänger Transformation (Voting Death)
  handleDoppelgangerTransformation(newPlayers, gameState.doppelgangerTarget, victim.id);

  // Lovers Check
  handleLoverDeathOnVote(victim, newPlayers, gameState);

  // Hunter Vote Death
  if (victim.role === ROLES.HUNTER.id) {
    if (await handleHunterVoteDeath(victim, newPlayers, gameState, updateGame)) return;
  }

  const winResult = checkWinCondition(newPlayers, gameState.lovers, gameState.winners);
  if (winResult) {
    await updateGame({
      players: newPlayers,
      ...winResult,
      phase: PHASES.GAME_OVER,
    });
    return;
  }

  await updateGame({
    players: newPlayers,
    dayLog: `${victim.name} was voted out.`,
    phase: PHASES.NIGHT_INTRO,
    votes: {},
    lockedVotes: [],
  });
};