// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AliasProfileEditor, type AliasProfileEditorProps } from './index';

afterEach(cleanup);

function fixture(overrides: Partial<AliasProfileEditorProps> = {}): AliasProfileEditorProps {
  return Object.freeze({
    alias: 'Shared alias', avatarLabel: 'Current avatar', busy: false, error: null,
    onAliasChange: vi.fn(), onChooseAvatar: vi.fn(), onContinue: vi.fn(), onBack: vi.fn(),
    ...overrides,
  });
}

describe('AliasProfileEditor', () => {
  it('requests the exact alias value and waits for a controlled parent update', () => {
    const props = fixture();
    const { rerender } = render(<AliasProfileEditor {...props} />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Temporary alias' });
    fireEvent.change(input, { target: { value: '  Shared alias  ' } });
    expect(props.onAliasChange).toHaveBeenCalledExactlyOnceWith('  Shared alias  ');
    expect(input.value).toBe('Shared alias');
    expect(props.onChooseAvatar).not.toHaveBeenCalled();
    expect(props.onContinue).not.toHaveBeenCalled();
    rerender(<AliasProfileEditor {...props} alias="  Shared alias  " />);
    expect(input.value).toBe('  Shared alias  ');
    expect(props.alias).toBe('Shared alias');
  });

  it('requests the avatar picker without changing alias or identity', async () => {
    const user = userEvent.setup();
    const props = fixture();
    render(<AliasProfileEditor {...props} />);
    await user.click(screen.getByRole('button', { name: /Tap to change/ }));
    expect(props.onChooseAvatar).toHaveBeenCalledTimes(1);
    expect(props.onAliasChange).not.toHaveBeenCalled();
    expect(props.onContinue).not.toHaveBeenCalled();
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe(props.alias);
    expect(screen.getByRole('img', { name: 'Current avatar' })).toBeTruthy();
  });

  it('supports keyboard continuation and uses the latest supplied callback', async () => {
    const user = userEvent.setup();
    const original = fixture();
    const updated = fixture();
    const { rerender } = render(<AliasProfileEditor {...original} />);
    screen.getByRole('button', { name: 'Continue' }).focus();
    await user.keyboard('{Enter}');
    expect(original.onContinue).toHaveBeenCalledTimes(1);
    rerender(<AliasProfileEditor {...updated} />);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(updated.onContinue).toHaveBeenCalledTimes(1);
    expect(original.onContinue).toHaveBeenCalledTimes(1);
  });

  it.each([{ busy: true, error: null }, { busy: false, error: 'Choose another value.' }])(
    'blocks click, Enter and explicit form submission for %j', async state => {
      const user = userEvent.setup();
      const props = fixture(state);
      render(<AliasProfileEditor {...props} />);
      const submit = screen.getByRole<HTMLButtonElement>('button', { name: 'Continue' });
      expect(submit.disabled).toBe(true);
      await user.click(submit);
      screen.getByRole('textbox').focus();
      await user.keyboard('{Enter}');
      fireEvent.submit(screen.getByRole('form', { name: 'Edit temporary alias' }));
      expect(props.onContinue).not.toHaveBeenCalled();
    },
  );

  it('allows continuation after the host clears busy and error state', async () => {
    const props = fixture({ busy: true, error: 'Waiting for validation.' });
    const { rerender } = render(<AliasProfileEditor {...props} />);
    fireEvent.submit(screen.getByRole('form', { name: 'Edit temporary alias' }));
    expect(props.onContinue).not.toHaveBeenCalled();
    rerender(<AliasProfileEditor {...props} busy={false} error={null} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Continue' }).disabled).toBe(false);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue' }));
    expect(props.onContinue).toHaveBeenCalledTimes(1);
  });

  it('renders the provided error as safe text with an accessible input description', () => {
    const error = '<img src=x onerror=alert(1)>';
    const { container } = render(<AliasProfileEditor {...fixture({ error })} />);
    const input = screen.getByRole('textbox');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe(error);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
    expect(container.querySelector('img, script')).toBeNull();
  });

  it('keeps the safe Back action keyboard accessible while continuation is blocked', async () => {
    const props = fixture({ busy: true, error: 'Unavailable.' });
    render(<AliasProfileEditor {...props} />);
    screen.getByRole('button', { name: 'Back' }).focus();
    await userEvent.setup().keyboard(' ');
    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect(props.onContinue).not.toHaveBeenCalled();
    expect(props.onAliasChange).not.toHaveBeenCalled();
  });

  it('keeps accessible input IDs distinct across mounted instances', () => {
    render(<><AliasProfileEditor {...fixture()} /><AliasProfileEditor {...fixture()} /></>);
    const ids = screen.getAllByRole('textbox', { name: 'Temporary alias' }).map(input => input.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(2);
  });
});
