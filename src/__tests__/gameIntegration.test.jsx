import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ROLES, TEAMS, CUPID_FATES, PHASES } from '../constants';
import { checkWinCondition } from '../utils/winConditions';
// The following imports are not used in this test file:
// import { resolveNight, startNight, advanceNight } from '../services/nightActions';
// import { resolveDayVoting, castPlayerVote, lockPlayerVote } from '../services/voting';

// Helper function to create a player
const createPlayer = (id, roleId, isAlive = true, alignment = null, extraProps = {}) => ({
  id,
  name: `Player ${id.slice(1)}`,
  isAlive,
  role: roleId,
  alignment: alignment || ROLES[roleId.toUpperCase()]?.alignment || 'neutral', // Default to role's alignment or neutral
  ...extraProps,
});

// Helper function to create initial game state
const createInitialGameState = (playersArray, settings = {}, initialPhase = PHASES.LOBBY) => {
  const players = {};
  playersArray.forEach(p => { players[p.id] = p; });

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
            console.log("mockUpdateGame: received updates", updates);
            if (updates.phase) {
                gameState.phase = updates.phase;
                console.log("mockUpdateGame: forcefully set phase to", gameState.phase);
            }
            // Acknowledge other updates, but focus on phase for this debug
            if (updates.players !== undefined) {
                if (Array.isArray(updates.players)) {
                    const playersMap = {};
                    updates.players.forEach(p => playersMap[p.id] = p);
                    gameState.players = playersMap;
                } else {
                    gameState.players = updates.players;
                }
            }
            if (updates.winners !== undefined) {
                gameState.winners = updates.winners;
            }
            if (updates.dayLog !== undefined) {
                gameState.dayLog = updates.dayLog;
            }
            if (updates.votes !== undefined) {
                gameState.votes = updates.votes;
            }
            if (updates.lockedVotes !== undefined) {
                gameState.lockedVotes = updates.lockedVotes;
            }
            // Ensure CurrentPlayers is always up-to-date for convenience in the test
            CurrentPlayers = Object.values(gameState.players);
            return gameState;
        });

        // Initial setup for CurrentPlayers, assuming a default set of players will be defined
        // by individual tests before calling createInitialGameState for gameState.
        CurrentPlayers = [];
    });

    it('Scenario: Villagers win when all werewolves are eliminated', async () => {
        const p1 = createPlayer('p1', ROLES.VILLAGER.id);
        const p2 = createPlayer('p2', ROLES.WEREWOLF.id);
        const p3 = createPlayer('p3', ROLES.VILLAGER.id);

        gameState = createInitialGameState([p1, p2, p3], {wolfCount: 1}, PHASES.DAY_REVEAL); // Start in a phase before night resolution

        // Simulate killing the werewolf
        let updatedPlayers = Object.values(gameState.players).map(p =>
            p.id === p2.id ? {...p, isAlive: false} : p
        );

        // Call checkWinCondition directly after updating players.
        // In a real game flow, this would happen at the end of night or day resolution.
        // For this integration test, we simulate the state where all wolves are dead.
        const result = checkWinCondition(updatedPlayers, gameState.lovers, gameState.winners, gameState.settings);

        expect(result).toEqual({
            winner: 'VILLAGERS',
            winners: ['VILLAGERS'],
            isGameOver: true
        });
    });

    it('Scenario: Werewolves win when they outnumber or equal good players', async () => {
        const p1 = createPlayer('p1', ROLES.WEREWOLF.id);
        const p2 = createPlayer('p2', ROLES.WEREWOLF.id);
        const p3 = createPlayer('p3', ROLES.VILLAGER.id); // Good player


        gameState = createInitialGameState([p1, p2, p3], {wolfCount: 2}, PHASES.DAY_VOTE);

        const result = checkWinCondition(Object.values(gameState.players), gameState.lovers, gameState.winners, gameState.settings);

        expect(result).toEqual({
            winner: 'WEREWOLVES',
            winners: ['WEREWOLVES'],
            isGameOver: true
        });
    });

    it('Scenario: Forbidden Love (Wolf + Villager) - Couple Win (2 players left)', async () => {
        const wolfLover = createPlayer('p1', ROLES.WEREWOLF.id, true, TEAMS.LOVERS);
        const villagerLover = createPlayer('p2', ROLES.VILLAGER.id, true, TEAMS.LOVERS);

        // All other players are dead
        const deadPlayers = [
            createPlayer('p3', ROLES.VILLAGER.id, false),
            createPlayer('p4', ROLES.CUPID.id, false),
        ];

        gameState = createInitialGameState([wolfLover, villagerLover, ...deadPlayers], {wolfCount: 1}, PHASES.DAY_REVEAL);
        gameState.lovers = [wolfLover.id, villagerLover.id];

        // Simulate their alignment being set to TEAMS.LOVERS
        const playersWithUpdatedAlignment = Object.values(gameState.players).map(p => {
            if (p.id === wolfLover.id || p.id === villagerLover.id) {
                return {...p, alignment: TEAMS.LOVERS};
            }
            return p;
        });

        const result = checkWinCondition(playersWithUpdatedAlignment, gameState.lovers, gameState.winners, gameState.settings);

        expect(result).toEqual({
            winner: 'LOVERS',
            winners: ['LOVERS'],
            isGameOver: true
        });
    });

    it('Scenario: Forbidden Love - Throuple Win (3 players left, Third Wheel Cupid)', async () => {
        const wolfLover = createPlayer('p1', ROLES.WEREWOLF.id, true, TEAMS.LOVERS);
        const villagerLover = createPlayer('p2', ROLES.VILLAGER.id, true, TEAMS.LOVERS);
        const cupid = createPlayer('p3', ROLES.CUPID.id, true); // Cupid is alive

        // All other players are dead
        const deadPlayers = [
            createPlayer('p4', ROLES.VILLAGER.id, false),
        ];

        gameState = createInitialGameState(
            [wolfLover, villagerLover, cupid, ...deadPlayers],
            {wolfCount: 1, cupidFateOption: CUPID_FATES.THIRD_WHEEL},
            PHASES.DAY_REVEAL
        );
        gameState.lovers = [wolfLover.id, villagerLover.id];

        // Simulate their alignment being set to TEAMS.LOVERS
        const playersWithUpdatedAlignment = Object.values(gameState.players).map(p => {
            if (p.id === wolfLover.id || p.id === villagerLover.id) {
                return {...p, alignment: TEAMS.LOVERS};
            }
            return p;
        });

        const result = checkWinCondition(playersWithUpdatedAlignment, gameState.lovers, gameState.winners, gameState.settings);

        expect(result).toEqual({
            winner: 'LOVERS',
            winners: ['LOVERS', 'CUPID'],
            isGameOver: true
        });
    });

    it('Scenario: Loyal Couple (Villager + Villager) - Village wins if no wolves', async () => {
        const v1 = createPlayer('v1', ROLES.VILLAGER.id);
        const v2 = createPlayer('v2', ROLES.VILLAGER.id);
        const wolf = createPlayer('wolf1', ROLES.WEREWOLF.id);

        gameState = createInitialGameState([v1, v2, wolf], {wolfCount: 1}, PHASES.DAY_REVEAL);
        gameState.lovers = [v1.id, v2.id]; // They are lovers

        // Simulate killing the werewolf
        let updatedPlayers = Object.values(gameState.players).map(p =>
            p.id === wolf.id ? {...p, isAlive: false} : p
        );

        const result = checkWinCondition(updatedPlayers, gameState.lovers, gameState.winners, gameState.settings);

        expect(result).toEqual({
            winner: 'VILLAGERS',
            winners: ['VILLAGERS'],
            isGameOver: true
        });
    });

    it('Scenario: Toxic Couple (Wolf + Wolf) - Werewolves win', async () => {
        const w1 = createPlayer('w1', ROLES.WEREWOLF.id);
        const w2 = createPlayer('w2', ROLES.WEREWOLF.id);
        const v1 = createPlayer('v1', ROLES.VILLAGER.id);

        gameState = createInitialGameState([w1, w2, v1], {wolfCount: 2}, PHASES.DAY_VOTE);
        gameState.lovers = [w1.id, w2.id]; // They are lovers

        const result = checkWinCondition(Object.values(gameState.players), gameState.lovers, gameState.winners, gameState.settings);

        expect(result).toEqual({
            winner: 'WEREWOLVES',
            winners: ['WEREWOLVES'],
            isGameOver: true
        });
    });

    it('Scenario: Cupid links two other players (Selfless fate) - Lovers win as last two', async () => {
        const cupid = createPlayer('p1', ROLES.CUPID.id, true);
        const villagerLover1 = createPlayer('p2', ROLES.VILLAGER.id, true, TEAMS.LOVERS);
        const villagerLover2 = createPlayer('p3', ROLES.VILLAGER.id, true, TEAMS.LOVERS);

        // All other players are dead
        const deadPlayers = [
            createPlayer('p4', ROLES.WEREWOLF.id, false),
            createPlayer('p5', ROLES.VILLAGER.id, false),
        ];

        gameState = createInitialGameState(
            [cupid, villagerLover1, villagerLover2, ...deadPlayers],
            { wolfCount: 1, cupidFateOption: CUPID_FATES.SELFLESS },
            PHASES.DAY_REVEAL
        );
        gameState.lovers = [villagerLover1.id, villagerLover2.id];

        const playersWithUpdatedAlignment = Object.values(gameState.players).map(p => {
            if (p.id === villagerLover1.id || p.id === villagerLover2.id) {
                return { ...p, alignment: TEAMS.LOVERS };
            }
            return p;
        });
        
        // Kill Cupid to ensure only lovers remain
        const finalPlayers = playersWithUpdatedAlignment.map(p => p.id === cupid.id ? { ...p, isAlive: false } : p);


        const result = checkWinCondition(finalPlayers, gameState.lovers, gameState.winners, gameState.settings);

        expect(result).toEqual({
            winner: 'LOVERS',
            winners: ['LOVERS'],
            isGameOver: true
        });
    });

    it('Scenario: Cupid links self and another player (Selfless fate) - Lovers win as last two', async () => {
        const cupid = createPlayer('p1', ROLES.CUPID.id, true, TEAMS.LOVERS); // Cupid is a lover
        const villagerLover = createPlayer('p2', ROLES.VILLAGER.id, true, TEAMS.LOVERS);

        // All other players are dead
        const deadPlayers = [
            createPlayer('p3', ROLES.WEREWOLF.id, false),
            createPlayer('p4', ROLES.VILLAGER.id, false),
        ];

        gameState = createInitialGameState(
            [cupid, villagerLover, ...deadPlayers],
            { wolfCount: 1, cupidCanChooseSelf: true, cupidFateOption: CUPID_FATES.SELFLESS },
            PHASES.DAY_REVEAL
        );
        gameState.lovers = [cupid.id, villagerLover.id];

        const playersWithUpdatedAlignment = Object.values(gameState.players).map(p => {
            if (p.id === cupid.id || p.id === villagerLover.id) {
                return { ...p, alignment: TEAMS.LOVERS };
            }
            return p;
        });

        const result = checkWinCondition(playersWithUpdatedAlignment, gameState.lovers, gameState.winners, gameState.settings);

        expect(result).toEqual({
            winner: 'LOVERS',
            winners: ['LOVERS'],
            isGameOver: true
        });
    });

    it('Scenario: Cupid links two other players (Third Wheel fate) - Throuple win with Cupid alive', async () => {
        const cupid = createPlayer('p1', ROLES.CUPID.id, true); // Cupid is alive
        const villagerLover1 = createPlayer('p2', ROLES.VILLAGER.id, true, TEAMS.LOVERS);
        const villagerLover2 = createPlayer('p3', ROLES.VILLAGER.id, true, TEAMS.LOVERS);

        // All other players are dead
        const deadPlayers = [
            createPlayer('p4', ROLES.WEREWOLF.id, false),
        ];

        gameState = createInitialGameState(
            [cupid, villagerLover1, villagerLover2, ...deadPlayers],
            { wolfCount: 1, cupidFateOption: CUPID_FATES.THIRD_WHEEL },
            PHASES.DAY_REVEAL
        );
        gameState.lovers = [villagerLover1.id, villagerLover2.id];

        const playersWithUpdatedAlignment = Object.values(gameState.players).map(p => {
            if (p.id === villagerLover1.id || p.id === villagerLover2.id) {
                return { ...p, alignment: TEAMS.LOVERS };
            }
            return p;
        });
        
        // Simulate a scenario where only Cupid and the two lovers are alive
        const finalPlayers = playersWithUpdatedAlignment.filter(p => p.id === cupid.id || p.id === villagerLover1.id || p.id === villagerLover2.id);


        const result = checkWinCondition(finalPlayers, gameState.lovers, gameState.winners, gameState.settings);

        expect(result).toEqual({
            winner: 'LOVERS',
            winners: ['LOVERS', 'CUPID'],
            isGameOver: true
        });
    });
});