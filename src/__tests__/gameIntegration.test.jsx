import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TEAMS, CUPID_FATES, PHASES, ROLE_IDS, TANNER_WIN_STRATEGIES } from '../constants';
import { checkWinCondition } from '../utils/winConditions';
import { findPlayerById } from '../utils/playersUtils';
import { roleRegistry } from '../roles/RoleRegistry.js';
import { resolveNight, handleHunterShot } from '../services/nightActions';
import { resolveDayVoting } from '../services/voting';
import { updateRoom } from '../services/rooms'; // Import updateRoom

import { MockGameState } from './testUtils';

// Mock the updateRoom function globally for game integration tests
vi.mock('../services/rooms', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    updateRoom: vi.fn(), // Mock the named export updateRoom
  };
});

// Helper function to create a player
const createPlayer = (id, roleId, isAlive = true, alignment = null, extraProps = {}) => ({
  id,
  name: `Player ${id.slice(1)}`,
  isAlive,
  role: roleId,
  alignment: alignment || roleRegistry.getRole(roleId.toUpperCase())?.alignment || 'neutral', // Default to role's alignment or neutral
  ...extraProps,
});

// Helper function to create initial game state using MockGameState
const createInitialGameState = (playersArray, settings = {}, initialPhase = PHASES.LOBBY) => {
  const playersMap = {};
  playersArray.forEach((p) => {
    playersMap[p.id] = p;
  });

  const initialState = {
    players: playersMap,
    phase: initialPhase,
    settings: {
      actionWaitTime: 10,
      votingWaitTime: 10,
      cupidFateOption: CUPID_FATES.SELFLESS, // Default cupid fate
      ...settings,
    },
    dayLog: [], // Start with an empty array
    nightActions: {
      werewolfVotes: {},
      doctorProtect: null,
      vigilanteTarget: null,
      sorcererCheck: null,
      cupidLinks: [],
      doppelgangerCopy: null,
      masonsReady: {},
    },
    votes: {},
    lockedVotes: [],
    lovers: [],
    winner: null,
    winners: [],
    doppelgangerTarget: null,
    vigilanteAmmo: {},
  };

  return new MockGameState(initialState);
};

let gameState;

beforeEach(() => {
  vi.resetAllMocks(); // Reset all mocks before each test
  gameState = null; // Reset gameState before each test
  // Mock the implementation of updateRoom to call gameState.update
  updateRoom.mockImplementation(async (roomCode, updates) => {
    if (gameState) {
      await gameState.update(updates);
    }
  });
});

