import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TeammateList from '../TeammateList';
import { ROLE_IDS } from '../../constants/roleIds';
import { Teams } from '../../models/Team';

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
  return {
    ...actual,
    roleRegistry: {
      ...actual.roleRegistry,
      getRole: vi.fn((roleId) => {
        switch (roleId) {
          case ROLE_IDS.WEREWOLF:
            return { id: ROLE_IDS.WEREWOLF, name: 'Werewolf' };
          case ROLE_IDS.MINION:
            return { id: ROLE_IDS.MINION, name: 'Minion' };
          case ROLE_IDS.MASON:
            return { id: ROLE_IDS.MASON, name: 'Mason' };
          case ROLE_IDS.CUPID:
            return { id: ROLE_IDS.CUPID, name: 'Cupid' };
          case ROLE_IDS.VILLAGER:
            return { id: ROLE_IDS.VILLAGER, name: 'Villager' };
          default:
            return { id: roleId, name: 'Unknown' };
        }
      }),
    },
  };
});

describe('TeammateList', () => {
  const commonPlayers = [
    { id: 'p1', name: 'Alice', role: ROLE_IDS.VILLAGER, avatarColor: '#111' },
    { id: 'p2', name: 'Bob', role: ROLE_IDS.WEREWOLF, avatarColor: '#222' },
    { id: 'p3', name: 'Charlie', role: ROLE_IDS.WEREWOLF, avatarColor: '#333' },
    { id: 'p4', name: 'David', role: ROLE_IDS.MINION, avatarColor: '#444' },
    { id: 'p5', name: 'Eve', role: ROLE_IDS.MASON, avatarColor: '#555' },
    { id: 'p6', name: 'Frank', role: ROLE_IDS.MASON, avatarColor: '#666' },
    { id: 'p7', name: 'Grace', role: ROLE_IDS.CUPID, avatarColor: '#777' },
    { id: 'p8', name: 'Heidi', role: ROLE_IDS.VILLAGER, avatarColor: '#888' },
  ];

  it('renders without crashing', () => {
    const myPlayer = { ...commonPlayers[0], role: ROLE_IDS.VILLAGER };
    const gameState = { lovers: [] };
    const { container } = render(
      <TeammateList players={commonPlayers} myPlayer={myPlayer} gameState={gameState} />
    );
    // Since a Villager has no allies by default, it should not render any content
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

  it('renders for a Lover, showing their partner', () => {
    const myPlayer = { ...commonPlayers[0], role: ROLE_IDS.VILLAGER }; // Alice the Villager (also a lover)
    const gameState = { lovers: ['p1', 'p8'] }; // Alice and Heidi are lovers
    render(<TeammateList players={commonPlayers} myPlayer={myPlayer} gameState={gameState} />);
    screen.debug(); // Debug output for inspection

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

  it('displays "💀 Dead" status for dead teammates', () => {
    const deadCharlie = { ...commonPlayers[2], isAlive: false };
    const myPlayer = { ...commonPlayers[1], role: ROLE_IDS.WEREWOLF }; // Bob the Werewolf
    const playersWithDead = [...commonPlayers.filter(p => p.id !== 'p3'), deadCharlie];
    const gameState = { lovers: [] };

    render(<TeammateList players={playersWithDead} myPlayer={myPlayer} gameState={gameState} />);

    // Content should be visible by default, no click needed
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('💀 Dead')).toBeInTheDocument();
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