import { describe, it, expect, beforeEach } from 'vitest';
import { checkWinCondition, isPlayerWinner } from './winConditions';
import { ROLES, TEAMS, CUPID_FATES } from '../constants';

describe('Win Conditions Service', () => {
  let mockPlayers;
  let mockGameSettings;

  beforeEach(() => {
    mockPlayers = [
      { id: 'p1', name: 'Player 1', isAlive: true, role: ROLES.SEER.id, alignment: TEAMS.VILLAGE },
      { id: 'p2', name: 'Player 2', isAlive: true, role: ROLES.DOCTOR.id, alignment: TEAMS.VILLAGE },
      { id: 'p3', name: 'Player 3', isAlive: true, role: ROLES.WEREWOLF.id, alignment: TEAMS.WEREWOLF },
      { id: 'p4', name: 'Player 4', isAlive: true, role: ROLES.VILLAGER.id, alignment: TEAMS.VILLAGE },
      { id: 'p5', name: 'Player 5', isAlive: true, role: ROLES.VILLAGER.id, alignment: TEAMS.VILLAGE },
      { id: 'p6', name: 'Player 6', isAlive: true, role: ROLES.CUPID.id, alignment: 'neutral' }, // Cupid's alignment is 'neutral'
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
        { ...mockPlayers[2], isAlive: false, role: ROLES.WEREWOLF.id }, // Werewolf dead
        { ...mockPlayers[3], isAlive: true },
        { ...mockPlayers[4], isAlive: true },
      ];

      const result = checkWinCondition(playersAfterWolfDeath, [], [], mockGameSettings);
      expect(result).toEqual({
        winner: 'VILLAGERS',
        winners: ['VILLAGERS'],
        isGameOver: true
      });
    });

    it('werewolves win when wolves >= good players', () => {
      const playersAfterManyDeaths = [
        { id: 'p3', name: 'Player 3', isAlive: true, role: ROLES.WEREWOLF.id }, // Werewolf
        { id: 'p4', name: 'Player 4', isAlive: true, role: ROLES.VILLAGER.id }, // Villager
        { id: 'p1', name: 'Player 1', isAlive: false, role: ROLES.SEER.id },
        { id: 'p2', name: 'Player 2', isAlive: false, role: ROLES.DOCTOR.id },
        { id: 'p5', name: 'Player 5', isAlive: false, role: ROLES.VILLAGER.id },
      ];

      const result = checkWinCondition(playersAfterManyDeaths, [], [], mockGameSettings);
      expect(result).toEqual({
        winner: 'WEREWOLVES',
        winners: ['WEREWOLVES'],
        isGameOver: true
      });
    });

    it('adds new winners to existing winners array', () => {
      const playersAfterWolfDeath = [
        { ...mockPlayers[0], isAlive: true },
        { ...mockPlayers[1], isAlive: true },
        { ...mockPlayers[2], isAlive: false, role: ROLES.WEREWOLF.id }, // Werewolf dead
        { ...mockPlayers[3], isAlive: true },
        { ...mockPlayers[4], isAlive: true },
      ];


      const result = checkWinCondition(playersAfterWolfDeath, [], []);
      expect(result).toEqual({
        winner: 'VILLAGERS',
        winners: ['VILLAGERS'],
        isGameOver: true
      });
    });

  });

  describe('isPlayerWinner', () => {
    it('returns true for Cupid if CUPID wins', () => {
      const player = { id: 'p5', role: ROLES.CUPID.id };
      const winners = ['CUPID'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns true for a lover if LOVERS win', () => {
      const player = { id: 'p1', role: ROLES.VILLAGER.id };
      const winners = ['LOVERS'];
      const lovers = ['p1', 'p2'];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns false for a non-lover if LOVERS win', () => {
      const player = { id: 'p3', role: ROLES.VILLAGER.id };
      const winners = ['LOVERS'];
      const lovers = ['p1', 'p2'];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });

    it('returns true for a good player if VILLAGERS win', () => {
      const player = { id: 'p1', role: ROLES.SEER.id, alignment: TEAMS.VILLAGE };
      const winners = ['VILLAGERS'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns false for an evil player if VILLAGERS win', () => {
      const player = { id: 'p3', role: ROLES.WEREWOLF.id, alignment: TEAMS.WEREWOLF };
      const winners = ['VILLAGERS'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });

    it('returns true for a werewolf if WEREWOLVES win', () => {
      const player = { id: 'p3', role: ROLES.WEREWOLF.id, alignment: TEAMS.WEREWOLF };
      const winners = ['WEREWOLVES'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns true for a sorcerer who found the seer if WEREWOLVES win', () => {
      const player = { id: 'p1', role: ROLES.SORCERER.id, foundSeer: true };
      const winners = ['WEREWOLVES'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(true);
    });

    it('returns false for a sorcerer who did not find the seer if WEREWOLVES win', () => {
      const player = { id: 'p1', role: ROLES.SORCERER.id, foundSeer: false };
      const winners = ['WEREWOLVES'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });





    it('returns false if player role does not match winner type', () => {
      const player = { id: 'p1', role: ROLES.SEER.id };
      const winners = ['WEREWOLVES'];
      const lovers = [];
      expect(isPlayerWinner(player, winners, lovers, mockGameSettings)).toBe(false);
    });
  });
});
