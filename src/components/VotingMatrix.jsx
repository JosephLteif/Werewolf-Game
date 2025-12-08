import React from 'react';
import { TEAMS } from '../constants/teams';
import { roleRegistry } from '../roles/RoleRegistry';

/**
 * Helper function to determine if a player is part of an 'evil' team for UI purposes.
 * This is a simplified version for rendering, assuming the full player object is available.
 * @param {string} playerId - The ID of the player to check.
 * @param {Array<Object>} players - An array of all player objects with their roles.
 * @returns {boolean} - True if the player is evil, false otherwise.
 */
const isPlayerEvil = (playerId, players) => {
  const player = players.find((p) => p.id === playerId);
  if (!player || !player.role) return false;

  const roleInstance = roleRegistry.getRole(player.role.id);
  if (!roleInstance) return false;

  return roleInstance.team === TEAMS.WEREWOLF;
};

export default function VotingMatrix({ votingMatrix, players }) {
  if (!votingMatrix || Object.keys(votingMatrix).length === 0 || !players || players.length === 0) {
    return <p className="text-gray-300">No voting history available.</p>;
  }

  const playerIds = players.map((p) => p.id);
  const maxDays = Math.max(...Object.values(votingMatrix).map((votes) => votes.length));
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  // Filter out any players from votingMatrix that are not in the current players list
  const filteredVotingMatrix = Object.keys(votingMatrix).reduce((acc, playerId) => {
    if (playerIds.includes(playerId)) {
      acc[playerId] = votingMatrix[playerId];
    }
    return acc;
  }, {});

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold text-white mb-4">Voting Matrix</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Voter
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Day {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {players.map(
              (
                voter // Iterate through all players to ensure consistent rows
              ) => (
                <tr key={voter.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-white">
                    {voter.name}
                  </td>
                  {days.map((dayIndex) => {
                    const targetId = filteredVotingMatrix[voter.id]
                      ? filteredVotingMatrix[voter.id][dayIndex - 1]
                      : null;
                    const targetPlayer = players.find((p) => p.id === targetId);

                    let borderColorClass = 'border-gray-500'; // Default for no vote or skip
                    let tooltipText = 'No vote';

                    if (targetId === 'skip') {
                      tooltipText = 'Skipped vote';
                    } else if (targetPlayer) {
                      borderColorClass = isPlayerEvil(targetPlayer.id, players)
                        ? 'border-green-500'
                        : 'border-red-500';
                      tooltipText = `Voted for ${targetPlayer.name}`;
                    }

                    return (
                      <td
                        key={`${voter.id}-day-${dayIndex}`}
                        className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center"
                      >
                        <div
                          className={`w-7 h-7 rounded-full border-2 ${borderColorClass} flex items-center justify-center text-[8px] font-bold text-white shadow-sm mx-auto`}
                          style={{ backgroundColor: targetPlayer?.avatarColor || '#6B7280' }} // Default background for no vote
                          title={tooltipText}
                        >
                          {targetPlayer ? targetPlayer.name[0] : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
