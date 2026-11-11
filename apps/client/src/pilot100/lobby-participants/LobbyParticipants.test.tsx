// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LobbyParticipants, type LobbyParticipantsProps } from './index';

afterEach(cleanup);

const participants = Object.freeze([
  Object.freeze({ id: 'one', alias: 'River', avatarLabel: 'Frost arc', host: true, ready: true, bot: false, canKick: false }),
  Object.freeze({ id: 'two', alias: 'River', avatarLabel: 'Quiet ridge', host: false, ready: false, bot: true, canKick: true }),
]);
function props(overrides: Partial<LobbyParticipantsProps> = {}): LobbyParticipantsProps {
  return { participants, openSeats: 2, fillWithBots: false, canBegin: false,
    onKick: vi.fn(), onBegin: vi.fn(), ...overrides };
}

describe('LobbyParticipants', () => {
  it('keeps duplicate aliases distinct, preserves row identity on reorder and does not mutate inputs', () => {
    const initial = props();
    const { rerender } = render(<LobbyParticipants {...initial} />);
    const rows = screen.getAllByRole('listitem');
    expect(screen.getAllByText('River')).toHaveLength(2);
    expect(within(rows[0]!).getByRole('img', { name: 'Frost arc' })).toBeTruthy();
    expect(within(rows[0]!).getByText('Host')).toBeTruthy();
    expect(within(rows[0]!).getByText('Ready')).toBeTruthy();
    expect(within(rows[0]!).getByText('Human')).toBeTruthy();
    expect(within(rows[1]!).getByText('Bot')).toBeTruthy();
    expect(within(rows[1]!).getByText('Not ready')).toBeTruthy();
    rerender(<LobbyParticipants {...initial} participants={[participants[1]!, participants[0]!]} />);
    expect(screen.getAllByRole('listitem')[0]).toBe(rows[1]);
    expect(participants.map(({ id }) => id)).toEqual(['one', 'two']);
  });

  it('uses current supplied kick capabilities and sends exact IDs by keyboard', async () => {
    const user = userEvent.setup();
    const initial = props();
    const { rerender } = render(<LobbyParticipants {...initial} />);
    await user.click(screen.getByRole('button', { name: 'Kick River (ID: one)' }));
    expect(initial.onKick).not.toHaveBeenCalled();
    const enabled = screen.getByRole('button', { name: 'Kick River (ID: two)' });
    enabled.focus();
    await user.keyboard('{Enter}');
    expect(initial.onKick).toHaveBeenCalledExactlyOnceWith('two');
    rerender(<LobbyParticipants {...initial} participants={participants.map((p) => ({ ...p, canKick: false }))} />);
    await user.click(enabled);
    expect(initial.onKick).toHaveBeenCalledTimes(1);
  });

  it('follows begin authority without deriving it from roster or readiness', async () => {
    const user = userEvent.setup();
    const initial = props({ participants: [participants[0]!] });
    const { rerender } = render(<LobbyParticipants {...initial} />);
    await user.click(screen.getByRole('button', { name: 'Begin game' }));
    expect(initial.onBegin).not.toHaveBeenCalled();
    rerender(<LobbyParticipants {...initial} participants={[]} canBegin />);
    screen.getByRole('button', { name: 'Begin game' }).focus();
    await user.keyboard(' ');
    expect(initial.onBegin).toHaveBeenCalledTimes(1);
    expect(screen.getByText('No participants yet.')).toBeTruthy();
  });

  it('distinguishes open seats and bot fill without inventing connected humans', () => {
    const initial = props();
    const { rerender } = render(<LobbyParticipants {...initial} />);
    expect(screen.getByText('2 open seats.')).toBeTruthy();
    expect(screen.getByText(/Bot fill disabled/).textContent).toContain('people to join');
    rerender(<LobbyParticipants {...initial} fillWithBots openSeats={1} />);
    expect(screen.getByText('1 open seat.')).toBeTruthy();
    expect(screen.getByText(/Bot fill enabled/).textContent).toContain('Bots are not connected humans');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    rerender(<LobbyParticipants {...initial} openSeats={0} />);
    expect(screen.getByText('0 open seats.')).toBeTruthy();
  });

  it.each([-1, 1.5, NaN, Infinity])('reports unavailable seat counts for %s', (openSeats) => {
    render(<LobbyParticipants {...props({ openSeats })} />);
    expect(screen.getByText('Open seat count unavailable.')).toBeTruthy();
  });

  it('renders text safely, omits extra private fields and labels unavailable avatars', () => {
    const publicParticipant = { ...participants[0]!, alias: '<img src=x>', avatarLabel: '',
      role: 'private-alignment', passcode: 'secret-passcode' };
    const { container } = render(<LobbyParticipants {...props({ participants: [publicParticipant] })} />);
    expect(screen.getByText('<img src=x>')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Avatar unavailable' })).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toMatch(/private-alignment|secret-passcode|passcode/);
  });
});
