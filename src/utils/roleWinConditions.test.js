import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isPlayerWinner } from './winConditions';
import { TEAMS, CUPID_FATES } from '../constants';
import { ROLE_IDS } from '../constants/roleIds';
import { roleRegistry } from '../roles/RoleRegistry';
import { Fanatic } from '../roles/implementations/Fanatic';
import { Sorcerer } from '../roles/implementations/Sorcerer';

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
          return new Sorcerer();
        case ROLE_IDS.FANATIC:
          return new Fanatic();
        default:
          return null;
      }
    });
  });

  it('Fanatic wins with Werewolves', () => {
    const player = { id: 'p1', role: ROLE_IDS.FANATIC };
    const winners = [TEAMS.WEREWOLF];
    expect(isPlayerWinner(player, winners, [], mockGameSettings)).toBe(true);
  });

  it('Sorcerer wins with Werewolves if Seer is found', () => {
    const player = { id: 'p2', role: ROLE_IDS.SORCERER, foundSeer: true };
    const winners = [TEAMS.WEREWOLF];
    expect(isPlayerWinner(player, winners, [], mockGameSettings)).toBe(true);
  });

  it('Sorcerer does not win with Werewolves if Seer is not found', () => {
    const player = { id: 'p2', role: ROLE_IDS.SORCERER, foundSeer: false };
    const winners = [TEAMS.WEREWOLF];
    expect(isPlayerWinner(player, winners, [], mockGameSettings)).toBe(false);
  });
});
