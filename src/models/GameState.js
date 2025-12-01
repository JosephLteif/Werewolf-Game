import { serverTimestamp } from 'firebase/database';
import { TANNER_WIN_STRATEGIES } from '../constants/tannerWinStrategies';

function defaultSettings() {
  return {
    actionWaitTime: 60,
    votingWaitTime: 240,
    wolfCount: 1,
    showActiveRolesPanel: true,
    cupidCanChooseSelf: false,
    cupidFateOption: 'third_wheel',
    tannerWinStrategy: TANNER_WIN_STRATEGIES.CONTINUE_GAME,
    activeRoles: {
      cupid: false,
      doctor: false,
      hunter: false,
      seer: false,
      villager: false,
      // add other roles as needed
    },
  };
}

class GameState {
  constructor(initialState, updateGameCallback) {
    if (!initialState || typeof initialState !== 'object') {
      throw new Error('initialState must be a non-null object.');
    }
    if (typeof updateGameCallback !== 'function') {
      throw new Error('updateGameCallback must be a function.');
    }

    this._state = initialState;
    this._updateGame = updateGameCallback;
  }

  static createInitialState(hostUser, code) {
    const hostId = hostUser.id || hostUser.uid || 'host';
    const playerObj = {
      name: hostUser.name || hostUser.displayName || 'Host',
      isAlive: true,
      ready: false,
      avatarColor: hostUser.avatarColor || null,
      role: null,
    };

    return {
      code,
      hostId,
      phase: 'LOBBY',
      dayLog: ['Waiting for game to start...'],
      updatedAt: serverTimestamp(),
      settings: defaultSettings(),
      players: {
        [hostId]: playerObj,
      },
      nightActions: {
        doctorProtect: null,
        sorcererCheck: null,
        vigilanteTarget: null,
        werewolfVotes: {},
        cupidLinks: [],
        masonsReady: {},
      },
      vigilanteAmmo: {},
      lockedVotes: [],
      lovers: [],
      votes: {},
      winner: null,
      winners: [],
    };
  }

  // --- Getters for top-level properties ---
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
    return this._state.dayLog;
  }

  get updatedAt() {
    return this._state.updatedAt;
  }

  get settings() {
    return this._state.settings;
  }

  get players() {
    // Convert players object map to array for easier consumption in components
    return Object.entries(this._state.players || {}).map(([id, p]) => ({ id, ...p }));
  }

  get rawPlayers() {
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

  // --- Methods to update game state properties ---

  async setPhase(newPhase) {
    await this._updateGame({ phase: newPhase });
  }

  async addDayLog(log) {
    const currentDayLog = this._state.dayLog || [];
    await this._updateGame({ dayLog: [...currentDayLog, log] });
  }

  async setPlayers(newPlayers) {
    // Assume newPlayers is an array of player objects and convert to map
    const playersMap = {};
    newPlayers.forEach((p) => {
      playersMap[p.id] = p;
    });
    await this._updateGame({ players: playersMap });
  }

  async setNightActions(actions) {
    await this._updateGame({ nightActions: actions });
  }

  async setVigilanteAmmo(ammo) {
    await this._updateGame({ vigilanteAmmo: ammo });
  }

  async setLockedVotes(lockedVotes) {
    await this._updateGame({ lockedVotes: lockedVotes });
  }

  async setLovers(lovers) {
    await this._updateGame({ lovers: lovers });
  }

  async setVotes(votes) {
    await this._updateGame({ votes: votes });
  }

  async setWinner(winner) {
    await this._updateGame({ winner: winner });
  }

  async setWinners(winners) {
    await this._updateGame({ winners: winners });
  }

  async setPhaseEndTime(endTime) {
    await this._updateGame({ phaseEndTime: endTime });
  }

  async setSettings(newSettings) {
    await this._updateGame({ settings: newSettings });
  }

  /**
   * Updates multiple properties of the game state.
   * @param {object} updates - An object containing properties to update.
   */
  async update(updates) {
    await this._updateGame(updates);
  }

  // --- Utility Methods ---

  // Returns true if the given player is the host of the current game.
  isHost(playerUid) {
    return this.hostId === playerUid;
  }

  // Finds a player by their UID.
  findPlayer(playerUid) {
    return this.players.find((p) => p.id === playerUid);
  }

  // Returns true if all players are ready, or if all alive players are ready.
  areAllPlayersReady(includeDead = false) {
    return this.players.every((p) => p.ready || (includeDead ? false : !p.isAlive));
  }
}

export default GameState;
