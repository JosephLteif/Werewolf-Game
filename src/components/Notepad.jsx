import React, { useState, useEffect } from 'react';
import { PanelRightClose, PanelRightOpen, Trash2, Plus, X } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'nightfall-vault-notes';

const Notepad = () => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Load notes
  useEffect(() => {
    const storedNotes = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    if (storedNotes) {
      setNotes(storedNotes);
    }
  }, []);

  // Save notes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const handleAddNote = () => {
    if (newNote.trim()) {
      setNotes([...notes, { id: Date.now(), text: newNote.trim() }]);
      setNewNote('');
    }
  };

  const handleDeleteNote = (id) => {
    setNotes(notes.filter((note) => note.id !== id));
  };

  const handleClearAllNotes = () => {
    if (window.confirm('Are you sure you want to delete all notes?')) {
      setNotes([]);
    }
  };

  return (
    /* MAIN CONTAINER 
      - Fixed to the right side.
      - Translates 100% to the right (off-screen) when hidden.
      - Translates to 0 (on-screen) when visible.
    */
    <div
      className={`fixed top-1/2 right-0 z-50 transform -translate-y-1/2 transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      {/* TOGGLE BUTTON 
        - Positioned Absolute.
        - 'right-full' pushes it to the immediate left of the container.
        - Moves in sync because it is a child of the translating container.
      */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`absolute right-full top-0 mt-2 mr-0 
          bg-indigo-600 hover:bg-indigo-700 text-white 
          p-3 shadow-[-4px_0px_10px_rgba(0,0,0,0.2)] 
          flex items-center justify-center 
          rounded-l-xl border-r border-indigo-800
          focus:outline-none transition-colors duration-200`}
        aria-label={isVisible ? 'Hide personal vault' : 'Show personal vault'}
      >
        {isVisible ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
      </button>

      {/* NOTEPAD CONTENT (The Vault) */}
      <div className="w-64 md:w-80 h-[28rem] bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-gray-100 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Personal Vault
          </h3>
          <span className="text-xs text-gray-500">{notes.length} notes</span>
        </div>

        {/* Note List Area */}
        <div className="flex-grow overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {notes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
              <span className="text-sm italic">Vault is empty</span>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="group relative bg-gray-800/50 hover:bg-gray-700/80 p-3 rounded border border-gray-700/50 hover:border-indigo-500/30 transition-all duration-200"
              >
                <p className="text-sm text-gray-200 pr-6 break-words whitespace-pre-wrap">
                  {note.text}
                </p>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Note"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer / Input Area */}
        <div className="p-3 bg-gray-800 border-t border-gray-700 space-y-2">
          <div className="relative">
            <input
              type="text"
              className="w-full bg-gray-900 text-gray-200 text-sm rounded-md py-2 pl-3 pr-10 border border-gray-700 focus:border-indigo-500 focus:outline-none placeholder-gray-500"
              placeholder="Type a secure note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="absolute right-1 top-1 p-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          {notes.length > 0 && (
            <button
              onClick={handleClearAllNotes}
              className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
            >
              <Trash2 size={12} />
              Clear Vault
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notepad;
