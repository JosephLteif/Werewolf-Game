import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignRolesAndStartGame, markPlayerReady } from './roles.js';
import { ROLE_IDS, PHASES } from '../constants';

import { Role } from '../roles/Role'; // Import the base Role class
import { Cupid } from '../roles/implementations/Cupid'; // Import Cupid role
import { Doctor } from '../roles/implementations/Doctor'; // Import Doctor role
import { Doppelganger } from '../roles/implementations/Doppelganger'; // Import Doppelganger role
import { Hunter } from '../roles/implementations/Hunter';
import { Lycan } from '../roles/implementations/Lycan';
import { Mason } from '../roles/implementations/Mason'; // Import Mason role
import { Mayor } from '../roles/implementations/Mayor';
import { Minion } from '../roles/implementations/Minion'; // Import Minion role
import { Seer } from '../roles/implementations/Seer'; // Import Seer role
import { Sorcerer } from '../roles/implementations/Sorcerer'; // Import Sorcerer role
import { Tanner } from '../roles/implementations/Tanner';
import { Vigilante } from '../roles/implementations/Vigilante'; // Import Vigilante role
import { Villager } from '../roles/implementations/Villager';
import { Werewolf } from '../roles/implementations/Werewolf'; // Import Werewolf role

const allRoles = [
  new Villager(),
  new Werewolf(),
  new Seer(),
  new Doctor(),
  new Hunter(),
  new Vigilante(),
  new Sorcerer(),
  new Minion(),
  new Cupid(),
  new Doppelganger(),
  new Mason(),
  new Lycan(),
  new Mayor(),
  new Tanner(),
];

vi.mock('../roles/RoleRegistry', () => ({
  roleRegistry: {
    getRole: vi.fn((roleId) => allRoles.find((r) => r.id === roleId)),
    getAllRoles: vi.fn(() => allRoles),
  },
}));

// MockGameState class (re-used from nightActions.test.js)
class MockGameState {
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

  isHost(playerUid) {
    return this.hostId === playerUid;
  }
}

