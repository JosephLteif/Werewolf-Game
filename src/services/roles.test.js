import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignRolesAndStartGame, markPlayerReady } from '../services/roles';
import { ROLE_IDS, PHASES } from '../constants';

// MockGameState class (re-used from nightActions.test.js)
class MockGameState {
  constructor(initialState) {
    this._state = { ...initialState }; // Deep copy initial state
    // Ensure players in _state is always a map, even if initialState provides an array
    if (Array.isArray(this._state.players)) {
      const playersMap = {};
      this._state.players.forEach(p => { playersMap[p.id] = p; });
      this._state.players = playersMap;
    }

    this.update = vi.fn(async (updates) => {
      // Handle updates to players specially: convert array to map for internal storage
      if (updates.players && Array.isArray(updates.players)) {
        const playersMap = {};
        updates.players.forEach(p => { playersMap[p.id] = p; });
        this._state.players = playersMap;
        const { players, ...restUpdates } = updates; // Extract players to avoid double assignment
        Object.assign(this._state, restUpdates); // Apply other updates
      } else {
        Object.assign(this._state, updates); // Apply all updates directly
      }
    });
  }

  get code() { return this._state.code; }
  get hostId() { return this._state.hostId; }
  get phase() { return this._state.phase; }
  get dayLog() { return this._state.dayLog; }
  get updatedAt() { return this._state.updatedAt; }
  get settings() { return this._state.settings; }
  get players() {
    // Always return players as an array, converting from internal map
    return Object.values(this._state.players || {});
  }
  get rawPlayers() {
    // Always return the internal map
    return this._state.players;
  }
  get nightActions() { return this._state.nightActions; }
  get vigilanteAmmo() { return this._state.vigilanteAmmo; }
  get lockedVotes() { return this._state.lockedVotes; }
  get lovers() { return this._state.lovers; }
  get votes() { return this._state.votes; }
  get winner() { return this._state.winner; }
  get winners() { return this._state.winners; }
  get phaseEndTime() { return this._state.phaseEndTime; }

  isHost(playerUid) {
    return this.hostId === playerUid;
  }
}

