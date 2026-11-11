// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioSettings, type AudioSettingsProps } from './index';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function fixture(overrides: Partial<AudioSettingsProps> = {}): AudioSettingsProps {
  return Object.freeze({
    musicEnabled: true, sfxEnabled: false, hapticsEnabled: false,
    musicVolume: 0.7, sfxVolume: 0.3, hapticsSupported: true,
    onMusicEnabledChange: vi.fn(), onSfxEnabledChange: vi.fn(),
    onHapticsEnabledChange: vi.fn(), onMusicVolumeChange: vi.fn(),
    onSfxVolumeChange: vi.fn(), onClose: vi.fn(), ...overrides,
  });
}

function expectSilent(props: AudioSettingsProps) {
  for (const [key, callback] of Object.entries(props)) {
    if (key.startsWith('on')) expect(callback).not.toHaveBeenCalled();
  }
}

describe('AudioSettings', () => {
  it('only requests independent toggle changes and follows controlled rerenders', async () => {
    const user = userEvent.setup();
    const props = fixture();
    const { rerender } = render(<AudioSettings {...props} />);
    expectSilent(props);
    const music = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Music enabled' });
    music.focus();
    await user.keyboard(' ');
    expect(props.onMusicEnabledChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(music.checked).toBe(true);
    expect(props.onSfxEnabledChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox', { name: 'Sound effects enabled' }));
    expect(props.onSfxEnabledChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(props.onHapticsEnabledChange).not.toHaveBeenCalled();
    expect(props.onMusicVolumeChange).not.toHaveBeenCalled();
    expect(props.onSfxVolumeChange).not.toHaveBeenCalled();
    rerender(<AudioSettings {...props} musicEnabled={false} sfxEnabled />);
    expect(music.checked).toBe(false);
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Sound effects enabled' }).checked).toBe(true);
    expect(props.musicEnabled).toBe(true);
  });

  it('requests independent bounded volume changes and reflects host values', () => {
    const props = fixture();
    const { rerender } = render(<AudioSettings {...props} />);
    const music = screen.getByRole<HTMLInputElement>('slider', { name: /Music volume/ });
    const sfx = screen.getByRole<HTMLInputElement>('slider', { name: /Sound effects volume/ });
    expect([music.min, music.max, music.step]).toEqual(['0', '1', '0.01']);
    fireEvent.change(music, { target: { value: '0.52' } });
    expect(props.onMusicVolumeChange).toHaveBeenLastCalledWith(0.52);
    expect(music.value).toBe('0.7');
    expect(props.onSfxVolumeChange).not.toHaveBeenCalled();
    fireEvent.change(music, { target: { value: '-9' } });
    expect(props.onMusicVolumeChange).toHaveBeenLastCalledWith(0);
    fireEvent.change(sfx, { target: { value: '9' } });
    expect(props.onSfxVolumeChange).toHaveBeenCalledExactlyOnceWith(1);
    expect(props.onMusicEnabledChange).not.toHaveBeenCalled();
    expect(props.onSfxEnabledChange).not.toHaveBeenCalled();
    expect(props.onHapticsEnabledChange).not.toHaveBeenCalled();
    rerender(<AudioSettings {...props} musicVolume={0} sfxVolume={1} />);
    expect(music.value).toBe('0');
    expect(sfx.value).toBe('1');
  });

  it.each([
    [-1, 2, '0', '1'], [NaN, -Infinity, '0', '0'], [Infinity, NaN, '1', '0'],
  ])('bounds invalid host volumes %s / %s without correcting host state', (musicVolume, sfxVolume, music, sfx) => {
    const props = fixture({ musicVolume, sfxVolume });
    render(<AudioSettings {...props} />);
    expect(screen.getByRole<HTMLInputElement>('slider', { name: /Music volume/ }).value).toBe(music);
    expect(screen.getByRole<HTMLInputElement>('slider', { name: /Sound effects volume/ }).value).toBe(sfx);
    expectSilent(props);
  });

  it('blocks unsupported haptics even with stale enabled input, then follows capability changes', async () => {
    const user = userEvent.setup();
    const props = fixture({ hapticsSupported: false, hapticsEnabled: true });
    const { rerender } = render(<AudioSettings {...props} />);
    const haptics = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Haptics enabled' });
    expect(haptics.disabled).toBe(true);
    expect(haptics.checked).toBe(false);
    const description = document.getElementById(haptics.getAttribute('aria-describedby') ?? '');
    expect(description?.textContent).toMatch(/unavailable/);
    await user.click(haptics);
    fireEvent.change(haptics, { target: { checked: true } });
    expectSilent(props);
    rerender(<AudioSettings {...props} hapticsSupported hapticsEnabled={false} />);
    expect(haptics.disabled).toBe(false);
    haptics.focus();
    await user.keyboard(' ');
    expect(props.onHapticsEnabledChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(haptics.checked).toBe(false);
    rerender(<AudioSettings {...props} hapticsSupported />);
    expect(haptics.checked).toBe(true);
    await user.click(haptics);
    expect(props.onHapticsEnabledChange).toHaveBeenLastCalledWith(false);
  });

  it('does not play media, persist preferences or provide a modal root', async () => {
    const user = userEvent.setup();
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const props = fixture();
    const { container } = render(<AudioSettings {...props} />);
    await user.click(screen.getByRole('checkbox', { name: 'Music enabled' }));
    await user.click(screen.getByRole('checkbox', { name: 'Sound effects enabled' }));
    await user.click(screen.getByRole('checkbox', { name: 'Haptics enabled' }));
    fireEvent.change(screen.getByRole('slider', { name: /Music volume/ }), { target: { value: '1' } });
    await user.click(screen.getByRole('button', { name: 'Close audio settings' }));
    expect(props.onClose).toHaveBeenCalledExactlyOnceWith();
    expect(play).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
    expect(container.querySelector('audio, video, [aria-modal], [role="dialog"]')).toBeNull();
    expect(screen.getByText(/system mute/)).toBeTruthy();
  });
});
