import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VoterAvatars from '../VoterAvatars';

describe('VoterAvatars', () => {
  const players = [
    { id: 'p1', name: 'Alice', avatarColor: '#FF0000' },
    { id: 'p2', name: 'Bob', avatarColor: '#00FF00' },
    { id: 'p3', name: 'Charlie', avatarColor: '#0000FF' },
  ];

  it('renders without crashing with valid props', () => {
    render(<VoterAvatars voterIds={['p1', 'p2']} players={players} />);
    expect(screen.getByTestId('voter-avatars-component')).toBeInTheDocument();
  });

  it('displays the correct number of voter avatars', () => {
    render(<VoterAvatars voterIds={['p1', 'p2', 'p3']} players={players} />);
    const avatars = screen.getAllByText(/[A-Z]/); // Find all elements with a single uppercase letter
    expect(avatars).toHaveLength(3);
  });

  it('displays the correct player initials', () => {
    render(<VoterAvatars voterIds={['p1', 'p3']} players={players} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.queryByText('B')).not.toBeInTheDocument();
  });

  it('handles an empty voterIds array by not rendering anything', () => {
    const { container } = render(<VoterAvatars voterIds={[]} players={players} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles null voterIds gracefully by not rendering anything', () => {
    const { container } = render(<VoterAvatars voterIds={null} players={players} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles voterIds with non-existent players gracefully', () => {
    render(<VoterAvatars voterIds={['p1', 'p4']} players={players} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByText('P')).not.toBeInTheDocument(); // Initial for 'p4' should not exist
    expect(screen.getAllByText(/[A-Z]/)).toHaveLength(1); // Only Alice's initial
  });

  it('applies custom size correctly', () => {
    render(<VoterAvatars voterIds={['p1']} players={players} size="6" />);
    const avatar = screen.getByText('A').closest('div');
    expect(avatar).toHaveClass('w-6');
    expect(avatar).toHaveClass('h-6');
    // Check for the text size class based on size prop
    expect(avatar).toHaveClass('text-[10px]');
  });

  it('applies custom border color correctly', () => {
    render(<VoterAvatars voterIds={['p1']} players={players} borderColor="border-red-500" />);
    const avatar = screen.getByText('A').closest('div');
    expect(avatar).toHaveClass('border-red-500');
  });

  it('displays correct title on hover', () => {
    render(<VoterAvatars voterIds={['p1']} players={players} />);
    const avatar = screen.getByText('A').closest('div');
    expect(avatar).toHaveAttribute('title', 'Alice');
  });
});
