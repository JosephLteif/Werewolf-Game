import { Moon } from 'lucide-react';
// import LogoBig from '../assets/Logo 3-Big.jpg'; // Removed big logo import
// Favicon.png is in the public directory, so we can reference it directly
// as an absolute path.
// import LogoSmall from '/favicon.png'; 

export default function AuthScreen({
  playerName,
  setPlayerName,
  roomCode,
  setRoomCode,
  joinRoom,
  createRoom,
  user,
  errorMsg,
}) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 space-y-6">
      <div className="text-center space-y-2">
        {/* <img src={LogoBig} alt="Nightfall Logo" className="mx-auto w-64 h-auto" /> */}
        <img src="/favicon.png" alt="Nightfall Logo" className="mx-auto w-24 h-auto" /> {/* Use small logo directly */}
        <h1 className="text-5xl font-black tracking-tighter text-indigo-500 flex items-center justify-center gap-3">
          NIGHTFALL
        </h1>
        <p className="text-slate-400">Local Multiplayer • Join Room</p>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700 space-y-4">
        {errorMsg && (
          <div className="bg-red-900/50 text-red-200 p-3 rounded text-sm text-center">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Your Name</label>
          <input
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
            placeholder="e.g. Wolfie"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white uppercase tracking-widest text-center font-mono placeholder:normal-case placeholder:tracking-normal"
              placeholder="Room Code"
              maxLength={4}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button
              onClick={joinRoom}
              disabled={!user}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-6 font-bold rounded-lg"
            >
              Join
            </button>
          </div>
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink mx-4 text-slate-600 text-xs">OR</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>
          <button
            onClick={createRoom}
            disabled={!user}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-3 rounded-lg font-bold"
          >
            Create New Room
          </button>
        </div>
      </div>
    </div>
  );
}
