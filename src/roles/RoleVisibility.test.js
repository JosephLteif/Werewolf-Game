import { describe, it, expect } from 'vitest';
import { Werewolf } from './implementations/Werewolf.js';
import { Twins } from './implementations/Twins.js';
import { Fanatic } from './implementations/Fanatic.js';
import { Role } from './Role.js';

describe('Role Visibility', () => {
  const p1 = { id: 'p1', role: 'werewolf' };
  const p2 = { id: 'p2', role: 'werewolf' };
  const p3 = { id: 'p3', role: 'villager' };
  const p4 = { id: 'p4', role: 'twin' };
  const p5 = { id: 'p5', role: 'twin' };
  const p6 = { id: 'p6', role: 'fanatic' };

  const allPlayers = [p1, p2, p3, p4, p5, p6];

  it('Werewolf should see other Werewolves', () => {
    const role = new Werewolf();
    const visible = role.getVisibleTeammates(p1, allPlayers);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('p2');
  });

  it('Twin should see other Twins', () => {
    const role = new Twins();
    const visible = role.getVisibleTeammates(p4, allPlayers);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('p5');
  });

  it('Fanatic should see Werewolves', () => {
    const role = new Fanatic();
    const visible = role.getVisibleTeammates(p6, allPlayers);
    expect(visible).toHaveLength(2);
    expect(visible.map((p) => p.id)).toEqual(expect.arrayContaining(['p1', 'p2']));
  });

  it('Base Role should see no one', () => {
    const role = new Role();
    const visible = role.getVisibleTeammates(p3, allPlayers);
    expect(visible).toHaveLength(0);
  });
});
