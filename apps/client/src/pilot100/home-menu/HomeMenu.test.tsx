// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { HomeMenu, type HomeMenuProps } from './index.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function props(mode: HomeMenuProps['mode'] = 'solo'): HomeMenuProps {
  return Object.freeze({ mode, logo: null, onModeChange: vi.fn(), onPlay: vi.fn() });
}

describe('HomeMenu', () => {
  it.each(['solo', 'multiplayer'] as const)('exposes supplied %s selection and a single launch action', (mode) => {
    render(<HomeMenu {...props(mode)} />);
    expect(screen.getByRole('heading', { name: 'Afterimage' })).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('group', { name: 'Play mode' })).toBeTruthy();
    expect((screen.getByRole('radio', { name: 'Solo' }) as HTMLInputElement).checked).toBe(mode === 'solo');
    expect((screen.getByRole('radio', { name: 'Multiplayer' }) as HTMLInputElement).checked).toBe(mode === 'multiplayer');
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Play']);
  });

  it('requests a mode change without substituting local state for the supplied mode', async () => {
    const user = userEvent.setup();
    const supplied = props();
    render(<HomeMenu {...supplied} />);
    await user.click(screen.getByRole('radio', { name: 'Multiplayer' }));
    expect(supplied.onModeChange).toHaveBeenCalledExactlyOnceWith('multiplayer');
    expect((screen.getByRole('radio', { name: 'Solo' }) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(supplied.onPlay).toHaveBeenCalledExactlyOnceWith('solo');
  });

  it('supports keyboard mode selection and Play activation with parent updates', async () => {
    // jsdom lacks the escape function used by user-event for native radio peers.
    vi.stubGlobal('CSS', { escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, character => `\\${character.codePointAt(0)!.toString(16)} `) });
    const user = userEvent.setup();
    const onPlay = vi.fn();
    function ControlledMenu() {
      const [mode, setMode] = useState<HomeMenuProps['mode']>('solo');
      return <HomeMenu mode={mode} logo={null} onModeChange={setMode} onPlay={onPlay} />;
    }
    render(<ControlledMenu />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Solo' }));
    await user.keyboard('{ArrowRight}');
    expect((screen.getByRole('radio', { name: 'Multiplayer' }) as HTMLInputElement).checked).toBe(true);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Play' }));
    await user.keyboard('{Enter}');
    expect(onPlay).toHaveBeenCalledExactlyOnceWith('multiplayer');
  });

  it('uses the latest mode and callback after a parent rerender', async () => {
    const user = userEvent.setup();
    const original = props();
    const updated = props('multiplayer');
    const { rerender } = render(<HomeMenu {...original} />);
    rerender(<HomeMenu {...updated} />);
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(original.onPlay).not.toHaveBeenCalled();
    expect(updated.onPlay).toHaveBeenCalledExactlyOnceWith('multiplayer');
  });

  it('renders the supplied logo with its accessible text', () => {
    render(<HomeMenu {...props()} logo={{ src: '/home-mark.svg', alt: 'Afterimage title' }} />);
    const logo = screen.getByRole('img', { name: 'Afterimage title' });
    expect(logo.getAttribute('src')).toBe('/home-mark.svg');
    expect(screen.getByRole('heading', { name: 'Afterimage title' })).toBeTruthy();
  });

  it.each(['', '   '])('keeps the working title for a blank logo source %j', src => {
    render(<HomeMenu {...props()} logo={{ src, alt: 'Approved title' }} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Afterimage' })).toBeTruthy();
  });

  it('replaces failed media with the working title and retries a new supplied source', () => {
    const supplied = props();
    const { rerender } = render(<HomeMenu {...supplied} logo={{ src: '/missing.svg', alt: 'Original title' }} />);
    fireEvent.error(screen.getByRole('img', { name: 'Original title' }));
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Afterimage' })).toBeTruthy();
    rerender(<HomeMenu {...supplied} logo={{ src: '/approved-new.svg', alt: 'New approved title' }} />);
    expect(screen.getByRole('img', { name: 'New approved title' }).getAttribute('src')).toBe('/approved-new.svg');
    expect(screen.getByRole('heading', { name: 'New approved title' })).toBeTruthy();
    expect(supplied.onModeChange).not.toHaveBeenCalled();
    expect(supplied.onPlay).not.toHaveBeenCalled();
  });
});
