import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayerRoleDisplay from '../PlayerRoleDisplay';
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

// Mock the roleRegistry
vi.mock('../../roles/RoleRegistry', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    roleRegistry: {
      ...actual.roleRegistry,
      getRole: vi.fn((roleId) => {
        switch (roleId) {
          case ROLE_IDS.VILLAGER:
            return mockVillagerRole;
          case ROLE_IDS.WEREWOLF:
            return mockWerewolfRole;
          case ROLE_IDS.DOCTOR:
            return mockDoctorRole;
          default:
            return undefined;
        }
      }),
    },
  };
});

describe('PlayerRoleDisplay', () => {
  it('renders without crashing', () => {
    const myPlayer = {
      id: 'p1',
      name: 'Player 1',
      role: ROLE_IDS.VILLAGER,
      avatarColor: '#FF0000',
    };
    render(<PlayerRoleDisplay myPlayer={myPlayer} />);
    expect(screen.getByTestId('player-role-display')).toBeInTheDocument();
  });

  it('does not render if myPlayer is null', () => {
    const { container } = render(<PlayerRoleDisplay myPlayer={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays player name and avatar initial', () => {
    const myPlayer = {
      id: 'p1',
      name: 'Player 1',
      role: ROLE_IDS.VILLAGER,
      avatarColor: '#FF0000',
    };
    render(<PlayerRoleDisplay myPlayer={myPlayer} />);
    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('displays correct role name and icon', () => {
    const myPlayer = { id: 'p1', name: 'Player 1', role: ROLE_IDS.DOCTOR, avatarColor: '#00FF00' };
    render(<PlayerRoleDisplay myPlayer={myPlayer} />);
    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(screen.getByTestId('doctor-icon')).toBeInTheDocument(); // Assuming mockDoctorRole uses doctor-icon
  });

  it('displays werewolf role name and icon', () => {
    const myPlayer = {
      id: 'p1',
      name: 'Player 1',
      role: ROLE_IDS.WEREWOLF,
      avatarColor: '#0000FF',
    };
    render(<PlayerRoleDisplay myPlayer={myPlayer} />);
    expect(screen.getByText('Werewolf')).toBeInTheDocument();
    expect(screen.getByTestId('werewolf-icon')).toBeInTheDocument(); // Assuming mockWerewolfRole uses werewolf-icon
  });

  it('displays villager role name and icon', () => {
    const myPlayer = {
      id: 'p1',
      name: 'Player 1',
      role: ROLE_IDS.VILLAGER,
      avatarColor: '#FFFF00',
    };
    render(<PlayerRoleDisplay myPlayer={myPlayer} />);
    expect(screen.getByText('Villager')).toBeInTheDocument();
    expect(screen.getByTestId('villager-icon')).toBeInTheDocument(); // Assuming mockVillagerRole uses villager-icon
  });

  it('handles a role not found in roleRegistry gracefully', () => {
    const myPlayer = { id: 'p1', name: 'Player 1', role: 'UNKNOWN_ROLE', avatarColor: '#FFFFFF' };
    render(<PlayerRoleDisplay myPlayer={myPlayer} />);
    // Should not display any role information if role not found
    expect(screen.queryByText('UNKNOWN_ROLE')).not.toBeInTheDocument();
    expect(screen.queryByTestId('skull-icon')).not.toBeInTheDocument(); // or any other icon
  });
});
