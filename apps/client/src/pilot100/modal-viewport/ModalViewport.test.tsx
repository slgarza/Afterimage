// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalViewport, type ModalViewportProps } from './index';

beforeEach(() => {
  // jsdom does not implement the native dialog top layer or inert interaction.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  } });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  vi.restoreAllMocks();
});

const overlay = (dismissible = true) => Object.freeze({
  id: 'decision', title: 'Choose a direction', dismissible, onDismiss: vi.fn(),
  content: <><button>First choice</button><button>Last choice</button></>,
});
const props = (value: ModalViewportProps['overlay'] = null): ModalViewportProps => Object.freeze({
  background: <button>Gameplay</button>, dock: <button>Dock</button>,
  overlay: value, reservedDockHeight: 64, reducedMotion: false,
});

describe('ModalViewport', () => {
  it('opens exactly one labelled dialog and blocks all background slots uniformly', () => {
    const { container } = render(<ModalViewport {...props(overlay())} />);
    const dialog = screen.getByRole('dialog', { name: 'Choose a direction' });
    expect(container.querySelectorAll('dialog')).toHaveLength(1);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(dialog);
    const background = container.querySelector('.modal-viewport__background')!;
    expect(background.hasAttribute('inert')).toBe(true);
    expect(background.getAttribute('aria-hidden')).toBe('true');
    expect((background as HTMLElement).style.filter).toBe('blur(6px) brightness(0.5) saturate(0)');
    expect((background as HTMLElement).style.pointerEvents).toBe('none');
    expect(background.querySelectorAll('button')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Gameplay' })).toBeNull();
  });

  it('cycles Tab in both directions and rejects focus outside the dialog', async () => {
    const user = userEvent.setup();
    render(<ModalViewport {...props(overlay())} />);
    const first = screen.getByRole('button', { name: 'First choice' });
    const last = screen.getByRole('button', { name: 'Last choice' });
    await user.tab(); expect(document.activeElement).toBe(first);
    await user.tab({ shift: true }); expect(document.activeElement).toBe(last);
    await user.tab(); expect(document.activeElement).toBe(first);
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
    outside.remove();
  });

  it('contains focus with no controls, and uses current controlled dismissal permissions', () => {
    const mandatory = { ...overlay(false), content: <p>Waiting for a decision</p> };
    const { rerender } = render(<ModalViewport {...props(mandatory)} />);
    fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(mandatory.onDismiss).not.toHaveBeenCalled();
    const optional = overlay();
    rerender(<ModalViewport {...props(optional)} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(optional.onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeTruthy(); // Only the parent may remove it.
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(optional.onDismiss).toHaveBeenCalledTimes(2);
  });

  it('restores focus and background state on removal, replacement and unmount', () => {
    const trigger = document.createElement('button');
    trigger.style.filter = 'contrast(2)';
    document.body.append(trigger);
    trigger.focus();
    const { rerender, unmount, container } = render(<ModalViewport {...props()} />);
    rerender(<ModalViewport {...props(overlay())} />);
    rerender(<ModalViewport {...props({ ...overlay(), id: 'replacement', title: 'Replacement' })} />);
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'Replacement' }));
    rerender(<ModalViewport {...props()} />);
    expect(document.activeElement).toBe(trigger);
    const background = container.querySelector<HTMLElement>('.modal-viewport__background')!;
    expect(background.hasAttribute('inert')).toBe(false);
    expect(background.hasAttribute('aria-hidden')).toBe(false);
    expect(background.style.filter).toBe('');
    expect(background.style.pointerEvents).toBe('');
    rerender(<ModalViewport {...props(overlay())} />);
    unmount();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.style.filter).toBe('contrast(2)');
    trigger.remove();
  });

  it('preserves slot state and inputs, sanitizes reservation and supports long content/reduced motion', () => {
    const frozen = props({ ...overlay(), content: <p>{'Long content '.repeat(1000)}</p> });
    const { container, rerender } = render(<ModalViewport {...frozen} />);
    const dock = container.querySelector<HTMLElement>('.modal-viewport__dock')!;
    expect(dock.style.minHeight).toBe('64px');
    for (const height of [-1, NaN, Infinity]) {
      rerender(<ModalViewport {...frozen} reservedDockHeight={height} reducedMotion />);
      expect(dock.style.minHeight).toBe('0');
    }
    expect(container.firstElementChild?.getAttribute('data-reduced-motion')).toBe('true');
    expect(screen.getByRole('dialog').textContent).toContain('Long content');
    expect(frozen.reservedDockHeight).toBe(64);
    expect(frozen.overlay?.id).toBe('decision');
  });
});
