import React from 'react';
import { Info } from 'lucide-react';

export default function RoleRulesModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50"
      onClick={onClose}
      data-testid="role-rules-modal-backdrop"
    >
      <div
        className="bg-slate-800 p-6 rounded-2xl max-w-md w-full border border-slate-700 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-black text-indigo-400 mb-4 flex items-center gap-2">
          <Info className="w-6 h-6" /> Rule Book
        </h3>
        <div className="space-y-4 text-slate-300 text-sm">
          <section>
            <h4 className="font-bold text-white mb-1">Objective</h4>
            <p>
              Villagers must find and eliminate all Werewolves. Werewolves must eliminate Villagers
              until they equal or outnumber them. The Fool wins if they are voted out by a vote.
            </p>
          </section>
          <section>
            <h4 className="font-bold text-white mb-1">Game Flow</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-indigo-300">Night:</strong> Special roles wake up secretly
                to perform actions (kill, heal, investigate).
              </li>
              <li>
                <strong className="text-orange-300">Day:</strong> Everyone wakes up. Deaths are
                revealed. Players discuss and vote to eliminate a suspect.
              </li>
            </ul>
          </section>
          <section>
            <h4 className="font-bold text-white mb-1">Voting</h4>
            <p>Majority vote eliminates a player. In case of a tie, no one dies.</p>
          </section>
          <section>
            <h4 className="font-bold text-white mb-1">Winning</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-blue-400">Villagers:</strong> Kill all Wolves.
              </li>
              <li>
                <strong className="text-red-400">Werewolves:</strong> Equal/outnumber Villagers.
              </li>
              <li>
                <strong className="text-pink-400">Lovers:</strong> Win if they are the last two
                players alive. Depending on the game settings, Cupid may also win if they are alive
                and involved in a "Third Wheel" scenario.
              </li>
              <li>
                <strong className="text-amber-400">The Fool:</strong> Wins if voted out.
              </li>
            </ul>
          </section>
          <section>
            <h4 className="font-bold text-white mb-1">The Fool's Win Strategy</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-amber-300">Game Continues:</strong> If the Fool is voted
                out, they win, and the game continues for the remaining players to achieve their win
                conditions. The Fool is added to the list of winners at the end of the game.
              </li>
              <li>
                <strong className="text-amber-300">Game Ends:</strong> If the Fool is voted out,
                they win, and the game ends immediately. Only The Fool is declared the winner.
              </li>
            </ul>
          </section>
          <section>
            <h4 className="font-bold text-white mb-1">Cupid's Role & Settings</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-pink-400">Cupid Can Choose Self:</strong> A game setting
                that determines if Cupid is allowed to choose themselves as one of the lovers.
              </li>
              <li>
                <strong className="text-pink-400">Cupid Strategy:</strong>
                <ul className="list-circle pl-4 space-y-1">
                  <li>
                    <strong className="text-pink-400">Selfless:</strong> Lovers win only if they are
                    the last two players alive. Cupid does not win unless they are one of the
                    lovers.
                  </li>
                  <li>
                    <strong className="text-pink-400">Third Wheel:</strong> Lovers win if they are
                    the last two players alive. Additionally, if Cupid is alive and not a lover,
                    they win with the lovers if only three players (the two lovers and Cupid) are
                    left.
                  </li>
                </ul>
              </li>
            </ul>
          </section>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-slate-700 hover:bg-slate-600 mt-6 py-3 rounded-xl font-bold transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
