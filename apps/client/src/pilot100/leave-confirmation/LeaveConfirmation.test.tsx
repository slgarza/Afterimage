// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LeaveConfirmation, type LeaveConfirmationProps } from './index';

afterEach(cleanup);

function fixture(overrides: Partial<LeaveConfirmationProps> = {}): LeaveConfirmationProps {
  return Object.freeze({
    mode: 'solo',
    busy: false,
    consequence: 'Return to the menu.',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  });
}

describe('LeaveConfirmation', () => {
  it('renders supplied consequence as text and only content for the modal host', () => {
    const props = fixture({ consequence: '<img src=x onerror=alert(1)>\nPublic consequence.' });
    const { container } = render(<LeaveConfirmation {...props} />);
    expect(screen.getByRole('region', { name: 'Leave Solo?' })).toBeTruthy();
    expect(container.querySelector('p')?.textContent).toBe(props.consequence);
    expect(container.querySelector('img, dialog, [aria-modal], [autofocus]')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('requests only the selected action on pointer activation, without changing the view', async () => {
    const user = userEvent.setup();
    const props = fixture();
    render(<LeaveConfirmation {...props} />);
    await user.click(screen.getByRole('button', { name: 'Stay' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Leave Solo?' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Leave' }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('supports native keyboard Stay and Leave actions', async () => {
    const user = userEvent.setup();
    const props = fixture();
    render(<LeaveConfirmation {...props} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Stay' }));
    await user.keyboard('{Enter}');
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    await user.tab();
    await user.keyboard(' ');
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('blocks busy confirmation, allows Stay, and uses updated controlled props', async () => {
    const user = userEvent.setup();
    const original = fixture({ busy: true });
    const { rerender } = render(<LeaveConfirmation {...original} />);
    const leave = screen.getByRole('button', { name: 'Leave' }) as HTMLButtonElement;
    expect(leave.disabled).toBe(true);
    await user.click(leave);
    fireEvent.click(leave);
    expect(original.onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Stay' }));
    expect(original.onCancel).toHaveBeenCalledTimes(1);

    const updated = fixture({ mode: 'multiplayer', consequence: 'Return to the lobby.' });
    rerender(<LeaveConfirmation {...updated} />);
    expect(screen.getByRole('heading', { name: 'Leave the room?' })).toBeTruthy();
    expect(screen.getByText(updated.consequence)).toBeTruthy();
    expect(screen.getByText('The match continues for other players while you decide and after you leave.')).toBeTruthy();
    expect(leave.disabled).toBe(false);
    await user.click(leave);
    await user.click(screen.getByRole('button', { name: 'Stay' }));
    expect(updated.onConfirm).toHaveBeenCalledTimes(1);
    expect(updated.onCancel).toHaveBeenCalledTimes(1);
    expect(original.onConfirm).not.toHaveBeenCalled();
    expect(original.busy).toBe(true);
  });

  it('never invokes actions on mount, rerender, Escape, or unmount', async () => {
    const user = userEvent.setup();
    const props = fixture({ mode: 'multiplayer' });
    const { rerender, unmount } = render(<LeaveConfirmation {...props} />);
    rerender(<LeaveConfirmation {...props} busy />);
    await user.keyboard('{Escape}');
    unmount();
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(props.onCancel).not.toHaveBeenCalled();
  });
});
