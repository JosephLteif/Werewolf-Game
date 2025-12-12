import { vi } from 'vitest';

export class MockGameState {
  constructor(initialState) {
    this._state = { ...initialState }; // Deep copy initial state
    // Ensure players in _state is always a map, even if initialState provides an array
    if (Array.isArray(this._state.players)) {
      const playersMap = {};
      this._state.players.forEach((p) => {
        playersMap[p.id] = p;
      });
      this._state.players = playersMap;
    }

    this.update = vi.fn(async (updates) => {
      // Deep merge updates into _state
      this._state = {
        ...this._state,
        ...updates,
      };
      console.log('MockGameState updated, _state:', this._state);

      // Special handling for players array to map conversion
      if (Array.isArray(this._state.players)) {
        const playersMap = {};
        this._state.players.forEach((p) => {
          playersMap[p.id] = p;
        });
        this._state.players = playersMap;
      }
    });
  }

  // Add the addDayLog method here
  addDayLog = vi.fn(async (log) => {
    // Ensure _state.dayLog is an array before pushing
    if (!Array.isArray(this._state.dayLog)) {
      this._state.dayLog = [];
    }
    this._state.dayLog.push(log);
    // Mimic the real GameState's behavior of calling update
    await this.update({ dayLog: this._state.dayLog });
  });

  // Mimic getters of the real GameState class
  get code() {
    return this._state.code;
  }
  get hostId() {
    return this._state.hostId;
  }
  get phase() {
    return this._state.phase;
  }
  get dayLog() {
    return Array.isArray(this._state.dayLog) ? this._state.dayLog : [];
  }
  get updatedAt() {
    return this._state.updatedAt;
  }
  get settings() {
    return this._state.settings;
  }
  get players() {
    // Always return players as an array, converting from internal map
    return Object.values(this._state.players || {});
  }
  get rawPlayers() {
    // Always return the internal map
    return this._state.players;
  }
  get nightActions() {
    return this._state.nightActions;
  }
  get vigilanteAmmo() {
    return this._state.vigilanteAmmo;
  }
  get lockedVotes() {
    return this._state.lockedVotes;
  }
  get lovers() {
    return this._state.lovers;
  }
  get votes() {
    return this._state.votes;
  }
  get winner() {
    return this._state.winner;
  }
  get winners() {
    return this._state.winners;
  }
  get phaseEndTime() {
    return this._state.phaseEndTime;
  }
  get shapeshifterPlayerId() {
    return this._state.nightActions?.shapeshifterPlayerId;
  }
  get shapeshifterTarget() {
    return this._state.nightActions?.shapeshifterCopy;
  }
  get playerAwaitingDeathNote() {
    return this._state.playerAwaitingDeathNote;
  }
  get nextPhaseAfterDeathNote() {
    return this._state.nextPhaseAfterDeathNote;
  }

  isHost(playerUid) {
    return this.hostId === playerUid;
  }
}
