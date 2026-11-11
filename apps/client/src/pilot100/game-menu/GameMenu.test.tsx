// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameMenu } from './index.js';
import type { GameMenuProps } from './index.js';

afterEach(cleanup);

function callbacks() {
  return {
    onHowToPlay: vi.fn(),
    onSettings: vi.fn(),
    onLeave: vi.fn(),
    onClose: vi.fn(),
  };
}

const actions = [
  ['How to Play', 'onHowToPlay'],
  ['Settings', 'onSettings'],
  ['Leave', 'onLeave'],
  ['Close', 'onClose'],
] as const;

describe('GameMenu', () => {
  it('explains multiplayer continues and updates mode without emitting actions', () => {
    const handlers = callbacks();
    const { rerender } = render(<GameMenu mode="multiplayer" {...handlers} />);
    expect(screen.getByText('The match continues while this menu is open.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /pause/i })).toBeNull();
    rerender(<GameMenu mode="solo" {...handlers} />);
    expect(screen.queryByText(/match continues/)).toBeNull();
    expect(screen.getByText('Choose a local game option.')).toBeTruthy();
    Object.values(handlers).forEach((handler) => expect(handler).not.toHaveBeenCalled());
  });

  it.each(actions)('%s emits only %s without submitting a host form', async (label, key) => {
    const user = userEvent.setup();
    const handlers = callbacks();
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(<form onSubmit={submit}><GameMenu mode="multiplayer" {...handlers} /></form>);
    await user.click(screen.getByRole('button', { name: label }));
    for (const [name, handler] of Object.entries(handlers)) {
      expect(handler).toHaveBeenCalledTimes(name === key ? 1 : 0);
    }
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText('Leaving opens a separate confirmation step.')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('supports natural keyboard order and activation while leaving host focus management intact', async () => {
    const user = userEvent.setup();
    const handlers = callbacks();
    render(<><GameMenu mode="multiplayer" {...handlers} /><button type="button">Host control</button></>);
    for (const [label, key] of actions) {
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: label }));
      await user.keyboard(key === 'onClose' ? ' ' : '{Enter}');
      expect(handlers[key]).toHaveBeenCalledTimes(1);
    }
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Host control' }));
  });

  it('uses current callbacks after a host rerender', async () => {
    const user = userEvent.setup();
    const oldHandlers = callbacks();
    const newHandlers = callbacks();
    const props: GameMenuProps = { mode: 'multiplayer', ...oldHandlers };
    const { rerender } = render(<GameMenu {...props} />);
    rerender(<GameMenu {...props} {...newHandlers} />);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(newHandlers.onClose).toHaveBeenCalledTimes(1);
    Object.values(oldHandlers).forEach((handler) => expect(handler).not.toHaveBeenCalled());
  });
});
