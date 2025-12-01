import React from 'react';
import { X, History } from 'lucide-react';

export default function GameHistoryModal({ dayLog, onClose }) {
  if (!dayLog) return null;

  // Assuming dayLog is a string with entries separated by newlines
  const entries = dayLog.split('\n').filter((entry) => entry.trim() !== '');

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50"
      onClick={onClose}
      data-testid="game-history-modal-backdrop"
    >
      <div
        className="bg-slate-800 p-6 rounded-2xl max-w-md w-full border border-slate-700 max-h-[80vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-2xl font-black text-indigo-400 mb-4 flex items-center gap-2">
          <History className="w-6 h-6" /> Game History (Grimoire)
        </h3>
        <div className="space-y-3 text-slate-300 text-sm max-h-[calc(80vh-120px)] overflow-y-auto pr-2">
          {entries.length > 0 ? (
            entries.map((entry, index) => (
              <p key={index} className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                {entry}
              </p>
            ))
          ) : (
            <p className="text-slate-400 italic">No historical events yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
