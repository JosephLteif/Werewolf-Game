import { describe, it, expect } from 'vitest';
import {
  getAlivePlayers,
  findPlayerById,
  getPlayersByRole,
  getPlayersByAlignment,
} from './playersUtils';
import { ROLE_IDS } from '../constants/roleIds';

// Mock player data
const mockPlayers = [
  { id: 'p1', name: 'Alice', isAlive: true, role: ROLE_IDS.SEER, alignment: 'GOOD' },
  { id: 'p2', name: 'Bob', isAlive: false, role: ROLE_IDS.WEREWOLF, alignment: 'EVIL' },
  { id: 'p3', name: 'Charlie', isAlive: true, role: ROLE_IDS.WEREWOLF, alignment: 'EVIL' },
  { id: 'p4', name: 'Dana', isAlive: true, role: ROLE_IDS.VILLAGER, alignment: 'GOOD' },
  { id: 'p5', name: 'Eve', isAlive: false, role: ROLE_IDS.VILLAGER, alignment: 'GOOD' },
];

describe('playersUtils', () => {
  describe('getAlivePlayers', () => {
    it('should return only alive players', () => {
      const alive = getAlivePlayers(mockPlayers);
      expect(alive).toHaveLength(3);
      expect(alive.map((p) => p.id)).toEqual(['p1', 'p3', 'p4']);
    });
  });

  describe('findPlayerById', () => {
    it('should find a player by id when present', () => {
      const player = findPlayerById(mockPlayers, 'p3');
      expect(player).toBeDefined();
      expect(player?.name).toBe('Charlie');
    });

    it('should return undefined when player does not exist', () => {
      const player = findPlayerById(mockPlayers, 'nonexistent');
      expect(player).toBeUndefined();
    });
  });

  describe('getPlayersByRole', () => {
    it('should return alive players with the specified role', () => {
      const werewolves = getPlayersByRole(mockPlayers, ROLE_IDS.WEREWOLF);
      // Only p3 is alive and a werewolf
      expect(werewolves).toHaveLength(1);
      expect(werewolves[0].id).toBe('p3');
    });

    it('should return an empty array when no alive players match the role', () => {
      const doctorPlayers = getPlayersByRole(mockPlayers, ROLE_IDS.DOCTOR);
      expect(doctorPlayers).toHaveLength(0);
    });
  });

  describe('getPlayersByAlignment', () => {
    it('should return alive players with the specified alignment', () => {
      const goodPlayers = getPlayersByAlignment(mockPlayers, 'GOOD');
      // p1 and p4 are alive and GOOD
      expect(goodPlayers).toHaveLength(2);
      expect(goodPlayers.map((p) => p.id).sort()).toEqual(['p1', 'p4']);
    });

    it('should return an empty array when no alive players match the alignment', () => {
      const neutralPlayers = getPlayersByAlignment(mockPlayers, 'NEUTRAL');
      expect(neutralPlayers).toHaveLength(0);
    });
  });
});
