// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoomEntryForm } from './index.js';

afterEach(cleanup);

function setup() {
  const onCreate = vi.fn();
  const onJoin = vi.fn();
  const view = render(<RoomEntryForm onCreate={onCreate} onJoin={onJoin} />);
  return { onCreate, onJoin, ...view };
}

function setName(value: string) {
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value } });
}

function submit() {
  fireEvent.submit(screen.getByRole('form', { name: 'Room entry' }));
}

describe('RoomEntryForm', () => {
  it('defaults to Create and submits only a trimmed name with Enter', async () => {
    const { onCreate, onJoin } = setup();
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Create' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByLabelText('Room code')).toBeNull();
    await user.type(screen.getByLabelText('Display name'), '  Mira  Vale  {Enter}');
    expect(onCreate.mock.calls).toEqual([[{ displayName: 'Mira  Vale' }]]);
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('joins with normalized allowed fields using Enter', async () => {
    const { onCreate, onJoin } = setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Join' }));
    expect(screen.getByRole('button', { name: 'Join' }).getAttribute('aria-pressed')).toBe('true');
    await user.type(screen.getByLabelText('Display name'), '  Écho  ');
    await user.type(screen.getByLabelText('Room code'), ' ab12cd {Enter}');
    expect(onJoin.mock.calls).toEqual([[{ roomCode: 'AB12CD', displayName: 'Écho' }]]);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it.each(['A', '🌒'.repeat(24), '界'.repeat(24), 'a'.repeat(24)])('accepts canonical name boundary %s', (name) => {
    const { onCreate } = setup();
    setName(name);
    submit();
    expect(onCreate.mock.calls).toEqual([[{ displayName: name }]]);
  });

  it.each(['', '   ', '🌒'.repeat(25), 'a'.repeat(25), 'Mi\u0007ra'])('rejects invalid names and preserves input %s', (name) => {
    const { onCreate, onJoin } = setup();
    setName(name);
    submit();
    const input = screen.getByLabelText<HTMLInputElement>('Display name');
    expect(input.value).toBe(name);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const error = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    expect(error?.textContent).toBe('Enter a display name with 1–24 characters and no control characters.');
    expect(onCreate).not.toHaveBeenCalled();
    expect(onJoin).not.toHaveBeenCalled();
  });

  it.each(['', 'ABCDE', 'ABCDEFG', 'ABC-D1', 'ＡＢＣ１２３', 'AB CD1'])('rejects invalid join codes %s with an associated error', (code) => {
    const { onCreate, onJoin } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    setName('Mira');
    fireEvent.change(screen.getByLabelText('Room code'), { target: { value: code } });
    submit();
    const input = screen.getByLabelText<HTMLInputElement>('Room code');
    expect(input.value).toBe(code);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Enter a room code with exactly six letters (A–Z) or digits (0–9).');
    expect(screen.getByLabelText('Display name').hasAttribute('aria-invalid')).toBe(false);
    expect(onCreate).not.toHaveBeenCalled();
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('requires both join fields and clears errors on mode changes without losing input', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    submit();
    expect(screen.getByLabelText('Display name').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('Room code').getAttribute('aria-invalid')).toBe('true');
    setName('  Mira  ');
    fireEvent.change(screen.getByLabelText('Room code'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByLabelText<HTMLInputElement>('Display name').value).toBe('  Mira  ');
    expect(screen.getByLabelText('Display name').hasAttribute('aria-describedby')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(screen.getByLabelText<HTMLInputElement>('Room code').value).toBe('abc');
    expect(screen.getByLabelText('Room code').hasAttribute('aria-invalid')).toBe(false);
  });

  it('uses unique IDs and local associations across multiple instances', () => {
    setup();
    setup();
    const forms = screen.getAllByRole('form');
    for (const form of forms) {
      fireEvent.click(within(form).getByRole('button', { name: 'Join' }));
      fireEvent.submit(form);
      for (const label of ['Display name', 'Room code']) {
        const input = within(form).getByLabelText(label);
        expect(form.contains(document.getElementById(input.getAttribute('aria-describedby') ?? ''))).toBe(true);
      }
    }
    const ids = Array.from(document.querySelectorAll('[id]'), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(['create', 'join'])('blocks every submission and mode change while busy in %s mode', async (mode) => {
    const { onCreate, onJoin, rerender } = setup();
    const user = userEvent.setup();
    if (mode === 'join') {
      await user.click(screen.getByRole('button', { name: 'Join' }));
      fireEvent.change(screen.getByLabelText('Room code'), { target: { value: 'ABC123' } });
    }
    setName('Mira');
    rerender(<RoomEntryForm busy onCreate={onCreate} onJoin={onJoin} />);
    for (const button of screen.getAllByRole<HTMLButtonElement>('button')) {
      expect(button.disabled).toBe(true);
      await user.click(button);
    }
    await user.keyboard('{Enter}');
    submit();
    expect(screen.getByRole('button', { name: mode === 'create' ? 'Create' : 'Join' }).getAttribute('aria-pressed')).toBe('true');
    expect(onCreate).not.toHaveBeenCalled();
    expect(onJoin).not.toHaveBeenCalled();
    rerender(<RoomEntryForm onCreate={onCreate} onJoin={onJoin} />);
    submit();
    expect(onCreate.mock.calls.length + onJoin.mock.calls.length).toBe(1);
  });
});
