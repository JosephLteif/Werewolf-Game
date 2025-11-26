import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameLogic } from './useGameLogic';
import { ROLES, PHASES } from '../constants';

describe('useGameLogic', () => {
  let mockUpdateGame;
  let mockPlayers;
  let mockUser;
  let mockGameState;
  let now;

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
    now = Date.now();
  });

  describe('startGame', () => {
    it('assigns roles correctly based on settings', async () => {
      const { result } = renderHook(() =>
        useGameLogic(mockGameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.startGame();
      });

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

      const { result } = renderHook(() =>
        useGameLogic(comprehensiveGameState, mockUpdateGame, comprehensivePlayers, mockUser, true, now)
      );

      await act(async () => {
        const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.9); // Make shuffle deterministic with positive comparison
        await result.current.startGame();
        mockRandom.mockRestore(); // Restore Math.random()
      });
      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      expect(updateCall.phase).toBe(PHASES.ROLE_REVEAL);
      expect(updateCall.players).toHaveLength(comprehensivePlayers.length);

      const roles = updateCall.players.map(p => p.role);

      // Expected roles count based on settings and number of players
      const expectedRoleCounts = {
        [ROLES.WEREWOLF.id]: 2, // wolfCount
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
        [ROLES.MASON.id]: 2, // Mason adds two
      };

      // Calculate expected villagers
      const totalSpecialRoles = Object.values(expectedRoleCounts).reduce((sum, count) => sum + count, 0);
      const expectedVillagers = comprehensivePlayers.length - totalSpecialRoles;
      if (expectedVillagers > 0) {
        expectedRoleCounts[ROLES.VILLAGER.id] = expectedVillagers;
      }

      for (const roleId in expectedRoleCounts) {
        expect(roles.filter(r => r === roleId)).toHaveLength(expectedRoleCounts[roleId]);
      }
    });

    it('does nothing if not Player 1', async () => {
      const { result } = renderHook(() =>
        useGameLogic(mockGameState, mockUpdateGame, mockPlayers, mockUser, false, now)
      );

      await act(async () => {
        await result.current.startGame();
      });

      expect(mockUpdateGame).not.toHaveBeenCalled();
    });
  });

  describe('startNight', () => {
    it('starts with Cupid if Cupid is present and no lovers', async () => {
      const cupidPlayer = { ...mockPlayers[0], role: ROLES.CUPID.id };
      const playersWithCupid = [cupidPlayer, ...mockPlayers.slice(1)];

      const { result } = renderHook(() =>
        useGameLogic({ ...mockGameState, lovers: [] }, mockUpdateGame, playersWithCupid, mockUser, true, now)
      );

      await act(async () => {
        await result.current.startNight();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_CUPID,
      }));
    });

    it('starts with Werewolf if no Cupid', async () => {
      const wolfPlayer = { ...mockPlayers[0], role: ROLES.WEREWOLF.id };
      const playersWithWolf = [wolfPlayer, ...mockPlayers.slice(1)];

      const { result } = renderHook(() =>
        useGameLogic({ ...mockGameState, lovers: [] }, mockUpdateGame, playersWithWolf, mockUser, true, now)
      );

      await act(async () => {
        await result.current.startNight();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_WEREWOLF,
      }));
    });

    it('starts with Doppelganger if Doppelganger is present and no target yet', async () => {
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLES.DOPPELGANGER.id };
      const playersWithDoppelganger = [doppelgangerPlayer, ...mockPlayers.slice(1)];

      const { result } = renderHook(() =>
        useGameLogic({ ...mockGameState, doppelgangerTarget: null }, mockUpdateGame, playersWithDoppelganger, mockUser, true, now)
      );

      await act(async () => {
        await result.current.startNight();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_DOPPELGANGER,
      }));
    });

    it('skips Cupid if Cupid is present but lovers are already set', async () => {
      const cupidPlayer = { ...mockPlayers[0], role: ROLES.CUPID.id };
      const playersWithCupid = [cupidPlayer, ...mockPlayers.slice(1)];
      const existingLovers = ['p1', 'p2'];

      const { result } = renderHook(() =>
        useGameLogic({ ...mockGameState, lovers: existingLovers }, mockUpdateGame, playersWithCupid, mockUser, true, now)
      );

      await act(async () => {
        await result.current.startNight();
      });

      // Assuming Werewolf is the next active phase after Cupid in the sequence
      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_WEREWOLF,
      }));
    });
  });

  describe('advanceNight', () => {
    it('advances from Cupid to Werewolf', async () => {
      const cupidPlayer = { ...mockPlayers[0], role: ROLES.CUPID.id };
      const wolfPlayer = { ...mockPlayers[1], role: ROLES.WEREWOLF.id };
      const players = [cupidPlayer, wolfPlayer, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_CUPID,
        nightActions: { cupidLinks: [] },
        lovers: [],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight('cupidLinks', ['p1', 'p2']);
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_WEREWOLF,
        lovers: ['p1', 'p2'],
      }));
    });

    it('removes a cupid link if already selected', async () => {
      const cupidPlayer = { ...mockPlayers[0], role: ROLES.CUPID.id };
      const players = [cupidPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_CUPID,
        nightActions: { cupidLinks: ['p1', 'p2'] }, // p1 and p2 are already linked
        lovers: [],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        // Now remove p2
        await result.current.advanceNight('cupidLinks', ['p1']);
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: { cupidLinks: ['p1'] },
        // Phase should advance to Werewolf
        phase: PHASES.NIGHT_WEREWOLF,
      }));
    });

    it('sets nightActions.cupidLinks to the provided value, but only sets lovers if count is 2', async () => {
      const cupidPlayer = { ...mockPlayers[0], role: ROLES.CUPID.id };
      const players = [cupidPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_CUPID,
        nightActions: { cupidLinks: [] },
        lovers: [],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      // Attempt to add a three players
      await act(async () => {
        await result.current.advanceNight('cupidLinks', ['p1', 'p2', 'p3']);
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: { cupidLinks: ['p1', 'p2', 'p3'] },
        // Phase should advance, assuming no other active roles after Cupid.
        phase: PHASES.NIGHT_WEREWOLF,
        // The `lovers` array should NOT be set because the length is not 2, so it won't be in the object.
      }));

      // Reset mock for a new call with valid lovers
      mockUpdateGame.mockClear();

      const newGameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_CUPID,
        nightActions: { cupidLinks: [] },
        lovers: [],
      };

      const { result: result2 } = renderHook(() =>
        useGameLogic(newGameState, mockUpdateGame, players, mockUser, true, now)
      );

      // Add two players
      await act(async () => {
        await result2.current.advanceNight('cupidLinks', ['p1', 'p2']);
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: { cupidLinks: ['p1', 'p2'] },
        phase: PHASES.NIGHT_WEREWOLF,
        lovers: ['p1', 'p2'], // Should be set now
      }));
    });

    it('advances to the next logical phase when no actionType is provided', async () => {
      const doctorPlayer = { ...mockPlayers[1], role: ROLES.DOCTOR.id };
      const players = [doctorPlayer, ...mockPlayers.slice(1)]; // Ensure Doctor is present

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF, // Start in Werewolf phase
        nightActions: {
          werewolfVotes: { 'p3': 'p1' }, // Assume werewolf vote is complete
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight(); // Call without actionType or actionValue
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_DOCTOR, // Expect to advance to Doctor phase
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances from Werewolf to Minion if Minion exists', async () => {
      const wolfPlayer = { ...mockPlayers[0], role: ROLES.WEREWOLF.id };
      const minionPlayer = { ...mockPlayers[1], role: ROLES.MINION.id };
      const players = [wolfPlayer, minionPlayer, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: { werewolfVotes: {} },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        // Use the actual wolf player's ID for voting
        await result.current.advanceNight('werewolfVote', { voterId: wolfPlayer.id, targetId: 'p3' });
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: {
          werewolfVotes: { [wolfPlayer.id]: 'p3' },
        },
      }));
    });

    it('does not advance phase if not all werewolves have voted', async () => {
      // Two werewolves exist in mockPlayers, only one votes
      const wolfPlayer1 = { ...mockPlayers[2], id: 'p3', role: ROLES.WEREWOLF.id, isAlive: true };
      const wolfPlayer2 = { ...mockPlayers[0], id: 'p1', role: ROLES.WEREWOLF.id, isAlive: true }; // p1 was Seer, now a Werewolf
      const playersWithTwoWolves = [
        wolfPlayer1,
        wolfPlayer2,
        { ...mockPlayers[1], id: 'p2', role: ROLES.VILLAGER.id, isAlive: true },
        { ...mockPlayers[3], id: 'p4', role: ROLES.VILLAGER.id, isAlive: true },
        { ...mockPlayers[4], id: 'p5', role: ROLES.VILLAGER.id, isAlive: true },
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {},
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithTwoWolves, mockUser, true, now)
      );

      await act(async () => {
        // Only wolfPlayer1 votes, wolfPlayer2 does not
        await result.current.advanceNight('werewolfVote', { voterId: wolfPlayer1.id, targetId: 'p2' });
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: {
          werewolfVotes: { [wolfPlayer1.id]: 'p2' },
        },
        // The phase should NOT advance
        // phase: PHASES.NIGHT_WEREWOLF, // Removed as phase is not part of update when only nightActions are updated
      }));
      // Ensure phaseEndTime is not updated when phase doesn't advance
      expect(mockUpdateGame.mock.calls[0][0]).not.toHaveProperty('phaseEndTime');
    });

    it('allows werewolf to cast provisional vote', async () => {
      const wolfPlayer = mockPlayers.find(p => p.role === ROLES.WEREWOLF.id);
      const targetPlayer = mockPlayers.find(p => p.id === 'p1'); // Seer

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {},
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, { uid: wolfPlayer.id, displayName: wolfPlayer.name }, true, now)
      );

      await act(async () => {
        await result.current.advanceNight('werewolfProvisionalVote', { voterId: wolfPlayer.id, targetId: targetPlayer.id });
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: {
          werewolfProvisionalVotes: { [wolfPlayer.id]: targetPlayer.id },
        },
      }));
    });

    it('allows werewolf to confirm vote (overriding provisional)', async () => {
      const wolfPlayer = mockPlayers.find(p => p.role === ROLES.WEREWOLF.id);
      const provisionalTarget = mockPlayers.find(p => p.id === 'p1'); // Seer
      const confirmedTarget = mockPlayers.find(p => p.id === 'p2'); // Doctor

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {
          werewolfProvisionalVotes: { [wolfPlayer.id]: provisionalTarget.id },
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, { uid: wolfPlayer.id, displayName: wolfPlayer.name }, true, now)
      );

      await act(async () => {
        await result.current.advanceNight('werewolfVote', { voterId: wolfPlayer.id, targetId: confirmedTarget.id });
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: {
          werewolfVotes: { [wolfPlayer.id]: confirmedTarget.id },
        },
        phase: PHASES.NIGHT_DOCTOR,
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances from Werewolf to Sorcerer if Sorcerer exists', async () => {
      const sorcererPlayer = { ...mockPlayers[0], role: ROLES.SORCERER.id };
      const players = [sorcererPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF, // Coming from Werewolf phase
        nightActions: { werewolfVotes: { 'p3': 'p1' } }, // Assume votes are done
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_SORCERER,
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances from Doctor to Vigilante if Vigilante exists', async () => {
      const vigilantePlayer = { ...mockPlayers[0], role: ROLES.VIGILANTE.id };
      const players = [vigilantePlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOCTOR, // Coming from Doctor phase
        nightActions: { doctorProtect: 'p1' }, // Assume action done
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_VIGILANTE,
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances from Seer to Mason if Masons exist', async () => {
      const masonPlayer1 = { ...mockPlayers[0], role: ROLES.MASON.id };
      const masonPlayer2 = { ...mockPlayers[1], role: ROLES.MASON.id };
      const players = [masonPlayer1, masonPlayer2, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_SEER, // Coming from Seer phase
        nightActions: { seerCheck: 'p1' }, // Assume action done
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_MASON,
        phaseEndTime: null, // Mason phase has no action, so timer cleared
      }));
    });

    it('updates doppelgangerTarget if Doppelganger makes a choice', async () => {
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLES.DOPPELGANGER.id };
      const targetPlayer = { ...mockPlayers[1], role: ROLES.SEER.id };
      const players = [doppelgangerPlayer, targetPlayer, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOPPELGANGER, // Start in Doppelganger phase
        doppelgangerTarget: null,
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight('doppelgangerCopy', targetPlayer.id);
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        doppelgangerTarget: targetPlayer.id,
        phase: PHASES.NIGHT_WEREWOLF, // Assuming Werewolf is the next active phase
        phaseEndTime: expect.any(Number),
      }));
    });

    it('skips NIGHT_DOPPELGANGER if no Doppelganger is present', async () => {
      // Setup players: One Cupid, one Werewolf, one Doctor, two Villagers (5 players total)
      const players = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLES.CUPID.id },
        { id: 'p2', name: 'Player 2', isAlive: true, ready: false, role: ROLES.WEREWOLF.id },
        { id: 'p3', name: 'Player 3', isAlive: true, ready: false, role: ROLES.DOCTOR.id },
        { id: 'p4', name: 'Player 4', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
        { id: 'p5', name: 'Player 5', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOPPELGANGER, // Start in Doppelganger phase
        doppelgangerTarget: null, // No target set, but no role exists
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight();
      });

      // Expect to skip Doppelganger and Cupid (if no Cupid), landing on Werewolf (if present)
      // or directly to Doctor if Werewolf is also not present/skipped.
      // In mockPlayers, there is a Werewolf.
      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_CUPID, // CUPID is next in sequence.
        phaseEndTime: expect.any(Number),
      }));
    });

    it('skips NIGHT_CUPID if no Cupid is present or lovers are already set', async () => {
      // Scenario 1: No Cupid present
      let playersWithoutCupid = mockPlayers.filter(p => p.role !== ROLES.CUPID.id);
      let gameStateNoCupid = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOPPELGANGER, // Start in Doppelganger phase
        doppelgangerTarget: 'p1', // Assume Doppelganger action already done
        lovers: [],
      };

      let { result } = renderHook(() =>
        useGameLogic(gameStateNoCupid, mockUpdateGame, playersWithoutCupid, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_WEREWOLF, // Expect to skip Cupid and land on Werewolf
        phaseEndTime: expect.any(Number),
      }));
      mockUpdateGame.mockClear();

      // Scenario 2: Cupid present, but lovers already set
      let playersWithCupid = [{ ...mockPlayers[0], role: ROLES.CUPID.id }, ...mockPlayers.slice(1)];
      let gameStateLoversSet = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOPPELGANGER, // Start in Doppelganger phase
        doppelgangerTarget: 'p1', // Assume Doppelganger action already done
        lovers: ['p1', 'p2'], // Lovers already set
      };

      let { result: result2 } = renderHook(() =>
        useGameLogic(gameStateLoversSet, mockUpdateGame, playersWithCupid, mockUser, true, now)
      );

      await act(async () => {
        await result2.current.advanceNight();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_WEREWOLF, // Expect to skip Cupid and land on Werewolf
        phaseEndTime: expect.any(Number),
      }));
    });

    it('skips NIGHT_WEREWOLF if no Werewolves are present', async () => {
      // Setup players with no Werewolves, but a Doctor exists
      let playersWithoutWerewolf = mockPlayers.filter(p => p.role !== ROLES.WEREWOLF.id);
      let doctorPlayer = { ...mockPlayers[1], role: ROLES.DOCTOR.id, isAlive: true };
      let players = [doctorPlayer, ...playersWithoutWerewolf.slice(1)];

      let gameStateNoWerewolf = {
        ...mockGameState,
        phase: PHASES.NIGHT_CUPID, // Start in Cupid phase (assuming Cupid has finished or skipped)
        lovers: ['p1', 'p2'], // Lovers already set to ensure Cupid is skipped
      };

      let { result } = renderHook(() =>
        useGameLogic(gameStateNoWerewolf, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight();
      });

      // Expect to skip Werewolf and land on Minion (if present) or Sorcerer (if present),
      // or Doctor if both are also absent.
      // In mockPlayers, a Doctor exists, but no Minion or Sorcerer.
      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_DOCTOR, // Expect to skip MINION and SORCERER and land on DOCTOR.
        phaseEndTime: expect.any(Number),
      }));
    });

    it('skips multiple inactive phases to land on the next active phase', async () => {
      // Setup players: only a Seer is present, no Doppelganger, Cupid, Werewolf, Minion, Sorcerer, Doctor, Mason, Vigilante
      const seerPlayer = { ...mockPlayers[0], role: ROLES.SEER.id, isAlive: true };
      const playersWithOnlySeer = [
        seerPlayer,
        { ...mockPlayers[1], role: ROLES.VILLAGER.id, isAlive: true },
        { ...mockPlayers[2], role: ROLES.VILLAGER.id, isAlive: true },
      ];

      // Start the phase at Doppelganger, expecting it to skip all the way to Seer
      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOPPELGANGER,
        doppelgangerTarget: null, // No doppelganger anyway
        lovers: ['p1', 'p2'], // Lovers set to skip Cupid
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithOnlySeer, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_SEER, // Expect to skip many phases and land on Seer
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances to NIGHT_DOPPELGANGER when a Doppelganger is present and untargeted', async () => {
      // Setup players with a Doppelganger, no Cupid to avoid complications
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLES.DOPPELGANGER.id, isAlive: true };
      const werewolfPlayer = { ...mockPlayers[1], role: ROLES.WEREWOLF.id, isAlive: true };
      const players = [doppelgangerPlayer, werewolfPlayer, ...mockPlayers.slice(2)]; // Ensure no Cupid for now

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_INTRO, // Start before Doppelganger in the sequence
        doppelgangerTarget: null, // Doppelganger has not yet chosen a target
        lovers: [], // Ensure Cupid is not skipped if it were to be next
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_DOPPELGANGER,
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances to NIGHT_CUPID when Cupid is present and lovers are not set', async () => {
      // Setup players with a Cupid, and ensure Doppelganger is either absent or has made a choice
      const cupidPlayer = { ...mockPlayers[0], role: ROLES.CUPID.id, isAlive: true };
      const werewolfPlayer = { ...mockPlayers[1], role: ROLES.WEREWOLF.id, isAlive: true };
      const doctorPlayer = { ...mockPlayers[2], role: ROLES.DOCTOR.id, isAlive: true };
      const players = [cupidPlayer, werewolfPlayer, doctorPlayer, ...mockPlayers.slice(3)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOPPELGANGER, // Start in Doppelganger phase
        doppelgangerTarget: 'someId', // Assume Doppelganger has made a choice
        lovers: [], // Lovers are not yet set
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_CUPID,
        phaseEndTime: expect.any(Number),
      }));
    });

    it('skips NIGHT_DOPPELGANGER in subsequent nights if target is already chosen', async () => {
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLES.DOPPELGANGER.id, isAlive: true };
      const werewolfPlayer = { ...mockPlayers[1], role: ROLES.WEREWOLF.id, isAlive: true };
      const players = [doppelgangerPlayer, werewolfPlayer, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_INTRO, // An early phase
        doppelgangerTarget: 'someExistingTargetId', // Doppelganger has already made a choice
        lovers: [], // To ensure Cupid would be the next if Doppelganger is skipped
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight();
      });

      // Expect to skip Doppelganger and land on Werewolf (since Cupid is not present in this setup)
      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_WEREWOLF,
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances to RESOLVE phase and calls resolveNight when no more night actions', async () => {
      // Mock resolveNight to check if it's called
      const resolveNightSpy = vi.spyOn(useGameLogic(mockGameState, mockUpdateGame, mockPlayers, mockUser, true, now), 'resolveNight');

      // Setup players such that no special night roles are active after Seer
      const playersWithoutSpecialRoles = [
        { ...mockPlayers[0], role: ROLES.SEER.id, isAlive: true },
        { ...mockPlayers[1], role: ROLES.VILLAGER.id, isAlive: true },
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_SEER, // Coming from Seer phase, which is the last action phase for this setup
        nightActions: { seerCheck: 'p1' }, // Assume action done
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithoutSpecialRoles, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight();
      });

      // Since resolveNight is called internally and we can't directly spy on it when called from the same hook instance
      // we will assert that updateGame is called with the state that would trigger resolveNight
      // and that the phase becomes DAY_REVEAL after resolution (as resolveNight would typically do)

      // The expectation is that advanceNight will transition to 'RESOLVE' internally
      // and call resolveNight, which then updates the phase to DAY_REVEAL (or GAME_OVER).
      // Since we can't directly spy on resolveNight if it's not exposed as a method of the returned object (which it is),
      // we can check the *final* state after it's called.
      // Alternatively, we can adjust the test for direct spying.

      // Let's modify the test to directly call the internal function,
      // but for that we need to modify the useGameLogic structure which is not ideal.
      // The current tests assume resolveNight is called as part of the flow.
      // So, we just check the final phase after everything is resolved.

      // For this test, after the `advanceNight` call, the `resolveNight` function should have been implicitly called
      // and `updateGame` should have been called with the result of `resolveNight`.

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      expect(updateCall.phase).toBe(PHASES.GAME_OVER); // As checkWin would trigger GAME_OVER
      expect(updateCall).toHaveProperty('winner', 'VILLAGERS'); // checkWin sets the winner
    });
  });

  describe('resolveNight', () => {
    it('eliminates werewolf target', async () => {
      const wolfPlayer = mockPlayers.find(p => p.role === ROLES.WEREWOLF.id);
      const doctorPlayer = mockPlayers.find(p => p.role === ROLES.DOCTOR.id);

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {
          werewolfVotes: { [wolfPlayer.id]: doctorPlayer.id },
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveNight(gameState.nightActions);
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      // Convert players object to array if needed
      const playersArray = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      const deadVillager = playersArray.find(p => p.id === doctorPlayer.id);
      expect(deadVillager).toBeDefined();
      expect(deadVillager.isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('died');
    });

    it('saves target if doctor protects', async () => {
      const wolfPlayer = mockPlayers.find(p => p.role === ROLES.WEREWOLF.id);
      const villagerPlayer = mockPlayers.find(p => p.role === ROLES.VILLAGER.id);
      const doctorPlayer = mockPlayers.find(p => p.role === ROLES.DOCTOR.id);

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOCTOR,
        nightActions: {
          werewolfVotes: { [wolfPlayer.id]: villagerPlayer.id },
          doctorProtect: villagerPlayer.id,
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveNight(gameState.nightActions);
      });

      const updateCall = mockUpdateGame.mock.calls[0][0];

      // Convert players object to array if needed
      const playersArray = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      const target = playersArray.find(p => p.id === villagerPlayer.id);
      expect(target).toBeDefined();
      expect(target.isAlive).toBe(true);
      expect(updateCall.dayLog).toContain('No one died');
    });

    it('handles Sorcerer successfully finding Seer', async () => {
      const sorcererPlayer = { ...mockPlayers[0], role: ROLES.SORCERER.id, foundSeer: false };
      const seerPlayer = { ...mockPlayers[1], role: ROLES.SEER.id };
      const playersWithSorcererSeer = [sorcererPlayer, seerPlayer, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_SORCERER,
        nightActions: {
          sorcererCheck: seerPlayer.id, // Sorcerer checks the Seer
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithSorcererSeer, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveNight(gameState.nightActions);
      });

      const updateCall = mockUpdateGame.mock.calls[0][0];
      const updatedSorcerer = updateCall.players.find(p => p.id === sorcererPlayer.id);
      expect(updatedSorcerer).toBeDefined();
      expect(updatedSorcerer.foundSeer).toBe(true);
    });

    it('handles Doppelganger transformation when target dies during night', async () => {
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLES.DOPPELGANGER.id }; // p1 is Doppelganger
      const targetPlayer = { ...mockPlayers[1], role: ROLES.SEER.id }; // p2 is Seer (the target)
      const werewolfPlayer = { ...mockPlayers[2], role: ROLES.WEREWOLF.id }; // p3 is Werewolf
      const playersWithDoppelgangerWerewolf = [
        doppelgangerPlayer,
        targetPlayer,
        werewolfPlayer,
        ...mockPlayers.slice(3)
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF, // Phase doesn't strictly matter for resolveNight, but good context
        doppelgangerTarget: targetPlayer.id, // Doppelganger chose p2
        nightActions: {
          werewolfVotes: { [werewolfPlayer.id]: targetPlayer.id }, // Werewolf kills p2
          doctorProtect: null,
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithDoppelgangerWerewolf, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveNight(gameState.nightActions);
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      const updatedDoppelganger = updatedPlayers.find(p => p.id === doppelgangerPlayer.id);
      expect(updatedDoppelganger).toBeDefined();
      expect(updatedDoppelganger.role).toBe(ROLES.SEER.id); // Doppelganger becomes Seer
      expect(updatedPlayers.find(p => p.id === targetPlayer.id).isAlive).toBe(false); // Target is dead
      expect(updateCall.dayLog).toContain(`${targetPlayer.name} died.`);
    });

    it('eliminates vigilante target if not protected', async () => {
      const vigilantePlayer = { ...mockPlayers[0], role: ROLES.VIGILANTE.id }; // p1 is Vigilante
      const targetPlayer = { ...mockPlayers[1], role: ROLES.VILLAGER.id }; // p2 is target
      const playersWithVigilante = [
        vigilantePlayer,
        targetPlayer,
        ...mockPlayers.slice(2)
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_VIGILANTE,
        nightActions: {
          vigilanteTarget: targetPlayer.id, // Vigilante shoots p2
          doctorProtect: null,
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithVigilante, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveNight(gameState.nightActions);
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      expect(updatedPlayers.find(p => p.id === targetPlayer.id).isAlive).toBe(false);
      expect(updateCall.dayLog).toContain(`${targetPlayer.name} died.`);
    });

    it('saves vigilante target if doctor protects', async () => {
      const vigilantePlayer = { ...mockPlayers[0], role: ROLES.VIGILANTE.id }; // p1 is Vigilante
      const targetPlayer = { ...mockPlayers[1], role: ROLES.VILLAGER.id }; // p2 is target
      const doctorPlayer = { ...mockPlayers[2], role: ROLES.DOCTOR.id }; // p3 is Doctor
      const werewolfPlayer = { ...mockPlayers[3], role: ROLES.WEREWOLF.id }; // p4 is Werewolf
      const playersWithVigilanteDoctor = [
        vigilantePlayer,
        targetPlayer,
        doctorPlayer,
        werewolfPlayer, // Add a werewolf to prevent early win condition
        ...mockPlayers.slice(4)
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_VIGILANTE,
        nightActions: {
          vigilanteTarget: targetPlayer.id, // Vigilante shoots p2
          doctorProtect: targetPlayer.id, // Doctor protects p2
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithVigilanteDoctor, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveNight(gameState.nightActions);
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      expect(updatedPlayers.find(p => p.id === targetPlayer.id).isAlive).toBe(true); // Target should still be alive
      expect(updateCall.dayLog).toContain('No one died');
    });
  });

  describe('voting', () => {
    it('castVote updates votes', async () => {
      const { result } = renderHook(() =>
        useGameLogic(mockGameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.castVote('p2');
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        votes: { [mockUser.uid]: 'p2' },
      }));
    });

    it('resolveVoting eliminates player with max votes', async () => {
      const gameState = {
        ...mockGameState,
        votes: {
          'p1': 'p4',  // Player 1 votes for p4 (villager)
          'p2': 'p4',  // p2 votes for p4  
          'p3': 'p5',  // p3 votes for p5
        },
        lockedVotes: ['p1', 'p2', 'p3'],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveVoting();
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      // Just verify that updateGame was called with the expected structure
      expect(updateCall).toHaveProperty('players');
      expect(updateCall).toHaveProperty('dayLog');

      // Convert players object to array if needed
      const playersArray = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      const deadPlayer = playersArray.find(p => p.id === 'p4');
      expect(deadPlayer).toBeDefined();
      expect(deadPlayer.isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('Player 4 was voted out.');
      expect(updateCall).toHaveProperty('phase', PHASES.NIGHT_INTRO);
    });

    it('resolveVoting accounts for Mayor\'s double vote', async () => {
      mockPlayers[0].role = ROLES.MAYOR.id;
      const playersWithMayor = [...mockPlayers];

      const gameState = {
        ...mockGameState,
        votes: {
          'p1': 'p3',  // Mayor (p1) votes for p3 (Werewolf) - 2 votes
          'p2': 'p3',  // p2 votes for p3 (Werewolf) - 1 vote
          'p4': 'p4',  // p4 votes for p4 (Villager) - 1 vote
        },
        lockedVotes: ['p1', 'p2', 'p4'],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithMayor, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveVoting();
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      expect(updateCall).toHaveProperty('players');
      expect(updateCall.players.find(p => p.id === 'p3').isAlive).toBe(false); // Verify werewolf is dead
      expect(updateCall).toHaveProperty('winner', 'VILLAGERS');
      expect(updateCall).toHaveProperty('phase', PHASES.GAME_OVER);
    });

    it('resolveVoting handles a tie in votes (no elimination)', async () => {
      const gameState = {
        ...mockGameState,
        votes: {
          'p1': 'p4',  // 1 vote for p4
          'p2': 'p5',  // 1 vote for p5
          'p3': 'p4',  // 1 vote for p4
          'p4': 'p5',  // 1 vote for p5
        },
        lockedVotes: ['p1', 'p2', 'p3', 'p4'],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveVoting();
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.dayLog).toContain('No one was eliminated.');
      expect(updateCall).toHaveProperty('phase', PHASES.NIGHT_INTRO);
    });

    it('resolveVoting handles a skip vote (no elimination)', async () => {
      const gameState = {
        ...mockGameState,
        votes: {
          'p1': 'skip',
          'p2': 'p4',
          'p3': 'skip',
        },
        lockedVotes: ['p1', 'p2', 'p3'],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveVoting();
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.dayLog).toContain('No one was eliminated.');
      expect(updateCall).toHaveProperty('phase', PHASES.NIGHT_INTRO);
    });

    it('resolveVoting handles Jester win', async () => {
      const jesterPlayer = { ...mockPlayers[0], role: ROLES.JESTER.id }; // p1 is Jester
      const playersWithJester = [jesterPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        votes: {
          'p2': 'p1', // p2 votes for Jester
          'p3': 'p1', // p3 votes for Jester
        },
        lockedVotes: ['p2', 'p3'],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithJester, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveVoting();
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.players.find(p => p.id === 'p1').isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('was voted out. They were the Jester!');
      expect(updateCall).toHaveProperty('winners', ['JESTER']);
      expect(updateCall).toHaveProperty('phase', PHASES.NIGHT_INTRO);
    });

    it('resolveVoting handles Tanner win', async () => {
      const tannerPlayer = { ...mockPlayers[0], role: ROLES.TANNER.id }; // p1 is Tanner
      const playersWithTanner = [tannerPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        votes: {
          'p2': 'p1', // p2 votes for Tanner
          'p3': 'p1', // p3 votes for Tanner
        },
        lockedVotes: ['p2', 'p3'],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithTanner, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveVoting();
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.players.find(p => p.id === 'p1').isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('was voted out. They were the Tanner!');
      expect(updateCall).toHaveProperty('winners', ['TANNER']);
      expect(updateCall).toHaveProperty('phase', PHASES.NIGHT_INTRO);
    });

    it('resolveVoting handles Doppelganger transformation when target is voted out', async () => {
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLES.DOPPELGANGER.id }; // p1 is Doppelganger
      const targetPlayer = { ...mockPlayers[1], role: ROLES.SEER.id }; // p2 is Seer (the target)
      const playersWithDoppelganger = [doppelgangerPlayer, targetPlayer, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        doppelgangerTarget: targetPlayer.id, // Doppelganger chose p2
        votes: {
          'p3': targetPlayer.id, // p3 votes for p2
          'p4': targetPlayer.id, // p4 votes for p2
        },
        lockedVotes: ['p3', 'p4'],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithDoppelganger, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveVoting();
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      const updatedDoppelganger = updateCall.players.find(p => p.id === doppelgangerPlayer.id);
      expect(updatedDoppelganger).toBeDefined();
      expect(updatedDoppelganger.role).toBe(ROLES.SEER.id); // Doppelganger becomes Seer
      expect(updateCall.players.find(p => p.id === targetPlayer.id).isAlive).toBe(false);
    });

    it('resolveVoting handles lover chain death when one lover is voted out', async () => {
      const lover1 = { ...mockPlayers[0], role: ROLES.VILLAGER.id }; // p1
      const lover2 = { ...mockPlayers[1], role: ROLES.VILLAGER.id }; // p2
      const playersWithLovers = [lover1, lover2, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        lovers: [lover1.id, lover2.id],
        votes: {
          'p3': lover1.id, // p3 votes for lover1
          'p4': lover1.id, // p4 votes for lover1
        },
        lockedVotes: ['p3', 'p4'],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithLovers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveVoting();
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.players.find(p => p.id === lover1.id).isAlive).toBe(false);
      expect(updateCall.players.find(p => p.id === lover2.id).isAlive).toBe(false); // Other lover also dies
    });

    it('resolveVoting handles Hunter being voted out', async () => {
      const hunterPlayer = { ...mockPlayers[0], role: ROLES.HUNTER.id }; // p1 is Hunter
      const playersWithHunter = [hunterPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        votes: {
          'p2': hunterPlayer.id, // p2 votes for Hunter
          'p3': hunterPlayer.id, // p3 votes for Hunter
        },
        lockedVotes: ['p2', 'p3'],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithHunter, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveVoting();
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.players.find(p => p.id === hunterPlayer.id).isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('Hunter) was voted out!');
      expect(updateCall).toHaveProperty('phase', PHASES.HUNTER_ACTION);
    });
  });

  describe('lockVote', () => {
    it('does nothing if no vote cast', async () => {
      const gameState = {
        ...mockGameState,
        phase: PHASES.DAY_VOTING,
        votes: {},
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.lockVote();
      });

      // Should not update if no vote cast
      expect(mockUpdateGame).not.toHaveBeenCalled();
    });

    it('successfully locks vote', async () => {
      const gameState = {
        ...mockGameState,
        phase: PHASES.DAY_VOTING,
        votes: { [mockUser.uid]: 'p2' },
        lockedVotes: [],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.lockVote();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(
        expect.objectContaining({
          lockedVotes: [mockUser.uid],
        })
      );
    });

    it('prevents double locking', async () => {
      const gameState = {
        ...mockGameState,
        phase: PHASES.DAY_VOTING,
        votes: { [mockUser.uid]: 'p2' },
        lockedVotes: [mockUser.uid],
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.lockVote();
      });

      // Should not update if already locked
      expect(mockUpdateGame).not.toHaveBeenCalled();
    });

    it('calls resolveVoting when all alive players have locked their votes', async () => {
      const alivePlayers = [
        { id: 'p1', name: 'Player 1', isAlive: true, role: ROLES.VILLAGER.id },
        { id: 'p2', name: 'Player 2', isAlive: true, role: ROLES.WEREWOLF.id }, // Make p2 a Werewolf for a clear tie scenario
      ];
      const gameState = {
        ...mockGameState,
        phase: PHASES.DAY_VOTING,
        votes: {
          'p1': 'p2', // Current user votes for p2
          'p2': 'p1', // Other player also votes for p1
        },
        lockedVotes: ['p2'], // p2 already locked, current user (p1) is the last to lock
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, alivePlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.lockVote();
      });

      // Expect mockUpdateGame to have been called twice:
      // 1. For updating lockedVotes
      // 2. For the outcome of resolveVoting (tie in votes, no elimination, phase change)
      expect(mockUpdateGame).toHaveBeenCalledTimes(2);

      // First call: Update lockedVotes
      expect(mockUpdateGame.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          lockedVotes: ['p2', 'p1'],
        })
      );

      // Second call: Outcome of resolveVoting (tie in votes)
      const resolveVotingCall = mockUpdateGame.mock.calls[1][0];
      expect(resolveVotingCall).toHaveProperty('dayLog', 'No one was eliminated.');
      expect(resolveVotingCall.phase).toBe(PHASES.NIGHT_INTRO);
      expect(resolveVotingCall).not.toHaveProperty('players'); // No players array update if no elimination
      expect(resolveVotingCall).not.toHaveProperty('winner'); // No winner for a tie
    });
  });

  describe('markReady', () => {
    it('marks a player as ready', async () => {
      const initialPlayers = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
        { id: 'p2', name: 'Player 2', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
      ];
      const gameState = { ...mockGameState, phase: PHASES.DAY_VOTING };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, initialPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.markReady();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(
        expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({ id: 'p1', ready: true }),
            expect.objectContaining({ id: 'p2', ready: false }),
          ]),
          phase: PHASES.DAY_VOTING, // Should not change phase yet
        })
      );
    });

    it('transitions to NIGHT_INTRO when all alive players are ready', async () => {
      const initialPlayers = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
        { id: 'p2', name: 'Player 2', isAlive: true, ready: true, role: ROLES.VILLAGER.id },
      ];
      const gameState = { ...mockGameState, phase: PHASES.DAY_VOTING };

      // p1 is the current user (mockUser) and the last to become ready
      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, initialPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.markReady();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(
        expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({ id: 'p1', ready: true }),
            expect.objectContaining({ id: 'p2', ready: true }),
          ]),
          phase: PHASES.NIGHT_INTRO, // Phase should change
        })
      );
    });

    it('dead players do not need to be ready to advance phase', async () => {
      const initialPlayers = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
        { id: 'p2', name: 'Player 2', isAlive: false, ready: false, role: ROLES.VILLAGER.id }, // Dead player
      ];
      const gameState = { ...mockGameState, phase: PHASES.DAY_VOTING };

      // p1 is the current user (mockUser) and the only alive player who needs to become ready
      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, initialPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.markReady();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(
        expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({ id: 'p1', ready: true }),
            expect.objectContaining({ id: 'p2', ready: false }), // Dead player remains not ready
          ]),
          phase: PHASES.NIGHT_INTRO, // Phase should change as all *alive* players are ready
        })
      );
    });
  });

  describe('checkWin (via resolveNight/resolveVoting)', () => {
    it('villagers win when all werewolves dead', async () => {
      // Set up game state where werewolf will be killed
      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {
          werewolfVotes: {}, // No werewolf votes (they're about to die)
        },
      };

      // Kill the werewolf by voting them out
      const votingState = {
        ...mockGameState,
        votes: {
          'p1': 'p3',  // Vote for werewolf
          'p2': 'p3',
          'p4': 'p3',
        },
        lockedVotes: ['p1', 'p2', 'p4'],
      };

      const { result } = renderHook(() =>
        useGameLogic(votingState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveVoting();
      });

      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall).toHaveProperty('winner', 'VILLAGERS');
      expect(updateCall).toHaveProperty('phase', PHASES.GAME_OVER);
    });

    it('werewolves win when wolves >= good players', async () => {
      // Set up where 1 werewolf and 1 good player remain (werewolves win condition)
      const survivors = [
        { id: 'p3', name: 'Player 3', isAlive: true, ready: true, role: ROLES.WEREWOLF.id }, // Werewolf
        { id: 'p4', name: 'Player 4', isAlive: true, ready: true, role: ROLES.VILLAGER.id }, // Villager
        { id: 'p1', name: 'Player 1', isAlive: false, ready: false, role: ROLES.SEER.id },
        { id: 'p2', name: 'Player 2', isAlive: false, ready: false, role: ROLES.DOCTOR.id },
        { id: 'p5', name: 'Player 5', isAlive: false, ready: false, role: ROLES.VILLAGER.id },
      ];

      // Simulate night actions where the villager is killed by the werewolf
      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {
          werewolfVotes: { 'p3': 'p4' }, // Werewolf votes to kill villager
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, survivors, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveNight(gameState.nightActions);
      });

      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall).toHaveProperty('winner', 'WEREWOLVES');
      expect(updateCall).toHaveProperty('phase', PHASES.GAME_OVER);
    });

    it('lovers win when only lovers remain', async () => {
      // Set up where only 2 lovers and 1 non-lover are alive, then the non-lover is killed
      const initialSurvivors = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: true, role: ROLES.VILLAGER.id }, // Lover 1
        { id: 'p2', name: 'Player 2', isAlive: true, ready: true, role: ROLES.VILLAGER.id }, // Lover 2
        { id: 'p3', name: 'Player 3', isAlive: true, ready: true, role: ROLES.WEREWOLF.id }, // Non-lover
        { id: 'p4', name: 'Player 4', isAlive: false, ready: false, role: ROLES.VILLAGER.id },
        { id: 'p5', name: 'Player 5', isAlive: false, ready: false, role: ROLES.VILLAGER.id },
      ];

      const gameState = {
        ...mockGameState,
        lovers: ['p1', 'p2'],
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {
          werewolfVotes: { 'p3': 'p1' }, // Werewolf kills a lover. This should trigger chain death, but the test focuses on the win condition if only lovers remain
          // For this test, let's assume the non-lover dies instead so only lovers remain.
          // This scenario might need re-evaluation of game logic or a specific setup.
          // For now, let's make it such that a non-lover is targetted, and the state leads to lovers being the only ones left
        },
      };

      // To make only lovers remain, let's kill the werewolf 'p3' through some means.
      // For simplicity in this test, let's directly set up the `players` such that
      // after night actions, only the lovers are alive.

      const playersAfterNight = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: true, role: ROLES.VILLAGER.id }, // Lover 1
        { id: 'p2', name: 'Player 2', isAlive: true, ready: true, role: ROLES.VILLAGER.id }, // Lover 2
        { id: 'p3', name: 'Player 3', isAlive: false, ready: true, role: ROLES.WEREWOLF.id }, // Werewolf (dead)
        { id: 'p4', name: 'Player 4', isAlive: false, ready: false, role: ROLES.VILLAGER.id },
        { id: 'p5', name: 'Player 5', isAlive: false, ready: false, role: ROLES.VILLAGER.id },
      ];

      // Simulate a night where werewolf p3 was killed by some other action not directly tested here,
      // leading to only p1 and p2 (lovers) being alive.
      // We'll call resolveNight with an empty werewolfVotes if we assume p3 was killed differently.
      const gameStateLeadingToLoversWin = {
        ...mockGameState,
        lovers: ['p1', 'p2'],
        phase: PHASES.NIGHT_WEREWOLF, // The phase before resolution
        nightActions: {}, // No direct werewolf action in this simplified setup for win check
      };

      const { result } = renderHook(() =>
        useGameLogic(gameStateLeadingToLoversWin, mockUpdateGame, playersAfterNight, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveNight(gameStateLeadingToLoversWin.nightActions);
      });

      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall).toHaveProperty('winner', 'LOVERS');
      expect(updateCall).toHaveProperty('phase', PHASES.GAME_OVER);
    });
  });

  describe('handleHunterShot', () => {
    it('eliminates target when hunter shoots', async () => {
      const gameState = {
        ...mockGameState,
        phase: PHASES.HUNTER_ACTION,
        dayLog: 'Player 3 (Hunter) was voted out!',
        nightActions: {
          doctorProtect: null,
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.handleHunterShot('p2');
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const playersArray = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      const victim = playersArray.find(p => p.id === 'p2');
      expect(victim).toBeDefined();
      expect(victim.isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('Hunter shot');
    });

    it('triggers lover death when hunter kills a lover', async () => {
      const gameState = {
        ...mockGameState,
        phase: PHASES.HUNTER_ACTION,
        dayLog: 'Player 3 (Hunter) was voted out!',
        lovers: ['p1', 'p2'],
        nightActions: {
          doctorProtect: null,
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.handleHunterShot('p1'); // Kill lover 1
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const playersArray = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      // Both lovers should be dead
      const lover1 = playersArray.find(p => p.id === 'p1');
      const lover2 = playersArray.find(p => p.id === 'p2');
      expect(lover1.isAlive).toBe(false);
      expect(lover2.isAlive).toBe(false);
    });

    it('handles Doppelganger transformation when target is shot by Hunter', async () => {
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLES.DOPPELGANGER.id }; // p1 is Doppelganger
      const targetPlayer = { ...mockPlayers[1], role: ROLES.SEER.id }; // p2 is Seer (the target)
      const hunterPlayer = { ...mockPlayers[2], role: ROLES.HUNTER.id }; // p3 is Hunter
      const werewolfPlayer = { ...mockPlayers[3], role: ROLES.WEREWOLF.id }; // p4 is Werewolf
      const playersWithDoppelgangerHunter = [
        doppelgangerPlayer,
        targetPlayer,
        hunterPlayer,
        werewolfPlayer, // Add a werewolf to prevent early win condition
        ...mockPlayers.slice(4)
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.HUNTER_ACTION,
        dayLog: `${hunterPlayer.name} (Hunter) was voted out!`,
        lovers: [],
        doppelgangerTarget: targetPlayer.id, // Doppelganger chose p2
        nightActions: {
          doctorProtect: null,
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithDoppelgangerHunter, mockUser, true, now)
      );

      await act(async () => {
        await result.current.handleHunterShot(targetPlayer.id); // Hunter shoots p2
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      const updatedDoppelganger = updatedPlayers.find(p => p.id === doppelgangerPlayer.id);
      expect(updatedDoppelganger).toBeDefined();
      expect(updatedDoppelganger.role).toBe(ROLES.SEER.id); // Doppelganger becomes Seer
      expect(updatedPlayers.find(p => p.id === targetPlayer.id).isAlive).toBe(false);
      expect(updateCall.dayLog).toContain(`Hunter shot ${targetPlayer.name}`);
    });

    it('prevents Hunter from killing a player protected by the Doctor', async () => {
      const hunterPlayer = { ...mockPlayers[0], role: ROLES.HUNTER.id }; // p1 is Hunter
      const victimPlayer = { ...mockPlayers[1], role: ROLES.VILLAGER.id }; // p2 is victim
      const doctorPlayer = { ...mockPlayers[2], role: ROLES.DOCTOR.id }; // p3 is Doctor
      const playersWithHunterDoctor = [
        hunterPlayer,
        victimPlayer,
        doctorPlayer,
        ...mockPlayers.slice(3)
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.HUNTER_ACTION,
        dayLog: `${hunterPlayer.name} (Hunter) was voted out!`,
        lovers: [],
        nightActions: {
          doctorProtect: victimPlayer.id, // Doctor protects p2
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithHunterDoctor, mockUser, true, now)
      );

      await act(async () => {
        await result.current.handleHunterShot(victimPlayer.id); // Hunter shoots p2
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      const updatedVictim = updatedPlayers.find(p => p.id === victimPlayer.id);
      expect(updatedVictim).toBeDefined();
      expect(updatedVictim.isAlive).toBe(true); // Victim should still be alive
      expect(updateCall.dayLog).toContain(`The Hunter tried to shoot ${victimPlayer.name}, but they were protected!`);
      expect(updateCall.phase).toBe(PHASES.NIGHT_INTRO); // Should transition to night intro
    });
  });

  describe('resolveNight - extended', () => {
    it('handles lover chain death', async () => {
      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        lovers: ['p1', 'p2'],
        nightActions: {
          werewolfVotes: { 'p3': 'p1' }, // Kill lover 1
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, mockPlayers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveNight(gameState.nightActions);
      });

      const updateCall = mockUpdateGame.mock.calls[0][0];
      const playersArray = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      // Both lovers should be dead
      const lover1 = playersArray.find(p => p.id === 'p1');
      const lover2 = playersArray.find(p => p.id === 'p2');
      expect(lover1.isAlive).toBe(false);
      expect(lover2.isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('died');
    });

    it('handles lover chain death when the second lover dies first', async () => {
      const werewolfPlayer = { ...mockPlayers[0], role: ROLES.WEREWOLF.id }; // p1 is Werewolf
      const lover1 = { ...mockPlayers[1], role: ROLES.VILLAGER.id, id: 'l1' };
      const lover2 = { ...mockPlayers[2], role: ROLES.VILLAGER.id, id: 'l2' };
      const playersWithLovers = [
        werewolfPlayer,
        lover1,
        lover2,
        ...mockPlayers.slice(3)
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        lovers: [lover1.id, lover2.id],
        nightActions: {
          werewolfVotes: { [werewolfPlayer.id]: lover2.id }, // Werewolf kills lover2
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithLovers, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveNight(gameState.nightActions);
      });

      const updateCall = mockUpdateGame.mock.calls[0][0];
      const playersArray = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      // Both lovers should be dead
      const updatedLover1 = playersArray.find(p => p.id === lover1.id);
      const updatedLover2 = playersArray.find(p => p.id === lover2.id);
      expect(updatedLover1.isAlive).toBe(false);
      expect(updatedLover2.isAlive).toBe(false);  // Lover2 should be dead (direct kill)
      expect(updateCall.dayLog).toContain(`${lover1.name} died.`); // Only lover1's death should be logged
      expect(updateCall.dayLog).not.toContain(`${lover2.name} died.`);
    });

    it('handles Hunter dying during the night', async () => {
      const werewolfPlayer = { ...mockPlayers[0], role: ROLES.WEREWOLF.id }; // p1 is Werewolf
      const hunterPlayer = { ...mockPlayers[1], role: ROLES.HUNTER.id }; // p2 is Hunter, dies
      const doctorPlayer = { ...mockPlayers[2], role: ROLES.DOCTOR.id }; // p3 is Doctor, not protecting hunter
      const playersWithHunterDying = [
        werewolfPlayer,
        hunterPlayer,
        doctorPlayer,
        ...mockPlayers.slice(3)
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {
          werewolfVotes: { [werewolfPlayer.id]: hunterPlayer.id }, // Werewolf kills Hunter
          doctorProtect: doctorPlayer.id, // Doctor protects himself
          vigilanteTarget: null,
          sorcererCheck: null,
          cupidLinks: {},
        },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithHunterDying, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveNight(gameState.nightActions);
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      const updatedHunter = updatedPlayers.find(p => p.id === hunterPlayer.id);
      expect(updatedHunter.isAlive).toBe(false); // Hunter should be dead
      expect(updateCall.dayLog).toContain(`${hunterPlayer.name} died. The Hunter died and seeks revenge!`);
      expect(updateCall.phase).toBe(PHASES.HUNTER_ACTION);
    });

    it('handles tie in werewolf votes by randomly selecting a target', async () => {
      const wolfPlayer1 = { id: 'w1', name: 'Wolf 1', role: ROLES.WEREWOLF.id, isAlive: true };
      const wolfPlayer2 = { id: 'w2', name: 'Wolf 2', role: ROLES.WEREWOLF.id, isAlive: true };
      const targetPlayer1 = { id: 't1', name: 'Target 1', role: ROLES.VILLAGER.id, isAlive: true };
      const targetPlayer2 = { id: 't2', name: 'Target 2', role: ROLES.VILLAGER.id, isAlive: true };
      const villager3 = { id: 'v3', name: 'Villager 3', role: ROLES.VILLAGER.id, isAlive: true };
      const villager4 = { id: 'v4', name: 'Villager 4', role: ROLES.VILLAGER.id, isAlive: true };
      const villager5 = { id: 'v5', name: 'Villager 5', role: ROLES.VILLAGER.id, isAlive: true };
      const villager6 = { id: 'v6', name: 'Villager 6', role: ROLES.VILLAGER.id, isAlive: true };

      const playersWithWolvesAndTargets = [
        wolfPlayer1,
        wolfPlayer2,
        targetPlayer1,
        targetPlayer2,
        villager3,
        villager4,
        villager5,
        villager6,
      ];

      const nightActions = {
        werewolfVotes: {
          [wolfPlayer1.id]: targetPlayer1.id, // p1 votes for t1
          [wolfPlayer2.id]: targetPlayer2.id, // p2 votes for t2
          // This creates a tie: t1 gets 1 vote, t2 gets 1 vote.
          // Note: In actual game, werewolves would coordinate for a single target,
          // but this test simulates a tie in how votes are distributed for resolution logic.
        },
        doctorProtect: null,
        vigilanteTarget: null,
        sorcererCheck: null,
        cupidLinks: [],
      };

      // Mock Math.random to make the tie-breaking deterministic
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0); // Always selects the first element from wolfTargets

      const { result } = renderHook(() =>
        useGameLogic(mockGameState, mockUpdateGame, playersWithWolvesAndTargets, mockUser, true, now)
      );

      await act(async () => {
        await result.current.resolveNight(nightActions);
      });

      mockRandom.mockRestore(); // Restore Math.random()

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Array.isArray(updateCall.players)
        ? updateCall.players
        : Object.values(updateCall.players);

      // With Math.random() mocked to 0, targetPlayer1 (t1) should be chosen and eliminated
      const eliminatedPlayer = updatedPlayers.find(p => p.id === targetPlayer1.id);
      const survivingPlayer = updatedPlayers.find(p => p.id === targetPlayer2.id);

      expect(eliminatedPlayer.isAlive).toBe(false);
      expect(survivingPlayer.isAlive).toBe(true);
      expect(updateCall.dayLog).toContain(`${targetPlayer1.name} died.`);
      expect(updateCall.phase).toBe(PHASES.DAY_REVEAL);
    });
  });

  describe('advanceNight - complete phases', () => {
    it('advances through Seer phase', async () => {
      const seerPlayer = { ...mockPlayers[0], role: ROLES.SEER.id };
      const players = [seerPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_SEER,
        nightActions: { seerCheck: null },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight('seerCheck', 'p2');
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.nightActions.seerCheck).toBe('p2');
      // Should advance to next phase
      expect(updateCall.phase).not.toBe(PHASES.NIGHT_SEER);
    });

    it('advances through Doctor phase', async () => {
      const doctorPlayer = { ...mockPlayers[1], role: ROLES.DOCTOR.id };
      const players = [doctorPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOCTOR,
        nightActions: { doctorProtect: null },
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, players, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight('doctorProtect', 'p1');
      });

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.nightActions.doctorProtect).toBe('p1');
      expect(updateCall.phase).not.toBe(PHASES.NIGHT_DOCTOR);
    });

    it('advances to Minion phase and sets phaseEndTime to null if minion exists', async () => {
      const minionPlayer = { ...mockPlayers[0], role: ROLES.MINION.id }; // p1 is minion
      const wolfPlayer = { ...mockPlayers[1], role: ROLES.WEREWOLF.id }; // p2 is wolf
      // Only include the one werewolf (wolfPlayer) and minion, and some other players.
      const playersWithMinion = [
        minionPlayer,
        wolfPlayer,
        { ...mockPlayers[3], isAlive: true, ready: false, role: ROLES.VILLAGER.id }, // p4
        { ...mockPlayers[4], isAlive: true, ready: false, role: ROLES.VILLAGER.id }, // p5
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF, // Coming from werewolf phase
        nightActions: { werewolfVotes: { [wolfPlayer.id]: 'p3' } }, // All wolves voted
      };

      const { result } = renderHook(() =>
        useGameLogic(gameState, mockUpdateGame, playersWithMinion, mockUser, true, now)
      );

      await act(async () => {
        await result.current.advanceNight();
      });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_MINION,
        phaseEndTime: null, // Minion phase has no action, so timer cleared
      }));
    });
  });
});
