import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TEAMS, CUPID_FATES, PHASES, ROLE_IDS, TANNER_WIN_STRATEGIES } from '../constants';
import { checkWinCondition } from '../utils/winConditions';
import { roleRegistry } from '../roles/RoleRegistry.js';
import { resolveNight } from '../services/nightActions';
import { resolveDayVoting } from '../services/voting';

// Helper function to create a player
const createPlayer = (id, roleId, isAlive = true, alignment = null, extraProps = {}) => ({
  id,
  name: `Player ${id.slice(1)}`,
  isAlive,
  role: roleId,
  alignment: alignment || roleRegistry.getRole(roleId.toUpperCase())?.alignment || 'neutral', // Default to role's alignment or neutral
  ...extraProps,
});

// Helper function to create initial game state
const createInitialGameState = (playersArray, settings = {}, initialPhase = PHASES.LOBBY) => {
  const players = {};
  playersArray.forEach((p) => {
    players[p.id] = p;
  });

  return {
    players,
    phase: initialPhase,
    settings: {
      actionWaitTime: 10,
      votingWaitTime: 10,
      cupidFateOption: CUPID_FATES.SELFLESS, // Default cupid fate
      ...settings,
    },
    dayLog: '',
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
};

describe('Game Integration Tests - Win Conditions', () => {
  let gameState;
  let MockUpdateGame;
  let CurrentPlayers; // Will hold the array of player objects

  beforeEach(() => {
    vi.restoreAllMocks(); // Restore all mocks before each test

    // Mock implementation for updateGame
    MockUpdateGame = vi.fn(async (updates) => {
      console.log('mockUpdateGame: received updates', updates);

      // Handle players specially: convert array to map for internal storage
      if (updates.players !== undefined) {
        if (Array.isArray(updates.players)) {
          const playersMap = {};
          updates.players.forEach((p) => (playersMap[p.id] = p));
          gameState.players = playersMap;
        } else {
          gameState.players = updates.players;
        }
      }

      // Apply all other updates directly
      Object.keys(updates).forEach(key => {
        if (key !== 'players') {
          gameState[key] = updates[key];
        }
      });

      // Ensure CurrentPlayers is always up-to-date for convenience in the test
      CurrentPlayers = Object.values(gameState.players);
      return gameState;
    });

    // Initial setup for CurrentPlayers, assuming a default set of players will be defined
    // by individual tests before calling createInitialGameState for gameState.
    CurrentPlayers = [];
  });

  it('Scenario: Villagers win when all werewolves are eliminated', async () => {
    const p1 = createPlayer('p1', 'villager');
    const p2 = createPlayer('p2', 'werewolf');
    const p3 = createPlayer('p3', 'villager');

    gameState = createInitialGameState([p1, p2, p3], { wolfCount: 1 }, PHASES.DAY_REVEAL); // Start in a phase before night resolution

    // Simulate killing the werewolf
    let updatedPlayers = Object.values(gameState.players).map((p) =>
      p.id === p2.id ? { ...p, isAlive: false } : p
    );

    // Call checkWinCondition directly after updating players.
    // In a real game flow, this would happen at the end of night or day resolution.
    // For this integration test, we simulate the state where all wolves are dead.
    const result = checkWinCondition(
      updatedPlayers,
      gameState.lovers,
      gameState.winners,
      gameState.settings
    );

    expect(result).toEqual({
      winner: 'VILLAGERS',
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
      Object.values(gameState.players),
      gameState.lovers,
      gameState.winners,
      gameState.settings
    );

    expect(result).toEqual({
      winner: 'WEREWOLVES',
      winners: ['WEREWOLVES'],
      isGameOver: true,
    });
  });

  it('Scenario: Forbidden Love (Wolf + Villager) - Couple Win (2 players left)', async () => {
    const wolfLover = createPlayer('p1', 'werewolf', true, TEAMS.LOVERS);
    const villagerLover = createPlayer('p2', 'villager', true, TEAMS.LOVERS);

    // All other players are dead
    const deadPlayers = [createPlayer('p3', 'villager', false), createPlayer('p4', 'cupid', false)];

    gameState = createInitialGameState(
      [wolfLover, villagerLover, ...deadPlayers],
      { wolfCount: 1 },
      PHASES.DAY_REVEAL
    );
    gameState.lovers = [wolfLover.id, villagerLover.id];

    // Simulate their alignment being set to TEAMS.LOVERS
    const playersWithUpdatedAlignment = Object.values(gameState.players).map((p) => {
      if (p.id === wolfLover.id || p.id === villagerLover.id) {
        return { ...p, alignment: TEAMS.LOVERS };
      }
      return p;
    });

    const result = checkWinCondition(
      playersWithUpdatedAlignment,
      gameState.lovers,
      gameState.winners,
      gameState.settings
    );

    expect(result).toEqual({
      winner: 'LOVERS',
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
    gameState.lovers = [wolfLover.id, villagerLover.id];

    // Simulate their alignment being set to TEAMS.LOVERS
    const playersWithUpdatedAlignment = Object.values(gameState.players).map((p) => {
      if (p.id === wolfLover.id || p.id === villagerLover.id) {
        return { ...p, alignment: TEAMS.LOVERS };
      }
      return p;
    });

    const result = checkWinCondition(
      playersWithUpdatedAlignment,
      gameState.lovers,
      gameState.winners,
      gameState.settings
    );

    expect(result).toEqual({
      winner: 'LOVERS',
      winners: ['LOVERS', 'CUPID'],
      isGameOver: true,
    });
  });

  it('Scenario: Loyal Couple (Villager + Villager) - Village wins if no wolves', async () => {
    const v1 = createPlayer('v1', 'villager');
    const v2 = createPlayer('v2', 'villager');
    const wolf = createPlayer('wolf1', 'werewolf');

    gameState = createInitialGameState([v1, v2, wolf], { wolfCount: 1 }, PHASES.DAY_REVEAL);
    gameState.lovers = [v1.id, v2.id]; // They are lovers

    // Simulate killing the werewolf
    let updatedPlayers = Object.values(gameState.players).map((p) =>
      p.id === wolf.id ? { ...p, isAlive: false } : p
    );

    const result = checkWinCondition(
      updatedPlayers,
      gameState.lovers,
      gameState.winners,
      gameState.settings
    );

    expect(result).toEqual({
      winner: 'VILLAGERS',
      winners: ['VILLAGERS'],
      isGameOver: true,
    });
  });

  it('Scenario: Toxic Couple (Wolf + Wolf) - Werewolves win', async () => {
    const w1 = createPlayer('w1', 'werewolf');
    const w2 = createPlayer('w2', 'werewolf');
    const v1 = createPlayer('v1', 'villager');

    gameState = createInitialGameState([w1, w2, v1], { wolfCount: 2 }, PHASES.DAY_VOTING);
    gameState.lovers = [w1.id, w2.id]; // They are lovers

    const result = checkWinCondition(
      Object.values(gameState.players),
      gameState.lovers,
      gameState.winners,
      gameState.settings
    );

    expect(result).toEqual({
      winner: 'WEREWOLVES',
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
    gameState.lovers = [villagerLover1.id, villagerLover2.id];

    const playersWithUpdatedAlignment = Object.values(gameState.players).map((p) => {
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
      gameState.winners,
      gameState.settings
    );

    expect(result).toEqual({
      winner: 'LOVERS',
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
    gameState.lovers = [cupid.id, villagerLover.id];

    const playersWithUpdatedAlignment = Object.values(gameState.players).map((p) => {
      if (p.id === cupid.id || p.id === villagerLover.id) {
        return { ...p, alignment: TEAMS.LOVERS };
      }
      return p;
    });

    const result = checkWinCondition(
      playersWithUpdatedAlignment,
      gameState.lovers,
      gameState.winners,
      gameState.settings
    );

    expect(result).toEqual({
      winner: 'LOVERS',
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
    gameState.lovers = [villagerLover1.id, villagerLover2.id];

    const playersWithUpdatedAlignment = Object.values(gameState.players).map((p) => {
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
      gameState.winners,
      gameState.settings
    );

    expect(result).toEqual({
      winner: 'LOVERS',
      winners: ['LOVERS', 'CUPID'],
      isGameOver: true,
    });
  });
  describe('Advanced Game Scenarios', () => {
    it('Scenario: Consensus - All wolves vote for the same target', async () => {
      const wolf1 = createPlayer('w1', ROLE_IDS.WEREWOLF);
      const wolf2 = createPlayer('w2', ROLE_IDS.WEREWOLF);
      const villager1 = createPlayer('v1', ROLE_IDS.VILLAGER);
      const villager2 = createPlayer('v2', ROLE_IDS.VILLAGER);
      const villager3 = createPlayer('v3', ROLE_IDS.VILLAGER);
      const villager4 = createPlayer('v4', ROLE_IDS.VILLAGER);
      const villager5 = createPlayer('v5', ROLE_IDS.VILLAGER);

      gameState = createInitialGameState([wolf1, wolf2, villager1, villager2, villager3, villager4, villager5], { wolfCount: 2 }, PHASES.NIGHT_WEREWOLF);
      gameState.nightActions.werewolfVotes = {
        [wolf1.id]: villager1.id,
        [wolf2.id]: villager1.id,
      };
      gameState.update = MockUpdateGame;

      await resolveNight(gameState, Object.values(gameState.players), gameState.nightActions);

      expect(MockUpdateGame).toHaveBeenCalled();
      const updatedVillager = gameState.players[villager1.id];
      expect(updatedVillager.isAlive).toBe(false);
      expect(gameState.dayLog).toContain('Player 1 died');
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
      gameState.nightActions.werewolfVotes = {
        [wolf1.id]: villagerA.id,
        [wolf2.id]: villagerB.id,
      };
      gameState.update = MockUpdateGame;

      // Mock Math.random to favor the first target (Villager A)
      vi.spyOn(Math, 'random').mockReturnValue(0.2);

      await resolveNight(gameState, Object.values(gameState.players), gameState.nightActions);

      expect(MockUpdateGame).toHaveBeenCalled();
      const updatedVillagerA = gameState.players[villagerA.id];
      const updatedVillagerB = gameState.players[villagerB.id];

      // One should be dead, the other alive. Based on mock, A should die.
      expect(updatedVillagerA.isAlive).toBe(false);
      expect(updatedVillagerB.isAlive).toBe(true);
      expect(gameState.dayLog).toContain('died'); // Either Player 1 or Player 2 died
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
      gameState.votes = {
        [wolf.id]: tanner.id,
        [villager.id]: tanner.id,
        [tanner.id]: wolf.id,
      };
      gameState.lockedVotes = [wolf.id, villager.id, tanner.id];
      gameState.update = MockUpdateGame;

      await resolveDayVoting(gameState, Object.values(gameState.players));

      expect(MockUpdateGame).toHaveBeenCalled();
      expect(gameState.phase).toBe(PHASES.GAME_OVER);
      expect(gameState.winner).toBe('TANNER');
      expect(gameState.winners).toContain(tanner.id);
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
      gameState.votes = {
        [wolf.id]: tanner.id,
        [villager1.id]: tanner.id,
        [villager2.id]: tanner.id,
        [tanner.id]: wolf.id,
      };
      gameState.lockedVotes = [wolf.id, villager1.id, villager2.id, tanner.id];
      gameState.update = MockUpdateGame;

      await resolveDayVoting(gameState, Object.values(gameState.players));

      expect(MockUpdateGame).toHaveBeenCalled();
      // Game should NOT be over (still 1 wolf vs 2 villagers)
      expect(gameState.phase).not.toBe(PHASES.GAME_OVER);
      expect(gameState.phase).toBe(PHASES.NIGHT_INTRO);
      // Tanner should be in winners list
      expect(gameState.winners).toContain(tanner.id);
      // Tanner should be dead
      const updatedTanner = gameState.players[tanner.id];
      expect(updatedTanner.isAlive).toBe(false);
    });
  });
});
