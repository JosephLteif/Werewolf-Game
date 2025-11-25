import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameLogic } from './useGameLogic';
import { ROLES, PHASES } from '../constants';

// Mock updateGame function
const mockUpdateGame = vi.fn();

describe('useGameLogic - Werewolf Voting', () => {
  beforeEach(() => {
    mockUpdateGame.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should correctly aggregate werewolf votes and determine a single target', async () => {
    const players = [
      { id: 'p1', name: 'Wolf1', role: ROLES.WEREWOLF.id, isAlive: true, avatarColor: 'red' },
      { id: 'p2', name: 'Wolf2', role: ROLES.WEREWOLF.id, isAlive: true, avatarColor: 'red' },
      { id: 'p3', name: 'Villager1', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
      { id: 'p4', name: 'Villager2', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
      { id: 'p5', name: 'Villager3', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
      { id: 'p6', name: 'Villager4', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' }, // Extra villager to prevent win
    ];

    const gameState = {
      phase: PHASES.NIGHT_WEREWOLF,
      nightActions: {
        werewolfVotes: {
          p1: 'p3', // Wolf1 votes Villager1
          p2: 'p3', // Wolf2 votes Villager1
        },
        doctorProtect: null,
      },
      settings: { actionWaitTime: 60 },
      lovers: [],
      doppelgangerTarget: null,
    };

    const { result } = renderHook(() =>
      useGameLogic(gameState, mockUpdateGame, players, { uid: 'p1' }, true, Date.now())
    );

    await act(async () => {
      await result.current.resolveNight(gameState.nightActions);
    });

    // Expect updateGame to be called with the resolved wolf target
    expect(mockUpdateGame).toHaveBeenCalledWith(
      expect.objectContaining({
        dayLog: 'Villager1 died.',
        phase: PHASES.DAY_REVEAL,
        nightActions: expect.objectContaining({
          werewolfVotes: {}, // Should be cleared
          wolfTarget: null, // Should be null as it's derived internally now
        }),
      })
    );

    // Verify if Villager1 is marked as dead
    const updatedPlayers = mockUpdateGame.mock.calls[0][0].players;
    const villager1 = updatedPlayers.find(p => p.id === 'p3');
    expect(villager1.isAlive).toBe(false);
  });

  it('should handle tied werewolf votes by random selection', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // Mock Math.random to always return 0 for predictable tie-breaking

    const players = [
      { id: 'p1', name: 'Wolf1', role: ROLES.WEREWOLF.id, isAlive: true, avatarColor: 'red' },
      { id: 'p2', name: 'Wolf2', role: ROLES.WEREWOLF.id, isAlive: true, avatarColor: 'red' },
      { id: 'p3', name: 'Villager1', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
      { id: 'p4', name: 'Villager2', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
      { id: 'p5', name: 'Villager3', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
      { id: 'p6', name: 'Villager4', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' }, // Extra villager
    ];

    const gameState = {
      phase: PHASES.NIGHT_WEREWOLF,
      nightActions: {
        werewolfVotes: {
          p1: 'p3', // Wolf1 votes Villager1
          p2: 'p4', // Wolf2 votes Villager2
        },
        doctorProtect: null,
      },
      settings: { actionWaitTime: 60 },
      lovers: [],
      doppelgangerTarget: null,
    };

    const { result } = renderHook(() =>
      useGameLogic(gameState, mockUpdateGame, players, { uid: 'p1' }, true, Date.now())
    );

    await act(async () => {
      await result.current.resolveNight(gameState.nightActions);
    });

    // With Math.random mocked to 0, the first element in the tied array should be chosen (p3)
    expect(mockUpdateGame).toHaveBeenCalledWith(
      expect.objectContaining({
        dayLog: 'Villager1 died.', // p3 should be chosen due to mock
        phase: PHASES.DAY_REVEAL,
        nightActions: expect.objectContaining({
          werewolfVotes: {},
          wolfTarget: null,
        }),
      })
    );

    const updatedPlayers = mockUpdateGame.mock.calls[0][0].players;
    const villager1 = updatedPlayers.find(p => p.id === 'p3');
    expect(villager1.isAlive).toBe(false);
  });

  it('should not advance night phase if not all werewolves have voted', async () => {
    const players = [
      { id: 'p1', name: 'Wolf1', role: ROLES.WEREWOLF.id, isAlive: true, avatarColor: 'red' },
      { id: 'p2', name: 'Wolf2', role: ROLES.WEREWOLF.id, isAlive: true, avatarColor: 'red' },
      { id: 'p3', name: 'Villager1', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
      { id: 'p4', name: 'Villager2', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
      { id: 'p5', name: 'Villager3', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
    ];

    const gameState = {
      phase: PHASES.NIGHT_WEREWOLF,
      nightActions: {
        werewolfVotes: {
          p1: 'p3', // Only Wolf1 has voted
        },
      },
      settings: { actionWaitTime: 60 },
      lovers: [],
      doppelgangerTarget: null,
    };

    const { result } = renderHook(() =>
      useGameLogic(gameState, mockUpdateGame, players, { uid: 'p1' }, true, Date.now())
    );

    await act(async () => {
      // Try to advance night, but it should not if not all have voted
      await result.current.advanceNight('werewolfVote', { voterId: 'p1', targetId: 'p3' });
    });

    // Expect updateGame to be called, but the phase should remain NIGHT_WEREWOLF (or not change phase in update)
    // The hook calls updateGame with { nightActions: ... } but NO phase change if staying
    expect(mockUpdateGame).toHaveBeenCalledWith(
      expect.objectContaining({
        nightActions: expect.objectContaining({
          werewolfVotes: {
            p1: 'p3', // Wolf1's vote should be recorded
          },
        }),
      })
    );

    // Ensure phase is NOT in the update (meaning it stays same) OR it is explicitly NIGHT_WEREWOLF
    const updateCall = mockUpdateGame.mock.calls[0][0];
    if (updateCall.phase) {
      expect(updateCall.phase).toBe(PHASES.NIGHT_WEREWOLF);
    }
  });

  it('should advance night phase when all werewolves have voted', async () => {
    const players = [
      { id: 'p1', name: 'Wolf1', role: ROLES.WEREWOLF.id, isAlive: true, avatarColor: 'red' },
      { id: 'p2', name: 'Wolf2', role: ROLES.WEREWOLF.id, isAlive: true, avatarColor: 'red' },
      { id: 'p3', name: 'Villager1', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
      { id: 'p4', name: 'Villager2', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
      { id: 'p5', name: 'Villager3', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
      { id: 'p6', name: 'Villager4', role: ROLES.VILLAGER.id, isAlive: true, avatarColor: 'blue' },
    ];

    const gameState = {
      phase: PHASES.NIGHT_WEREWOLF,
      nightActions: {
        werewolfVotes: {
          p1: 'p3', // Wolf1 has voted
        },
      },
      settings: { actionWaitTime: 60 },
      lovers: [],
      doppelgangerTarget: null,
    };

    const { result } = renderHook(() =>
      useGameLogic(gameState, mockUpdateGame, players, { uid: 'p2' }, true, Date.now())
    );

    await act(async () => {
      // Wolf2 casts their vote, completing all werewolf votes
      await result.current.advanceNight('werewolfVote', { voterId: 'p2', targetId: 'p3' });
    });

    // Expect updateGame to be called, and the phase should advance to the next expected phase
    const updateGameCall = mockUpdateGame.mock.calls[0][0];
    expect(updateGameCall.phase).toBe(PHASES.DAY_REVEAL); // Should resolve to Day Reveal
    expect(updateGameCall.dayLog).toContain('Villager1 died');
    expect(updateGameCall.nightActions.werewolfVotes).toEqual({}); // Votes should be cleared after resolution
  });
});
