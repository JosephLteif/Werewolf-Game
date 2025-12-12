import { describe, it, expect, vi } from 'vitest';
import { Werewolf } from './implementations/Werewolf';
import { Cursed } from './implementations/Cursed';
import { ROLE_IDS } from '../constants/roleIds';
import { Teams } from '../models/Team';
import { ALIGNMENTS } from '../constants/alignments';

describe('Cursed Role Integration', () => {
  it('should be converted to a Werewolf when targeted by werewolves', () => {
    const werewolf = new Werewolf();
    const cursed = new Cursed();

    const players = [
      { id: 'player1', name: 'Player 1', role: ROLE_IDS.WEREWOLF, isAlive: true },
      { id: 'player2', name: 'Player 2', role: ROLE_IDS.CURSED, isAlive: true, team: Teams.VILLAGER, alignment: ALIGNMENTS.GOOD },
      { id: 'player3', name: 'Player 3', role: ROLE_IDS.VILLAGER, isAlive: true },
    ];

    const nightActions = {
      werewolfVotes: { player1: 'player2' },
      doctorProtect: null,
    };
    const deaths = [];
    const addLog = vi.fn();

    const context = {
      players,
      nightActions,
      deaths,
      addLog,
    };

    werewolf.applyNightOutcome(context);

    const cursedPlayer = players.find(p => p.id === 'player2');

    expect(deaths.length).toBe(0);
    expect(cursedPlayer.role).toBe(ROLE_IDS.WEREWOLF);
    expect(cursedPlayer.team).toBe(Teams.WEREWOLF);
    expect(cursedPlayer.alignment).toBe(ALIGNMENTS.EVIL);
    expect(addLog).toHaveBeenCalledWith('Player 2 was attacked by the werewolves, but survived! They have been turned into a werewolf.');
  });

  it('should not be converted if protected by the Doctor', () => {
    const werewolf = new Werewolf();
    const cursed = new Cursed();

    const players = [
      { id: 'player1', name: 'Player 1', role: ROLE_IDS.WEREWOLF, isAlive: true },
      { id: 'player2', name: 'Player 2', role: ROLE_IDS.CURSED, isAlive: true, team: Teams.VILLAGER, alignment: ALIGNMENTS.GOOD },
      { id: 'player3', name: 'Player 3', role: ROLE_IDS.VILLAGER, isAlive: true },
    ];

    const nightActions = {
      werewolfVotes: { player1: 'player2' },
      doctorProtect: 'player2',
    };
    const deaths = [];
    const addLog = vi.fn();

    const context = {
      players,
      nightActions,
      deaths,
      addLog,
    };

    werewolf.applyNightOutcome(context);

    const cursedPlayer = players.find(p => p.id === 'player2');

    expect(deaths.length).toBe(0);
    expect(cursedPlayer.role).toBe(ROLE_IDS.CURSED);
    expect(cursedPlayer.team).toBe(Teams.VILLAGER);
    expect(cursedPlayer.alignment).toBe(ALIGNMENTS.GOOD);
    expect(addLog).not.toHaveBeenCalled();
  });
});
