// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LobbyRoster, type LobbyRosterProps } from './index';

afterEach(cleanup);

function players(count: number): LobbyRosterProps['players'] {
  return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({
    id: `player-${index}`,
    displayName: `Member ${index + 1}`,
    connected: index % 2 === 0,
  })));
}

describe('LobbyRoster', () => {
  it('explains the empty waiting state and exact missing count', () => {
    render(<LobbyRoster players={[]} currentPlayerId={null} hostPlayerId={null} />);

    expect(screen.getByText('0 / 10 players')).toBeTruthy();
    expect(screen.getByText('Waiting for players to join the lobby.')).toBeTruthy();
    expect(screen.getByText('5 more players are needed to reach the minimum player count.')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Players' }).tagName).toBe('OL');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('counts disconnected members toward the four-player roster', () => {
    render(<LobbyRoster players={players(4)} currentPlayerId={null} hostPlayerId={null} />);

    expect(screen.getByText('4 / 10 players')).toBeTruthy();
    expect(screen.getByText('1 more player is needed to reach the minimum player count.')).toBeTruthy();
    expect(screen.getAllByText('Disconnected')).toHaveLength(2);
    expect(screen.queryByText('Minimum player count reached.')).toBeNull();
  });

  it.each([5, 10])('shows the minimum reached with %i members and no start action', (count) => {
    const { container } = render(
      <LobbyRoster players={players(count)} currentPlayerId={null} hostPlayerId={null} />,
    );

    expect(screen.getByText(`${count} / 10 players`)).toBeTruthy();
    expect(screen.getByText('Minimum player count reached.')).toBeTruthy();
    expect(screen.queryByText(/more players? (?:is|are) needed/)).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(count);
    expect(container.textContent).not.toMatch(/start|ready/i);
    expect(container.querySelector('button, a, input')).toBeNull();
  });

  it('preserves input order and displays a connection status on every row', () => {
    const roster = Object.freeze([players(3)[2]!, players(3)[0]!, players(3)[1]!]);
    render(<LobbyRoster players={roster} currentPlayerId={null} hostPlayerId={null} />);

    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Member 3 Connected', 'Member 1 Connected', 'Member 2 Disconnected',
    ]);
    expect(roster.map((player) => player.id)).toEqual(['player-2', 'player-0', 'player-1']);
  });

  it('labels distinct identities by ID even when display names match', () => {
    const roster = [
      { id: 'first', displayName: 'River', connected: true },
      { id: 'second', displayName: 'River', connected: false },
    ] as const;
    const { rerender } = render(
      <LobbyRoster players={roster} currentPlayerId="second" hostPlayerId="first" />,
    );

    const rows = screen.getAllByRole('listitem');
    expect(screen.getAllByText('River')).toHaveLength(2);
    expect(within(rows[0]!).getByText('Host')).toBeTruthy();
    expect(within(rows[0]!).queryByText('You')).toBeNull();
    expect(within(rows[1]!).getByText('You')).toBeTruthy();
    expect(within(rows[1]!).queryByText('Host')).toBeNull();

    rerender(<LobbyRoster players={roster} currentPlayerId="second" hostPlayerId="second" />);
    expect(within(screen.getAllByRole('listitem')[1]!).getByText('You')).toBeTruthy();
    expect(within(screen.getAllByRole('listitem')[1]!).getByText('Host')).toBeTruthy();
  });

  it.each([null, 'unknown'])('adds no identity labels for %s IDs', (identity) => {
    render(<LobbyRoster players={players(2)} currentPlayerId={identity} hostPlayerId={identity} />);

    expect(screen.queryByText('You')).toBeNull();
    expect(screen.queryByText('Host')).toBeNull();
  });

  it('renders HTML-like names as text and omits unexpected private fields', () => {
    const displayName = '<img src=x onerror=alert(1)>';
    const roster = [{ id: 'safe', displayName, connected: true, role: 'private-test-role' }];
    const { container } = render(
      <LobbyRoster players={roster} currentPlayerId={null} hostPlayerId={null} />,
    );

    expect(screen.getByText(displayName).textContent).toBe(displayName);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).not.toContain('private-test-role');
  });
});
