import { vi } from 'vitest';
import { ROLE_IDS } from '../../constants/roleIds';

// Define mock role objects
const mockVillagerRole = {
  id: ROLE_IDS.VILLAGER,
  name: 'Villager',
  description: 'A simple villager.',
  team: 'villagers',
  alignment: 'good',
  icon: vi.fn(() => null),
};

const mockWerewolfRole = {
  id: ROLE_IDS.WEREWOLF,
  name: 'Werewolf',
  description: 'A hungry wolf.',
  team: 'werewolves',
  alignment: 'evil',
  icon: vi.fn(() => null),
};

const mockDoctorRole = {
  id: ROLE_IDS.DOCTOR,
  name: 'Doctor',
  description: 'Heals people.',
  team: 'villagers',
  alignment: 'good',
  icon: vi.fn(() => null),
};

const mockMasonRole = {
  id: ROLE_IDS.MASON,
  name: 'Mason',
  description: 'A builder.',
  team: 'villagers',
  alignment: 'good',
  icon: vi.fn(() => null),
};

const mockRoleRegistry = {
  getAllRoles: vi.fn(() => [mockVillagerRole, mockWerewolfRole, mockDoctorRole, mockMasonRole]),
  getRole: vi.fn((roleId) => {
    switch (roleId) {
      case ROLE_IDS.VILLAGER:
        return mockVillagerRole;
      case ROLE_IDS.WEREWOLF:
        return mockWerewolfRole;
      case ROLE_IDS.DOCTOR:
        return mockDoctorRole;
      case ROLE_IDS.MASON:
        return mockMasonRole;
      default:
        return undefined;
    }
  }),
};

export const roleRegistry = mockRoleRegistry;
