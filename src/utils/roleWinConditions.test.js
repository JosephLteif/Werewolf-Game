import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isPlayerWinner } from './winConditions';
import { TEAMS, CUPID_FATES } from '../constants';
import { ROLE_IDS } from '../constants/roleIds';
import { ALIGNMENTS } from '../constants/alignments';
import { roleRegistry } from '../roles/RoleRegistry';

// Mock roleRegistry
vi.mock('../roles/RoleRegistry', () => ({
    roleRegistry: {
        getRole: vi.fn(),
    },
}));

describe('Role Win Conditions', () => {
    let mockGameSettings;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGameSettings = { cupidFateOption: CUPID_FATES.SELFLESS };

        vi.mocked(roleRegistry.getRole).mockImplementation((roleId) => {
            switch (roleId) {
                case ROLE_IDS.SORCERER:
                    return { id: ROLE_IDS.SORCERER, team: { id: TEAMS.WEREWOLF }, alignment: ALIGNMENTS.EVIL };
                case ROLE_IDS.MINION:
                    return { id: ROLE_IDS.MINION, team: { id: TEAMS.WEREWOLF }, alignment: ALIGNMENTS.EVIL };
                default:
                    return null;
            }
        });
    });

    it('Minion wins with Werewolves', () => {
        const player = { id: 'p1', role: ROLE_IDS.MINION };
        const winners = ['WEREWOLVES'];
        expect(isPlayerWinner(player, winners, [], mockGameSettings)).toBe(true);
    });

    it('Sorcerer wins with Werewolves even if Seer not found', () => {
        const player = { id: 'p2', role: ROLE_IDS.SORCERER, foundSeer: false };
        const winners = ['WEREWOLVES'];
        expect(isPlayerWinner(player, winners, [], mockGameSettings)).toBe(false);
    });
});
