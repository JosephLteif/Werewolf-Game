import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Role } from './Role';

// Custom Role for testing RoleRegistry register method
class CustomRole extends Role {
  constructor() {
    super();
    this.id = 'custom';
    this.name = 'Custom Role';
    this.description = 'A custom role for testing.';
  }
}

describe('RoleRegistry Class', () => {
  // Save the original roleRegistry for testing
  let originalRoleRegistry;

  beforeEach(async () => {
    // We are testing the actual RoleRegistry, so we need to unmock it.
    vi.doUnmock('./RoleRegistry');
    // Use dynamic import after unmocking to get the fresh, unmocked module
    const module = await import('./RoleRegistry');
    originalRoleRegistry = module.roleRegistry;

    // Clean up any custom roles from previous runs
    if (originalRoleRegistry.getRole('custom')) {
      originalRoleRegistry.roles.delete('custom');
      originalRoleRegistry.roleInstances = originalRoleRegistry.roleInstances.filter(
        (r) => r.id !== 'custom'
      );
    }
  });

  afterEach(() => {
    // Re-mock RoleRegistry after each test to ensure isolation for other test files
    // that might depend on the mock.
    vi.mock('./RoleRegistry', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        roleRegistry: {
          ...actual.roleRegistry,
          // Re-initialize with original behavior or specific mocks if needed
          getRole: vi.fn((roleId) => actual.roleRegistry.getAllRoles().find((r) => r.id === roleId)),
          getAllRoles: vi.fn(() => actual.roleRegistry.getAllRoles()),
        },
      };
    });
  });

  it('register method adds a new role to the registry', () => {
    const newCustomRole = new CustomRole();
    originalRoleRegistry.register(newCustomRole.id, newCustomRole);
    expect(originalRoleRegistry.getRole('custom')).toBe(newCustomRole);
  });
});