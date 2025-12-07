import { useState, useEffect } from 'react';
import { getGameAnalysis } from '../utils/gameStats';

/**
 * Custom hook to analyze game history and extract accolades and voting matrix.
 * @param {Array<Object>} history - The game's vote history log.
 * @param {Array<Object>} players - An array of all player objects.
 * @returns {Object} - An object containing accolades and voting matrix.
 */
export function useGameHistory(history, players) {
  const [accolades, setAccolades] = useState([]);
  const [votingMatrix, setVotingMatrix] = useState({});

  useEffect(() => {
    if (!history || !players || history.length === 0 || players.length === 0) {
      setAccolades([]);
      setVotingMatrix({});
      return;
    }

    const { accolades: newAccolades, votingMatrix: newVotingMatrix } = getGameAnalysis(
      history,
      players
    );
    setAccolades(newAccolades);
    setVotingMatrix(newVotingMatrix);
  }, [history, players]);

  return { accolades, votingMatrix };
}
