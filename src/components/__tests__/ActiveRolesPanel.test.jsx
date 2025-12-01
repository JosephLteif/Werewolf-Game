import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActiveRolesPanel from '../ActiveRolesPanel';
import { ROLE_IDS } from '../../constants/roleIds';

// Mock the lucide-react icons as they are React components
vi.mock('lucide-react', () => ({
  Users: vi.fn(() => <svg data-testid="users-icon" />),
  ChevronDown: vi.fn(() => <svg data-testid="chevron-down-icon" />),
  Skull: vi.fn(() => <svg data-testid="skull-icon" />),
  Heart: vi.fn(() => <svg data-testid="heart-icon" />),
  Shield: vi.fn(() => <svg data-testid="shield-icon" />), // Added Shield icon
  Crosshair: vi.fn(() => <svg data-testid="crosshair-icon" />), // Corrected to Crosshair
  Fingerprint: vi.fn(() => <svg data-testid="fingerprint-icon" />), // Added Fingerprint
  Hammer: vi.fn(() => <svg data-testid="hammer-icon" />),
  Crown: vi.fn(() => <svg data-testid="crown-icon" />), // Added Crown
  Ghost: vi.fn(() => <svg data-testid="ghost-icon" />), // Added Ghost
  Eye: vi.fn(() => <svg data-testid="eye-icon" />),
  Sparkles: vi.fn(() => <svg data-testid="sparkles-icon" />),
  UserX: vi.fn(() => <svg data-testid="userx-icon" />), // Added UserX
  Zap: vi.fn(() => <svg data-testid="zap-icon" />), // Added Zap
}));

// Define mock role objects
const mockVillagerRole = {
  id: ROLE_IDS.VILLAGER,
  name: 'Villager',
  description: 'A simple villager.',
  team: 'villagers',
  alignment: 'good',
  icon: () => <svg data-testid="villager-icon" />,
};

const mockWerewolfRole = {
  id: ROLE_IDS.WEREWOLF,
  name: 'Werewolf',
  description: 'A hungry wolf.',
  team: 'werewolves',
  alignment: 'evil',
  icon: () => <svg data-testid="werewolf-icon" />,
};

const mockDoctorRole = {
  id: ROLE_IDS.DOCTOR,
  name: 'Doctor',
  description: 'Heals people.',
  team: 'villagers',
  alignment: 'good',
  icon: () => <svg data-testid="doctor-icon" />,
};

const mockMasonRole = {
  id: ROLE_IDS.MASON,
  name: 'Mason',
  description: 'A builder.',
  team: 'villagers',
  alignment: 'good',
  icon: () => <svg data-testid="mason-icon" />,
};

// Mock the roleRegistry using importOriginal for partial mocking
vi.mock('../../roles/RoleRegistry', async (importOriginal) => {
  const actual = await importOriginal(); // This imports the actual module
  const mockRoleRegistry = {
    ...actual.roleRegistry, // Copy existing properties from the actual roleRegistry
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
  return {
    ...actual, // Export all original exports
    roleRegistry: mockRoleRegistry, // Override the roleRegistry export with our mock
  };
});

describe('ActiveRolesPanel', () => {
  it('renders without crashing and shows "Roles in Session" title when roles are present', () => {
    // Provide active roles so the component actually renders
    render(
      <ActiveRolesPanel activeRoles={{ [ROLE_IDS.VILLAGER]: true }} wolfCount={1} playerCount={3} />
    );
    expect(screen.getByText('Roles in Session')).toBeInTheDocument();
  });

  it('displays the correct roles when activeRoles are provided and panel is opened', () => {
    const activeRoles = {
      [ROLE_IDS.VILLAGER]: true,
      [ROLE_IDS.DOCTOR]: true,
    };
    render(<ActiveRolesPanel activeRoles={activeRoles} wolfCount={1} playerCount={4} />);

    fireEvent.click(screen.getByText('Roles in Session')); // Open the panel

    expect(screen.getByText('Villager')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(screen.getByText('Werewolf')).toBeInTheDocument(); // Werewolf from wolfCount
  });

  it('does not display panel content when closed', () => {
    const activeRoles = {
      [ROLE_IDS.VILLAGER]: true,
      [ROLE_IDS.DOCTOR]: true,
    };
    render(<ActiveRolesPanel activeRoles={activeRoles} wolfCount={1} playerCount={4} />);

    expect(screen.queryByText('Villager')).not.toBeInTheDocument();
    expect(screen.queryByText('Doctor')).not.toBeInTheDocument();
    expect(screen.queryByText('Werewolf')).not.toBeInTheDocument();
  });

  it('displays panel content when opened by clicking the button', () => {
    const activeRoles = {
      [ROLE_IDS.VILLAGER]: true,
      [ROLE_IDS.DOCTOR]: true,
    };
    render(<ActiveRolesPanel activeRoles={activeRoles} wolfCount={1} playerCount={4} />);

    fireEvent.click(screen.getByText('Roles in Session'));

    expect(screen.getByText('Villager')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(screen.getByText('Werewolf')).toBeInTheDocument();
  });

  it('hides panel content when closed again by clicking the button', () => {
    const activeRoles = {
      [ROLE_IDS.VILLAGER]: true,
      [ROLE_IDS.DOCTOR]: true,
    };
    render(<ActiveRolesPanel activeRoles={activeRoles} wolfCount={1} playerCount={4} />);

    fireEvent.click(screen.getByText('Roles in Session')); // Open
    fireEvent.click(screen.getByText('Roles in Session')); // Close

    expect(screen.queryByText('Villager')).not.toBeInTheDocument();
    expect(screen.queryByText('Doctor')).not.toBeInTheDocument();
    expect(screen.queryByText('Werewolf')).not.toBeInTheDocument();
  });

  it('calculates villagers correctly with various roles including Mason', () => {
    // 1 Werewolf, 1 Doctor, 2 Masons. Total 4 special roles + 1 wolf = 5.
    // If playerCount is 6, then 1 Villager should be added.
    const activeRoles = {
      [ROLE_IDS.DOCTOR]: true,
      [ROLE_IDS.MASON]: true,
    };
    render(<ActiveRolesPanel activeRoles={activeRoles} wolfCount={1} playerCount={6} />);

    fireEvent.click(screen.getByText('Roles in Session'));

    expect(screen.getByText('Villager')).toBeInTheDocument();
    expect(screen.getByText('Werewolf')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(screen.getByText('Mason')).toBeInTheDocument();
  });

  it('does not render if activeRoles is null', () => {
    const { container } = render(
      <ActiveRolesPanel activeRoles={null} wolfCount={0} playerCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render if no roles are in session after calculation', () => {
    // If wolfCount is 0, activeRoles is empty, and playerCount is 0, no roles should be displayed
    const activeRoles = {};
    render(<ActiveRolesPanel activeRoles={activeRoles} wolfCount={0} playerCount={0} />);
    expect(screen.queryByText('Roles in Session')).not.toBeInTheDocument();
    // Also explicitly check for the container as the component should return null
    const { container } = render(
      <ActiveRolesPanel activeRoles={activeRoles} wolfCount={0} playerCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });
});
