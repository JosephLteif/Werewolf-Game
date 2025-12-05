import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TeammateList from '../TeammateList';
import { ROLE_IDS } from '../../constants/roleIds';
import { Teams } from '../../models/Team'; // Corrected import

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Users: vi.fn(() => <svg data-testid="users-icon" />),
  ChevronDown: vi.fn(() => <svg data-testid="chevron-down-icon" />),
  ChevronUp: vi.fn(() => <svg data-testid="chevron-up-icon" />),
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

// Mock roleRegistry (simplified for this component's needs)
vi.mock('../../roles/RoleRegistry', async (importOriginal) => {
  const actual = await importOriginal();
  // Import actual role implementations for mocking
  const { Villager } = await import('../../roles/implementations/Villager');
  const { Werewolf } = await import('../../roles/implementations/Werewolf');
  const { Minion } = await import('../../roles/implementations/Minion');
  const { Mason } = await import('../../roles/implementations/Mason');
  const { Cupid } = await import('../../roles/implementations/Cupid');
  const { Role } = await import('../../roles/Role'); // Base Role

  return {
    ...actual,
    roleRegistry: {
      ...actual.roleRegistry,
      getRole: vi.fn((roleId) => {
        switch (roleId) {
          case ROLE_IDS.WEREWOLF:
            return new Werewolf();
          case ROLE_IDS.MINION:
            return new Minion();
          case ROLE_IDS.MASON:
            return new Mason();
          case ROLE_IDS.CUPID:
            return new Cupid();
          case ROLE_IDS.VILLAGER:
            return new Villager();
          case 'ALLY_ROLE': // Custom role for testing 'Ally' branch
            const allyRole = new Role();
            allyRole.id = 'ALLY_ROLE';
            allyRole.name = 'Ally Role';
            allyRole.getVisibleTeammates = () => []; // Provide a mock implementation
            return allyRole;
          default:
            const baseRole = new Role();
            baseRole.id = roleId;
            baseRole.name = 'Unknown';
            return baseRole;
        }
      }),
    },
  };
});

