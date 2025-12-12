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

const mockTwinRole = {
  id: ROLE_IDS.TWIN,
  name: 'Twin',
  description: 'A twin.',
  team: 'villagers',
  alignment: 'good',
  icon: vi.fn(() => null),
};

const mockShapeshifterRole = {
  id: ROLE_IDS.SHAPESHIFTER,
  name: 'Shapeshifter',
  description: 'A shapeshifter.',
  team: 'villagers',
  alignment: 'neutral',
  icon: vi.fn(() => null),
};

const mockFanaticRole = {
  id: ROLE_IDS.FANATIC,
  name: 'Fanatic',
  description: 'A fanatic.',
  team: 'werewolves',
  alignment: 'evil',
  icon: vi.fn(() => null),
};

const mockTheFoolRole = {
  id: ROLE_IDS.THE_FOOL,
  name: 'The Fool',
  description: 'A fool.',
  team: 'neutral',
  alignment: 'neutral',
  icon: vi.fn(() => null),
};

const mockRoleRegistry = {
  getAllRoles: vi.fn(() => [mockVillagerRole, mockWerewolfRole, mockDoctorRole, mockTwinRole, mockShapeshifterRole, mockFanaticRole, mockTheFoolRole]),
  getRole: vi.fn((roleId) => {
    switch (roleId) {
      case ROLE_IDS.VILLAGER:
        return mockVillagerRole;
      case ROLE_IDS.WEREWOLF:
        return mockWerewolfRole;
      case ROLE_IDS.DOCTOR:
        return mockDoctorRole;
      case ROLE_IDS.TWIN:
        return mockTwinRole;
      case ROLE_IDS.SHAPESHIFTER:
        return mockShapeshifterRole;
      case ROLE_IDS.FANATIC:
        return mockFanaticRole;
      case ROLE_IDS.THE_FOOL:
        return mockTheFoolRole;
      default:
        return undefined;
    }
  }),
};

export const roleRegistry = mockRoleRegistry;