describe('Game Integration Tests', () => {
  describe('Win Conditions', () => {
    it('Scenario: Villagers win when all werewolves are eliminated', async () => {
      const p1 = createPlayer('p1', 'villager');
      const p2 = createPlayer('p2', 'werewolf');
      const p3 = createPlayer('p3', 'villager');

      gameState = createInitialGameState([p1, p2, p3], { wolfCount: 1 }, PHASES.DAY_REVEAL); // Start in a phase before night resolution

      // Simulate killing the werewolf
      let updatedPlayers = gameState.players.map((p) =>
        p.id === p2.id ? { ...p, isAlive: false } : p
      );

      // Call checkWinCondition directly after updating players.
      // In a real game flow, this would happen at the end of night or day resolution.
      // For this integration test, we simulate the state where all wolves are dead.
      const result = checkWinCondition(
        updatedPlayers,
        gameState.lovers,
        gameState._state.winners,
        gameState.settings
      );

      expect(result).toEqual({
        winners: ['VILLAGERS'],
        isGameOver: true,
      });
    });

    it('Scenario: Werewolves win when they outnumber or equal good players', async () => {
      const p1 = createPlayer('p1', 'werewolf');
      const p2 = createPlayer('p2', 'werewolf');
      const p3 = createPlayer('p3', 'villager'); // Good player

      gameState = createInitialGameState([p1, p2, p3], { wolfCount: 2 }, PHASES.DAY_VOTING);

      const result = checkWinCondition(
        gameState.players,
        gameState.lovers,
        gameState._state.winners,
        gameState.settings
      );

      expect(result).toEqual({
        winners: ['WEREWOLVES'],
        isGameOver: true,
      });
    });

    it('Scenario: Forbidden Love (Wolf + Villager) - Couple Win (2 players left)', async () => {
      const wolfLover = createPlayer('p1', 'werewolf', true, TEAMS.LOVERS);
      const villagerLover = createPlayer('p2', 'villager', true, TEAMS.LOVERS);

      // All other players are dead
      const deadPlayers = [
        createPlayer('p3', 'villager', false),
        createPlayer('p4', 'cupid', false),
      ];

      gameState = createInitialGameState(
        [wolfLover, villagerLover, ...deadPlayers],
        { wolfCount: 1 },
        PHASES.DAY_REVEAL
      );
      gameState._state.lovers = [wolfLover.id, villagerLover.id];

      // Simulate their alignment being set to TEAMS.LOVERS
      const playersWithUpdatedAlignment = gameState.players.map((p) => {
        if (p.id === wolfLover.id || p.id === villagerLover.id) {
          return { ...p, alignment: TEAMS.LOVERS };
        }
        return p;
      });

      const result = checkWinCondition(
        playersWithUpdatedAlignment,
        gameState.lovers,
        gameState._state.winners,
        gameState.settings
      );

      expect(result).toEqual({
        winners: ['LOVERS'],
        isGameOver: true,
      });
    });

    it('Scenario: Forbidden Love - Throuple Win (3 players left, Third Wheel Cupid)', async () => {
      const wolfLover = createPlayer('p1', 'werewolf', true, TEAMS.LOVERS);
      const villagerLover = createPlayer('p2', 'villager', true, TEAMS.LOVERS);
      const cupid = createPlayer('p3', 'cupid', true); // Cupid is alive

      // All other players are dead
      const deadPlayers = [createPlayer('p4', 'villager', false)];

      gameState = createInitialGameState(
        [wolfLover, villagerLover, cupid, ...deadPlayers],
        { wolfCount: 1, cupidFateOption: CUPID_FATES.THIRD_WHEEL },
        PHASES.DAY_REVEAL
      );
      gameState._state.lovers = [wolfLover.id, villagerLover.id];

      // Simulate their alignment being set to TEAMS.LOVERS
      const playersWithUpdatedAlignment = gameState.players.map((p) => {
        if (p.id === wolfLover.id || p.id === villagerLover.id) {
          return { ...p, alignment: TEAMS.LOVERS };
        }
        return p;
      });

      const result = checkWinCondition(
        playersWithUpdatedAlignment,
        gameState.lovers,
        gameState._state.winners,
        gameState.settings
      );

      expect(result).toEqual({
        winners: ['LOVERS', 'CUPID'],
        isGameOver: true,
      });
    });

    it('Scenario: Loyal Couple (Villager + Villager) - Village wins if no wolves', async () => {
      const v1 = createPlayer('v1', 'villager');
      const v2 = createPlayer('v2', 'villager');
      const wolf = createPlayer('wolf1', 'werewolf');

      gameState = createInitialGameState([v1, v2, wolf], { wolfCount: 1 }, PHASES.DAY_REVEAL);
      gameState._state.lovers = [v1.id, v2.id]; // They are lovers

      // Simulate killing the werewolf
      let updatedPlayers = gameState.players.map((p) =>
        p.id === wolf.id ? { ...p, isAlive: false } : p
      );

      const result = checkWinCondition(
        updatedPlayers,
        gameState.lovers,
        gameState._state.winners,
        gameState.settings
      );

      expect(result).toEqual({
        winners: ['VILLAGERS'],
        isGameOver: true,
      });
    });

    it('Scenario: Toxic Couple (Wolf + Wolf) - Werewolves win', async () => {
      const w1 = createPlayer('w1', ROLE_IDS.WEREWOLF);
      const w2 = createPlayer('w2', ROLE_IDS.WEREWOLF);
      const v1 = createPlayer('v1', 'villager');

      gameState = createInitialGameState([w1, w2, v1], { wolfCount: 2 }, PHASES.DAY_VOTING);
      gameState._state.lovers = [w1.id, w2.id]; // They are lovers

      const result = checkWinCondition(
        gameState.players,
        gameState.lovers,
        gameState._state.winners,
        gameState.settings
      );

      expect(result).toEqual({
        winners: ['WEREWOLVES'],
        isGameOver: true,
      });
    });

    it('Scenario: Cupid links two other players (Selfless fate) - Lovers win as last two', async () => {
      const cupid = createPlayer('p1', 'cupid', true);
      const villagerLover1 = createPlayer('p2', 'villager', true, TEAMS.LOVERS);
      const villagerLover2 = createPlayer('p3', 'villager', true, TEAMS.LOVERS);

      // All other players are dead
      const deadPlayers = [
        createPlayer('p4', 'werewolf', false),
        createPlayer('p5', 'villager', false),
      ];

      gameState = createInitialGameState(
        [cupid, villagerLover1, villagerLover2, ...deadPlayers],
        { wolfCount: 1, cupidFateOption: CUPID_FATES.SELFLESS },
        PHASES.DAY_REVEAL
      );
      gameState._state.lovers = [villagerLover1.id, villagerLover2.id];

      const playersWithUpdatedAlignment = gameState.players.map((p) => {
        if (p.id === villagerLover1.id || p.id === villagerLover2.id) {
          return { ...p, alignment: TEAMS.LOVERS };
        }
        return p;
      });

      // Kill Cupid to ensure only lovers remain
      const finalPlayers = playersWithUpdatedAlignment.map((p) =>
        p.id === cupid.id ? { ...p, isAlive: false } : p
      );

      const result = checkWinCondition(
        finalPlayers,
        gameState.lovers,
        gameState._state.winners,
        gameState.settings
      );

      expect(result).toEqual({
        winners: ['LOVERS'],
        isGameOver: true,
      });
    });

    it('Scenario: Cupid links self and another player (Selfless fate) - Lovers win as last two', async () => {
      const cupid = createPlayer('p1', 'cupid', true, TEAMS.LOVERS); // Cupid is a lover
      const villagerLover = createPlayer('p2', 'villager', true, TEAMS.LOVERS);

      // All other players are dead
      const deadPlayers = [
        createPlayer('p3', 'werewolf', false),
        createPlayer('p4', 'villager', false),
      ];

      gameState = createInitialGameState(
        [cupid, villagerLover, ...deadPlayers],
        { wolfCount: 1, cupidCanChooseSelf: true, cupidFateOption: CUPID_FATES.SELFLESS },
        PHASES.DAY_REVEAL
      );
      gameState._state.lovers = [cupid.id, villagerLover.id];

      const playersWithUpdatedAlignment = gameState.players.map((p) => {
        if (p.id === cupid.id || p.id === villagerLover.id) {
          return { ...p, alignment: TEAMS.LOVERS };
        }
        return p;
      });

      const result = checkWinCondition(
        playersWithUpdatedAlignment,
        gameState.lovers,
        gameState._state.winners,
        gameState.settings
      );

      expect(result).toEqual({
        winners: ['LOVERS'],
        isGameOver: true,
      });
    });

    it('Scenario: Cupid links two other players (Third Wheel fate) - Throuple win with Cupid alive', async () => {
      const cupid = createPlayer('p1', 'cupid', true); // Cupid is alive
      const villagerLover1 = createPlayer('p2', 'villager', true, TEAMS.LOVERS);
      const villagerLover2 = createPlayer('p3', 'villager', true, TEAMS.LOVERS);

      // All other players are dead
      const deadPlayers = [createPlayer('p4', 'werewolf', false)];

      gameState = createInitialGameState(
        [cupid, villagerLover1, villagerLover2, ...deadPlayers],
        { wolfCount: 1, cupidFateOption: CUPID_FATES.THIRD_WHEEL },
        PHASES.DAY_REVEAL
      );
      gameState._state.lovers = [villagerLover1.id, villagerLover2.id];

      const playersWithUpdatedAlignment = gameState.players.map((p) => {
        if (p.id === villagerLover1.id || p.id === villagerLover2.id) {
          return { ...p, alignment: TEAMS.LOVERS };
        }
        return p;
      });

      // Simulate a scenario where only Cupid and the two lovers are alive
      const finalPlayers = playersWithUpdatedAlignment.filter(
        (p) => p.id === cupid.id || p.id === villagerLover1.id || p.id === villagerLover2.id
      );

      const result = checkWinCondition(
        finalPlayers,
        gameState.lovers,
        gameState._state.winners,
        gameState.settings
      );

      expect(result).toEqual({
        winners: ['LOVERS', 'CUPID'],
        isGameOver: true,
      });
    });
  });
  describe('Night Action Resolution', () => {
    it('Scenario: Consensus - All wolves vote for the same target', async () => {
      const wolf1 = createPlayer('w1', ROLE_IDS.WEREWOLF);
      const wolf2 = createPlayer('w2', ROLE_IDS.WEREWOLF);
      const villager1 = createPlayer('v1', ROLE_IDS.VILLAGER);
      const villager2 = createPlayer('v2', ROLE_IDS.VILLAGER);
      const villager3 = createPlayer('v3', ROLE_IDS.VILLAGER);
      const villager4 = createPlayer('v4', ROLE_IDS.VILLAGER);
      const villager5 = createPlayer('v5', ROLE_IDS.VILLAGER);

      gameState = createInitialGameState(
        [wolf1, wolf2, villager1, villager2, villager3, villager4, villager5],
        { wolfCount: 2 },
        PHASES.NIGHT_WEREWOLF
      );
      gameState._state.nightActions.werewolfVotes = {
        [wolf1.id]: villager1.id,
        [wolf2.id]: villager1.id,
      };

      await resolveNight(gameState, gameState.players, gameState._state.nightActions);

      expect(gameState.update).toHaveBeenCalled();
      const updatedVillager = findPlayerById(gameState.players, villager1.id);
      expect(updatedVillager.isAlive).toBe(false);
      expect(gameState._state.dayLog.some((log) => log.includes('was torn apart by wolves'))).toBe(
        true
      );
    });

    it('Scenario: Split Vote - Wolves vote for different targets (Random resolution)', async () => {
      const wolf1 = createPlayer('w1', ROLE_IDS.WEREWOLF);
      const wolf2 = createPlayer('w2', ROLE_IDS.WEREWOLF);
      const villagerA = createPlayer('v1', ROLE_IDS.VILLAGER);
      const villagerB = createPlayer('v2', ROLE_IDS.VILLAGER);
      const villagerC = createPlayer('v3', ROLE_IDS.VILLAGER);
      const villagerD = createPlayer('v4', ROLE_IDS.VILLAGER);
      const villagerE = createPlayer('v5', ROLE_IDS.VILLAGER);

      gameState = createInitialGameState(
        [wolf1, wolf2, villagerA, villagerB, villagerC, villagerD, villagerE],
        { wolfCount: 2 },
        PHASES.NIGHT_WEREWOLF
      );
      gameState._state.nightActions.werewolfVotes = {
        [wolf1.id]: villagerA.id,
        [wolf2.id]: villagerB.id,
      };

      // Mock Math.random to favor the first target (Villager A)
      vi.spyOn(Math, 'random').mockReturnValue(0.2);

      await resolveNight(gameState, gameState.players, gameState._state.nightActions);

      expect(gameState.update).toHaveBeenCalled();
      const updatedVillagerA = findPlayerById(gameState.players, villagerA.id);
      const updatedVillagerB = findPlayerById(gameState.players, villagerB.id);

      // One should be dead, the other alive. Based on mock, A should die.
      expect(updatedVillagerA.isAlive).toBe(false);
      expect(updatedVillagerB.isAlive).toBe(true);
      expect(gameState._state.dayLog.some((log) => log.includes('wolves'))).toBe(true); // Either Player 1 or Player 2 was torn apart by wolves
    });

    it('Scenario: Single werewolf votes for a target', async () => {
      const wolf1 = createPlayer('w1', ROLE_IDS.WEREWOLF);
      const villager1 = createPlayer('v1', ROLE_IDS.VILLAGER);
      const villager2 = createPlayer('v2', ROLE_IDS.VILLAGER);

      gameState = createInitialGameState(
        [wolf1, villager1, villager2],
        { wolfCount: 1 },
        PHASES.NIGHT_WEREWOLF
      );
      gameState._state.nightActions.werewolfVotes = {
        [wolf1.id]: villager1.id,
      };

      await resolveNight(gameState, gameState.players, gameState._state.nightActions);

      expect(gameState.update).toHaveBeenCalled();
      const updatedVillager = findPlayerById(gameState.players, villager1.id);
      expect(updatedVillager.isAlive).toBe(false);
      expect(gameState._state.dayLog.some((log) => log.includes('was torn apart by wolves'))).toBe(
        true
      );
    });

    it('Scenario: No werewolf votes', async () => {
      const wolf1 = createPlayer('w1', ROLE_IDS.WEREWOLF);
      const wolf2 = createPlayer('w2', ROLE_IDS.WEREWOLF);
      const villager1 = createPlayer('v1', ROLE_IDS.VILLAGER);

      gameState = createInitialGameState(
        [wolf1, wolf2, villager1],
        { wolfCount: 2 },
        PHASES.NIGHT_WEREWOLF
      );
      gameState._state.nightActions.werewolfVotes = {};

      await resolveNight(gameState, gameState.players, gameState._state.nightActions);

      expect(gameState.update).toHaveBeenCalled();
      const updatedVillager = findPlayerById(gameState.players, villager1.id);
      expect(updatedVillager.isAlive).toBe(true);
      expect(gameState._state.dayLog).toContain('No one died.');
    });

    it('Scenario: Three-way split vote among werewolves', async () => {
      const wolf1 = createPlayer('w1', ROLE_IDS.WEREWOLF);
      const wolf2 = createPlayer('w2', ROLE_IDS.WEREWOLF);
      const wolf3 = createPlayer('w3', ROLE_IDS.WEREWOLF);
      const v1 = createPlayer('v1', ROLE_IDS.VILLAGER);
      const v2 = createPlayer('v2', ROLE_IDS.VILLAGER);
      const v3 = createPlayer('v3', ROLE_IDS.VILLAGER);

      gameState = createInitialGameState(
        [wolf1, wolf2, wolf3, v1, v2, v3],
        { wolfCount: 3 },
        PHASES.NIGHT_WEREWOLF
      );
      gameState._state.nightActions.werewolfVotes = {
        [wolf1.id]: v1.id,
        [wolf2.id]: v2.id,
        [wolf3.id]: v3.id,
      };

      await resolveNight(gameState, gameState.players, gameState._state.nightActions);

      expect(gameState.update).toHaveBeenCalled();

      const alivePlayers = [
        findPlayerById(gameState.players, v1.id).isAlive,
        findPlayerById(gameState.players, v2.id).isAlive,
        findPlayerById(gameState.players, v3.id).isAlive,
      ];
      const deadPlayers = alivePlayers.filter((s) => !s);

      expect(deadPlayers.length).toBe(1);
      expect(gameState._state.dayLog.some((log) => log.includes('wolves'))).toBe(true);
    });

    it('Scenario: Werewolf votes for another werewolf', async () => {
      const wolf1 = createPlayer('w1', ROLE_IDS.WEREWOLF);
      const wolf2 = createPlayer('w2', ROLE_IDS.WEREWOLF);
      const villager1 = createPlayer('v1', ROLE_IDS.VILLAGER);

      gameState = createInitialGameState(
        [wolf1, wolf2, villager1],
        { wolfCount: 2 },
        PHASES.NIGHT_WEREWOLF
      );
      gameState._state.nightActions.werewolfVotes = {
        [wolf1.id]: wolf2.id,
      };

      await resolveNight(gameState, gameState.players, gameState._state.nightActions);

      expect(gameState.update).toHaveBeenCalled();

      const targetWolf = findPlayerById(gameState.players, wolf2.id);
      expect(targetWolf.isAlive).toBe(false);
      expect(gameState._state.dayLog.some((log) => log.includes('was torn apart by wolves'))).toBe(
        true
      );
    });
  });

  describe('Day Voting Resolution', () => {
    it('Scenario: Majority vote leads to player elimination', async () => {
      const p1 = createPlayer('p1', ROLE_IDS.VILLAGER);
      const p2 = createPlayer('p2', ROLE_IDS.VILLAGER);
      const p3 = createPlayer('p3', ROLE_IDS.WEREWOLF);
      const p4 = createPlayer('p4', ROLE_IDS.VILLAGER);
      gameState = createInitialGameState([p1, p2, p3, p4], { wolfCount: 1 }, PHASES.DAY_VOTING);
      gameState._state.votes = {
        [p1.id]: p3.id,
        [p2.id]: p3.id,
        [p4.id]: p3.id,
      };
      gameState._state.lockedVotes = [p1.id, p2.id, p4.id];
      await resolveDayVoting(gameState, gameState.players);
      console.log('dayLog:', gameState._state.dayLog);
      const updatedP3 = findPlayerById(gameState.players, p3.id);
      expect(updatedP3.isAlive).toBe(false);
      expect(gameState._state.dayLog.some((log) => log.includes('was lynched'))).toBe(true);
      expect(gameState._state.phase).toBe(PHASES.GAME_OVER);
      expect(gameState._state.winners).toContain('VILLAGERS');
    });

    it('Scenario: Tie vote with no mayor results in no elimination', async () => {
      const p1 = createPlayer('p1', ROLE_IDS.VILLAGER);
      const p2 = createPlayer('p2', ROLE_IDS.VILLAGER);
      const p3 = createPlayer('p3', ROLE_IDS.WEREWOLF);
      const p4 = createPlayer('p4', ROLE_IDS.VILLAGER);
      gameState = createInitialGameState([p1, p2, p3, p4], { wolfCount: 1 }, PHASES.DAY_VOTING);
      gameState._state.votes = {
        [p1.id]: p3.id,
        [p2.id]: p3.id,
        [p3.id]: p1.id,
        [p4.id]: p1.id,
      };
      gameState._state.lockedVotes = [p1.id, p2.id, p3.id, p4.id];

      await resolveDayVoting(gameState, gameState.players, gameState._state.lockedVotes);
      expect(gameState.update).toHaveBeenCalled();
      const updatedP1 = findPlayerById(gameState.players, p1.id);
      const updatedP3 = findPlayerById(gameState.players, p3.id);
      expect(updatedP1.isAlive).toBe(true);
      expect(updatedP3.isAlive).toBe(true);
      expect(gameState._state.dayLog).toContain('The vote was a tie!');
      expect(gameState._state.phase).toBe(PHASES.NIGHT_INTRO);
    });

    it("Scenario: Mayor's vote creates a majority", async () => {
      const p1 = createPlayer('p1', ROLE_IDS.MAYOR, true, null, { isMayor: true });
      const p2 = createPlayer('p2', ROLE_IDS.VILLAGER);
      const p3 = createPlayer('p3', ROLE_IDS.WEREWOLF);
      const p4 = createPlayer('p4', ROLE_IDS.VILLAGER);
      gameState = createInitialGameState([p1, p2, p3, p4], { wolfCount: 1 }, PHASES.DAY_VOTING);
      gameState._state.votes = {
        [p1.id]: p3.id, // Mayor votes for p3 (2 votes)
        [p2.id]: p4.id, // p4 gets 1 vote
        [p3.id]: p2.id, // p2 gets 1 vote
        [p4.id]: p3.id, // p3 gets 1 vote (total 3)
      };
      gameState._state.lockedVotes = [p1.id, p2.id, p3.id, p4.id];

      await resolveDayVoting(gameState, gameState.players, gameState._state.lockedVotes);
      const updatedP3 = findPlayerById(gameState.players, p3.id);
      expect(updatedP3.isAlive).toBe(false);
      expect(gameState._state.dayLog.some((log) => log.includes('was lynched'))).toBe(true);
      expect(gameState._state.phase).toBe(PHASES.GAME_OVER);
    });

    it('Scenario: Villagers win by voting out the last werewolf', async () => {
      const p1 = createPlayer('p1', ROLE_IDS.VILLAGER);
      const p2 = createPlayer('p2', ROLE_IDS.VILLAGER);
      const p3 = createPlayer('p3', ROLE_IDS.WEREWOLF);
      gameState = createInitialGameState([p1, p2, p3], { wolfCount: 1 }, PHASES.DAY_VOTING);
      gameState._state.votes = {
        [p1.id]: p3.id,
        [p2.id]: p3.id,
        [p3.id]: p1.id,
      };
      gameState._state.lockedVotes = [p1.id, p2.id, p3.id];

      await resolveDayVoting(gameState, gameState.players, gameState._state.lockedVotes);
      expect(gameState.update).toHaveBeenCalled();
      expect(findPlayerById(gameState.players, p3.id).isAlive).toBe(false);
      expect(gameState._state.phase).toBe(PHASES.GAME_OVER);
      expect(gameState._state.winners).toContain('VILLAGERS');
    });

    it('Scenario: Werewolves win by achieving parity', async () => {
      const p1 = createPlayer('p1', ROLE_IDS.WEREWOLF);
      const p2 = createPlayer('p2', ROLE_IDS.WEREWOLF);
      const p3 = createPlayer('p3', ROLE_IDS.VILLAGER);
      const p4 = createPlayer('p4', ROLE_IDS.VILLAGER);
      gameState = createInitialGameState([p1, p2, p3, p4], { wolfCount: 2 }, PHASES.DAY_VOTING);
      gameState._state.votes = {
        [p1.id]: p3.id,
        [p2.id]: p3.id,
        [p3.id]: p1.id,
        [p4.id]: p3.id, // p3 gets 3 votes
      };
      gameState._state.lockedVotes = [p1.id, p2.id, p3.id, p4.id];

      await resolveDayVoting(gameState, gameState.players, gameState._state.lockedVotes);
      expect(gameState.update).toHaveBeenCalled();
      expect(findPlayerById(gameState.players, p3.id).isAlive).toBe(false);
      // Now it's 2 werewolves vs 1 villager. Parity is met.
      expect(gameState._state.phase).toBe(PHASES.GAME_OVER);
      expect(gameState._state.winners).toContain('WEREWOLVES');
    });

    it('Scenario: Werewolf day votes are counted correctly', async () => {
      const wolf1 = createPlayer('w1', ROLE_IDS.WEREWOLF);
      const wolf2 = createPlayer('w2', ROLE_IDS.WEREWOLF);
      const villager1 = createPlayer('v1', ROLE_IDS.VILLAGER);
      const villager2 = createPlayer('v2', ROLE_IDS.VILLAGER);

      gameState = createInitialGameState(
        [wolf1, wolf2, villager1, villager2],
        { wolfCount: 2 },
        PHASES.DAY_VOTING
      );
      gameState._state.votes = {
        [wolf1.id]: villager1.id, // Wolf votes villager
        [wolf2.id]: villager2.id, // Wolf votes other villager
        [villager1.id]: wolf1.id, // Villager votes wolf
        [villager2.id]: villager1.id, // Villager votes other villager
      };
      // v1 gets 2 votes, v2 gets 1, w1 gets 1. v1 should be eliminated.
      gameState._state.lockedVotes = [wolf1.id, wolf2.id, villager1.id, villager2.id];

      await resolveDayVoting(gameState, gameState.players, gameState._state.lockedVotes);

      expect(gameState.update).toHaveBeenCalled();
      expect(findPlayerById(gameState.players, villager1.id).isAlive).toBe(false);
      expect(findPlayerById(gameState.players, villager2.id).isAlive).toBe(true);
      expect(findPlayerById(gameState.players, wolf1.id).isAlive).toBe(true);
      expect(gameState._state.dayLog.some((log) => log.includes('was lynched'))).toBe(true);
    });

    it('Scenario: Tanner Win Strategy - END_GAME', async () => {
      const tanner = createPlayer('t1', ROLE_IDS.TANNER);
      const wolf = createPlayer('w1', ROLE_IDS.WEREWOLF);
      const villager = createPlayer('v1', ROLE_IDS.VILLAGER);

      gameState = createInitialGameState(
        [tanner, wolf, villager],
        {
          wolfCount: 1,
          tannerWinStrategy: TANNER_WIN_STRATEGIES.END_GAME,
        },
        PHASES.DAY_VOTING
      );
      gameState._state.votes = {
        [wolf.id]: tanner.id,
        [villager.id]: tanner.id,
        [tanner.id]: wolf.id,
      };
      gameState._state.lockedVotes = [wolf.id, villager.id, tanner.id];

      await resolveDayVoting(gameState, gameState.players, gameState._state.lockedVotes);

      expect(gameState.update).toHaveBeenCalled();
      expect(gameState._state.phase).toBe(PHASES.GAME_OVER);
      expect(gameState._state.winners).toContain('TANNER');
    });

    it('Scenario: Tanner Win Strategy - CONTINUE_GAME', async () => {
      const tanner = createPlayer('t1', ROLE_IDS.TANNER);
      const wolf = createPlayer('w1', ROLE_IDS.WEREWOLF);
      const villager1 = createPlayer('v1', ROLE_IDS.VILLAGER);
      const villager2 = createPlayer('v2', ROLE_IDS.VILLAGER);

      gameState = createInitialGameState(
        [tanner, wolf, villager1, villager2],
        {
          wolfCount: 1,
          tannerWinStrategy: TANNER_WIN_STRATEGIES.CONTINUE_GAME,
        },
        PHASES.DAY_VOTING
      );
      gameState._state.votes = {
        [wolf.id]: tanner.id,
        [villager1.id]: tanner.id,
        [villager2.id]: tanner.id,
        [tanner.id]: wolf.id,
      };
      gameState._state.lockedVotes = [wolf.id, villager1.id, villager2.id, tanner.id];

      await resolveDayVoting(gameState, gameState.players, gameState._state.lockedVotes);

      expect(gameState.update).toHaveBeenCalled();
      // Game should NOT be over (still 1 wolf vs 2 villagers)
      expect(gameState._state.phase).not.toBe(PHASES.GAME_OVER);
      expect(gameState._state.phase).toBe(PHASES.DEATH_NOTE_INPUT);
      expect(gameState._state.playerAwaitingDeathNote).toBe(tanner.id);
      expect(gameState._state.nextPhaseAfterDeathNote).toBe(PHASES.NIGHT_INTRO);
      // Tanner should be in winners list
      expect(gameState._state.winners).toContain('TANNER');
      // Tanner should be dead
      const updatedTanner = findPlayerById(gameState.players, tanner.id);
      expect(updatedTanner.isAlive).toBe(false);
    });
  });

  describe('Role-specific Mechanics', () => {
    it('Scenario: Vigilante cannot shoot without ammo', async () => {
      const vigilante = createPlayer('v1', ROLE_IDS.VIGILANTE);
      const target = createPlayer('t1', ROLE_IDS.VILLAGER);
      const wolf = createPlayer('w1', ROLE_IDS.WEREWOLF);

      gameState = createInitialGameState([vigilante, target, wolf], {}, PHASES.NIGHT_VIGILANTE);

      gameState._state.vigilanteAmmo = { [vigilante.id]: 0 };

      let nightActions = { ...gameState._state.nightActions, vigilanteTarget: null };

      await resolveNight(gameState, gameState.players, nightActions);

      expect(findPlayerById(gameState.players, target.id).isAlive).toBe(true);
    });

    it('Scenario: Hunter dies and kills another player', async () => {
      const hunter = createPlayer('h1', ROLE_IDS.HUNTER);
      const target = createPlayer('t2', ROLE_IDS.VILLAGER);
      const wolf = createPlayer('w3', ROLE_IDS.WEREWOLF);
      const villager = createPlayer('v4', ROLE_IDS.VILLAGER);

      let players = [hunter, target, wolf, villager];
      gameState = createInitialGameState(players, {}, PHASES.DAY_VOTING);

      gameState._state.votes = {
        [wolf.id]: hunter.id,
        [target.id]: hunter.id,
        [villager.id]: hunter.id,
      };
      gameState._state.lockedVotes = [wolf.id, target.id, villager.id];
      await resolveDayVoting(gameState, players, gameState._state.lockedVotes);

      expect(gameState._state.phase).toBe(PHASES.DEATH_NOTE_INPUT);
      expect(gameState._state.playerAwaitingDeathNote).toBe(hunter.id);
      expect(gameState._state.nextPhaseAfterDeathNote).toBe(PHASES.HUNTER_ACTION);
      expect(findPlayerById(gameState.players, hunter.id).isAlive).toBe(false);

      // Manually advance phase to simulate submitting death note
      gameState._state.phase = PHASES.HUNTER_ACTION;

      await handleHunterShot(gameState, gameState.players, target.id);

      expect(findPlayerById(gameState.players, target.id).isAlive).toBe(false);
      expect(
        gameState._state.dayLog.some((log) =>
          log.includes("was taken down by the Hunter's final shot")
        )
      ).toBe(true);
    });

    it('Scenario: Doctor protects from Werewolf kill', async () => {
      const doctor = createPlayer('d1', ROLE_IDS.DOCTOR);
      const target = createPlayer('t1', ROLE_IDS.VILLAGER);
      const wolf = createPlayer('w1', ROLE_IDS.WEREWOLF);

      gameState = createInitialGameState([doctor, target, wolf], {}, PHASES.NIGHT_WEREWOLF);

      let nightActions = {
        ...gameState._state.nightActions,
        werewolfVotes: { [wolf.id]: target.id },
        doctorProtect: target.id,
      };

      await resolveNight(gameState, gameState.players, nightActions);

      expect(findPlayerById(gameState.players, target.id).isAlive).toBe(true);
    });

    it('Scenario: Doctor protects from Vigilante shot', async () => {
      const doctor = createPlayer('d1', ROLE_IDS.DOCTOR);
      const vigilante = createPlayer('v1', ROLE_IDS.VIGILANTE);
      const target = createPlayer('t1', ROLE_IDS.VILLAGER);

      gameState = createInitialGameState([doctor, vigilante, target], {}, PHASES.NIGHT_VIGILANTE);

      gameState._state.vigilanteAmmo = { [vigilante.id]: 1 };

      let nightActions = {
        ...gameState._state.nightActions,
        vigilanteTarget: target.id,
        doctorProtect: target.id,
      };

      await resolveNight(gameState, gameState.players, nightActions);

      expect(findPlayerById(gameState.players, target.id).isAlive).toBe(true);
    });

    it('Scenario: Doctor protects from Hunter revenge shot', async () => {
      const doctor = createPlayer('d1', ROLE_IDS.DOCTOR);
      const hunter = createPlayer('h1', ROLE_IDS.HUNTER);
      const target = createPlayer('t1', ROLE_IDS.VILLAGER);
      const wolf = createPlayer('w1', ROLE_IDS.WEREWOLF);

      let players = [doctor, hunter, target, wolf];
      gameState = createInitialGameState(players, {}, PHASES.NIGHT_WEREWOLF);

      let nightActions = {
        werewolfVotes: { [wolf.id]: hunter.id },
        doctorProtect: target.id,
      };
      await resolveNight(gameState, gameState.players, nightActions);

      expect(gameState._state.phase).toBe(PHASES.HUNTER_ACTION);

      gameState._state.nightActions = nightActions;
      await handleHunterShot(gameState, gameState.players, target.id);

      expect(findPlayerById(gameState.players, target.id).isAlive).toBe(true);
      expect(
        gameState._state.dayLog.some((log) =>
          log.includes('tried to shoot Player 1, but they were protected!')
        )
      ).toBe(true);
    });
  });
});
