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
  Shield: vi.fn(() => <svg data-testid="shield-icon" />),
  Crosshair: vi.fn(() => <svg data-testid="crosshair-icon" />),
  Fingerprint: vi.fn(() => <svg data-testid="fingerprint-icon" />),
  Hammer: vi.fn(() => <svg data-testid="hammer-icon" />),
  Crown: vi.fn(() => <svg data-testid="crown-icon" />),
  Ghost: vi.fn(() => <svg data-testid="ghost-icon" />),
  Eye: vi.fn(() => <svg data-testid="eye-icon" />),
  Sparkles: vi.fn(() => <svg data-testid="sparkles-icon" />),
  UserX: vi.fn(() => <svg data-testid="userx-icon" />),
  Zap: vi.fn(() => <svg data-testid="zap-icon" />),
  Info: vi.fn(() => <svg data-testid="info-icon" />),
}));

// Mock the module that exports the singleton roleRegistry
vi.mock('../roles/RoleRegistry', () => {
  // Define mock role objects with necessary properties, including a mock icon
  const MockVillagerIcon = vi.fn(() => <svg data-testid="villager-icon" />);
  const MockWerewolfIcon = vi.fn(() => <svg data-testid="werewolf-icon" />);
  const MockDoctorIcon = vi.fn(() => <svg data-testid="doctor-icon" />);
  const MockMasonIcon = vi.fn(() => <svg data-testid="mason-icon" />);

  const mockVillagerRole = {
    id: ROLE_IDS.VILLAGER,
    name: 'Villager',
    description: 'A simple villager.',
    team: 'villagers',
    alignment: 'good',
    icon: MockVillagerIcon,
  };

  const mockWerewolfRole = {
    id: ROLE_IDS.WEREWOLF,
    name: 'Werewolf',
    description: 'Hunts at night.',
    team: 'werewolves',
    alignment: 'evil',
    icon: MockWerewolfIcon,
  };

  const mockDoctorRole = {
    id: ROLE_IDS.DOCTOR,
    name: 'Doctor',
    description: 'Can save one person each night.',
    team: 'villagers',
    alignment: 'good',
    icon: MockDoctorIcon,
  };

  const mockMasonRole = {
    id: ROLE_IDS.MASON,
    name: 'Mason',
    description: 'Knows other Masons.',
    team: 'villagers',
    alignment: 'good',
    icon: MockMasonIcon,
  };

  const mockRoleRegistry = {
    getAllRoles: vi.fn(() => [mockVillagerRole, mockWerewolfRole, mockDoctorRole, mockMasonRole]),
    getRole: vi.fn((id) => {
      switch (id) {
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
    roleRegistry: mockRoleRegistry,
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
