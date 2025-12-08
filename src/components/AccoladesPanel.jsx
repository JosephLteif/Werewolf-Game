import React from 'react';

export default function AccoladesPanel({ accolades, players }) {
  if (!accolades || accolades.length === 0) {
    return <p className="text-gray-300">No special accolades awarded.</p>;
  }

  const getPlayerName = (playerId) => {
    const player = players.find((p) => p.id === playerId);
    return player ? player.name : 'Unknown Player';
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold text-white mb-4">Accolades</h3>
      <ul className="space-y-2">
        {accolades.map((acc, index) => (
          <li
            key={index}
            className="flex flex-col items-start text-white bg-slate-700/50 p-3 rounded-md"
          >
            <div className="flex items-center">
              <span className="font-semibold text-purple-400 mr-2 text-lg">{acc.accolade}:</span>
              <span className="text-xl font-bold">{getPlayerName(acc.playerId)}</span>
            </div>
            {acc.description && <p className="text-slate-300 text-sm mt-1">{acc.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
