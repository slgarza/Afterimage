// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpectatorView, type SpectatorViewProps } from './index';

afterEach(cleanup);

const props = (): SpectatorViewProps => Object.freeze({
  reason: 'Your signal was severed.',
  publicRound: 4,
  publicSummary: 'The district remains unstable.',
  onOpenMenu: vi.fn(),
});

describe('SpectatorView', () => {
  it('explains permanent silent observation with only a local menu control', async () => {
    const input = props();
    const { container } = render(<SpectatorView {...input} />);
    expect(screen.getByRole('heading', { name: 'Permanently Disconnected' })).toBeTruthy();
    expect(screen.getByText(/silent spectator for the rest of this match/)).toBeTruthy();
    expect(screen.getByText(/cannot vote, join the Crew, use powers, chat, send reactions, or reveal your role/)).toBeTruthy();
    expect(screen.getByText(input.reason)).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(container.querySelectorAll('a, input, select, textarea, [tabindex], [contenteditable]')).toHaveLength(0);
    expect(container.textContent).not.toMatch(/Archivist|Static|The Null|reconnect|retry/i);
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open local menu' }));
    await user.keyboard('{Enter}');
    expect(input.onOpenMenu).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/The match continues/)).toBeTruthy();
  });

  it('updates public observation and menu callback without mutating frozen inputs', async () => {
    const input = props();
    const before = { ...input };
    const { rerender } = render(<SpectatorView {...input} />);
    const next = Object.freeze({ ...input, publicRound: 5, publicSummary: 'Public resolution received.', onOpenMenu: vi.fn() });
    rerender(<SpectatorView {...next} />);
    expect(screen.queryByText(input.publicSummary)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Round 4' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Round 5' })).toBeTruthy();
    expect(screen.getByText(next.publicSummary)).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(next.onOpenMenu).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole('button'));
    expect(next.onOpenMenu).toHaveBeenCalledTimes(1);
    expect(input.onOpenMenu).not.toHaveBeenCalled();
    expect(input).toEqual(before);
    expect(next.publicRound).toBe(5);
  });

  it.each([NaN, Infinity, -1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'honestly labels unavailable context for invalid round %s', (publicRound) => {
      render(<SpectatorView {...props()} reason="  " publicSummary={'\n'} publicRound={publicRound} />);
      expect(screen.getByRole('heading', { name: 'Round unavailable' })).toBeTruthy();
      expect(screen.getByText('Disconnect reason unavailable.')).toBeTruthy();
      expect(screen.getByText('Public summary unavailable.')).toBeTruthy();
      expect(screen.getAllByRole('button')).toHaveLength(1);
    },
  );

  it('renders supplied public text as text rather than executable markup', () => {
    const text = '<button>Vote now</button>';
    const { container } = render(<SpectatorView {...props()} publicSummary={text} />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });
});
