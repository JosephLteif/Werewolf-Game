import { ROLES } from '../constants';

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

    // Handle tie or skip
    if (victims.length > 1 || victims[0] === 'skip') {
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
