// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShellNavigation, type ShellNavigationProps } from './index';

afterEach(cleanup);

const routes = [
  ['home', 'Home'],
  ['how-to-play', 'How to Play'],
  ['achievements', 'Achievements'],
  ['settings', 'Settings'],
] as const;

describe('ShellNavigation', () => {
  it.each(routes)('requests exactly %s while leaving selection controlled', async (route, label) => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const props: ShellNavigationProps = Object.freeze({ selected: 'home', hidden: false, onNavigate });
    const { rerender } = render(<ShellNavigation {...props} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(routes.map(([, text]) => text));
    await user.click(screen.getByRole('button', { name: label }));
    expect(onNavigate.mock.calls).toEqual([[route]]);
    expect(screen.getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBe('page');
    expect(props.selected).toBe('home');

    rerender(<ShellNavigation {...props} selected={route} />);
    expect(screen.getByRole('button', { name: label }).getAttribute('aria-current')).toBe('page');
    expect(screen.getAllByRole('button').filter((button) => button.hasAttribute('aria-current'))).toHaveLength(1);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('supports native tab order and Enter/Space without submitting a host form', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onSubmit = vi.fn((event: React.SubmitEvent<HTMLFormElement>) => event.preventDefault());
    render(<form onSubmit={onSubmit}><ShellNavigation selected="settings" hidden={false} onNavigate={onNavigate} /></form>);

    for (const [route, label] of routes) {
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: label }));
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onNavigate.mock.calls.slice(-2)).toEqual([[route], [route]]);
    }
    expect(onNavigate).toHaveBeenCalledTimes(8);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('removes the rail and tab stops while hidden and restores supplied selection', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const view = (hidden: boolean) => <><ShellNavigation selected="achievements" hidden={hidden} onNavigate={onNavigate} /><button>After rail</button></>;
    const { rerender } = render(view(true));
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After rail' }));

    rerender(view(false));
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Achievements' }).getAttribute('aria-current')).toBe('page');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    rerender(view(true));
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(onNavigate.mock.calls).toEqual([['settings']]);
  });
});
