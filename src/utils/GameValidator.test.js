import { describe, it, expect } from 'vitest';
import { GameValidator } from './GameValidator.js';

describe('GameValidator', () => {
    it('should be invalid if fewer than 4 players', () => {
        const players = [{}, {}, {}];
        const settings = { wolfCount: 1, specialRoles: {} };
        const result = GameValidator.validate(players, settings);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Game requires at least 4 players to start.');
    });

    it('should be invalid if no wolves', () => {
        const players = [{}, {}, {}, {}];
        const settings = { wolfCount: 0, specialRoles: {} };
        const result = GameValidator.validate(players, settings);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('There must be at least 1 Werewolf.');
    });

    it('should be invalid if not enough players for roles', () => {
        const players = [{}, {}, {}, {}]; // 4 players
        const settings = {
            wolfCount: 2,
            specialRoles: { mason: true, seer: true }
        };
        // Slots: 2 wolves + 2 masons + 1 seer = 5 slots
        const result = GameValidator.validate(players, settings);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Not enough players for selected roles');
    });

    it('should count mason as 2 slots', () => {
        const players = [{}, {}, {}, {}, {}]; // 5 players
        const settings = { wolfCount: 1, specialRoles: { mason: true } };
        // Slots: 1 wolf + 2 masons = 3 slots. 5 players available. Valid.
        const result = GameValidator.validate(players, settings);
        expect(result.isValid).toBe(true);
    });

    it('should be valid with sufficient players', () => {
        const players = [{}, {}, {}, {}, {}];
        const settings = { wolfCount: 1, specialRoles: { seer: true } };
        const result = GameValidator.validate(players, settings);
        expect(result.isValid).toBe(true);
    });
});