describe('TeammateList', () => {
  const commonPlayers = [
    { id: 'p1', name: 'Alice', role: ROLE_IDS.VILLAGER, avatarColor: '#111', isAlive: true },
    { id: 'p2', name: 'Bob', role: ROLE_IDS.WEREWOLF, avatarColor: '#222', isAlive: true },
    { id: 'p3', name: 'Charlie', role: ROLE_IDS.WEREWOLF, avatarColor: '#333', isAlive: true },
    { id: 'p4', name: 'David', role: ROLE_IDS.MINION, avatarColor: '#444', isAlive: true },
    { id: 'p5', name: 'Eve', role: ROLE_IDS.MASON, avatarColor: '#555', isAlive: true },
    { id: 'p6', name: 'Frank', role: ROLE_IDS.MASON, avatarColor: '#666', isAlive: true },
    { id: 'p7', name: 'Grace', role: ROLE_IDS.CUPID, avatarColor: '#777', isAlive: true },
    { id: 'p8', name: 'Heidi', role: ROLE_IDS.VILLAGER, avatarColor: '#888', isAlive: true },
    { id: 'p9', name: 'Ivan', role: 'ALLY_ROLE', avatarColor: '#999', isAlive: true }, // For 'Ally' branch
  ];

  it('does not render if myPlayer is null (covers line 8)', () => {
    const { container } = render(
      <TeammateList players={commonPlayers} myPlayer={null} gameState={{}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render if players is null (covers line 8)', () => {
    const myPlayer = { ...commonPlayers[0] };
    const { container } = render(
      <TeammateList players={null} myPlayer={myPlayer} gameState={{}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders for a Werewolf, showing other Werewolves', () => {
    const myPlayer = { ...commonPlayers[1], role: ROLE_IDS.WEREWOLF }; // Bob the Werewolf
    const gameState = { lovers: [] };
    render(<TeammateList players={commonPlayers} myPlayer={myPlayer} gameState={gameState} />);

    // Content should be visible by default (isCollapsed = false)
    expect(screen.getByText('Pack & Allies')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument(); // Other Werewolf
    expect(screen.queryByText('David')).not.toBeInTheDocument(); // Minion, not a Werewolf
    expect(screen.queryByText('Alice')).not.toBeInTheDocument(); // Villager
  });

  it('renders for a Minion, showing Werewolves', () => {
    const myPlayer = { ...commonPlayers[3], role: ROLE_IDS.MINION }; // David the Minion
    const gameState = { lovers: [] };
    render(<TeammateList players={commonPlayers} myPlayer={myPlayer} gameState={gameState} />);

    // Content should be visible by default
    expect(screen.getByText('My Masters')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument(); // Werewolf
    expect(screen.getByText('Charlie')).toBeInTheDocument(); // Werewolf
    expect(screen.queryByText('Alice')).not.toBeInTheDocument(); // Villager
  });

  it('renders for a Mason, showing other Masons', () => {
    const myPlayer = { ...commonPlayers[4], role: ROLE_IDS.MASON }; // Eve the Mason
    const gameState = { lovers: [] };
    render(<TeammateList players={commonPlayers} myPlayer={myPlayer} gameState={gameState} />);

    // Content should be visible by default
    expect(screen.getByText('Fellow Masons')).toBeInTheDocument();
    expect(screen.getByText('Frank')).toBeInTheDocument(); // Other Mason
    expect(screen.queryByText('Alice')).not.toBeInTheDocument(); // Villager
  });

  it('renders for Cupid, showing lovers if any', () => {
    const myPlayer = { ...commonPlayers[6], role: ROLE_IDS.CUPID }; // Grace the Cupid
    const gameState = { lovers: ['p1', 'p2'] }; // Alice and Bob are lovers
    render(<TeammateList players={commonPlayers} myPlayer={myPlayer} gameState={gameState} />);

    // Content should be visible by default
    expect(screen.getByText('Lovers')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
  });

  it('does not render Cupid allies if gameState.lovers is null or undefined (covers line 31)', () => {
    const myPlayer = { ...commonPlayers[6], role: ROLE_IDS.CUPID }; // Grace the Cupid
    render(<TeammateList players={commonPlayers} myPlayer={myPlayer} gameState={{}} />);
    expect(screen.queryByText('Lovers')).not.toBeInTheDocument();
  });

  it('renders for a Lover, showing their partner', () => {
    const myPlayer = { ...commonPlayers[0], role: ROLE_IDS.VILLAGER }; // Alice the Villager (also a lover)
    const gameState = { lovers: ['p1', 'p8'] }; // Alice and Heidi are lovers
    render(<TeammateList players={commonPlayers} myPlayer={myPlayer} gameState={gameState} />);

    // Content should be visible by default
    expect(screen.getByText('My Lover')).toBeInTheDocument();
    expect(screen.getByText('Heidi')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument(); // Should not show self
  });

  it('renders for a Werewolf who is also a Lover, showing both teammates and partner', () => {
    const myPlayer = { ...commonPlayers[1], role: ROLE_IDS.WEREWOLF }; // Bob the Werewolf
    const gameState = { lovers: ['p1', 'p2'] }; // Alice and Bob are lovers
    render(<TeammateList players={commonPlayers} myPlayer={myPlayer} gameState={gameState} />);

    // Content should be visible by default, no click needed
    expect(screen.getByText('Pack & Allies')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument(); // Other Werewolf
    expect(screen.getByText('My Lover')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument(); // Lover partner
  });

  it('collapses and expands when the header is clicked', () => {
    const myPlayer = { ...commonPlayers[1], role: ROLE_IDS.WEREWOLF }; // Bob the Werewolf
    const gameState = { lovers: [] };
    render(<TeammateList players={commonPlayers} myPlayer={myPlayer} gameState={gameState} />);

    expect(screen.getByText('Charlie')).toBeInTheDocument(); // Visible when expanded (default)

    fireEvent.click(screen.getByText('Allies')); // Collapse
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument(); // Hidden when collapsed

    fireEvent.click(screen.getByText('Allies')); // Expand
    expect(screen.getByText('Charlie')).toBeInTheDocument(); // Visible again
  });

  it('displays "💀 Dead" status for dead teammates and lovers (covers lines 91 and 119)', () => {
    const deadCharlie = { ...commonPlayers[2], isAlive: false };
    const deadAlice = { ...commonPlayers[0], isAlive: false }; // Alice is a lover
    const myPlayer = { ...commonPlayers[1], role: ROLE_IDS.WEREWOLF }; // Bob the Werewolf (also a lover)

    const playersWithDead = [
      ...commonPlayers.filter((p) => p.id !== 'p3' && p.id !== 'p1'),
      deadCharlie,
      deadAlice,
    ];

    const gameState = { lovers: ['p1', 'p2'] }; // Alice (dead) and Bob (alive) are lovers

    render(<TeammateList players={playersWithDead} myPlayer={myPlayer} gameState={gameState} />);

    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getAllByText('💀 Dead')).toHaveLength(2); // One for Charlie, one for Alice
    expect(screen.getByText('My Lover')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Partner')).not.toBeInTheDocument(); // 'Partner' should not be visible when dead
  });

  it('displays "Ally" for a relevant player who is not Minion/Werewolf (covers line 95)', () => {
    const myPlayer = { ...commonPlayers[4], role: ROLE_IDS.MASON }; // Eve the Mason
    const relevantAlly = { ...commonPlayers[5], role: ROLE_IDS.MASON, isAlive: true }; // Frank the Mason
    const players = [
      myPlayer,
      relevantAlly,
      { ...commonPlayers[0], isAlive: true, role: 'ALLY_ROLE' }, // Custom Ally (not part of the relevantPlayers logic in TeammateList)
    ];
    const gameState = { lovers: [] };

    render(<TeammateList players={players} myPlayer={myPlayer} gameState={gameState} />);

    expect(screen.getByText('Fellow Masons')).toBeInTheDocument();
    expect(screen.getByText('Frank')).toBeInTheDocument();
    // For Frank (Mason), it should display 'Ally' as his role is not Minion/Werewolf
    expect(screen.getByText('Ally')).toBeInTheDocument();
  });

  it('does not render if there are no relevant players or partners', () => {
    const myPlayer = { ...commonPlayers[0], role: ROLE_IDS.VILLAGER }; // Alice, a plain villager
    const gameState = { lovers: [] };
    const { container } = render(
      <TeammateList players={commonPlayers} myPlayer={myPlayer} gameState={gameState} />
    );
    expect(container.firstChild).toBeNull();
  });
});
