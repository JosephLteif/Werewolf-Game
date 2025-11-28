import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  castPlayerVote,
  lockPlayerVote,
  resolveDayVoting,
  determineVotingResult,
} from './voting';
import { ROLES, PHASES } from '../constants';


describe('Voting Service', () => {
  let mockUpdateGame;
  let mockPlayers;
  let mockUser;
  let currentGameState; // This will hold the mutable game state for each test

  beforeEach(() => {
    mockUser = { uid: 'p1', displayName: 'Player 1' };
    mockPlayers = [
      { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLES.SEER.id },
      { id: 'p2', name: 'Player 2', isAlive: true, ready: false, role: ROLES.DOCTOR.id },
      { id: 'p3', name: 'Player 3', isAlive: true, ready: false, role: ROLES.WEREWOLF.id },
      { id: 'p4', name: 'Player 4', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
      { id: 'p5', name: 'Player 5', isAlive: true, ready: false, role: ROLES.VILLAGER.id },
    ];
    // Initialize currentGameState for each test
    currentGameState = {
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
      votes: {},
      lockedVotes: [],
    };

    mockUpdateGame = vi.fn(async (updates) => {
      // This mock directly updates currentGameState
      currentGameState = { ...currentGameState, ...updates };
      return currentGameState; // Return the updated state
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('castPlayerVote', () => {
    it('updates votes', async () => {
      await castPlayerVote(currentGameState, mockUpdateGame, mockUser, 'p2'); // Use currentGameState

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        votes: { [mockUser.uid]: 'p2' },
      }));
      // Assert directly on currentGameState as it's modified by mockUpdateGame
      expect(currentGameState.votes).toEqual({ [mockUser.uid]: 'p2' });
    });

    it('does nothing if vote already locked', async () => {
      currentGameState.lockedVotes = [mockUser.uid]; // Set locked state directly

      await castPlayerVote(currentGameState, mockUpdateGame, mockUser, 'p2');

      expect(mockUpdateGame).not.toHaveBeenCalled();
    });

    it('allows a player to change their vote before locking', async () => {
      currentGameState.phase = PHASES.DAY_VOTING;
      currentGameState.votes = { [mockUser.uid]: 'p2' }; // Player 1 initially votes for Player 2
      currentGameState.lockedVotes = [];

      // Player 1 changes their vote to Player 3
      await castPlayerVote(currentGameState, mockUpdateGame, mockUser, 'p3');

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        votes: { [mockUser.uid]: 'p3' },
      }));
      expect(currentGameState.votes).toEqual({ [mockUser.uid]: 'p3' });
    });
  });

  describe('lockPlayerVote', () => {
    it('does nothing if no vote cast', async () => {
      currentGameState.phase = PHASES.DAY_VOTING;
      currentGameState.votes = {}; // No votes cast

      await lockPlayerVote(currentGameState, mockUpdateGame, mockPlayers, mockUser);

      expect(mockUpdateGame).not.toHaveBeenCalled();
    });

    it('successfully locks vote', async () => {
      currentGameState.phase = PHASES.DAY_VOTING;
      currentGameState.votes = { [mockUser.uid]: 'p2' };
      currentGameState.lockedVotes = [];

      await lockPlayerVote(currentGameState, mockUpdateGame, mockPlayers, mockUser);

      expect(mockUpdateGame).toHaveBeenCalledWith(
        expect.objectContaining({
          lockedVotes: [mockUser.uid],
        })
      );
      expect(currentGameState.lockedVotes).toEqual([mockUser.uid]);
    });

    it('prevents double locking', async () => {
      currentGameState.phase = PHASES.DAY_VOTING;
      currentGameState.votes = { [mockUser.uid]: 'p2' };
      currentGameState.lockedVotes = [mockUser.uid];

      await lockPlayerVote(currentGameState, mockUpdateGame, mockPlayers, mockUser);

      expect(mockUpdateGame).not.toHaveBeenCalled();
    });

    it('calls resolveDayVoting when all alive players have locked their votes', async () => {
      currentGameState.phase = PHASES.DAY_VOTING;
      currentGameState.votes = {
        'p1': 'p2',
        'p2': 'p1',
        'p3': 'p1',
        'p4': 'p1',
        'p5': 'p1',
      };
      currentGameState.lockedVotes = ['p1', 'p2', 'p3', 'p4'];

      const updatedMockPlayers = mockPlayers.map(p => ({ ...p, isAlive: true }));
      // This call will trigger the last lock and then resolveDayVoting
      await lockPlayerVote(currentGameState, mockUpdateGame, updatedMockPlayers, { uid: 'p5' });

      // After resolveDayVoting, currentGameState should reflect the changes
      expect(currentGameState.phase).toBe(PHASES.NIGHT_INTRO);
      expect(currentGameState.dayLog).toBe('Player 1 was voted out.'); // Assert on the exact string now
      expect(currentGameState.players.find(p => p.id === 'p1').isAlive).toBe(false); // Player 1 should be dead
    });
  });

  describe('resolveDayVoting', () => {
    it('eliminates player with max votes', async () => {
      currentGameState.votes = {
        'p1': 'p4',
        'p2': 'p4',
        'p3': 'p5',
      };
      currentGameState.lockedVotes = ['p1', 'p2', 'p3'];

      await resolveDayVoting(currentGameState, mockUpdateGame, mockPlayers);

      expect(mockUpdateGame).toHaveBeenCalled();
      expect(currentGameState.players.find(p => p.id === 'p4').isAlive).toBe(false);
      expect(currentGameState.dayLog).toContain('Player 4 was voted out.');
      expect(currentGameState.phase).toBe(PHASES.NIGHT_INTRO);
    });

    it('accounts for Mayor\'s double vote', async () => {
      mockPlayers[0].role = ROLES.MAYOR.id; // p1 is Mayor
      currentGameState.votes = {
        'p1': 'p5', // Mayor (p1) votes for p5
        'p2': 'p5', // p2 votes for p5
        'p4': 'p4', // p4 votes for p4
      };
      currentGameState.lockedVotes = ['p1', 'p2', 'p4'];

      await resolveDayVoting(currentGameState, mockUpdateGame, mockPlayers);

      expect(mockUpdateGame).toHaveBeenCalled();
      expect(currentGameState.players.find(p => p.id === 'p5').isAlive).toBe(false);
      expect(currentGameState.phase).toBe(PHASES.NIGHT_INTRO);
    });

    it('handles a tie in votes (no elimination)', async () => {
      currentGameState.votes = {
        'p1': 'p4',
        'p2': 'p5',
        'p3': 'p4',
        'p4': 'p5',
      };
      currentGameState.lockedVotes = ['p1', 'p2', 'p3', 'p4'];

      await resolveDayVoting(currentGameState, mockUpdateGame, mockPlayers);

      expect(mockUpdateGame).toHaveBeenCalled();
      expect(currentGameState.dayLog).toContain('No one was eliminated.');
      expect(currentGameState.phase).toBe(PHASES.NIGHT_INTRO);
    });

    it('handles a skip vote (no elimination)', async () => {
      currentGameState.votes = {
        'p1': 'skip',
        'p2': 'p4',
        'p3': 'skip',
      };
      currentGameState.lockedVotes = ['p1', 'p2', 'p3'];

      await resolveDayVoting(currentGameState, mockUpdateGame, mockPlayers);

      expect(mockUpdateGame).toHaveBeenCalled();
      expect(currentGameState.dayLog).toContain('No one was eliminated.');
      expect(currentGameState.phase).toBe(PHASES.NIGHT_INTRO);
    });

    it('handles Doppelganger transformation when target is voted out', async () => {
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLES.DOPPELGANGER.id }; // p1 is Doppelganger
      const targetPlayer = { ...mockPlayers[1], role: ROLES.SEER.id }; // p2 is Seer (the target)
      const playersWithDoppelganger = [doppelgangerPlayer, targetPlayer, ...mockPlayers.slice(2)];

      currentGameState.doppelgangerTarget = targetPlayer.id; // Doppelganger chose p2
      currentGameState.votes = {
        'p3': targetPlayer.id, // p3 votes for p2
        'p4': targetPlayer.id, // p4 votes for p2
      };
      currentGameState.lockedVotes = ['p3', 'p4'];

      await resolveDayVoting(currentGameState, mockUpdateGame, playersWithDoppelganger);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updatedDoppelganger = currentGameState.players.find(p => p.id === doppelgangerPlayer.id);
      expect(updatedDoppelganger).toBeDefined();
      expect(updatedDoppelganger.role).toBe(ROLES.SEER.id);
      expect(currentGameState.players.find(p => p.id === targetPlayer.id).isAlive).toBe(false);
    });

    it('handles lover chain death when one lover is voted out', async () => {
      const lover1 = { ...mockPlayers[0], role: ROLES.VILLAGER.id }; // p1
      const lover2 = { ...mockPlayers[1], role: ROLES.VILLAGER.id }; // p2
      const playersWithLovers = [lover1, lover2, ...mockPlayers.slice(2)];

      currentGameState.lovers = [lover1.id, lover2.id];
      currentGameState.votes = {
        'p3': lover1.id, // p3 votes for lover1
        'p4': lover1.id, // p4 votes for lover1
      };
      currentGameState.lockedVotes = ['p3', 'p4'];

      await resolveDayVoting(currentGameState, mockUpdateGame, playersWithLovers);

      expect(mockUpdateGame).toHaveBeenCalled();
      expect(currentGameState.players.find(p => p.id === lover1.id).isAlive).toBe(false);
      expect(currentGameState.players.find(p => p.id === lover2.id).isAlive).toBe(false);
    });

    it('handles Hunter being voted out', async () => {
      const hunterPlayer = { ...mockPlayers[0], role: ROLES.HUNTER.id }; // p1 is Hunter
      const playersWithHunter = [hunterPlayer, ...mockPlayers.slice(1)];

      currentGameState.votes = {
        'p2': hunterPlayer.id, // p2 votes for Hunter
        'p3': hunterPlayer.id, // p3 votes for Hunter
      };
      currentGameState.lockedVotes = ['p2', 'p3'];

      await resolveDayVoting(currentGameState, mockUpdateGame, playersWithHunter);

      expect(mockUpdateGame).toHaveBeenCalled();
      expect(currentGameState.players.find(p => p.id === hunterPlayer.id).isAlive).toBe(false);
      expect(currentGameState.dayLog).toContain('Hunter) was voted out!');
      expect(currentGameState.phase).toBe(PHASES.HUNTER_ACTION);
    });

    it('resolves day voting on timeout even if not all players have locked their votes', async () => {
      currentGameState.phase = PHASES.DAY_VOTING;
      currentGameState.votes = {
        'p1': 'p4',
        'p2': 'p4',
        'p3': 'p5',
      };
      currentGameState.lockedVotes = ['p1', 'p2'];

      await resolveDayVoting(currentGameState, mockUpdateGame, mockPlayers);

      expect(mockUpdateGame).toHaveBeenCalled();
      expect(currentGameState.players.find(p => p.id === 'p4').isAlive).toBe(false);
      expect(currentGameState.dayLog).toContain('Player 4 was voted out.');
      expect(currentGameState.phase).toBe(PHASES.NIGHT_INTRO);
    });

    it('ignores votes that are not locked', async () => {
      currentGameState.phase = PHASES.DAY_VOTING;
      currentGameState.votes = {
        'p1': 'p4', // Locked
        'p2': 'p4', // Locked
        'p3': 'p5', // Not locked
        'p4': 'p5', // Not locked
        'p5': 'p5', // Not locked
      };
      currentGameState.lockedVotes = ['p1', 'p2'];

      await resolveDayVoting(currentGameState, mockUpdateGame, mockPlayers);

      expect(mockUpdateGame).toHaveBeenCalled();
      expect(currentGameState.players.find(p => p.id === 'p4').isAlive).toBe(false);
      expect(currentGameState.players.find(p => p.id === 'p5').isAlive).toBe(true);
      expect(currentGameState.dayLog).toContain('Player 4 was voted out.');
    });
  });

  describe('determineVotingResult', () => {
    // ... tests for determineVotingResult remain unchanged ...
    it('returns no_elimination if there are no votes', () => {
      const result = determineVotingResult({});
      expect(result.type).toBe('no_elimination');
    });

    it('returns elimination with the correct victim', () => {
      const voteCounts = { 'p1': 2, 'p2': 1 };
      const result = determineVotingResult(voteCounts);
      expect(result.type).toBe('elimination');
      expect(result.victims).toEqual(['p1']);
    });

    it('returns no_elimination on a tie', () => {
      const voteCounts = { 'p1': 2, 'p2': 2 };
      const result = determineVotingResult(voteCounts);
      expect(result.type).toBe('no_elimination');
    });

    it('returns no_elimination on a skip vote win', () => {
      const voteCounts = { 'skip': 2, 'p2': 1 };
      const result = determineVotingResult(voteCounts);
      expect(result.type).toBe('no_elimination');
    });
  });
});
