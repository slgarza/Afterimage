// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PowerTargetPrompt, type PowerTargetPromptProps } from './index';

afterEach(cleanup);

function setup(overrides: Partial<PowerTargetPromptProps> = {}) {
  const props: PowerTargetPromptProps = {
    powerId: 'power-1', title: 'Choose a target', instruction: 'Request one target.',
    targets: Object.freeze([
      Object.freeze({ id: 'a', alias: 'Aster', eligible: true, reason: null }),
      Object.freeze({ id: 'b', alias: 'Birch', eligible: false, reason: 'Unavailable from authority.' }),
    ]),
    canAct: true, pending: false, onChoose: vi.fn(), ...overrides,
  };
  return { props, ...render(<PowerTargetPrompt {...props} />) };
}

describe('PowerTargetPrompt', () => {
  it('requests only an eligible identity through pointer and keyboard activation', async () => {
    const user = userEvent.setup();
    const { props } = setup();
    await user.click(screen.getByRole('button', { name: 'Birch' }));
    expect(props.onChoose).not.toHaveBeenCalled();
    const target = screen.getByRole('button', { name: 'Aster' });
    await user.click(target);
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(props.onChoose).toHaveBeenCalledTimes(3);
    expect(props.onChoose).toHaveBeenNthCalledWith(1, 'a');
    expect(props.onChoose).toHaveBeenNthCalledWith(2, 'a');
    expect(props.onChoose).toHaveBeenNthCalledWith(3, 'a');
  });

  it.each([
    { canAct: false, pending: false },
    { canAct: true, pending: true },
    { canAct: false, pending: true },
  ])('prevents requests when capability is %j', (state) => {
    const { props } = setup(state);
    for (const button of screen.getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(button);
    }
    expect(props.onChoose).not.toHaveBeenCalled();
  });

  it('uses updated capability and pending props without inventing completion', () => {
    const { props, rerender } = setup();
    rerender(<PowerTargetPrompt {...props} pending />);
    fireEvent.click(screen.getByRole('button', { name: 'Aster' }));
    expect(props.onChoose).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('Target request pending.');
    rerender(<PowerTargetPrompt {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Aster' }));
    expect(props.onChoose).toHaveBeenCalledWith('a');
  });

  it('explicitly waits for authority when targets are empty, with no submission or dismissal', () => {
    const { props } = setup({ targets: [] });
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Waiting for authority');
    expect(props.onChoose).not.toHaveBeenCalled();
  });

  it('does not resolve exhaustion when every supplied target is ineligible', () => {
    const { props } = setup({ targets: [{ id: 'c', alias: 'Cedar', eligible: false, reason: null }] });
    expect(screen.getByRole('status').textContent).toContain('No eligible targets supplied');
    fireEvent.click(screen.getByRole('button'));
    expect(props.onChoose).not.toHaveBeenCalled();
  });

  it('exposes full long reasons through visible text and accessible descriptions', () => {
    const reason = 'Authority explanation: '.repeat(100) + 'final detail';
    setup({ targets: [{ id: 'd', alias: 'Dune', eligible: false, reason }] });
    const button = screen.getByRole('button', { name: 'Dune' });
    const description = document.getElementById(button.getAttribute('aria-describedby')!);
    expect(description?.textContent).toBe(reason);
    expect(screen.getByRole('region', { name: 'Choose a target' })).toBeTruthy();
  });
});
