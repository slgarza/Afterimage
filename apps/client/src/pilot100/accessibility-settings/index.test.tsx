// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibilitySettings, type AccessibilitySettingsProps } from './index';

afterEach(cleanup);

function props(overrides: Partial<AccessibilitySettingsProps> = {}): AccessibilitySettingsProps {
  return Object.freeze({
    reduceMotion: false,
    systemReduceMotion: true,
    onReduceMotionChange: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  });
}

describe('AccessibilitySettings', () => {
  it.each([false, true])('requests a single boolean change from %s and waits for supplied state', async (selected) => {
    const user = userEvent.setup();
    const supplied = props({ reduceMotion: selected });
    const { rerender } = render(<AccessibilitySettings {...supplied} />);
    const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Reduce Motion' });

    await user.click(checkbox);

    expect(supplied.onReduceMotionChange).toHaveBeenCalledExactlyOnceWith(!selected);
    expect(checkbox.checked).toBe(selected);
    expect(supplied.systemReduceMotion).toBe(true);
    expect(supplied.reduceMotion).toBe(selected);
    expect(supplied.onClose).not.toHaveBeenCalled();

    rerender(<AccessibilitySettings {...supplied} reduceMotion={!selected} />);
    expect(checkbox.checked).toBe(!selected);
  });

  it('distinguishes the selected control from the independent supplied system preference', () => {
    const supplied = props();
    const { rerender } = render(<AccessibilitySettings {...supplied} />);
    const region = screen.getByRole('region', { name: 'Accessibility' });
    const checkbox = within(region).getByRole<HTMLInputElement>('checkbox', { name: 'Reduce Motion' });
    expect(checkbox.checked).toBe(false);
    expect(within(region).getByRole('term').textContent).toBe('System motion preference');
    expect(within(region).getByRole('definition').textContent).toBe('Reduced motion requested');
    const description = document.getElementById(checkbox.getAttribute('aria-describedby') ?? '');
    expect(description?.textContent).toContain('reduces decorative motion');
    expect(description?.textContent).toContain('Labels and essential game-state feedback remain');
    expect(within(region).getByText(/does not change your operating-system settings/)).toBeTruthy();

    rerender(<AccessibilitySettings {...supplied} systemReduceMotion={false} />);
    expect(checkbox.checked).toBe(false);
    expect(within(region).getByRole('definition').textContent).toBe('No reduced motion requested');
    expect(supplied.onReduceMotionChange).not.toHaveBeenCalled();
  });

  it('supports keyboard selection and closing without emitting unrelated actions', async () => {
    const user = userEvent.setup();
    const supplied = props();
    render(<AccessibilitySettings {...supplied} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('checkbox'));
    await user.keyboard(' ');
    expect(supplied.onReduceMotionChange).toHaveBeenCalledExactlyOnceWith(true);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close accessibility settings' }));
    await user.keyboard('{Enter}');
    expect(supplied.onClose).toHaveBeenCalledExactlyOnceWith();
    expect(supplied.onReduceMotionChange).toHaveBeenCalledTimes(1);
  });
});
