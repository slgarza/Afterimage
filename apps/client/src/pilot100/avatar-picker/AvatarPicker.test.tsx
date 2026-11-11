// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AvatarPicker } from './index.js';
import type { AvatarPickerProps } from './index.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const choices = Object.freeze([
  Object.freeze({ id: 'fold', label: 'Silver Fold', src: '/approved/fold.webp' }),
  Object.freeze({ id: 'arc', label: 'Quiet Arc', src: null }),
  Object.freeze({ id: 'line', label: 'Soft Line', src: '' }),
] as const);

function setup(overrides: Partial<AvatarPickerProps> = {}) {
  const props: AvatarPickerProps = { choices, selectedId: 'fold', onSelect: vi.fn(), onClose: vi.fn(), ...overrides };
  return { props, ...render(<AvatarPicker {...props} />) };
}

describe('AvatarPicker', () => {
  it('requests only supplied IDs by pointer and stays controlled until rerender', async () => {
    const user = userEvent.setup();
    const { props, rerender } = setup();
    await user.click(screen.getByRole('radio', { name: 'Quiet Arc' }));
    expect(props.onSelect).toHaveBeenCalledExactlyOnceWith('arc');
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Silver Fold' }).checked).toBe(true);
    rerender(<AvatarPicker {...props} selectedId="arc" />);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Quiet Arc' }).checked).toBe(true);
    expect(screen.getByText('Selected').closest('label')?.textContent).toContain('Quiet Arc');
    expect(choices[0].id).toBe('fold');
    expect(choices[1].src).toBeNull();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('supports native arrow and space selection and keyboard close', async () => {
    // jsdom lacks CSS.escape, which user-event uses to find native radio peers.
    vi.stubGlobal('CSS', { escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character.codePointAt(0)!.toString(16)} `) });
    const user = userEvent.setup();
    const { props, rerender } = setup();
    screen.getByRole('radio', { name: 'Silver Fold' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(props.onSelect).toHaveBeenLastCalledWith('arc');
    rerender(<AvatarPicker {...props} selectedId="arc" />);
    screen.getByRole('radio', { name: 'Soft Line' }).focus();
    await user.keyboard(' ');
    expect(props.onSelect).toHaveBeenLastCalledWith('line');
    rerender(<AvatarPicker {...props} selectedId="line" />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    await user.keyboard('{Enter}');
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(vi.mocked(props.onSelect).mock.calls).toEqual([['arc'], ['line']]);
  });

  it('does not select an unknown ID and updates when choices are replaced', () => {
    const { props, rerender } = setup({ selectedId: 'unknown' });
    expect(screen.getAllByRole<HTMLInputElement>('radio').every((radio) => !radio.checked)).toBe(true);
    expect(screen.queryByText('Selected')).toBeNull();
    rerender(<AvatarPicker {...props} choices={[choices[1]]} selectedId="arc" />);
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Quiet Arc' }).checked).toBe(true);
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('offers a meaningful empty state and pointer/keyboard close', async () => {
    const user = userEvent.setup();
    const { props } = setup({ choices: [] });
    expect(screen.getByText('No avatars are available.')).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.keyboard(' ');
    expect(props.onClose).toHaveBeenCalledTimes(2);
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('retains named choices for absent and failed media and recovers for a new source', () => {
    const { props, container, rerender } = setup();
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(screen.getAllByText('Image unavailable')).toHaveLength(2);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getAllByText('Image unavailable')).toHaveLength(3);
    for (const choice of choices) expect(screen.getByRole('radio', { name: choice.label })).toBeTruthy();
    rerender(<AvatarPicker {...props} choices={[{ ...choices[0], src: '/approved/fold-new.webp' }]} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/approved/fold-new.webp');
    expect(screen.queryByText('Image unavailable')).toBeNull();
    rerender(<AvatarPicker {...props} choices={[{ ...choices[0], src: '   ' }]} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('radio', { name: 'Silver Fold' })).toBeTruthy();
  });

  it('isolates radio groups across instances without claiming modal behavior', () => {
    setup();
    setup();
    const groups = screen.getAllByRole('group', { name: 'Available avatars' });
    const names = groups.map((group) => within(group).getByRole('radio', { name: 'Silver Fold' }).getAttribute('name'));
    expect(new Set(names).size).toBe(2);
    expect(screen.queryByRole('dialog')).toBeNull();
    const ids = Array.from(document.querySelectorAll('[id]'), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
