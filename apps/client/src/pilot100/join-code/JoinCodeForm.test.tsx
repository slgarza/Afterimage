// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JoinCodeForm } from './index.js';
import type { JoinCodeFormProps } from './index.js';

afterEach(cleanup);

function props(overrides: Partial<JoinCodeFormProps> = {}): JoinCodeFormProps {
  return Object.freeze({
    code: '', passcode: '', passcodeRequired: false, busy: false, error: null,
    onCodeChange: vi.fn(), onPasscodeChange: vi.fn(), onJoin: vi.fn(), onBack: vi.fn(),
    ...overrides,
  });
}

describe('JoinCodeForm', () => {
  it('shows the controlled password only on authority request and removes it on rerender', () => {
    const value = props({ passcode: 'private value' });
    const { rerender, container } = render(<JoinCodeForm {...value} />);
    expect(screen.queryByLabelText('Passcode')).toBeNull();
    expect(container.innerHTML).not.toContain(value.passcode);
    rerender(<JoinCodeForm {...value} passcodeRequired />);
    const input = screen.getByLabelText<HTMLInputElement>('Passcode');
    expect(input.type).toBe('password');
    expect(input.value).toBe(value.passcode);
    fireEvent.change(input, { target: { value: ' new secret ' } });
    expect(value.onPasscodeChange).toHaveBeenCalledWith(' new secret ');
    expect(input.value).toBe(value.passcode);
    rerender(<JoinCodeForm {...value} />);
    expect(screen.queryByLabelText('Passcode')).toBeNull();
    expect(container.innerHTML).not.toContain(value.passcode);
  });

  it('forwards raw code edits and lets authority control syntax and submission', async () => {
    const value = props({ code: 'a' });
    const { rerender } = render(<JoinCodeForm {...value} />);
    const input = screen.getByLabelText<HTMLInputElement>('Room code');
    fireEvent.change(input, { target: { value: ' ab-? ' } });
    expect(value.onCodeChange).toHaveBeenCalledWith(' ab-? ');
    expect(input.value).toBe('a');
    rerender(<JoinCodeForm {...value} code=" ab-? " />);
    expect(input.value).toBe(' ab-? ');
    await userEvent.setup().type(input, '{Enter}');
    expect(value.onJoin).toHaveBeenCalledExactlyOnceWith();
    expect(screen.getAllByRole('button', { name: 'Join' })).toHaveLength(1);
  });

  it('blocks clicks, Enter and direct submissions while busy but allows Back', async () => {
    const value = props();
    const { rerender } = render(<JoinCodeForm {...value} />);
    rerender(<JoinCodeForm {...value} busy />);
    const user = userEvent.setup();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Join' }).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Join' }));
    await user.keyboard('{Enter}');
    fireEvent.submit(screen.getByRole('form', { name: 'Join with code' }));
    expect(value.onJoin).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(value.onBack).toHaveBeenCalledExactlyOnceWith();
    rerender(<JoinCodeForm {...value} />);
    await user.click(screen.getByRole('button', { name: 'Join' }));
    expect(value.onJoin).toHaveBeenCalledExactlyOnceWith();
  });

  it.each(['Invalid code.', 'Room is full.', 'Joining is unavailable.'])('renders safe error verbatim: %s', (error) => {
    const value = props({ error, passcode: 'hidden credential' });
    const { container, rerender } = render(<JoinCodeForm {...value} />);
    expect(screen.getByRole('alert').textContent).toBe(error);
    const form = screen.getByRole('form', { name: 'Join with code' });
    expect(document.getElementById(form.getAttribute('aria-describedby') ?? '')?.textContent).toBe(error);
    expect(container.innerHTML).not.toContain(value.passcode);
    rerender(<JoinCodeForm {...value} error={null} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps labels distinct across multiple instances', () => {
    render(<><JoinCodeForm {...props()} /><JoinCodeForm {...props({ passcodeRequired: true })} /></>);
    const inputs = screen.getAllByLabelText('Room code');
    expect(inputs[0]?.id).not.toBe(inputs[1]?.id);
    expect(screen.getByLabelText('Passcode').id).not.toBe(inputs[0]?.id);
  });
});
