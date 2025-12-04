import { useState } from 'react';
import { History, ChevronDown } from 'lucide-react';

export default function GameHistoryPanel({ dayLog }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!dayLog || dayLog.length === 0) return null;

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 rounded-lg bg-slate-900/80 backdrop-blur border border-indigo-500/30 text-indigo-200 text-sm font-medium transition-colors flex items-center gap-2 hover:bg-slate-800"
      >
        <History className="w-4 h-4 text-indigo-400" />
        Grimoire
        <ChevronDown
          className={`w-4 h-4 text-indigo-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 p-4 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg shadow-xl w-64 max-h-96 overflow-y-auto">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Game History</h4>
          {dayLog.map((entry, index) => (
            <div key={index} className="mb-3 pb-3 border-b border-slate-700 last:border-b-0">
              <p className="text-slate-200 text-sm">{entry}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
