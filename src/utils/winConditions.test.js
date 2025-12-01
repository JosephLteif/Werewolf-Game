import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkWinCondition, isPlayerWinner } from './winConditions';
import { TEAMS, CUPID_FATES } from '../constants';
import { ROLE_IDS } from '../constants/roleIds';
import { ALIGNMENTS } from '../constants/alignments';
import { roleRegistry } from '../roles/RoleRegistry'; // Import the real roleRegistry

// Mock the roleRegistry at the top level, making getRole a mock function
vi.mock('../roles/RoleRegistry', () => ({
  roleRegistry: {
    getRole: vi.fn(), // Make getRole a mock function
    // Add other methods if needed by winConditions.js, though currently only getRole is used
  },
}));

describe('Win Conditions Service', () => {
  let mockPlayers;
  let mockGameSettings;

  beforeEach(() => {
    // Clear mock calls and reset implementation before each test
    vi.clearAllMocks();
    // Set the default mock implementation for getRole for all tests in this file
    vi.mocked(roleRegistry.getRole).mockImplementation((roleId) => {
      switch (roleId) {
        case ROLE_IDS.SEER:
          return { id: ROLE_IDS.SEER, team: { id: TEAMS.VILLAGE }, alignment: ALIGNMENTS.GOOD }; // Corrected team structure
        case ROLE_IDS.DOCTOR:
          return { id: ROLE_IDS.DOCTOR, team: { id: TEAMS.VILLAGE }, alignment: ALIGNMENTS.GOOD }; // Corrected team structure
        case ROLE_IDS.WEREWOLF:
          return {
            id: ROLE_IDS.WEREWOLF,
            team: { id: TEAMS.WEREWOLF },
            alignment: ALIGNMENTS.EVIL,
          }; // Corrected team structure
        case ROLE_IDS.VILLAGER:
          return { id: ROLE_IDS.VILLAGER, team: { id: TEAMS.VILLAGE }, alignment: ALIGNMENTS.GOOD }; // Corrected team structure
        case ROLE_IDS.CUPID:
          return { id: ROLE_IDS.CUPID, team: { id: TEAMS.VILLAGE }, alignment: ALIGNMENTS.NEUTRAL }; // Corrected team structure
        case ROLE_IDS.SORCERER: // Added Sorcerer to mock
          return {
            id: ROLE_IDS.SORCERER,
            team: { id: TEAMS.WEREWOLF },
            alignment: ALIGNMENTS.EVIL,
          }; // Corrected team structure
        default:
          return null;
      }
    });

    mockPlayers = [
      { id: 'p1', name: 'Player 1', isAlive: true, role: ROLE_IDS.SEER },
      { id: 'p2', name: 'Player 2', isAlive: true, role: ROLE_IDS.DOCTOR },
      { id: 'p3', name: 'Player 3', isAlive: true, role: ROLE_IDS.WEREWOLF },
      { id: 'p4', name: 'Player 4', isAlive: true, role: ROLE_IDS.VILLAGER },
      { id: 'p5', name: 'Player 5', isAlive: true, role: ROLE_IDS.VILLAGER },
      { id: 'p6', name: 'Player 6', isAlive: true, role: ROLE_IDS.CUPID },
    ];
    mockGameSettings = {
      cupidFateOption: CUPID_FATES.SELFLESS,
    };
  });

  describe('checkWinCondition', () => {
    it('villagers win when all werewolves dead', () => {
      const playersAfterWolfDeath = [
        { ...mockPlayers[0], isAlive: true },
        { ...mockPlayers[1], isAlive: true },
        { ...mockPlayers[2], isAlive: false, role: ROLE_IDS.WEREWOLF }, // Werewolf dead
        { ...mockPlayers[3], isAlive: true },
        { ...mockPlayers[4], isAlive: true },
      ];

      const result = checkWinCondition(playersAfterWolfDeath, [], [], mockGameSettings);
      expect(result).toEqual({
        winner: 'VILLAGERS',
        winners: ['VILLAGERS'],
        isGameOver: true,
      });
    });

    it('werewolves win when wolves >= good players', () => {
      const playersAfterManyDeaths = [
        { id: 'p3', name: 'Player 3', isAlive: true, role: ROLE_IDS.WEREWOLF }, // Werewolf
        { id: 'p4', name: 'Player 4', isAlive: true, role: ROLE_IDS.VILLAGER }, // Villager
        { id: 'p1', name: 'Player 1', isAlive: false, role: ROLE_IDS.SEER },
        { id: 'p2', name: 'Player 2', isAlive: false, role: ROLE_IDS.DOCTOR },
        { id: 'p5', name: 'Player 5', isAlive: false, role: ROLE_IDS.VILLAGER },
      ];

      const result = checkWinCondition(playersAfterManyDeaths, [], [], mockGameSettings);
      expect(result).toEqual({
        winner: 'WEREWOLVES',
        winners: ['WEREWOLVES'],
        isGameOver: true,
      });
    });

    it('adds new winners to existing winners array', () => {
      const playersAfterWolfDeath = [
        { ...mockPlayers[0], isAlive: true },
        { ...mockPlayers[1], isAlive: true },
        { ...mockPlayers[2], isAlive: false, role: ROLE_IDS.WEREWOLF }, // Werewolf dead
        { ...mockPlayers[3], isAlive: true },
        { ...mockPlayers[4], isAlive: true },
      ];

      const result = checkWinCondition(playersAfterWolfDeath, [], []);
      expect(result).toEqual({
        winner: 'VILLAGERS',
        winners: ['VILLAGERS'],
        isGameOver: true,
      });
    });
  });

  describe('isPlayerWinner', () => {
    it('returns true for Cupid if CUPID wins', () => {
      const player = { id: 'p5', role: ROLE_IDS.CUPID };
      const winners = ['CUPID'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns true for a lover if LOVERS win', () => {
      const player = { id: 'p1', role: ROLE_IDS.VILLAGER };
      const winners = ['LOVERS'];
      const lovers = ['p1', 'p2'];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns false for a non-lover if LOVERS win', () => {
      const player = { id: 'p3', role: ROLE_IDS.VILLAGER };
      const winners = ['LOVERS'];
      const lovers = ['p1', 'p2'];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });

    it('returns true for a good player if VILLAGERS win', () => {
      const player = { id: 'p1', role: ROLE_IDS.SEER };
      const winners = ['VILLAGERS'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns false for an evil player if VILLAGERS win', () => {
      const player = { id: 'p3', role: ROLE_IDS.WEREWOLF };
      const winners = ['VILLAGERS'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });

    it('returns true for a werewolf if WEREWOLVES win', () => {
      const player = { id: 'p3', role: ROLE_IDS.WEREWOLF };
      const winners = ['WEREWOLVES'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns true for a sorcerer who found the seer if WEREWOLVES win', () => {
      const player = { id: 'p1', role: ROLE_IDS.SORCERER, foundSeer: true };
      const winners = ['WEREWOLVES'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns false for a sorcerer who did not find the seer if WEREWOLVES win', () => {
      const player = { id: 'p1', role: ROLE_IDS.SORCERER, foundSeer: false };
      const winners = ['WEREWOLVES'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });

    it('returns false if player role does not match winner type', () => {
      const player = { id: 'p1', role: ROLE_IDS.SEER };
      const winners = ['WEREWOLVES'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });
  });
});
