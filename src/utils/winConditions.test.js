import { describe, it, expect, beforeEach } from 'vitest';
import { checkWinCondition, isPlayerWinner } from './winConditions';
import { TEAMS, CUPID_FATES } from '../constants';

describe('Win Conditions Service', () => {
  let mockPlayers;
  let mockGameSettings;

  beforeEach(() => {
    mockPlayers = [
      { id: 'p1', name: 'Player 1', isAlive: true, role: 'seer' },
      { id: 'p2', name: 'Player 2', isAlive: true, role: 'doctor' },
      { id: 'p3', name: 'Player 3', isAlive: true, role: 'werewolf' },
      { id: 'p4', name: 'Player 4', isAlive: true, role: 'villager' },
      { id: 'p5', name: 'Player 5', isAlive: true, role: 'villager' },
      { id: 'p6', name: 'Player 6', isAlive: true, role: 'cupid' },
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
        { ...mockPlayers[2], isAlive: false, role: 'werewolf' }, // Werewolf dead
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
        { id: 'p3', name: 'Player 3', isAlive: true, role: 'werewolf' }, // Werewolf
        { id: 'p4', name: 'Player 4', isAlive: true, role: 'villager' }, // Villager
        { id: 'p1', name: 'Player 1', isAlive: false, role: 'seer' },
        { id: 'p2', name: 'Player 2', isAlive: false, role: 'doctor' },
        { id: 'p5', name: 'Player 5', isAlive: false, role: 'villager' },
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
        { ...mockPlayers[2], isAlive: false, role: 'werewolf' }, // Werewolf dead
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
      const player = { id: 'p5', role: 'cupid' };
      const winners = ['CUPID'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns true for a lover if LOVERS win', () => {
      const player = { id: 'p1', role: 'villager' };
      const winners = ['LOVERS'];
      const lovers = ['p1', 'p2'];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns false for a non-lover if LOVERS win', () => {
      const player = { id: 'p3', role: 'villager' };
      const winners = ['LOVERS'];
      const lovers = ['p1', 'p2'];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });

    it('returns true for a good player if VILLAGERS win', () => {
      const player = { id: 'p1', role: 'seer' };
      const winners = ['VILLAGERS'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns false for an evil player if VILLAGERS win', () => {
      const player = { id: 'p3', role: 'werewolf' };
      const winners = ['VILLAGERS'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });

    it('returns true for a werewolf if WEREWOLVES win', () => {
      const player = { id: 'p3', role: 'werewolf' };
      const winners = ['WEREWOLVES'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns true for a sorcerer who found the seer if WEREWOLVES win', () => {
      const player = { id: 'p1', role: 'sorcerer', foundSeer: true };
      const winners = ['WEREWOLVES'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns false for a sorcerer who did not find the seer if WEREWOLVES win', () => {
      const player = { id: 'p1', role: 'sorcerer', foundSeer: false };
      const winners = ['WEREWOLVES'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });

    it('returns false for a forbidden lover if VILLAGERS win', () => {
      const player = { id: 'p1', role: 'villager', alignment: TEAMS.LOVERS };
      const winners = ['VILLAGERS'];
      const lovers = ['p1', 'p2'];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });

    it('returns false if player role does not match winner type', () => {
      const player = { id: 'p1', role: 'seer' };
      const winners = ['WEREWOLVES'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });
  });
});
