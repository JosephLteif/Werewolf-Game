import { describe, it, expect } from 'vitest';
import { Werewolf } from './implementations/Werewolf.js';
import { Mason } from './implementations/Mason.js';
import { Minion } from './implementations/Minion.js';
import { Role } from './Role.js';

describe('Role Visibility', () => {
    const p1 = { id: 'p1', role: 'werewolf' };
    const p2 = { id: 'p2', role: 'werewolf' };
    const p3 = { id: 'p3', role: 'villager' };
    const p4 = { id: 'p4', role: 'mason' };
    const p5 = { id: 'p5', role: 'mason' };
    const p6 = { id: 'p6', role: 'minion' };

    const allPlayers = [p1, p2, p3, p4, p5, p6];

    it('Werewolf should see other Werewolves', () => {
        const role = new Werewolf();
        const visible = role.getVisibleTeammates(p1, allPlayers);
        expect(visible).toHaveLength(1);
        expect(visible[0].id).toBe('p2');
    });

    it('Mason should see other Masons', () => {
        const role = new Mason();
        const visible = role.getVisibleTeammates(p4, allPlayers);
        expect(visible).toHaveLength(1);
        expect(visible[0].id).toBe('p5');
    });

    it('Minion should see Werewolves', () => {
        const role = new Minion();
        const visible = role.getVisibleTeammates(p6, allPlayers);
        expect(visible).toHaveLength(2);
        expect(visible.map(p => p.id)).toEqual(expect.arrayContaining(['p1', 'p2']));
    });

    it('Base Role should see no one', () => {
        const role = new Role();
        const visible = role.getVisibleTeammates(p3, allPlayers);
        expect(visible).toHaveLength(0);
    });
});
