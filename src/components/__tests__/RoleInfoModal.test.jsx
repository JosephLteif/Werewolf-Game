import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleInfoModal } from '../RoleInfoModal';
import { ROLE_IDS } from '../../constants/roleIds';
import { ALIGNMENTS } from '../../constants/alignments';
import { Teams } from '../../models/Team';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Info: vi.fn(() => <svg data-testid="info-icon" />),
  Users: vi.fn(() => <svg data-testid="users-icon" />),
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
}));

// Define mock role objects
const mockVillagerRole = {
  id: ROLE_IDS.VILLAGER,
  name: 'Villager',
  description: 'A simple villager.',
  team: Teams.VILLAGER,
  alignment: ALIGNMENTS.GOOD,
  weight: 1,
  icon: () => <svg data-testid="villager-icon" />,
  selectable: true,
};

const mockWerewolfRole = {
  id: ROLE_IDS.WEREWOLF,
  name: 'Werewolf',
  description: 'A hungry wolf.',
  team: Teams.WEREWOLF,
  alignment: ALIGNMENTS.EVIL,
  weight: -6,
  icon: () => <svg data-testid="werewolf-icon" />,
  selectable: true,
};

const mockDoctorRole = {
  id: ROLE_IDS.DOCTOR,
  name: 'Doctor',
  description: 'Heals people.',
  team: Teams.VILLAGER,
  alignment: ALIGNMENTS.GOOD,
  weight: 4,
  icon: () => <svg data-testid="doctor-icon" />,
  selectable: true,
};

const mockUnselectableRole = {
  id: 'narrator',
  name: 'Narrator',
  description: 'Controls the game.',
  team: Teams.NEUTRAL,
  alignment: ALIGNMENTS.NEUTRAL,
  weight: 0,
  icon: () => <svg data-testid="narrator-icon" />,
  selectable: false, // This role should not be selectable
};

// Mock the roleRegistry
vi.mock('../../roles/RoleRegistry', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    roleRegistry: {
      ...actual.roleRegistry,
      getAllRoles: vi.fn(() => [
        mockVillagerRole,
        mockWerewolfRole,
        mockDoctorRole,
        mockUnselectableRole,
      ]),
      getRole: vi.fn((roleId) => {
        switch (roleId) {
          case ROLE_IDS.VILLAGER:
            return mockVillagerRole;
          case ROLE_IDS.WEREWOLF:
            return mockWerewolfRole;
          case ROLE_IDS.DOCTOR:
            return mockDoctorRole;
          case 'narrator':
            return mockUnselectableRole;
          default:
            return undefined;
        }
      }),
    },
  };
});

describe('RoleInfoModal', () => {
  it('does not render when showRoleInfo is false', () => {
    const { container } = render(<RoleInfoModal showRoleInfo={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly for a specific role', () => {
    const onCloseMock = vi.fn();
    render(<RoleInfoModal showRoleInfo={ROLE_IDS.VILLAGER} onClose={onCloseMock} />);

    expect(screen.getByText('Villager')).toBeInTheDocument();
    expect(screen.getByText('A simple villager.')).toBeInTheDocument();
    // Corrected assertion: ALIGNMENTS.GOOD is 'good' (lowercase) in the component
    expect(screen.getByText(ALIGNMENTS.GOOD)).toBeInTheDocument();
    expect(screen.getByText('Weight: +1')).toBeInTheDocument();
    expect(screen.getByTestId('villager-icon')).toBeInTheDocument();
  });

  it('renders the Rule Book when showRoleInfo is "RULES"', () => {
    const onCloseMock = vi.fn();
    render(<RoleInfoModal showRoleInfo="RULES" onClose={onCloseMock} />);

    expect(screen.getByText('Rule Book')).toBeInTheDocument();
    // Corrected assertion: Using a partial match or regex for the long text
    expect(
      screen.getByText(/Villagers must find and eliminate all Werewolves/)
    ).toBeInTheDocument();
    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
  });

  it('renders all available roles when showRoleInfo is "ALL_ROLES"', () => {
    const onCloseMock = vi.fn();
    render(<RoleInfoModal showRoleInfo="ALL_ROLES" onClose={onCloseMock} />);

    expect(screen.getByText('All Available Roles')).toBeInTheDocument();
    expect(screen.getByText('Villager')).toBeInTheDocument();
    expect(screen.getByText('Werewolf')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
    // Assert that the unselectable role is NOT displayed
    expect(screen.queryByText('Narrator')).not.toBeInTheDocument();
  });

  it('calls onClose when the Close button is clicked', () => {
    const onCloseMock = vi.fn();
    render(<RoleInfoModal showRoleInfo={ROLE_IDS.VILLAGER} onClose={onCloseMock} />);

    fireEvent.click(screen.getByText('Close'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking outside the modal content', () => {
    const onCloseMock = vi.fn();
    render(<RoleInfoModal showRoleInfo={ROLE_IDS.VILLAGER} onClose={onCloseMock} />);

    // Click the outermost div which is the modal backdrop
    fireEvent.click(screen.getByTestId('role-info-modal-backdrop'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the modal content', () => {
    const onCloseMock = vi.fn();
    render(<RoleInfoModal showRoleInfo={ROLE_IDS.VILLAGER} onClose={onCloseMock} />);

    // Clicking inside the modal content (e.g., on the role name) should not trigger onClose
    fireEvent.click(screen.getByText('Villager'));
    expect(onCloseMock).not.toHaveBeenCalled();
  });
});
