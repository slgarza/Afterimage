// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LobbySettingsForm, type LobbySettingsFormProps } from './index.js';

afterEach(cleanup);

function settings(overrides: Partial<LobbySettingsFormProps> = {}): LobbySettingsFormProps {
  return Object.freeze({
    players: 5, roundSeconds: 60, fillWithBots: false, editable: true, busy: false,
    onPlayersChange: vi.fn(), onRoundSecondsChange: vi.fn(), onFillWithBotsChange: vi.fn(),
    onSave: vi.fn(), onClose: vi.fn(), ...overrides,
  });
}

describe('LobbySettingsForm', () => {
  it('emits only canonical values and leaves supplied values controlled', async () => {
    const props = settings();
    render(<LobbySettingsForm {...props} />);
    const user = userEvent.setup();
    const players = screen.getByLabelText<HTMLSelectElement>('Players');
    const timer = screen.getByLabelText<HTMLSelectElement>('Round duration');
    expect(Array.from(players.options, (option) => option.value)).toEqual(['5', '6', '7', '8', '9', '10']);
    expect(Array.from(timer.options, (option) => option.value)).toEqual(['30', '60', '90', '120']);
    for (const value of ['5', '6', '7', '8', '9', '10']) await user.selectOptions(players, value);
    for (const value of ['30', '60', '90', '120']) await user.selectOptions(timer, value);
    await user.click(screen.getByRole('checkbox'));
    expect(props.onPlayersChange).toHaveBeenCalledTimes(6);
    expect(vi.mocked(props.onPlayersChange).mock.calls).toEqual([[5], [6], [7], [8], [9], [10]]);
    expect(vi.mocked(props.onRoundSecondsChange).mock.calls).toEqual([[30], [60], [90], [120]]);
    expect(props.onFillWithBotsChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(players.value).toBe('5');
    expect(timer.value).toBe('60');
    expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(false);
    expect(props.players).toBe(5);
  });

  it('allows inspection and keyboard closing without read-only changes or submission', async () => {
    const props = settings({ editable: false });
    render(<LobbySettingsForm {...props} />);
    expect(screen.getByText('5–10 players')).toBeTruthy();
    expect(screen.getByText('30 / 60 / 90 / 120 seconds')).toBeTruthy();
    for (const select of screen.getAllByRole('combobox')) {
      expect(select.matches(':disabled')).toBe(true);
      fireEvent.change(select, { target: { value: '90' } });
    }
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('form', { name: 'Lobby settings' }));
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Save' }).disabled).toBe(true);
    expect(props.onPlayersChange).not.toHaveBeenCalled();
    expect(props.onRoundSecondsChange).not.toHaveBeenCalled();
    expect(props.onFillWithBotsChange).not.toHaveBeenCalled();
    expect(props.onSave).not.toHaveBeenCalled();
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    await user.keyboard('{Enter}');
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('replaces supplied values and permissions and suppresses saves while busy', async () => {
    const props = settings();
    const { rerender } = render(<LobbySettingsForm {...props} />);
    const user = userEvent.setup();
    screen.getByRole('button', { name: 'Save' }).focus();
    await user.keyboard('{Enter}');
    expect(props.onSave).toHaveBeenCalledOnce();
    rerender(<LobbySettingsForm {...props} players={10} roundSeconds={120} fillWithBots busy />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.submit(screen.getByRole('form', { name: 'Lobby settings' }));
    expect(props.onSave).toHaveBeenCalledOnce();
    expect(screen.getByRole('status').textContent).toBe('Saving settings…');
    expect(screen.getByLabelText<HTMLSelectElement>('Players').value).toBe('10');
    expect(screen.getByLabelText<HTMLSelectElement>('Round duration').value).toBe('120');
    expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(true);
    rerender(<LobbySettingsForm {...props} editable={false} />);
    expect(screen.getByLabelText('Players').matches(':disabled')).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('rejects unavailable selections and does not silently normalize invalid supplied counts', () => {
    const props = settings({ players: 11 });
    render(<LobbySettingsForm {...props} />);
    expect(screen.getByLabelText<HTMLSelectElement>('Players').value).toBe('');
    expect(screen.getByText('Unavailable player count (11)')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Players'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Round duration'), { target: { value: '45' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Lobby settings' }));
    expect(props.onPlayersChange).not.toHaveBeenCalled();
    expect(props.onRoundSecondsChange).not.toHaveBeenCalled();
    expect(props.onSave).not.toHaveBeenCalled();
  });
});
