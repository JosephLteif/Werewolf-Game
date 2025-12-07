import React, { useState } from 'react';
import { findPlayerById } from '../utils/playersUtils';

const MAX_CHARS = 50;

export default function DeathNoteInputScreen({ gameState, user, actions }) {
  const { playerAwaitingDeathNote, players } = gameState;
  const isMyTurn = user.uid === playerAwaitingDeathNote;
  const victimPlayer = findPlayerById(players, playerAwaitingDeathNote);

  const [deathNoteMessage, setDeathNoteMessage] = useState('');

  const handleSubmit = () => {
    if (isMyTurn) {
      actions.submitDeathNote(gameState, user.uid, deathNoteMessage);
    }
  };

  // Handle cases where playerAwaitingDeathNote might not be fully propagated yet
  if (!playerAwaitingDeathNote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-6">
        <h2 className="text-4xl font-bold mb-4">Loading Death Note input...</h2>
        <p className="text-lg text-slate-400">Please wait.</p>
      </div>
    );
  }

  // Now that playerAwaitingDeathNote is defined, try to find the victim.
  // This check should now only fail if there's a serious data inconsistency.
  if (!victimPlayer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-6">
        <h2 className="text-4xl font-bold mb-4">Awaiting Death Note...</h2>
        <p className="text-lg text-slate-400">Error: Victim player data not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-6">
      {isMyTurn ? (
        <>
          <h2 className="text-4xl font-bold mb-4 text-red-400">Your Last Will</h2>
          <p className="text-lg text-slate-300 mb-6">
            You've been lynched! Leave a message for the living.
          </p>
          <div className="w-full max-w-md">
            <textarea
              className="w-full p-4 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500 resize-none"
              rows="3"
              maxLength={MAX_CHARS}
              value={deathNoteMessage}
              onChange={(e) => setDeathNoteMessage(e.target.value)}
              placeholder="Enter your final words (max 50 chars)"
            ></textarea>
            <div className="text-right text-sm text-slate-400 mt-2">
              {deathNoteMessage.length}/{MAX_CHARS}
            </div>
            <button
              onClick={handleSubmit}
              disabled={deathNoteMessage.trim().length === 0}
              className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Last Will
            </button>
            <button
              onClick={() => actions.submitDeathNote(gameState, user.uid, '')}
              className="mt-2 w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
            >
              Skip
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-4xl font-bold mb-4">Day Concludes...</h2>
          <p className="text-lg text-slate-300">
            Waiting for <span className="text-red-400 font-bold">{victimPlayer.name}</span> to write
            their last will.
          </p>
          <p className="text-md text-slate-300">check the grimoire after this phase.</p>
          <p className="text-sm text-slate-500 mt-2 animate-pulse">
            The game will continue shortly...
          </p>
        </>
      )}
    </div>
  );
}