describe('Role Assignment and Readiness', () => {
  let mockPlayersArray;
  let mockUser;
  let mockGameStateInstance;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockUser = { uid: 'p1', displayName: 'Player 1' };
    mockPlayersArray = [
      { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLE_IDS.SEER },
      { id: 'p2', name: 'Player 2', isAlive: true, ready: false, role: ROLE_IDS.DOCTOR },
      { id: 'p3', name: 'Player 3', isAlive: true, ready: false, role: ROLE_IDS.WEREWOLF },
      { id: 'p4', name: 'Player 4', isAlive: true, ready: false, role: ROLE_IDS.VILLAGER },
      { id: 'p5', name: 'Player 5', isAlive: true, ready: false, role: ROLE_IDS.VILLAGER },
    ];
    const initialPlayersMap = {};
    mockPlayersArray.forEach(p => { initialPlayersMap[p.id] = p; });

    mockGameStateInstance = new MockGameState({
      settings: {
        wolfCount: 1,
        activeRoles: {
          [ROLE_IDS.SEER]: true,
          [ROLE_IDS.DOCTOR]: true,
        },
        actionWaitTime: 30,
      },
      phase: PHASES.LOBBY,
      players: initialPlayersMap,
      nightActions: {},
    });
  });

  describe('assignRolesAndStartGame', () => {
    it('assigns roles correctly based on settings', async () => {
      await assignRolesAndStartGame(mockGameStateInstance, mockPlayersArray, true);

      expect(mockGameStateInstance.update).toHaveBeenCalled();
      const updateCall = mockGameStateInstance.update.mock.calls[0][0];

      expect(updateCall.phase).toBe(PHASES.ROLE_REVEAL);
      expect(updateCall.players).toHaveLength(5);

      const roles = updateCall.players.map(p => p.role);
      expect(roles).toContain(ROLE_IDS.WEREWOLF);
      expect(roles).toContain(ROLE_IDS.SEER);
      expect(roles).toContain(ROLE_IDS.DOCTOR);

      const villagers = roles.filter(r => r === ROLE_IDS.VILLAGER);
      expect(villagers).toHaveLength(2);
    });

    it('assigns all specified roles correctly when many are active', async () => {
      const comprehensivePlayers = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false },
        { id: 'p2', name: 'Player 2', isAlive: true, ready: false },
        { id: 'p3', name: 'Player 3', isAlive: true, ready: false },
        { id: 'p4', name: 'Player 4', isAlive: true, ready: false },
        { id: 'p5', name: 'Player 5', isAlive: true, ready: false },
        { id: 'p6', name: 'Player 6', isAlive: true, ready: false },
        { id: 'p7', name: 'Player 7', isAlive: true, ready: false },
        { id: 'p8', name: 'Player 8', isAlive: true, ready: false },
        { id: 'p9', name: 'Player 9', isAlive: true, ready: false },
        { id: 'p10', name: 'Player 10', isAlive: true, ready: false },
        { id: 'p11', name: 'Player 11', isAlive: true, ready: false },
        { id: 'p12', name: 'Player 12', isAlive: true, ready: false },
        { id: 'p13', name: 'Player 13', isAlive: true, ready: false },
        { id: 'p14', name: 'Player 14', isAlive: true, ready: false },
        { id: 'p15', name: 'Player 15', isAlive: true, ready: false },
        { id: 'p16', name: 'Player 16', isAlive: true, ready: false },
      ];

      const comprehensiveGameState = new MockGameState({
        settings: {
          wolfCount: 2,
          activeRoles: {
            [ROLE_IDS.DOCTOR]: true,
            [ROLE_IDS.SEER]: true,
            [ROLE_IDS.HUNTER]: true,
            [ROLE_IDS.VIGILANTE]: true,
            [ROLE_IDS.SORCERER]: true,
            [ROLE_IDS.MINION]: true,
            [ROLE_IDS.LYCAN]: true,
            [ROLE_IDS.CUPID]: true,
            [ROLE_IDS.DOPPELGANGER]: true,
            [ROLE_IDS.MAYOR]: true,
            [ROLE_IDS.MASON]: true, // Mason will add two roles
          },
          actionWaitTime: 30,
        },
        phase: PHASES.LOBBY,
        players: {}, // This will be replaced by assignRoles
      });

      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.9);
      await assignRolesAndStartGame(comprehensiveGameState, comprehensivePlayers, true);
      mockRandom.mockRestore();

      expect(comprehensiveGameState.update).toHaveBeenCalled();
      const updateCall = comprehensiveGameState.update.mock.calls[0][0];

      expect(updateCall.phase).toBe(PHASES.ROLE_REVEAL);
      expect(updateCall.players).toHaveLength(comprehensivePlayers.length);

      const expectedRoleCounts = {
        [ROLE_IDS.WEREWOLF]: 2,
        [ROLE_IDS.DOCTOR]: 1,
        [ROLE_IDS.SEER]: 1,
        [ROLE_IDS.HUNTER]: 1,
        [ROLE_IDS.VIGILANTE]: 1,
        [ROLE_IDS.SORCERER]: 1,
        [ROLE_IDS.MINION]: 1,
        [ROLE_IDS.LYCAN]: 1,
        [ROLE_IDS.CUPID]: 1,
        [ROLE_IDS.DOPPELGANGER]: 1,
        [ROLE_IDS.MAYOR]: 1,
        [ROLE_IDS.MASON]: 2,
      };

      const totalSpecialRoles = Object.values(expectedRoleCounts).reduce((sum, count) => sum + count, 0);
      const expectedVillagers = comprehensivePlayers.length - totalSpecialRoles;
      if (expectedVillagers > 0) {
        expectedRoleCounts[ROLE_IDS.VILLAGER] = expectedVillagers;
      }

      const roles = updateCall.players.map(p => p.role);
      const roleCounts = roles.reduce((acc, role) => {
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});
      expect(roleCounts).toEqual(expectedRoleCounts);
    });

    it('does nothing if not host', async () => {
      // The assignRolesAndStartGame function itself has a host check,
      // but in the new structure, the call to assignRolesAndStartGame is already guarded by isHost in coreGameActions.
      // So, this test will now call assignRolesAndStartGame directly with isHost=false,
      // and it should still do nothing.
      await assignRolesAndStartGame(mockGameStateInstance, mockPlayersArray, false);
      expect(mockGameStateInstance.update).not.toHaveBeenCalled();
    });
  });

  describe('markPlayerReady', () => {
    it('marks a player as ready', async () => {
      const initialPlayers = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLE_IDS.VILLAGER },
        { id: 'p2', name: 'Player 2', isAlive: true, ready: false, role: ROLE_IDS.VILLAGER },
      ];
      const testGameState = new MockGameState({ ...mockGameStateInstance._state, players: {
        'p1': initialPlayers[0],
        'p2': initialPlayers[1],
      }, phase: PHASES.DAY_VOTING });

      await markPlayerReady(initialPlayers, mockUser, testGameState);

      expect(testGameState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({ id: 'p1', ready: true }),
            expect.objectContaining({ id: 'p2', ready: false }),
          ]),
          phase: PHASES.DAY_VOTING,
        })
      );
    });

    it('transitions to NIGHT_INTRO when all alive players are ready', async () => {
      const initialPlayers = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLE_IDS.VILLAGER },
        { id: 'p2', name: 'Player 2', isAlive: true, ready: true, role: ROLE_IDS.VILLAGER },
      ];
      const testGameState = new MockGameState({ ...mockGameStateInstance._state, players: {
        'p1': initialPlayers[0],
        'p2': initialPlayers[1],
      }, phase: PHASES.DAY_VOTING });

      await markPlayerReady(initialPlayers, mockUser, testGameState);

      expect(testGameState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({ id: 'p1', ready: true }),
            expect.objectContaining({ id: 'p2', ready: true }),
          ]),
          phase: PHASES.NIGHT_INTRO,
        })
      );
    });

    it('dead players do not need to be ready to advance phase', async () => {
      const initialPlayers = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLE_IDS.VILLAGER },
        { id: 'p2', name: 'Player 2', isAlive: false, ready: false, role: ROLE_IDS.VILLAGER },
      ];
      const testGameState = new MockGameState({ ...mockGameStateInstance._state, players: {
        'p1': initialPlayers[0],
        'p2': initialPlayers[1],
      }, phase: PHASES.DAY_VOTING });

      await markPlayerReady(initialPlayers, mockUser, testGameState);

      expect(testGameState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({ id: 'p1', ready: true }),
            expect.objectContaining({ id: 'p2', ready: false }),
          ]),
          phase: PHASES.NIGHT_INTRO,
        })
      );
    });
  });
});