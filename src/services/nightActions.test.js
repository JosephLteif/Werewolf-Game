import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as nightActions from './nightActions';
import { ROLE_IDS, PHASES } from '../constants';
import { TEAMS } from '../constants';
import * as winConditions from '../utils/winConditions';


describe('Night Actions Service', () => {
  let mockUpdateGame;
  let mockPlayers;
  let mockGameState;
  let now;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockUpdateGame = vi.fn();
    mockPlayers = [
      { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLE_IDS.SEER },
      { id: 'p2', name: 'Player 2', isAlive: true, ready: false, role: ROLE_IDS.DOCTOR },
      { id: 'p3', name: 'Player 3', isAlive: true, ready: false, role: ROLE_IDS.WEREWOLF },
      { id: 'p4', name: 'Player 4', isAlive: true, ready: false, role: ROLE_IDS.VILLAGER },
      { id: 'p5', name: 'Player 5', isAlive: true, ready: false, role: ROLE_IDS.VILLAGER },
    ];
    mockGameState = {
      settings: {
        wolfCount: 1,
        activeRoles: {
          [ROLE_IDS.SEER]: true,
          [ROLE_IDS.DOCTOR]: true,
        },
        actionWaitTime: 30,
      },
      phase: PHASES.LOBBY,
      players: {},
    };
    now = Date.now();

  });
  describe('startNight', () => {
    it('starts with Cupid if Cupid is present and no lovers', async () => {
      const cupidPlayer = { ...mockPlayers[0], role: ROLE_IDS.CUPID };
      const playersWithCupid = [cupidPlayer, ...mockPlayers.slice(1)];

      await nightActions.startNight({ ...mockGameState, lovers: [] }, mockUpdateGame, playersWithCupid, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_CUPID,
      }));
    });

    it('starts with Werewolf if no Cupid and no Doppelganger', async () => {
      const wolfPlayer = { ...mockPlayers[0], role: ROLE_IDS.WEREWOLF };
      const playersWithWolf = [wolfPlayer, ...mockPlayers.slice(1)];

      await nightActions.startNight({ ...mockGameState, lovers: [] }, mockUpdateGame, playersWithWolf, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_WEREWOLF,
      }));
    });

    it('starts with Doppelganger if Doppelganger is present and no target yet', async () => {
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLE_IDS.DOPPELGANGER };
      const playersWithDoppelganger = [doppelgangerPlayer, ...mockPlayers.slice(1)];

      await nightActions.startNight({ ...mockGameState, doppelgangerTarget: null }, mockUpdateGame, playersWithDoppelganger, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_DOPPELGANGER,
      }));
    });

    it('skips Cupid if Cupid is present but lovers are already set', async () => {
      const cupidPlayer = { ...mockPlayers[0], role: ROLE_IDS.CUPID };
      const playersWithCupid = [cupidPlayer, ...mockPlayers.slice(1)];
      const existingLovers = ['p1', 'p2'];

      await nightActions.startNight({ ...mockGameState, lovers: existingLovers }, mockUpdateGame, playersWithCupid, now);

      // Assuming Werewolf is the next active phase after Cupid in the sequence if Cupid is skipped
      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_WEREWOLF,
      }));
    });
  });

  describe('advanceNight', () => {
    it('advances from Cupid to Werewolf', async () => {
      const cupidPlayer = { ...mockPlayers[0], role: ROLE_IDS.CUPID };
      const wolfPlayer = { ...mockPlayers[1], role: ROLE_IDS.WEREWOLF };
      const players = [cupidPlayer, wolfPlayer, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_CUPID,
        nightActions: { cupidLinks: [] },
        lovers: [],
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now, 'cupidLinks', ['p1', 'p2']);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_WEREWOLF,
        lovers: ['p1', 'p2'],
      }));
    });

    it('removes a cupid link if already selected', async () => {
      const cupidPlayer = { ...mockPlayers[0], role: ROLE_IDS.CUPID };
      const players = [cupidPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_CUPID,
        nightActions: { cupidLinks: ['p1', 'p2'] }, // p1 and p2 are already linked
        lovers: [],
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now, 'cupidLinks', ['p1']);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: { cupidLinks: ['p1'] },
        // Phase should advance to Werewolf
        phase: PHASES.NIGHT_WEREWOLF,
      }));
    });

    it('sets nightActions.cupidLinks to the provided value, but only sets lovers if count is 2', async () => {
      const cupidPlayer = { ...mockPlayers[0], role: ROLE_IDS.CUPID };
      const players = [cupidPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_CUPID,
        nightActions: { cupidLinks: [] },
        lovers: [],
      };

      // Attempt to add three players
      await nightActions.advanceNight(gameState, mockUpdateGame, players, now, 'cupidLinks', ['p1', 'p2', 'p3']);

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

      // Add two players
      await nightActions.advanceNight(newGameState, mockUpdateGame, players, now, 'cupidLinks', ['p1', 'p2']);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: { cupidLinks: ['p1', 'p2'] },
        phase: PHASES.NIGHT_WEREWOLF,
        lovers: ['p1', 'p2'], // Should be set now
      }));
    });

    it('advances to the next logical phase when no actionType is provided', async () => {
      const doctorPlayer = { ...mockPlayers[1], role: ROLE_IDS.DOCTOR };
      const players = [doctorPlayer, ...mockPlayers.slice(1)]; // Ensure Doctor is present

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF, // Start in Werewolf phase
        nightActions: {
          werewolfVotes: { 'p3': 'p1' }, // Assume werewolf vote is complete
        },
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_DOCTOR, // Expect to advance to Doctor phase
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances phase on timeout even if werewolves have not voted', async () => {
      const wolfPlayer1 = { ...mockPlayers[2], id: 'p3', role: ROLE_IDS.WEREWOLF, isAlive: true };
      const wolfPlayer2 = { ...mockPlayers[0], id: 'p1', role: ROLE_IDS.WEREWOLF, isAlive: true };
      const playersWithTwoWolves = [
        wolfPlayer1,
        wolfPlayer2,
        { ...mockPlayers[1], id: 'p2', role: ROLE_IDS.DOCTOR, isAlive: true },
        { ...mockPlayers[3], id: 'p4', role: ROLE_IDS.VILLAGER, isAlive: true },
        { ...mockPlayers[4], id: 'p5', role: ROLE_IDS.VILLAGER, isAlive: true },
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {},
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, playersWithTwoWolves, now, null, null); // Pass null for actionType to simulate timeout

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      // It should advance to the next phase in the sequence (Minion, then Sorcerer, then Doctor)
      expect(updateCall.phase).toBe(PHASES.NIGHT_DOCTOR);
    });

    it('advances from Werewolf to Minion if Minion exists', async () => {
      const wolfPlayer = { ...mockPlayers[0], role: ROLE_IDS.WEREWOLF };
      const minionPlayer = { ...mockPlayers[1], role: ROLE_IDS.MINION };
      const players = [wolfPlayer, minionPlayer, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: { werewolfVotes: {} },
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now, 'werewolfVote', { voterId: wolfPlayer.id, targetId: 'p3' });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: {
          werewolfVotes: { [wolfPlayer.id]: 'p3' },
        },
      }));
    });

    it('does not advance phase if not all werewolves have voted', async () => {
      // Two werewolves exist in mockPlayers, only one votes
      const wolfPlayer1 = { ...mockPlayers[2], id: 'p3', role: ROLE_IDS.WEREWOLF, isAlive: true };
      const wolfPlayer2 = { ...mockPlayers[0], id: 'p1', role: ROLE_IDS.WEREWOLF, isAlive: true }; // p1 was Seer, now a Werewolf
      const playersWithTwoWolves = [
        wolfPlayer1,
        wolfPlayer2,
        { ...mockPlayers[1], id: 'p2', role: ROLE_IDS.VILLAGER, isAlive: true },
        { ...mockPlayers[3], id: 'p4', role: ROLE_IDS.VILLAGER, isAlive: true },
        { ...mockPlayers[4], id: 'p5', role: ROLE_IDS.VILLAGER, isAlive: true },
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {},
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, playersWithTwoWolves, now, 'werewolfVote', { voterId: wolfPlayer1.id, targetId: 'p2' });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: {
          werewolfVotes: { [wolfPlayer1.id]: 'p2' },
        },
      }));
      expect(mockUpdateGame.mock.calls[0][0]).not.toHaveProperty('phaseEndTime');
      expect(mockUpdateGame.mock.calls[0][0]).not.toHaveProperty('phase');
    });

    it('allows werewolf to cast provisional vote', async () => {
      const wolfPlayer = mockPlayers.find(p => p.role === ROLE_IDS.WEREWOLF);
      const targetPlayer = mockPlayers.find(p => p.id === 'p1'); // Seer

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {},
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, mockPlayers, now, 'werewolfProvisionalVote', { voterId: wolfPlayer.id, targetId: targetPlayer.id });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: {
          werewolfProvisionalVotes: { [wolfPlayer.id]: targetPlayer.id },
        },
      }));
    });

    it('allows werewolf to confirm vote (overriding provisional)', async () => {
      const wolfPlayer = mockPlayers.find(p => p.role === ROLE_IDS.WEREWOLF);
      const provisionalTarget = mockPlayers.find(p => p.id === 'p1'); // Seer
      const confirmedTarget = mockPlayers.find(p => p.id === 'p2'); // Doctor

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {
          werewolfProvisionalVotes: { [wolfPlayer.id]: provisionalTarget.id },
        },
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, mockPlayers, now, 'werewolfVote', { voterId: wolfPlayer.id, targetId: confirmedTarget.id });

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        nightActions: {
          werewolfVotes: { [wolfPlayer.id]: confirmedTarget.id },
        },
        phase: PHASES.NIGHT_DOCTOR,
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances from Werewolf to Sorcerer if Sorcerer exists', async () => {
      const sorcererPlayer = { ...mockPlayers[0], role: ROLE_IDS.SORCERER };
      const players = [sorcererPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF, // Coming from Werewolf phase
        nightActions: { werewolfVotes: { 'p3': 'p1' } }, // Assume votes are done
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_SORCERER,
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances from Doctor to Vigilante if Vigilante exists', async () => {
      const vigilantePlayer = { ...mockPlayers[0], role: ROLE_IDS.VIGILANTE };
      const players = [vigilantePlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOCTOR, // Coming from Doctor phase
        nightActions: { doctorProtect: 'p1' }, // Assume action done
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_VIGILANTE,
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances from Seer to Mason if Masons exist', async () => {
      const masonPlayer1 = { ...mockPlayers[0], role: ROLE_IDS.MASON };
      const masonPlayer2 = { ...mockPlayers[1], role: ROLE_IDS.MASON };
      const players = [masonPlayer1, masonPlayer2, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_SEER, // Coming from Seer phase
        nightActions: { seerCheck: 'p1' }, // Assume action done
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_MASON,
        phaseEndTime: null, // Mason phase has no action, so timer cleared
      }));
    });

    it('advances immediately if only one mason is alive and clicks ready', async () => {
      const masonPlayer1 = { ...mockPlayers[0], role: ROLE_IDS.MASON, isAlive: true };
      const masonPlayer2 = { ...mockPlayers[1], role: ROLE_IDS.MASON, isAlive: false }; // Dead mason
      const players = [masonPlayer1, masonPlayer2, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_MASON,
        nightActions: { masonsReady: {} },
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now, 'masonReady', masonPlayer1.id);

      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.phase).not.toBe(PHASES.NIGHT_MASON);
    });

    it('resets masonsReady when entering mason phase', async () => {
      const masonPlayer1 = { ...mockPlayers[0], role: ROLE_IDS.MASON };
      const masonPlayer2 = { ...mockPlayers[1], role: ROLE_IDS.MASON };
      const players = [masonPlayer1, masonPlayer2, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_SEER, // Coming from a phase before Mason
        nightActions: {
          seerCheck: 'p1',
          masonsReady: { 'someOldId': true } // Old mason ready state
        },
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now, 'seerCheck', 'p2');

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_MASON,
        nightActions: expect.objectContaining({
          masonsReady: {},
        }),
      }));
    });

    it('updates doppelgangerTarget if Doppelganger makes a choice', async () => {
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLE_IDS.DOPPELGANGER };
      const targetPlayer = { ...mockPlayers[1], role: ROLE_IDS.SEER };
      const players = [doppelgangerPlayer, targetPlayer, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOPPELGANGER, // Start in Doppelganger phase
        doppelgangerTarget: null,
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now, 'doppelgangerCopy', targetPlayer.id);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        doppelgangerTarget: targetPlayer.id,
        phase: PHASES.NIGHT_WEREWOLF, // Assuming Werewolf is the next active phase
        phaseEndTime: expect.any(Number),
      }));
    });

    it('skips NIGHT_DOPPELGANGER if no Doppelganger is present', async () => {
      // Setup players: One Cupid, one Werewolf, one Doctor, two Villagers (5 players total)
      const players = [
        { id: 'p1', name: 'Player 1', isAlive: true, ready: false, role: ROLE_IDS.CUPID },
        { id: 'p2', name: 'Player 2', isAlive: true, ready: false, role: ROLE_IDS.WEREWOLF },
        { id: 'p3', name: 'Player 3', isAlive: true, ready: false, role: ROLE_IDS.DOCTOR },
        { id: 'p4', name: 'Player 4', isAlive: true, ready: false, role: ROLE_IDS.VILLAGER },
        { id: 'p5', name: 'Player 5', isAlive: true, ready: false, role: ROLE_IDS.VILLAGER },
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOPPELGANGER, // Start in Doppelganger phase
        doppelgangerTarget: null, // No target set, but no role exists
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now);

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
      let playersWithoutCupid = mockPlayers.filter(p => p.role !== ROLE_IDS.CUPID);
      let gameStateNoCupid = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOPPELGANGER, // Start in Doppelganger phase
        doppelgangerTarget: 'p1', // Assume Doppelganger action already done
        lovers: [],
      };

      await nightActions.advanceNight(gameStateNoCupid, mockUpdateGame, playersWithoutCupid, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_WEREWOLF, // Expect to skip Cupid and land on Werewolf
        phaseEndTime: expect.any(Number),
      }));
      mockUpdateGame.mockClear();

      // Scenario 2: Cupid present, but lovers already set
      let playersWithCupid = [{ ...mockPlayers[0], role: ROLE_IDS.CUPID }, ...mockPlayers.slice(1)];
      let gameStateLoversSet = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOPPELGANGER, // Start in Doppelganger phase
        doppelgangerTarget: 'p1', // Assume Doppelganger action already done
        lovers: ['p1', 'p2'], // Lovers already set
      };

      await nightActions.advanceNight(gameStateLoversSet, mockUpdateGame, playersWithCupid, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_WEREWOLF, // Expect to skip Cupid and land on Werewolf
        phaseEndTime: expect.any(Number),
      }));
    });

    it('skips NIGHT_WEREWOLF if no Werewolves are present', async () => {
      // Setup players with no Werewolves, but a Doctor exists
      let playersWithoutWerewolf = mockPlayers.filter(p => p.role !== ROLE_IDS.WEREWOLF);
      let doctorPlayer = { ...mockPlayers[1], role: ROLE_IDS.DOCTOR, isAlive: true };
      let players = [doctorPlayer, ...playersWithoutWerewolf.slice(1)];

      let gameStateNoWerewolf = {
        ...mockGameState,
        phase: PHASES.NIGHT_CUPID, // Start in Cupid phase (assuming Cupid has finished or skipped)
        lovers: ['p1', 'p2'], // Lovers already set to ensure Cupid is skipped
      };

      await nightActions.advanceNight(gameStateNoWerewolf, mockUpdateGame, players, now);

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
      const seerPlayer = { ...mockPlayers[0], role: ROLE_IDS.SEER, isAlive: true };
      const playersWithOnlySeer = [
        seerPlayer,
        { ...mockPlayers[1], role: ROLE_IDS.VILLAGER, isAlive: true },
        { ...mockPlayers[2], role: ROLE_IDS.VILLAGER, isAlive: true },
      ];

      // Start the phase at Doppelganger, expecting it to skip all the way to Seer
      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOPPELGANGER,
        doppelgangerTarget: null, // No doppelganger anyway
        lovers: ['p1', 'p2'], // Lovers set to skip Cupid
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, playersWithOnlySeer, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_SEER, // Expect to skip many phases and land on Seer
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances to NIGHT_DOPPELGANGER when a Doppelganger is present and untargeted', async () => {
      // Setup players with a Doppelganger, no Cupid to avoid complications
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLE_IDS.DOPPELGANGER, isAlive: true };
      const werewolfPlayer = { ...mockPlayers[1], role: ROLE_IDS.WEREWOLF, isAlive: true };
      const players = [doppelgangerPlayer, werewolfPlayer, ...mockPlayers.slice(2)]; // Ensure no Cupid for now

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_INTRO, // Start before Doppelganger in the sequence
        doppelgangerTarget: null, // Doppelganger has not yet chosen a target
        lovers: [], // Ensure Cupid is not skipped if it were to be next
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_DOPPELGANGER,
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances to NIGHT_CUPID when Cupid is present and lovers are not set', async () => {
      // Setup players with a Cupid, and ensure Doppelganger is either absent or has made a choice
      const cupidPlayer = { ...mockPlayers[0], role: ROLE_IDS.CUPID, isAlive: true };
      const werewolfPlayer = { ...mockPlayers[1], role: ROLE_IDS.WEREWOLF, isAlive: true };
      const doctorPlayer = { ...mockPlayers[2], role: ROLE_IDS.DOCTOR, isAlive: true };
      const players = [cupidPlayer, werewolfPlayer, doctorPlayer, ...mockPlayers.slice(3)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOPPELGANGER, // Start in Doppelganger phase
        doppelgangerTarget: 'someId', // Assume Doppelganger has made a choice
        lovers: [], // Lovers are not yet set
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_CUPID,
        phaseEndTime: expect.any(Number),
      }));
    });

    it('skips NIGHT_DOPPELGANGER in subsequent nights if target is already chosen', async () => {
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLE_IDS.DOPPELGANGER, isAlive: true };
      const werewolfPlayer = { ...mockPlayers[1], role: ROLE_IDS.WEREWOLF, isAlive: true };
      const players = [doppelgangerPlayer, werewolfPlayer, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_INTRO, // An early phase
        doppelgangerTarget: 'someExistingTargetId', // Doppelganger has already made a choice
        lovers: [], // To ensure Cupid would be the next if Doppelganger is skipped
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now);

      // Expect to skip Doppelganger and land on Werewolf (since Cupid is not present in this setup)
      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_WEREWOLF,
        phaseEndTime: expect.any(Number),
      }));
    });

    it('advances to RESOLVE phase and calls resolveNight when no more night actions', async () => {
      // Mock checkWin to avoid complex win condition logic during this test
      vi.spyOn(winConditions, 'checkWinCondition').mockReturnValueOnce({ isGameOver: true, winner: 'VILLAGERS', winners: ['VILLAGERS'] });

      const playersWithoutSpecialRoles = [
        { ...mockPlayers[0], role: ROLE_IDS.SEER, isAlive: true },
        { ...mockPlayers[1], role: ROLE_IDS.VILLAGER, isAlive: true },
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_SEER, // Coming from Seer phase, which is the last action phase for this setup
        nightActions: { seerCheck: 'p1' }, // Assume action done
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, playersWithoutSpecialRoles, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.GAME_OVER,
        winner: 'VILLAGERS',
      }));


    });

    it('advances through Seer phase', async () => {
      const seerPlayer = { ...mockPlayers[0], role: ROLE_IDS.SEER };
      const players = [seerPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_SEER,
        nightActions: { seerCheck: null },
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now, 'seerCheck', 'p2');

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.nightActions.seerCheck).toBe('p2');
      // Should advance to next phase
      expect(updateCall.phase).not.toBe(PHASES.NIGHT_SEER);
    });

    it('advances through Doctor phase', async () => {
      const doctorPlayer = { ...mockPlayers[1], role: ROLE_IDS.DOCTOR };
      const players = [doctorPlayer, ...mockPlayers.slice(1)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOCTOR,
        nightActions: { doctorProtect: null },
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, players, now, 'doctorProtect', 'p1');

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];
      expect(updateCall.nightActions.doctorProtect).toBe('p1');
      expect(updateCall.phase).not.toBe(PHASES.NIGHT_DOCTOR);
    });

    it('advances to Minion phase and sets phaseEndTime to null if minion exists', async () => {
      const minionPlayer = { ...mockPlayers[0], role: ROLE_IDS.MINION }; // p1 is minion
      const wolfPlayer = { ...mockPlayers[1], role: ROLE_IDS.WEREWOLF }; // p2 is wolf
      // Only include the one werewolf (wolfPlayer) and minion, and some other players.
      const playersWithMinion = [
        minionPlayer,
        wolfPlayer,
        { ...mockPlayers[3], isAlive: true, ready: false, role: ROLE_IDS.VILLAGER }, // p4
        { ...mockPlayers[4], isAlive: true, ready: false, role: ROLE_IDS.VILLAGER }, // p5
      ];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF, // Coming from werewolf phase
        nightActions: { werewolfVotes: { [wolfPlayer.id]: 'p3' } }, // All wolves voted
      };

      await nightActions.advanceNight(gameState, mockUpdateGame, playersWithMinion, now);

      expect(mockUpdateGame).toHaveBeenCalledWith(expect.objectContaining({
        phase: PHASES.NIGHT_MINION,
        phaseEndTime: null, // Minion phase has no action, so timer cleared
      }));
    });
  });

  describe('resolveNight', () => {
    it('eliminates werewolf target', async () => {
      const wolfPlayer = mockPlayers.find(p => p.role === ROLE_IDS.WEREWOLF);
      const doctorPlayer = mockPlayers.find(p => p.role === ROLE_IDS.DOCTOR);

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        nightActions: {
          werewolfVotes: { [wolfPlayer.id]: doctorPlayer.id },
        },
      };

      await nightActions.resolveNight(gameState, mockUpdateGame, mockPlayers, gameState.nightActions);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const playersArray = Object.values(updateCall.players);

      const deadVillager = playersArray.find(p => p.id === doctorPlayer.id);
      expect(deadVillager).toBeDefined();
      expect(deadVillager.isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('died');
    });

    it('saves target if doctor protects', async () => {
      const wolfPlayer = mockPlayers.find(p => p.role === ROLE_IDS.WEREWOLF);
      const villagerPlayer = mockPlayers.find(p => p.role === ROLE_IDS.VILLAGER);

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_DOCTOR,
        nightActions: {
          werewolfVotes: { [wolfPlayer.id]: villagerPlayer.id },
          doctorProtect: villagerPlayer.id,
        },
      };

      await nightActions.resolveNight(gameState, mockUpdateGame, mockPlayers, gameState.nightActions);

      const updateCall = mockUpdateGame.mock.calls[0][0];

      const playersArray = Object.values(updateCall.players);

      const target = playersArray.find(p => p.id === villagerPlayer.id);
      expect(target).toBeDefined();
      expect(target.isAlive).toBe(true);
      expect(updateCall.dayLog).toContain('No one died');
    });

    it('handles Sorcerer successfully finding Seer', async () => {
      const sorcererPlayer = { ...mockPlayers[0], role: ROLE_IDS.SORCERER, foundSeer: false };
      const seerPlayer = { ...mockPlayers[1], role: ROLE_IDS.SEER };
      const playersWithSorcererSeer = [sorcererPlayer, seerPlayer, ...mockPlayers.slice(2)];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_SORCERER,
        nightActions: {
          sorcererCheck: seerPlayer.id, // Sorcerer checks the Seer
        },
      };

      await nightActions.resolveNight(gameState, mockUpdateGame, playersWithSorcererSeer, gameState.nightActions);

      const updateCall = mockUpdateGame.mock.calls[0][0];
      const updatedSorcerer = updateCall.players.find(p => p.id === sorcererPlayer.id);
      expect(updatedSorcerer).toBeDefined();
      expect(updatedSorcerer.foundSeer).toBe(true);
    });

    it('handles Doppelganger transformation when target dies during night', async () => {
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLE_IDS.DOPPELGANGER }; // p1 is Doppelganger
      const targetPlayer = { ...mockPlayers[1], role: ROLE_IDS.SEER }; // p2 is Seer (the target)
      const werewolfPlayer = { ...mockPlayers[2], role: ROLE_IDS.WEREWOLF }; // p3 is Werewolf
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

      await nightActions.resolveNight(gameState, mockUpdateGame, playersWithDoppelgangerWerewolf, gameState.nightActions);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Object.values(updateCall.players);

      const updatedDoppelganger = updatedPlayers.find(p => p.id === doppelgangerPlayer.id);
      expect(updatedDoppelganger).toBeDefined();
      expect(updatedDoppelganger.role).toBe(ROLE_IDS.SEER); // Doppelganger becomes Seer
      expect(updatedPlayers.find(p => p.id === targetPlayer.id).isAlive).toBe(false); // Target is dead
      expect(updateCall.dayLog).toContain(`${targetPlayer.name} died.`);
    });

    it('eliminates vigilante target if not protected', async () => {
      const vigilantePlayer = { ...mockPlayers[0], role: ROLE_IDS.VIGILANTE }; // p1 is Vigilante
      const targetPlayer = { ...mockPlayers[1], role: ROLE_IDS.VILLAGER }; // p2 is target
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

      await nightActions.resolveNight(gameState, mockUpdateGame, playersWithVigilante, gameState.nightActions);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Object.values(updateCall.players);

      expect(updatedPlayers.find(p => p.id === targetPlayer.id).isAlive).toBe(false);
      expect(updateCall.dayLog).toContain(`${targetPlayer.name} died.`);
    });

    it('saves vigilante target if doctor protects', async () => {
      const vigilantePlayer = { ...mockPlayers[0], role: ROLE_IDS.VIGILANTE }; // p1 is Vigilante
      const targetPlayer = { ...mockPlayers[1], role: ROLE_IDS.VILLAGER }; // p2 is target
      const doctorPlayer = { ...mockPlayers[2], role: ROLE_IDS.DOCTOR }; // p3 is Doctor
      const werewolfPlayer = { ...mockPlayers[3], role: ROLE_IDS.WEREWOLF }; // p4 is Werewolf
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

      await nightActions.resolveNight(gameState, mockUpdateGame, playersWithVigilanteDoctor, gameState.nightActions);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Object.values(updateCall.players);

      expect(updatedPlayers.find(p => p.id === targetPlayer.id).isAlive).toBe(true); // Target should still be alive
      expect(updateCall.dayLog).toContain('No one died');
    });

    it('handles lover chain death', async () => {
      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_WEREWOLF,
        lovers: ['p1', 'p2'],
        nightActions: {
          werewolfVotes: { 'p3': 'p1' }, // Kill lover 1
        },
      };

      await nightActions.resolveNight(gameState, mockUpdateGame, mockPlayers, gameState.nightActions);

      const updateCall = mockUpdateGame.mock.calls[0][0];
      const playersArray = Object.values(updateCall.players);

      // Both lovers should be dead
      const lover1 = playersArray.find(p => p.id === 'p1');
      const lover2 = playersArray.find(p => p.id === 'p2');
      expect(lover1.isAlive).toBe(false);
      expect(lover2.isAlive).toBe(false);
      expect(updateCall.dayLog).toContain('died');
    });

    it('handles lover chain death when the second lover dies first', async () => {
      const werewolfPlayer = { ...mockPlayers[0], role: ROLE_IDS.WEREWOLF }; // p1 is Werewolf
      const lover1 = { ...mockPlayers[1], role: ROLE_IDS.VILLAGER, id: 'l1' };
      const lover2 = { ...mockPlayers[2], role: ROLE_IDS.VILLAGER, id: 'l2' };
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

      await nightActions.resolveNight(gameState, mockUpdateGame, playersWithLovers, gameState.nightActions);

      const updateCall = mockUpdateGame.mock.calls[0][0];
      const playersArray = Object.values(updateCall.players);

      // Both lovers should be dead
      const updatedLover1 = playersArray.find(p => p.id === lover1.id);
      const updatedLover2 = playersArray.find(p => p.id === lover2.id);
      expect(updatedLover1.isAlive).toBe(false);
      expect(updatedLover2.isAlive).toBe(false);  // Lover2 should be dead (direct kill)
      expect(updateCall.dayLog).toContain(`${lover1.name} died.`); // Only lover1's death should be logged
      expect(updateCall.dayLog).not.toContain(`${lover2.name} died.`);
    });

    it('sets lovers alignment to LOVERS_TEAM for Forbidden Love (Wolf + Villager)', async () => {
      const wolfPlayer = { ...mockPlayers[0], id: 'wolf1', role: ROLE_IDS.WEREWOLF, isAlive: true };
      const villagerPlayer = { ...mockPlayers[1], id: 'villager1', role: ROLE_IDS.VILLAGER, isAlive: true };
      const cupidPlayer = { ...mockPlayers[2], id: 'cupid1', role: ROLE_IDS.CUPID, isAlive: true };

      const players = [wolfPlayer, villagerPlayer, cupidPlayer];

      const gameState = {
        ...mockGameState,
        phase: PHASES.NIGHT_CUPID,
        lovers: [], // Lovers not yet set in gameState
        nightActions: {
          cupidLinks: [wolfPlayer.id, villagerPlayer.id],
        },
      };

      // Mock checkWinCondition to avoid game over
      vi.spyOn(winConditions, 'checkWinCondition').mockReturnValueOnce(null);

      await nightActions.resolveNight(gameState, mockUpdateGame, players, gameState.nightActions);

      const updateCall = mockUpdateGame.mock.calls[0][0];
      const updatedPlayers = Object.values(updateCall.players);

      const updatedWolfLover = updatedPlayers.find(p => p.id === wolfPlayer.id);
      const updatedVillagerLover = updatedPlayers.find(p => p.id === villagerPlayer.id);
      const updatedCupidPlayer = updatedPlayers.find(p => p.id === cupidPlayer.id);

      expect(updatedWolfLover.alignment).toBe(TEAMS.LOVERS);
      expect(updatedVillagerLover.alignment).toBe(TEAMS.LOVERS);
      expect(updatedCupidPlayer.alignment).not.toBe(TEAMS.LOVERS); // Cupid should not be affected
    });

    it('handles Hunter dying during the night', async () => {
      const werewolfPlayer = { ...mockPlayers[0], role: ROLE_IDS.WEREWOLF }; // p1 is Werewolf
      const hunterPlayer = { ...mockPlayers[1], role: ROLE_IDS.HUNTER }; // p2 is Hunter, dies
      const doctorPlayer = { ...mockPlayers[2], role: ROLE_IDS.DOCTOR }; // p3 is Doctor, not protecting hunter
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

      await nightActions.resolveNight(gameState, mockUpdateGame, playersWithHunterDying, gameState.nightActions);

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Object.values(updateCall.players);

      const updatedHunter = updatedPlayers.find(p => p.id === hunterPlayer.id);
      expect(updatedHunter.isAlive).toBe(false); // Hunter should be dead
      expect(updateCall.dayLog).toContain(`${hunterPlayer.name} died. The Hunter died and seeks revenge!`);
      expect(updateCall.phase).toBe(PHASES.HUNTER_ACTION);
    });

    it('handles tie in werewolf votes by randomly selecting a target', async () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const wolfPlayer1 = { id: 'w1', name: 'Wolf 1', role: ROLE_IDS.WEREWOLF, isAlive: true };
      const wolfPlayer2 = { id: 'w2', name: 'Wolf 2', role: ROLE_IDS.WEREWOLF, isAlive: true };
      const targetPlayer1 = { id: 't1', name: 'Target 1', role: ROLE_IDS.VILLAGER, isAlive: true };
      const targetPlayer2 = { id: 't2', name: 'Target 2', role: ROLE_IDS.VILLAGER, isAlive: true };
      const villager3 = { id: 'v3', name: 'Villager 3', role: ROLE_IDS.VILLAGER, isAlive: true };
      const villager4 = { id: 'v4', name: 'Villager 4', role: ROLE_IDS.VILLAGER, isAlive: true };
      const villager5 = { id: 'v5', name: 'Villager 5', role: ROLE_IDS.VILLAGER, isAlive: true };
      const villager6 = { id: 'v6', name: 'Villager 6', role: ROLE_IDS.VILLAGER, isAlive: true };

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

      const localNightActionsState = {
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

      await nightActions.resolveNight(mockGameState, mockUpdateGame, playersWithWolvesAndTargets, localNightActionsState);

      mockRandom.mockRestore(); // Restore Math.random()

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Object.values(updateCall.players);

      // With Math.random() mocked to 0, targetPlayer1 (t1) should be chosen and eliminated
      const eliminatedPlayer = updatedPlayers.find(p => p.id === targetPlayer1.id);
      const survivingPlayer = updatedPlayers.find(p => p.id === targetPlayer2.id);

      expect(eliminatedPlayer.isAlive).toBe(false);
      expect(survivingPlayer.isAlive).toBe(true);
      expect(updateCall.dayLog).toContain(`${targetPlayer1.name} died.`);
      expect(updateCall.phase).toBe(PHASES.DAY_REVEAL);
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

      await nightActions.handleHunterShot(gameState, mockUpdateGame, mockPlayers, 'p2');

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const playersArray = Object.values(updateCall.players);

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

      await nightActions.handleHunterShot(gameState, mockUpdateGame, mockPlayers, 'p1'); // Kill lover 1

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const playersArray = Object.values(updateCall.players);

      // Both lovers should be dead
      const lover1 = playersArray.find(p => p.id === 'p1');
      const lover2 = playersArray.find(p => p.id === 'p2');
      expect(lover1.isAlive).toBe(false);
      expect(lover2.isAlive).toBe(false);
    });

    it('handles Doppelganger transformation when target is shot by Hunter', async () => {
      const doppelgangerPlayer = { ...mockPlayers[0], role: ROLE_IDS.DOPPELGANGER }; // p1 is Doppelganger
      const targetPlayer = { ...mockPlayers[1], role: ROLE_IDS.SEER }; // p2 is Seer (the target)
      const hunterPlayer = { ...mockPlayers[2], role: ROLE_IDS.HUNTER }; // p3 is Hunter
      const werewolfPlayer = { ...mockPlayers[3], role: ROLE_IDS.WEREWOLF }; // p4 is Werewolf
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

      await nightActions.handleHunterShot(gameState, mockUpdateGame, playersWithDoppelgangerHunter, targetPlayer.id); // Hunter shoots p2

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Object.values(updateCall.players);

      const updatedDoppelganger = updatedPlayers.find(p => p.id === doppelgangerPlayer.id);
      expect(updatedDoppelganger).toBeDefined();
      expect(updatedDoppelganger.role).toBe(ROLE_IDS.SEER); // Doppelganger becomes Seer
      expect(updatedPlayers.find(p => p.id === targetPlayer.id).isAlive).toBe(false);
      expect(updateCall.dayLog).toContain(`Hunter shot ${targetPlayer.name}`);
    });

    it('prevents Hunter from killing a player protected by the Doctor', async () => {
      const hunterPlayer = { ...mockPlayers[0], role: ROLE_IDS.HUNTER }; // p1 is Hunter
      const victimPlayer = { ...mockPlayers[1], role: ROLE_IDS.VILLAGER }; // p2 is victim
      const doctorPlayer = { ...mockPlayers[2], role: ROLE_IDS.DOCTOR }; // p3 is Doctor
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

      await nightActions.handleHunterShot(gameState, mockUpdateGame, playersWithHunterDoctor, victimPlayer.id); // Hunter shoots p2

      expect(mockUpdateGame).toHaveBeenCalled();
      const updateCall = mockUpdateGame.mock.calls[0][0];

      const updatedPlayers = Object.values(updateCall.players);

      const updatedVictim = updatedPlayers.find(p => p.id === victimPlayer.id);
      expect(updatedVictim).toBeDefined();
      expect(updatedVictim.isAlive).toBe(true); // Victim should still be alive
      expect(updateCall.dayLog).toContain(`The Hunter tried to shoot ${victimPlayer.name}, but they were protected!`);
      expect(updateCall.phase).toBe(PHASES.NIGHT_INTRO); // Should transition to night intro
    });
  });
});
