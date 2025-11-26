import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignRolesAndStartGame, markPlayerReady } from '../services/roles';
import { ROLES, PHASES } from '../constants';

describe('Role Assignment and Readiness', () => {
  let mockUpdateGame;
  let mockPlayers;
  let mockUser;
  let mockGameState;

  beforeEach(() => {
    mockUpdateGame = vi.fn();
    mockUser = { uid: 'p1', displayName: 'Player 1' };
    mockPlayers = [
      { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLES.SEER.id },
      { id: 'p2', name: 'Player 2', isAlive: true, ready: false, role: ROLES.DOCTOR.id },
      { id: 'p3', name: 'Player 3', isAlive: true, ready: false, role: ROLES.WEREWOLF.id },
      { id: 'p4', name: 'Player 4', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
      { id: 'p5', name: 'Player 5', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
    ];
    mockGameState = {
      settings: {
        wolfCount: 1,
        activeRoles: {
          [ROLES.SEER.id]: true,
          [ROLES.DOCTOR.id]: true,
        },
        actionWaitTime: 30,
      },
      phase: PHASES.LOBBY,
      players: {},
    };
  });

  describe('assignRolesAndStartGame', () => {
    it('assigns roles correctly based on settings', async () => {
      await assignRolesAndStartGame(mockGameState, mockUpdateGame, mockPlayers, true);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      expect(updateCall.phase).toBe(PHASES.ROLE_REVEAL);
      expect(updateCall.players).toHaveLength(5);

      const roles = updateCall.players.map(p => p.role);
      expect(roles).toContain(ROLES.WEREWOLF.id);
      expect(roles).toContain(ROLES.SEER.id);
      expect(roles).toContain(ROLES.DOCTOR.id);

      const villagers = roles.filter(r => r === ROLES.VILLAGER.id);
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

      const comprehensiveGameState = {
        settings: {
          wolfCount: 2,
          activeRoles: {
            [ROLES.DOCTOR.id]: true,
            [ROLES.SEER.id]: true,
            [ROLES.HUNTER.id]: true,
            [ROLES.JESTER.id]: true,
            [ROLES.VIGILANTE.id]: true,
            [ROLES.SORCERER.id]: true,
            [ROLES.MINION.id]: true,
            [ROLES.LYCAN.id]: true,
            [ROLES.CUPID.id]: true,
            [ROLES.DOPPELGANGER.id]: true,
            [ROLES.TANNER.id]: true,
            [ROLES.MAYOR.id]: true,
            [ROLES.MASON.id]: true, // Mason will add two roles
          },
          actionWaitTime: 30,
        },
        phase: PHASES.LOBBY,
        players: {},
      };

      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.9);
      await assignRolesAndStartGame(comprehensiveGameState, mockUpdateGame, comprehensivePlayers, true);
      mockRandom.mockRestore();

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      expect(updateCall.phase).toBe(PHASES.ROLE_REVEAL);
      expect(updateCall.players).toHaveLength(comprehensivePlayers.length);

      const roles = updateCall.players.map(p => p.role);

      const expectedRoleCounts = {
        [ROLES.WEREWOLF.id]: 2,
        [ROLES.DOCTOR.id]: 1,
        [ROLES.SEER.id]: 1,
        [ROLES.HUNTER.id]: 1,
        [ROLES.JESTER.id]: 1,
        [ROLES.VIGILANTE.id]: 1,
        [ROLES.SORCERER.id]: 1,
        [ROLES.MINION.id]: 1,
        [ROLES.LYCAN.id]: 1,
        [ROLES.CUPID.id]: 1,
        [ROLES.DOPPELGANGER.id]: 1,
        [ROLES.TANNER.id]: 1,
        [ROLES.MAYOR.id]: 1,
        [ROLES.MASON.id]: 2,
      };

      const totalSpecialRoles = Object.values(expectedRoleCounts).reduce((sum, count) => sum + count, 0);
      const expectedVillagers = comprehensivePlayers.length - totalSpecialRoles;
      if (expectedVillagers > 0) {
        expectedRoleCounts[ROLES.VILLAGER.id] = expectedVillagers;
      }

      for (const roleId in expectedRoleCounts) {
        expect(roles.filter(r => r === roleId)).toHaveLength(expectedRoleCounts[roleId]);
      }
    });

    it('does nothing if not host', async () => {
      await assignRolesAndStartGame(mockGameState, mockUpdateGame, mockPlayers, false);
      expect(mockUpdateGame).not.toHaveBeenCalled();
    });
  });

  describe('markPlayerReady', () => {
    it('marks a player as ready', async () => {
      const initialPlayers = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
        { id: 'p2', name: 'Player 2', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
      ];
      const gameState = { ...mockGameState, phase: PHASES.DAY_VOTING };

      await markPlayerReady(initialPlayers, mockUser, gameState, mockUpdateGame);

      expect(mockUpdateGame).toHaveBeenCalledWith(
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
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
        { id: 'p2', name: 'Player 2', isAlive: true, ready: true, role: ROLES.VILLAGER.id },
      ];
      const gameState = { ...mockGameState, phase: PHASES.DAY_VOTING };

      await markPlayerReady(initialPlayers, mockUser, gameState, mockUpdateGame);

      expect(mockUpdateGame).toHaveBeenCalledWith(
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
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
        { id: 'p2', name: 'Player 2', isAlive: false, ready: false, role: ROLES.VILLAGER.id },
      ];
      const gameState = { ...mockGameState, phase: PHASES.DAY_VOTING };

      await markPlayerReady(initialPlayers, mockUser, gameState, mockUpdateGame);

      expect(mockUpdateGame).toHaveBeenCalledWith(
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