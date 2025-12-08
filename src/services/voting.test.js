import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  castPlayerVote,
  lockPlayerVote,
  resolveDayVoting,
  determineVotingResult,
} from './voting';
import { PHASES, ROLE_IDS, TANNER_WIN_STRATEGIES } from '../constants';

// MockGameState class (re-used from nightActions.test.js and roles.test.js)
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

  // Mimic getters of the real GameState class
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
  get doppelgangerPlayerId() {
    return this._state.doppelgangerPlayerId;
  }
  get doppelgangerTarget() {
    return this._state.doppelgangerTarget;
  }
  get playerAwaitingDeathNote() {
    return this._state.playerAwaitingDeathNote;
  }
  get nextPhaseAfterDeathNote() {
    return this._state.nextPhaseAfterDeathNote;
  }

  isHost(playerUid) {
    return this.hostId === playerUid;
  }
}

describe('Voting Service', () => {
  let mockPlayersArray;
  let mockUser;
  let mockInitialGameState; // Store a base initial state for tests

  beforeEach(() => {
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

    mockInitialGameState = {
      settings: {
        wolfCount: 1,
        activeRoles: {
          [ROLE_IDS.SEER]: true,
          [ROLE_IDS.DOCTOR]: true,
        },
        actionWaitTime: 30,
      },
      phase: PHASES.LOBBY,
      players: initialPlayersMap, // Use the map for initial state
      votes: {},
      lockedVotes: [],
      dayLog: [], // Explicitly set dayLog as an empty array
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('castPlayerVote', () => {
    it('updates votes', async () => {
      const testGameState = new MockGameState({ ...mockInitialGameState });
      await castPlayerVote(testGameState, mockUser, 'p2');

      expect(testGameState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          votes: { [mockUser.uid]: 'p2' },
        })
      );
      // Assert directly on testGameState's internal state
      expect(testGameState._state.votes).toEqual({ [mockUser.uid]: 'p2' });
    });

    it('does nothing if vote already locked', async () => {
      const testGameState = new MockGameState({
        ...mockInitialGameState,
        lockedVotes: [mockUser.uid],
      });

      await castPlayerVote(testGameState, mockUser, 'p2');

      expect(testGameState.update).not.toHaveBeenCalled();
    });

    it('allows a player to change their vote before locking', async () => {
      const testGameState = new MockGameState({
        ...mockInitialGameState,
        phase: PHASES.DAY_VOTING,
        votes: { [mockUser.uid]: 'p2' },
        lockedVotes: [],
      });

      // Player 1 changes their vote to Player 3
      await castPlayerVote(testGameState, mockUser, 'p3');

      expect(testGameState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          votes: { [mockUser.uid]: 'p3' },
        })
      );
      expect(testGameState._state.votes).toEqual({ [mockUser.uid]: 'p3' });
    });
  });

  describe('lockPlayerVote', () => {
    let initialPlayers;
    let initialPlayersMap;
    let updatedMockPlayers;

    beforeEach(() => {
      initialPlayers = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLE_IDS.SEER },
        { id: 'p2', name: 'Player 2', isAlive: true, ready: false, role: ROLE_IDS.DOCTOR },
        { id: 'p3', name: 'Player 3', isAlive: true, ready: false, role: ROLE_IDS.WEREWOLF },
        { id: 'p4', name: 'Player 4', isAlive: true, ready: false, role: ROLE_IDS.VILLAGER },
        { id: 'p5', name: 'Player 5', isAlive: true, ready: false, role: ROLE_IDS.VILLAGER },
      ];
      initialPlayersMap = {};
      initialPlayers.forEach((p) => {
        initialPlayersMap[p.id] = p;
      });
      updatedMockPlayers = initialPlayers.map((p) => ({ ...p, isAlive: true }));
    });

    it('does nothing if no vote cast', async () => {
      const testGameState = new MockGameState({
        ...mockInitialGameState,
        phase: PHASES.DAY_VOTING,
        votes: {},
      });

      await lockPlayerVote(testGameState, mockPlayersArray, mockUser);

      expect(testGameState.update).not.toHaveBeenCalled();
    });

    it('successfully locks vote', async () => {
      const testGameState = new MockGameState({
        ...mockInitialGameState,
        phase: PHASES.DAY_VOTING,
        votes: { [mockUser.uid]: 'p2' },
        lockedVotes: [],
      });

      await lockPlayerVote(testGameState, mockPlayersArray, mockUser);

      expect(testGameState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          lockedVotes: [mockUser.uid],
        })
      );
      expect(testGameState._state.lockedVotes).toEqual([mockUser.uid]);
    });

    it('prevents double locking', async () => {
      const testGameState = new MockGameState({
        ...mockInitialGameState,
        phase: PHASES.DAY_VOTING,
        votes: { [mockUser.uid]: 'p2' },
        lockedVotes: [mockUser.uid],
      });

      await lockPlayerVote(testGameState, mockPlayersArray, mockUser);

      expect(testGameState.update).not.toHaveBeenCalled();
    });

    it('calls resolveDayVoting when all alive players have locked their votes', async () => {
      const testGameState = new MockGameState({
        ...mockInitialGameState,
        phase: PHASES.DAY_VOTING,
        players: initialPlayersMap, // Use initialPlayers for this specific test
        votes: {
          p1: 'p2',
          p2: 'p1',
          p3: 'p1',
          p4: 'p1',
          p5: 'p1',
        },
        lockedVotes: ['p1', 'p2', 'p3', 'p4'],
      });

      // This call will trigger the last lock and then resolveDayVoting
      await lockPlayerVote(testGameState, updatedMockPlayers, { uid: 'p5' });

      // After resolveDayVoting, should go to death note phase
      expect(testGameState._state.phase).toBe(PHASES.DEATH_NOTE_INPUT);
      expect(testGameState._state.playerAwaitingDeathNote).toBe('p1');
      expect(testGameState._state.nextPhaseAfterDeathNote).toBe(PHASES.NIGHT_INTRO);
      expect(testGameState._state.dayLog).toContain(
        'Player 1 was lynched. They are writing their last will...'
      );
      expect(testGameState._state.players['p1'].isAlive).toBe(false);
    });
  });

  describe('resolveDayVoting', () => {
    it('eliminates player with max votes', async () => {
      const testGameState = new MockGameState({
        ...mockInitialGameState,
        votes: { p1: 'p4', p2: 'p4', p3: 'p5' },
        lockedVotes: ['p1', 'p2', 'p3'],
      });

      await resolveDayVoting(testGameState, mockPlayersArray, testGameState.lockedVotes);

      expect(testGameState.update).toHaveBeenCalled();
      expect(testGameState._state.players['p4'].isAlive).toBe(false);
      expect(testGameState._state.dayLog).toContain(
        'Player 4 was lynched. They are writing their last will...'
      );
      expect(testGameState._state.phase).toBe(PHASES.DEATH_NOTE_INPUT);
      expect(testGameState._state.playerAwaitingDeathNote).toBe('p4');
    });

    it("accounts for Mayor's double vote", async () => {
      const playersWithMayor = mockPlayersArray.map((p) =>
        p.id === 'p1' ? { ...p, role: ROLE_IDS.MAYOR } : p
      );
      const playersWithMayorMap = {};
      playersWithMayor.forEach((p) => {
        playersWithMayorMap[p.id] = p;
      });

      const testGameState = new MockGameState({
        ...mockInitialGameState,
        players: playersWithMayorMap,
        votes: {
          p1: 'p5', // Mayor (p1) votes for p5
          p2: 'p5', // p2 votes for p5
          p4: 'p4', // p4 votes for p4
        },
        lockedVotes: ['p1', 'p2', 'p4'],
      });

      await resolveDayVoting(testGameState, playersWithMayor, testGameState.lockedVotes);

      expect(testGameState.update).toHaveBeenCalled();
      expect(testGameState._state.players['p5'].isAlive).toBe(false);
      expect(testGameState._state.phase).toBe(PHASES.DEATH_NOTE_INPUT);
      expect(testGameState._state.playerAwaitingDeathNote).toBe('p5');
    });

    it('handles a tie in votes (no elimination)', async () => {
      const testGameState = new MockGameState({
        ...mockInitialGameState,
        votes: { p1: 'p4', p2: 'p5', p3: 'p4', p4: 'p5' },
        lockedVotes: ['p1', 'p2', 'p3', 'p4'],
      });

      await resolveDayVoting(testGameState, mockPlayersArray, testGameState.lockedVotes);

      expect(testGameState.update).toHaveBeenCalled();
      expect(testGameState._state.dayLog).toContain('The vote was a tie!');
      expect(testGameState._state.phase).toBe(PHASES.NIGHT_INTRO);
    });

    it('handles a skip vote (no elimination)', async () => {
      const testGameState = new MockGameState({
        ...mockInitialGameState,
        votes: { p1: 'skip', p2: 'p4', p3: 'skip' },
        lockedVotes: ['p1', 'p2', 'p3'],
      });

      await resolveDayVoting(testGameState, mockPlayersArray, testGameState.lockedVotes);

      expect(testGameState.update).toHaveBeenCalled();
      expect(testGameState._state.dayLog).toContain('No one was eliminated.');
      expect(testGameState._state.phase).toBe(PHASES.NIGHT_INTRO);
    });

    it('handles Doppelganger transformation when target is voted out', async () => {
      const doppelgangerPlayer = { ...mockPlayersArray[0], role: ROLE_IDS.DOPPELGANGER }; // p1 is Doppelganger
      const targetPlayer = { ...mockPlayersArray[1], role: ROLE_IDS.SEER }; // p2 is Seer (the target)
      const playersWithDoppelganger = [
        doppelgangerPlayer,
        targetPlayer,
        ...mockPlayersArray.slice(2),
      ];
      const playersWithDoppelgangerMap = {};
      playersWithDoppelganger.forEach((p) => {
        playersWithDoppelgangerMap[p.id] = p;
      });

      const testGameState = new MockGameState({
        ...mockInitialGameState,
        players: playersWithDoppelgangerMap,
        nightActions: {
          doppelgangerCopy: targetPlayer.id, // Doppelganger chose p2
          doppelgangerPlayerId: doppelgangerPlayer.id,
        },
        doppelgangerPlayerId: doppelgangerPlayer.id, // Also set at root level for fallback
        votes: {
          p3: targetPlayer.id, // p3 votes for p2
          p4: targetPlayer.id, // p4 votes for p2
        },
        lockedVotes: ['p3', 'p4'],
      });

      await resolveDayVoting(
        testGameState,
        playersWithDoppelganger,
        testGameState.lockedVotes
      );

      expect(testGameState.update).toHaveBeenCalled();
      expect(testGameState._state.players[doppelgangerPlayer.id].role).toBe(ROLE_IDS.SEER);
      expect(testGameState._state.players[targetPlayer.id].isAlive).toBe(false);
    });

    it('handles lover chain death when one lover is voted out', async () => {
      const lover1 = { ...mockPlayersArray[0], role: ROLE_IDS.VILLAGER }; // p1
      const lover2 = { ...mockPlayersArray[1], role: ROLE_IDS.VILLAGER }; // p2
      const playersWithLovers = [lover1, lover2, ...mockPlayersArray.slice(2)];
      const playersWithLoversMap = {};
      playersWithLovers.forEach((p) => {
        playersWithLoversMap[p.id] = p;
      });

      const testGameState = new MockGameState({
        ...mockInitialGameState,
        players: playersWithLoversMap,
        lovers: [lover1.id, lover2.id],
        votes: {
          p3: lover1.id, // p3 votes for lover1
          p4: lover1.id, // p4 votes for lover1
        },
        lockedVotes: ['p3', 'p4'],
      });

      await resolveDayVoting(testGameState, playersWithLovers, testGameState.lockedVotes);

      expect(testGameState.update).toHaveBeenCalled();
      expect(testGameState._state.players[lover1.id].isAlive).toBe(false);
      expect(testGameState._state.players[lover2.id].isAlive).toBe(false);
    });

    it('handles Hunter being voted out', async () => {
      const hunterPlayer = { ...mockPlayersArray[0], name: 'Hunter P', role: ROLE_IDS.HUNTER }; // p1 is Hunter
      const playersWithHunter = [hunterPlayer, ...mockPlayersArray.slice(1)];
      const playersWithHunterMap = {};
      playersWithHunter.forEach((p) => {
        playersWithHunterMap[p.id] = p;
      });

      const testGameState = new MockGameState({
        ...mockInitialGameState,
        players: playersWithHunterMap,
        votes: {
          p2: hunterPlayer.id, // p2 votes for Hunter
          p3: hunterPlayer.id, // p3 votes for Hunter
        },
        lockedVotes: ['p2', 'p3'],
      });

      await resolveDayVoting(testGameState, playersWithHunter, testGameState.lockedVotes);

      expect(testGameState.update).toHaveBeenCalled();
      expect(testGameState._state.players[hunterPlayer.id].isAlive).toBe(false);
      expect(testGameState._state.dayLog).toContain(
        `${hunterPlayer.name} was lynched. They are writing their last will...`
      );
      expect(testGameState._state.phase).toBe(PHASES.DEATH_NOTE_INPUT);
      expect(testGameState._state.playerAwaitingDeathNote).toBe(hunterPlayer.id);
      expect(testGameState._state.nextPhaseAfterDeathNote).toBe(PHASES.HUNTER_ACTION);
    });

    it('resolves day voting on timeout even if not all players have locked their votes', async () => {
      const testGameState = new MockGameState({
        ...mockInitialGameState,
        phase: PHASES.DAY_VOTING,
        votes: { p1: 'p4', p2: 'p4', p3: 'p5' },
        lockedVotes: ['p1', 'p2'],
      });

      await resolveDayVoting(testGameState, mockPlayersArray, testGameState.lockedVotes);

      expect(testGameState.update).toHaveBeenCalled();
      expect(testGameState._state.players['p4'].isAlive).toBe(false);
      expect(testGameState._state.dayLog).toContain(
        'Player 4 was lynched. They are writing their last will...'
      );
      expect(testGameState._state.phase).toBe(PHASES.DEATH_NOTE_INPUT);
    });

    it('ignores votes that are not locked', async () => {
      const testGameState = new MockGameState({
        ...mockInitialGameState,
        phase: PHASES.DAY_VOTING,
        votes: {
          p1: 'p4', // Locked
          p2: 'p4', // Locked
          p3: 'p5', // Not locked
          p4: 'p5', // Not locked
          p5: 'p5', // Not locked
        },
        lockedVotes: ['p1', 'p2'],
      });

      await resolveDayVoting(testGameState, mockPlayersArray, testGameState.lockedVotes);

      expect(testGameState.update).toHaveBeenCalled();
      expect(testGameState._state.players['p4'].isAlive).toBe(false);
      expect(testGameState._state.players['p5'].isAlive).toBe(true);
      expect(testGameState._state.dayLog).toContain(
        'Player 4 was lynched. They are writing their last will...'
      );
    });

    it('handles Tanner win with END_GAME strategy', async () => {
      const tannerPlayer = { ...mockPlayersArray[0], role: ROLE_IDS.TANNER };
      const playersWithTanner = [tannerPlayer, ...mockPlayersArray.slice(1)];
      const playersWithTannerMap = {};
      playersWithTanner.forEach((p) => {
        playersWithTannerMap[p.id] = p;
      });

      const testGameState = new MockGameState({
        ...mockInitialGameState,
        settings: {
          ...mockInitialGameState.settings,
          tannerWinStrategy: TANNER_WIN_STRATEGIES.END_GAME,
        },
        players: playersWithTannerMap,
        votes: {
          p2: tannerPlayer.id,
          p3: tannerPlayer.id,
        },
        lockedVotes: ['p2', 'p3'],
      });

      await resolveDayVoting(testGameState, playersWithTanner, testGameState.lockedVotes);

      expect(testGameState.update).toHaveBeenCalled();
      expect(testGameState._state.phase).toBe(PHASES.GAME_OVER);
      expect(testGameState._state.winners).toEqual(['TANNER']);
    });

    it('handles Tanner win with CONTINUE_GAME strategy', async () => {
      const tannerPlayer = { ...mockPlayersArray[0], role: ROLE_IDS.TANNER };
      const playersWithTanner = [tannerPlayer, ...mockPlayersArray.slice(1)];
      const playersWithTannerMap = {};
      playersWithTanner.forEach((p) => {
        playersWithTannerMap[p.id] = p;
      });

      const testGameState = new MockGameState({
        ...mockInitialGameState,
        settings: {
          ...mockInitialGameState.settings,
          tannerWinStrategy: TANNER_WIN_STRATEGIES.CONTINUE_GAME,
        },
        players: playersWithTannerMap,
        votes: {
          p2: tannerPlayer.id,
          p3: tannerPlayer.id,
        },
        lockedVotes: ['p2', 'p3'],
        winners: [],
      });

      await resolveDayVoting(testGameState, playersWithTanner, testGameState.lockedVotes);

      expect(testGameState.update).toHaveBeenCalled();
      // Tanner's death still triggers the death note phase before continuing
      expect(testGameState._state.phase).toBe(PHASES.DEATH_NOTE_INPUT);
      expect(testGameState._state.winners).toEqual(['TANNER']);
      expect(testGameState._state.players[tannerPlayer.id].isAlive).toBe(false);
      expect(testGameState._state.playerAwaitingDeathNote).toBe(tannerPlayer.id);
      expect(testGameState._state.nextPhaseAfterDeathNote).toBe(PHASES.NIGHT_INTRO);
    });
  });

  describe('determineVotingResult', () => {
    it('returns no_elimination if there are no votes', () => {
      const result = determineVotingResult({});
      expect(result.type).toBe('no_elimination');
    });

    it('returns elimination with the correct victim', () => {
      const voteCounts = { p1: 2, p2: 1 };
      const result = determineVotingResult(voteCounts);
      expect(result.type).toBe('elimination');
      expect(result.victims).toEqual(['p1']);
    });

    it('returns no_elimination on a tie', () => {
      const voteCounts = { p1: 2, p2: 2 };
      const result = determineVotingResult(voteCounts);
      expect(result.type).toBe('no_elimination');
    });

    it('returns no_elimination on a skip vote win', () => {
      const voteCounts = { skip: 2, p2: 1 };
      const result = determineVotingResult(voteCounts);
      expect(result.type).toBe('no_elimination');
    });

    it('returns no_elimination if max votes is 0', () => {
      const voteCounts = { p1: 0, p2: 0 };
      const result = determineVotingResult(voteCounts);
      expect(result.type).toBe('no_elimination');
    });
  });
});