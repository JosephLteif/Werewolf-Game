import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  castPlayerVote,
  lockPlayerVote,
  resolveDayVoting,
} from './voting';
import { ROLES, PHASES } from '../constants';


describe('Voting Service', () => {
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('castPlayerVote', () => {
    it('updates votes', async () => {
      await castPlayerVote(mockGameState, mockUpdateGame, mockUser, 'p2');

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        votes: { [mockUser.uid]: 'p2' },
      }));
    });

    it('does nothing if vote already locked', async () => {
      const lockedGameState = {
        ...mockGameState,
        lockedVotes: [mockUser.uid],
      };

      await castPlayerVote(lockedGameState, mockUpdateGame, mockUser, 'p2');

      expect(mockUpdateGame).not.toHaveBeenCalled();
    });
  });

  describe('lockPlayerVote', () => {
    it('does nothing if no vote cast', async () => {
      const gameState = {
        ...mockGameState,
        phase: PHASES.DAY_VOTING,
        votes: {},
      };

      await lockPlayerVote(gameState, mockUpdateGame, mockPlayers, mockUser);

      expect(mockUpdateGame).not.toHaveBeenCalled();
    });

    it('successfully locks vote', async () => {
      const gameState = {
        ...mockGameState,
        phase: PHASES.DAY_VOTING,
        votes: { [mockUser.uid]: 'p2' },
        lockedVotes: [],
      };

      await lockPlayerVote(gameState, mockUpdateGame, mockPlayers, mockUser);

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

      await lockPlayerVote(gameState, mockUpdateGame, mockPlayers, mockUser);

      expect(mockUpdateGame).not.toHaveBeenCalled();
    });

    it('calls resolveDayVoting when all alive players have locked their votes', async () => {
      const gameState = {
        ...mockGameState,
        phase: PHASES.DAY_VOTING,
        votes: {
          'p1': 'p2',
          'p2': 'p1',
          'p3': 'p1',
          'p4': 'p1',
          'p5': 'p1', // Add p5's vote so lockPlayerVote doesn't return early
        },
        lockedVotes: ['p1', 'p2', 'p3', 'p4'],
      };

      // All players are alive initially, so 5 alive players.
      // 4 locked votes, need one more to trigger resolveDayVoting
      // We are acting as { uid: 'p5' }, so p5 will be the 5th to lock their vote.
      const updatedMockPlayers = mockPlayers.map(p => ({ ...p, isAlive: true }));


      await lockPlayerVote(gameState, mockUpdateGame, updatedMockPlayers, { uid: 'p5' });

      // Expect that lockPlayerVote updates the lockedVotes
      expect(mockUpdateGame).toHaveBeenCalledWith(
        expect.objectContaining({
          lockedVotes: expect.arrayContaining(['p1', 'p2', 'p3', 'p4', 'p5']),
        })
      );

      // Now, assert that resolveDayVoting was called by checking its side effects
      // Player 1 should be voted out (4 votes vs 1)
      expect(mockUpdateGame).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: PHASES.NIGHT_INTRO,
          dayLog: expect.stringContaining('Player 1 was voted out'),
        })
      );
    });
  });

  describe('resolveDayVoting', () => {
    // Restore the original resolveDayVoting for these tests


    it('eliminates player with max votes', async () => {
      const gameState = {
        ...mockGameState,
        votes: {
          'p1': 'p4',  // Player 1 votes for p4 (villager)
          'p2': 'p4',  // p2 votes for p4
          'p3': 'p5',  // p3 votes for p5
        },
        lockedVotes: ['p1', 'p2', 'p3'],
      };

      await resolveDayVoting(gameState, mockUpdateGame, mockPlayers);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      expect(updateCall).toHaveProperty('players');
      expect(updateCall).toHaveProperty('dayLog');

      const playersArray = Object.values(updateCall.players);

      const deadPlayer = playersArray.find(p => p.id === 'p4');
      expect(deadPlayer).toBeDefined();
      expect(deadPlayer.isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('Player 4 was voted out.');
      expect(updateCall).toHaveProperty('phase', PHASES.NIGHT_INTRO);
    });

    it('accounts for Mayor\'s double vote', async () => {
      mockPlayers[0].role = ROLES.MAYOR.id;
      const playersWithMayor = [...mockPlayers];

      const gameState = {
        ...mockGameState,
        votes: {
          'p1': 'p5',  // Mayor (p1) votes for p5 (villager) - 2 votes
          'p2': 'p5',  // p2 votes for p5 (villager) - 1 vote
          'p4': 'p4',  // p4 votes for p4 (villager) - 1 vote
        },
        lockedVotes: ['p1', 'p2', 'p4'],
      };

      await resolveDayVoting(gameState, mockUpdateGame, playersWithMayor);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      expect(updateCall).toHaveProperty('players');
      expect(updateCall.players.find(p => p.id === 'p5').isAlive).toBe(false); // Verify werewolf is dead
      expect(updateCall).toHaveProperty('phase', PHASES.NIGHT_INTRO);
    });

    it('handles a tie in votes (no elimination)', async () => {
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

      await resolveDayVoting(gameState, mockUpdateGame, mockPlayers);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.dayLog).toContain('No one was eliminated.');
      expect(updateCall).toHaveProperty('phase', PHASES.NIGHT_INTRO);
    });

    it('handles a skip vote (no elimination)', async () => {
      const gameState = {
        ...mockGameState,
        votes: {
          'p1': 'skip',
          'p2': 'p4',
          'p3': 'skip',
        },
        lockedVotes: ['p1', 'p2', 'p3'],
      };

      await resolveDayVoting(gameState, mockUpdateGame, mockPlayers);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.dayLog).toContain('No one was eliminated.');
      expect(updateCall).toHaveProperty('phase', PHASES.NIGHT_INTRO);
    });

    it('handles Jester win', async () => {
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

      await resolveDayVoting(gameState, mockUpdateGame, playersWithJester);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.players.find(p => p.id === 'p1').isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('was voted out. They were the Jester!');
      expect(updateCall).toHaveProperty('winners', ['JESTER']);
      expect(updateCall).toHaveProperty('phase', PHASES.NIGHT_INTRO);
    });

    it('handles Tanner win', async () => {
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

      await resolveDayVoting(gameState, mockUpdateGame, playersWithTanner);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.players.find(p => p.id === 'p1').isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('was voted out. They were the Tanner!');
      expect(updateCall).toHaveProperty('winners', ['TANNER']);
      expect(updateCall).toHaveProperty('phase', PHASES.NIGHT_INTRO);
    });

    it('handles Doppelganger transformation when target is voted out', async () => {
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

      await resolveDayVoting(gameState, mockUpdateGame, playersWithDoppelganger);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      const updatedDoppelganger = updateCall.players.find(p => p.id === doppelgangerPlayer.id);
      expect(updatedDoppelganger).toBeDefined();
      expect(updatedDoppelganger.role).toBe(ROLES.SEER.id); // Doppelganger becomes Seer
      expect(updateCall.players.find(p => p.id === targetPlayer.id).isAlive).toBe(false);
    });

    it('handles lover chain death when one lover is voted out', async () => {
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

      await resolveDayVoting(gameState, mockUpdateGame, playersWithLovers);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.players.find(p => p.id === lover1.id).isAlive).toBe(false);
      expect(updateCall.players.find(p => p.id === lover2.id).isAlive).toBe(false); // Other lover also dies
    });

    it('handles Hunter being voted out', async () => {
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

      await resolveDayVoting(gameState, mockUpdateGame, playersWithHunter);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.players.find(p => p.id === hunterPlayer.id).isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('Hunter) was voted out!');
      expect(updateCall).toHaveProperty('phase', PHASES.HUNTER_ACTION);
    });
  });
});