// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateLobbyForm, type CreateLobbyFormProps, type LobbyDraft } from './index';

afterEach(cleanup);

function draft(overrides: Partial<LobbyDraft> = {}): LobbyDraft {
  return Object.freeze({
    name: 'Shared room', players: 5, roundSeconds: 60,
    fillWithBots: true, difficulty: 'calm', listed: true,
    requirePasscode: true, passcode: 'NeverEcho42', ...overrides,
  });
}

function fixture(overrides: Partial<CreateLobbyFormProps> = {}): CreateLobbyFormProps {
  return Object.freeze({
    value: draft(), difficulties: Object.freeze([{ id: 'calm', label: 'Calm' }, { id: 'sharp', label: 'Sharp' }]),
    busy: false, error: null, onChange: vi.fn(), onCreate: vi.fn(), onClose: vi.fn(), ...overrides,
  });
}

describe('CreateLobbyForm', () => {
  it('keeps seat requests in 5–10 and preserves every unrelated draft field', async () => {
    const user = userEvent.setup();
    const props = fixture();
    const { rerender } = render(<CreateLobbyForm {...props} />);
    for (let players = 5; players <= 10; players++) {
      const value = draft({ players });
      rerender(<CreateLobbyForm {...props} value={value} />);
      const less = screen.getByRole<HTMLButtonElement>('button', { name: 'Fewer seats' });
      const more = screen.getByRole<HTMLButtonElement>('button', { name: 'More seats' });
      expect(less.disabled).toBe(players === 5);
      expect(more.disabled).toBe(players === 10);
      vi.mocked(props.onChange).mockClear();
      await user.click(less);
      await user.click(more);
      expect(vi.mocked(props.onChange).mock.calls).toEqual([
        ...(players > 5 ? [[{ ...value, players: players - 1 }]] : []),
        ...(players < 10 ? [[{ ...value, players: players + 1 }]] : []),
      ]);
      expect(screen.getByLabelText('Seat count').textContent).toBe(String(players));
      expect(value.players).toBe(players);
    }
  });

  it('requests only the four canonical timer steps without mutating controlled data', async () => {
    const timers = [30, 60, 90, 120] as const;
    const user = userEvent.setup();
    const props = fixture();
    const { rerender } = render(<CreateLobbyForm {...props} />);
    for (const [index, roundSeconds] of timers.entries()) {
      const value = draft({ roundSeconds });
      rerender(<CreateLobbyForm {...props} value={value} />);
      const less = screen.getByRole<HTMLButtonElement>('button', { name: 'Shorter round' });
      const more = screen.getByRole<HTMLButtonElement>('button', { name: 'Longer round' });
      expect(less.disabled).toBe(index === 0);
      expect(more.disabled).toBe(index === timers.length - 1);
      vi.mocked(props.onChange).mockClear();
      await user.click(less);
      await user.click(more);
      expect(vi.mocked(props.onChange).mock.calls).toEqual([
        ...(index > 0 ? [[{ ...value, roundSeconds: timers[index - 1] }]] : []),
        ...(index < timers.length - 1 ? [[{ ...value, roundSeconds: timers[index + 1] }]] : []),
      ]);
      expect(screen.getByLabelText('Round duration').textContent).toBe(`${roundSeconds} seconds`);
    }
  });

  it('preserves exact name edits and waits for the host to update the draft', () => {
    const props = fixture();
    const { rerender } = render(<CreateLobbyForm {...props} />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Lobby name' });
    fireEvent.change(input, { target: { value: '  Another room  ' } });
    expect(props.onChange).toHaveBeenCalledExactlyOnceWith({ ...props.value, name: '  Another room  ' });
    expect(input.value).toBe(props.value.name);
    rerender(<CreateLobbyForm {...props} value={draft({ name: '  Another room  ' })} />);
    expect(input.value).toBe('  Another room  ');
    expect(props.value.name).toBe('Shared room');
  });

  it('keeps bot, difficulty and listing edits scoped to their supplied draft fields', async () => {
    const user = userEvent.setup();
    const props = fixture();
    const { rerender } = render(<CreateLobbyForm {...props} />);
    await user.click(screen.getByRole('checkbox', { name: 'Fill empty seats with bots' }));
    expect(props.onChange).toHaveBeenLastCalledWith({ ...props.value, fillWithBots: false });
    rerender(<CreateLobbyForm {...props} value={draft({ fillWithBots: false })} />);
    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Bot difficulty' }).disabled).toBe(true);
    rerender(<CreateLobbyForm {...props} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Bot difficulty' }), 'sharp');
    expect(props.onChange).toHaveBeenLastCalledWith({ ...props.value, difficulty: 'sharp' });
    await user.click(screen.getByRole('checkbox', { name: 'Show in lobby directory' }));
    expect(props.onChange).toHaveBeenLastCalledWith({ ...props.value, listed: false });
  });

  it('clears the passcode through the host when protection is disabled and hides the field', async () => {
    const props = fixture();
    const { rerender } = render(<CreateLobbyForm {...props} />);
    expect(screen.getByLabelText('Passcode').getAttribute('type')).toBe('password');
    await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Require passcode' }));
    const cleared = draft({ requirePasscode: false, passcode: '' });
    expect(props.onChange).toHaveBeenCalledExactlyOnceWith(cleared);
    expect(props.value.passcode).toBe('NeverEcho42');
    rerender(<CreateLobbyForm {...props} value={cleared} />);
    expect(screen.queryByLabelText('Passcode')).toBeNull();
    expect(screen.getByRole('form').textContent).not.toContain('NeverEcho42');
  });

  it('sends an exact ephemeral passcode edit without submitting or echoing it', () => {
    const props = fixture();
    render(<CreateLobbyForm {...props} />);
    fireEvent.change(screen.getByLabelText('Passcode'), { target: { value: '  New pass  ' } });
    expect(props.onChange).toHaveBeenCalledExactlyOnceWith({ ...props.value, passcode: '  New pass  ' });
    expect(props.onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole('form').textContent).not.toContain('  New pass  ');
  });

  it('blocks duplicate creation while busy, including direct form submission', async () => {
    const props = fixture({ busy: true });
    render(<CreateLobbyForm {...props} />);
    const form = screen.getByRole('form', { name: 'Create lobby' });
    expect(form.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Creating…' }).disabled).toBe(true);
    fireEvent.submit(form);
    expect(props.onCreate).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close create lobby' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onCreate).not.toHaveBeenCalled();
  });

  it('requests creation by keyboard only after the host removes busy state', async () => {
    const props = fixture({ busy: true });
    const { rerender } = render(<CreateLobbyForm {...props} />);
    rerender(<CreateLobbyForm {...props} busy={false} />);
    screen.getByRole('button', { name: 'Create lobby' }).focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(props.onCreate).toHaveBeenCalledTimes(1);
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('renders accessible errors as text and redacts the current passcode', () => {
    const props = fixture({ error: 'NeverEcho42: <img src=x onerror=alert(1)>' });
    const { container } = render(<CreateLobbyForm {...props} />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('[redacted]: <img src=x onerror=alert(1)>');
    expect(container.textContent).not.toContain('NeverEcho42');
    expect(container.querySelector('img, script')).toBeNull();
  });

  it('honestly disables bot difficulty when there are no supplied choices', () => {
    const props = fixture({ difficulties: [] });
    render(<CreateLobbyForm {...props} />);
    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Bot difficulty' }).disabled).toBe(true);
    expect(screen.getByRole('option', { name: 'Difficulties unavailable' })).toBeTruthy();
    expect(props.onChange).not.toHaveBeenCalled();
  });
});