// Custom Role for testing RoleRegistry register method
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
    mockPlayersArray.forEach((p) => {
      initialPlayersMap[p.id] = p;
    });

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

  // Tests for assignRolesAndStartGame and markPlayerReady are here, unchanged

  describe('assignRolesAndStartGame', () => {
    it('assigns roles correctly based on settings', async () => {
      await assignRolesAndStartGame(mockGameStateInstance, mockPlayersArray, true);

      expect(mockGameStateInstance.update).toHaveBeenCalled();
      const updateCall = mockGameStateInstance.update.mock.calls[0][0];

      expect(updateCall.phase).toBe(PHASES.ROLE_REVEAL);
      expect(updateCall.players).toHaveLength(5);

      const roles = updateCall.players.map((p) => p.role);
      expect(roles).toContain(ROLE_IDS.WEREWOLF);
      expect(roles).toContain(ROLE_IDS.SEER);
      expect(roles).toContain(ROLE_IDS.DOCTOR);

      const villagers = roles.filter((r) => r === ROLE_IDS.VILLAGER);
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
      // FIX: Changed mockGameStateInstance to comprehensiveGameState
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

      const totalSpecialRoles = Object.values(expectedRoleCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      const expectedVillagers = comprehensivePlayers.length - totalSpecialRoles;
      if (expectedVillagers > 0) {
        expectedRoleCounts[ROLE_IDS.VILLAGER] = expectedVillagers;
      }

      const roles = updateCall.players.map((p) => p.role);
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
      const testGameState = new MockGameState({
        ...mockGameStateInstance._state,
        players: {
          p1: initialPlayers[0],
          p2: initialPlayers[1],
        },
        phase: PHASES.DAY_VOTING,
      });

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
      const testGameState = new MockGameState({
        ...mockGameStateInstance._state,
        players: {
          p1: initialPlayers[0],
          p2: initialPlayers[1],
        },
        phase: PHASES.DAY_VOTING,
      });

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
      const testGameState = new MockGameState({
        ...mockGameStateInstance._state,
        players: {
          p1: initialPlayers[0],
          p2: initialPlayers[1],
        },
        phase: PHASES.DAY_VOTING,
      });

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

  describe('Role Class', () => {
    it('base Role getNightPhase returns null', () => {
      const role = new Role();
      expect(role.getNightPhase()).toBeNull();
    });

    it('base Role processNightAction returns an empty object', () => {
      const role = new Role();
      expect(role.processNightAction({}, {}, {})).toEqual({});
    });
  });

  describe('Cupid Role', () => {
    let cupidRole;
    beforeEach(() => {
      cupidRole = new Cupid();
    });

    it('isWakeUpPhase returns true for NIGHT_CUPID', () => {
      expect(cupidRole.isWakeUpPhase(PHASES.NIGHT_CUPID)).toBe(true);
    });

    it('isWakeUpPhase returns false for other phases', () => {
      expect(cupidRole.isWakeUpPhase(PHASES.DAY)).toBe(false);
      expect(cupidRole.isWakeUpPhase(PHASES.NIGHT_WEREWOLF)).toBe(false);
    });

    it('getNightPhase returns NIGHT_CUPID', () => {
      expect(cupidRole.getNightPhase()).toBe(PHASES.NIGHT_CUPID);
    });

    it('processNightAction correctly records cupidLinks', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'cupid1', role: ROLE_IDS.CUPID };
      const action = { type: 'cupidLinks', targetIds: ['p1', 'p2'] };
      const result = cupidRole.processNightAction(gameState, player, action);
      expect(result).toEqual({ cupidLinks: ['p1', 'p2'] });
    });

    it('processNightAction returns empty object for unknown action type', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'cupid1', role: ROLE_IDS.CUPID };
      const action = { type: 'unknownAction' };
      const result = cupidRole.processNightAction(gameState, player, action);
      expect(result).toEqual({});
    });
  });

  describe('Doctor Role', () => {
    let doctorRole;
    beforeEach(() => {
      doctorRole = new Doctor();
    });

    it('isWakeUpPhase returns true for NIGHT_DOCTOR', () => {
      expect(doctorRole.isWakeUpPhase(PHASES.NIGHT_DOCTOR)).toBe(true);
    });

    it('isWakeUpPhase returns false for other phases', () => {
      expect(doctorRole.isWakeUpPhase(PHASES.DAY)).toBe(false);
      expect(doctorRole.isWakeUpPhase(PHASES.NIGHT_WEREWOLF)).toBe(false);
    });

    it('getNightPhase returns NIGHT_DOCTOR', () => {
      expect(doctorRole.getNightPhase()).toBe(PHASES.NIGHT_DOCTOR);
    });

    it('processNightAction correctly records doctorProtect target', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'doctor1', role: ROLE_IDS.DOCTOR };
      const action = { type: 'doctorProtect', targetId: 'p1' };
      const result = doctorRole.processNightAction(gameState, player, action);
      expect(result).toEqual({ doctorProtect: 'p1' });
    });

    it('processNightAction returns empty object for unknown action type', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'doctor1', role: ROLE_IDS.DOCTOR };
      const action = { type: 'unknownAction' };
      const result = doctorRole.processNightAction(gameState, player, action);
      expect(result).toEqual({});
    });
  });

  describe('Doppelganger Role', () => {
    let doppelgangerRole;
    beforeEach(() => {
      doppelgangerRole = new Doppelganger();
    });

    it('isWakeUpPhase returns true for NIGHT_DOPPELGANGER', () => {
      expect(doppelgangerRole.isWakeUpPhase(PHASES.NIGHT_DOPPELGANGER)).toBe(true);
    });

    it('isWakeUpPhase returns false for other phases', () => {
      expect(doppelgangerRole.isWakeUpPhase(PHASES.DAY)).toBe(false);
      expect(doppelgangerRole.isWakeUpPhase(PHASES.NIGHT_WEREWOLF)).toBe(false);
    });

    it('getNightPhase returns NIGHT_DOPPELGANGER', () => {
      expect(doppelgangerRole.getNightPhase()).toBe(PHASES.NIGHT_DOPPELGANGER);
    });

    it('processNightAction correctly records doppelgangerCopy target and player', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'doppel1', role: ROLE_IDS.DOPPELGANGER };
      const action = { type: 'doppelgangerCopy', targetId: 'p1' };
      const result = doppelgangerRole.processNightAction(gameState, player, action);
      expect(result).toEqual({ doppelgangerCopy: 'p1', doppelgangerPlayerId: 'doppel1' });
    });

    it('processNightAction returns empty object for unknown action type', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'doppel1', role: ROLE_IDS.DOPPELGANGER };
      const action = { type: 'unknownAction' };
      const result = doppelgangerRole.processNightAction(gameState, player, action);
      expect(result).toEqual({});
    });
  });

  describe('Mason Role', () => {
    let masonRole;
    beforeEach(() => {
      masonRole = new Mason();
    });

    it('isWakeUpPhase returns true for NIGHT_MASON', () => {
      expect(masonRole.isWakeUpPhase(PHASES.NIGHT_MASON)).toBe(true);
    });

    it('isWakeUpPhase returns false for other phases', () => {
      expect(masonRole.isWakeUpPhase(PHASES.DAY)).toBe(false);
      expect(masonRole.isWakeUpPhase(PHASES.NIGHT_WEREWOLF)).toBe(false);
    });

    it('getNightPhase returns NIGHT_MASON', () => {
      expect(masonRole.getNightPhase()).toBe(PHASES.NIGHT_MASON);
    });

    it('processNightAction correctly records masonReady status', () => {
      const gameState = { nightActions: { masonsReady: {} } };
      const player = { id: 'mason1', role: ROLE_IDS.MASON };
      const action = { type: 'masonReady' };
      const result = masonRole.processNightAction(gameState, player, action);
      expect(result).toEqual({ masonsReady: { mason1: true } });
    });

    it('processNightAction merges masonReady status with existing ones', () => {
      const gameState = { nightActions: { masonsReady: { mason2: true } } };
      const player = { id: 'mason1', role: ROLE_IDS.MASON };
      const action = { type: 'masonReady' };
      const result = masonRole.processNightAction(gameState, player, action);
      expect(result).toEqual({ masonsReady: { mason2: true, mason1: true } });
    });

    it('processNightAction returns empty object for unknown action type', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'mason1', role: ROLE_IDS.MASON };
      const action = { type: 'unknownAction' };
      const result = masonRole.processNightAction(gameState, player, action);
      expect(result).toEqual({});
    });
  });

  describe('Minion Role', () => {
    let minionRole;
    beforeEach(() => {
      minionRole = new Minion();
    });

    it('isWakeUpPhase returns true for NIGHT_MINION', () => {
      expect(minionRole.isWakeUpPhase(PHASES.NIGHT_MINION)).toBe(true);
    });

    it('isWakeUpPhase returns false for other phases', () => {
      expect(minionRole.isWakeUpPhase(PHASES.DAY)).toBe(false);
      expect(minionRole.isWakeUpPhase(PHASES.NIGHT_WEREWOLF)).toBe(false);
    });

    it('getNightPhase returns NIGHT_MINION', () => {
      expect(minionRole.getNightPhase()).toBe(PHASES.NIGHT_MINION);
    });

    it('processNightAction returns empty object', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'minion1', role: ROLE_IDS.MINION };
      const action = { type: 'anyAction' }; // Minion doesn't process night actions
      const result = minionRole.processNightAction(gameState, player, action);
      expect(result).toEqual({});
    });
  });

  describe('Seer Role', () => {
    let seerRole;
    beforeEach(() => {
      seerRole = new Seer();
    });

    it('isWakeUpPhase returns true for NIGHT_SEER', () => {
      expect(seerRole.isWakeUpPhase(PHASES.NIGHT_SEER)).toBe(true);
    });

    it('isWakeUpPhase returns false for other phases', () => {
      expect(seerRole.isWakeUpPhase(PHASES.DAY)).toBe(false);
      expect(seerRole.isWakeUpPhase(PHASES.NIGHT_WEREWOLF)).toBe(false);
    });

    it('getNightPhase returns NIGHT_SEER', () => {
      expect(seerRole.getNightPhase()).toBe(PHASES.NIGHT_SEER);
    });

    it('processNightAction correctly records seerCheck target', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'seer1', role: ROLE_IDS.SEER };
      const action = { type: 'seerCheck', targetId: 'p1' };
      const result = seerRole.processNightAction(gameState, player, action);
      expect(result).toEqual({ seerCheck: 'p1' });
    });

    it('processNightAction returns empty object for unknown action type', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'seer1', role: ROLE_IDS.SEER };
      const action = { type: 'unknownAction' };
      const result = seerRole.processNightAction(gameState, player, action);
      expect(result).toEqual({});
    });
  });

  describe('Sorcerer Role', () => {
    let sorcererRole;
    beforeEach(() => {
      sorcererRole = new Sorcerer();
    });

    it('isWakeUpPhase returns true for NIGHT_SORCERER', () => {
      expect(sorcererRole.isWakeUpPhase(PHASES.NIGHT_SORCERER)).toBe(true);
    });

    it('isWakeUpPhase returns false for other phases', () => {
      expect(sorcererRole.isWakeUpPhase(PHASES.DAY)).toBe(false);
      expect(sorcererRole.isWakeUpPhase(PHASES.NIGHT_WEREWOLF)).toBe(false);
    });

    it('getNightPhase returns NIGHT_SORCERER', () => {
      expect(sorcererRole.getNightPhase()).toBe(PHASES.NIGHT_SORCERER);
    });

    it('processNightAction correctly records sorcererCheck target', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'sorcerer1', role: ROLE_IDS.SORCERER };
      const action = { type: 'sorcererCheck', targetId: 'p1' };
      const result = sorcererRole.processNightAction(gameState, player, action);
      expect(result).toEqual({ sorcererCheck: 'p1' });
    });

    it('processNightAction returns empty object for unknown action type', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'sorcerer1', role: ROLE_IDS.SORCERER };
      const action = { type: 'unknownAction' };
      const result = sorcererRole.processNightAction(gameState, player, action);
      expect(result).toEqual({});
    });
  });

  describe('Vigilante Role', () => {
    let vigilanteRole;
    beforeEach(() => {
      vigilanteRole = new Vigilante();
    });

    it('isWakeUpPhase returns true for NIGHT_VIGILANTE', () => {
      expect(vigilanteRole.isWakeUpPhase(PHASES.NIGHT_VIGILANTE)).toBe(true);
    });

    it('isWakeUpPhase returns false for other phases', () => {
      expect(vigilanteRole.isWakeUpPhase(PHASES.DAY)).toBe(false);
      expect(vigilanteRole.isWakeUpPhase(PHASES.NIGHT_WEREWOLF)).toBe(false);
    });

    it('getNightPhase returns NIGHT_VIGILANTE', () => {
      expect(vigilanteRole.getNightPhase()).toBe(PHASES.NIGHT_VIGILANTE);
    });

    it('processNightAction correctly records vigilanteTarget', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'vigilante1', role: ROLE_IDS.VIGILANTE };
      const action = { type: 'vigilanteTarget', targetId: 'p1' };
      const result = vigilanteRole.processNightAction(gameState, player, action);
      expect(result).toEqual({ vigilanteTarget: 'p1' });
    });

    it('processNightAction returns empty object for unknown action type', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'vigilante1', role: ROLE_IDS.VIGILANTE };
      const action = { type: 'unknownAction' };
      const result = vigilanteRole.processNightAction(gameState, player, action);
      expect(result).toEqual({});
    });
  });

  describe('Werewolf Role', () => {
    let werewolfRole;
    beforeEach(() => {
      werewolfRole = new Werewolf();
    });

    it('isWakeUpPhase returns true for NIGHT_WEREWOLF', () => {
      expect(werewolfRole.isWakeUpPhase(PHASES.NIGHT_WEREWOLF)).toBe(true);
    });

    it('isWakeUpPhase returns false for other phases', () => {
      expect(werewolfRole.isWakeUpPhase(PHASES.DAY)).toBe(false);
      expect(werewolfRole.isWakeUpPhase(PHASES.NIGHT_CUPID)).toBe(false);
    });

    it('getNightPhase returns NIGHT_WEREWOLF', () => {
      expect(werewolfRole.getNightPhase()).toBe(PHASES.NIGHT_WEREWOLF);
    });

    it('processNightAction correctly records werewolfVote target', () => {
      const gameState = { nightActions: { werewolfVotes: {} } };
      const player = { id: 'wolf1', role: ROLE_IDS.WEREWOLF };
      const action = { type: 'werewolfVote', targetId: 'p1' };
      const result = werewolfRole.processNightAction(gameState, player, action);
      expect(result).toEqual({ werewolfVotes: { wolf1: 'p1' }, werewolfProvisionalVotes: {} });
    });

    it('processNightAction merges werewolfVote target with existing votes', () => {
      const gameState = { nightActions: { werewolfVotes: { wolf2: 'p2' } } };
      const player = { id: 'wolf1', role: ROLE_IDS.WEREWOLF };
      const action = { type: 'werewolfVote', targetId: 'p1' };
      const result = werewolfRole.processNightAction(gameState, player, action);
      expect(result).toEqual({
        werewolfVotes: { wolf2: 'p2', wolf1: 'p1' },
        werewolfProvisionalVotes: {},
      });
    });

    it('processNightAction returns empty object for unknown action type', () => {
      const gameState = { nightActions: {} };
      const player = { id: 'wolf1', role: ROLE_IDS.WEREWOLF };
      const action = { type: 'unknownAction' };
      const result = werewolfRole.processNightAction(gameState, player, action);
      expect(result).toEqual({});
    });
  });
});
