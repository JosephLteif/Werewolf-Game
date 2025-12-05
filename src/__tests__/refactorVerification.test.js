import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role } from '../roles/Role';
import { Lycan } from '../roles/implementations/Lycan';
import { Seer } from '../roles/implementations/Seer';
import { Teams } from '../models/Team';
import { ROLE_IDS } from '../constants/roleIds';
import { ALIGNMENTS } from '../constants/alignments';
import { roleRegistry } from '../roles/RoleRegistry';
import { checkWinCondition } from '../utils/winConditions';

describe('Refactor Verification', () => {
    describe('Role Appearance Logic', () => {
        let lycan;
        let seer;
        let villagerRole;

        beforeEach(() => {
            lycan = new Lycan();
            seer = new Seer();
            villagerRole = new Role(); // Generic role
            villagerRole.id = 'villager';
        });

        it('Lycan should appear as Werewolf to Seer', () => {
            expect(lycan.getSeenRole(seer)).toBe(ROLE_IDS.WEREWOLF);
            expect(lycan.getSeenAlignment(seer)).toBe(ALIGNMENTS.EVIL);
        });

        it('Lycan should appear as Lycan to non-Seer', () => {
            expect(lycan.getSeenRole(villagerRole)).toBe('lycan');
            expect(lycan.getSeenAlignment(villagerRole)).toBe(ALIGNMENTS.GOOD);
        });

        it('Seer investigate should return seen role and alignment', () => {
            // Mock roleRegistry to return Lycan for a player
            vi.spyOn(roleRegistry, 'getRole').mockImplementation((roleId) => {
                if (roleId === 'lycan') return lycan;
                return null;
            });

            const targetPlayer = { id: 'p1', role: 'lycan' };
            // Pass roleRegistry to investigate
            const result = seer.investigate(targetPlayer, roleRegistry);

            expect(result).toEqual({
                role: ROLE_IDS.WEREWOLF,
                alignment: ALIGNMENTS.EVIL,
            });
        });
    });

    describe('Polymorphic Win Conditions', () => {
        let context;

        beforeEach(() => {
            context = {
                alivePlayers: [],
                currentWinners: [],
                roleRegistry: roleRegistry,
            };

            // Mock roleRegistry to return basic roles
            vi.spyOn(roleRegistry, 'getRole').mockImplementation((roleId) => {
                if (roleId === 'werewolf') return { team: Teams.WEREWOLF, alignment: ALIGNMENTS.EVIL };
                if (roleId === 'villager') return { team: Teams.VILLAGER, alignment: ALIGNMENTS.GOOD };
                if (roleId === 'lycan') return { team: Teams.VILLAGER, alignment: ALIGNMENTS.GOOD }; // Lycan is good team
                return { team: Teams.VILLAGER, alignment: ALIGNMENTS.GOOD };
            });
        });

        it('Villagers should win when 0 werewolves', () => {
            context.alivePlayers = [
                { id: 'p1', role: 'villager', isAlive: true },
                { id: 'p2', role: 'lycan', isAlive: true },
            ];

            const result = Teams.VILLAGER.checkWin(context);
            expect(result).toBe(true);
        });

        it('Villagers should NOT win when werewolves exist', () => {
            context.alivePlayers = [
                { id: 'p1', role: 'villager', isAlive: true },
                { id: 'p3', role: 'werewolf', isAlive: true },
            ];

            const result = Teams.VILLAGER.checkWin(context);
            expect(result).toBe(false);
        });

        it('Werewolves should win when >= good players', () => {
            context.alivePlayers = [
                { id: 'p3', role: 'werewolf', isAlive: true }, // 1 wolf
                { id: 'p1', role: 'villager', isAlive: true }, // 1 good
            ];

            const result = Teams.WEREWOLF.checkWin(context);
            expect(result).toBe(true);
        });

        it('Werewolves should NOT win when < good players', () => {
            context.alivePlayers = [
                { id: 'p3', role: 'werewolf', isAlive: true }, // 1 wolf
                { id: 'p1', role: 'villager', isAlive: true }, // 1 good
                { id: 'p2', role: 'villager', isAlive: true }, // 2 good
            ];

            const result = Teams.WEREWOLF.checkWin(context);
            expect(result).toBe(false);
        });
    });
});
