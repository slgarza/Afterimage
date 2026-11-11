// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GateOperation, type GateOperationProps } from './index';

afterEach(cleanup);

function fixture(overrides: Partial<GateOperationProps> = {}): GateOperationProps {
  return Object.freeze({
    incidentTitle: 'Recover the observatory',
    choices: Object.freeze([
      Object.freeze({ id: 'gate-ash', label: 'Ash arch', icon: Object.freeze({ src: '/ash.svg', alt: 'Ash gate symbol' }), available: true }),
      Object.freeze({ id: 'gate-reed', label: 'Reed passage', icon: null, available: true }),
      Object.freeze({ id: 'gate-slate', label: 'Slate door', icon: null, available: false }),
    ]),
    safeGateId: 'gate-reed', corruptedGateId: 'gate-slate', selectedId: null,
    canChoose: true, remainingSeconds: 12.25, onChoose: vi.fn(), ...overrides,
  });
}

describe('GateOperation', () => {
  it('requests only supplied available gate IDs and waits for controlled selection', async () => {
    const user = userEvent.setup();
    const props = fixture();
    const { rerender } = render(<GateOperation {...props} />);
    await user.click(screen.getByRole('button', { name: 'Ash arch' }));
    const reed = screen.getByRole('button', { name: 'Reed passage' });
    reed.focus();
    await user.keyboard('{Enter}');
    expect(vi.mocked(props.onChoose).mock.calls).toEqual([['gate-ash'], ['gate-reed']]);
    expect(reed.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByText('Selected')).toBeNull();
    rerender(<GateOperation {...props} selectedId="gate-reed" />);
    expect(reed.getAttribute('aria-pressed')).toBe('true');
    expect(within(reed).getByText('Selected')).toBeTruthy();
    expect(props.selectedId).toBeNull();
    expect(props.choices.map(({ id }) => id)).toEqual(['gate-ash', 'gate-reed', 'gate-slate']);
  });

  it('never submits an unavailable gate through pointer or keyboard', async () => {
    const props = fixture();
    render(<GateOperation {...props} />);
    const unavailable = screen.getByRole<HTMLButtonElement>('button', { name: 'Slate door' });
    expect(unavailable.disabled).toBe(true);
    expect(within(unavailable).getByText('Unavailable')).toBeTruthy();
    await userEvent.setup().click(unavailable);
    fireEvent.click(unavailable);
    fireEvent.keyDown(unavailable, { key: 'Enter' });
    expect(props.onChoose).not.toHaveBeenCalled();
  });

  it.each([0, -1])('prevents all gate choices after a supplied deadline of %s', async (remainingSeconds) => {
    const props = fixture({ remainingSeconds });
    render(<GateOperation {...props} />);
    expect(screen.getByText('Choice time expired')).toBeTruthy();
    for (const button of screen.getAllByRole<HTMLButtonElement>('button')) {
      expect(button.disabled).toBe(true);
      await userEvent.setup().click(button);
      fireEvent.click(button);
    }
    expect(props.onChoose).not.toHaveBeenCalled();
  });

  it('honors revoked permission and accepts a later controlled permission update', async () => {
    const props = fixture({ canChoose: false });
    const { rerender } = render(<GateOperation {...props} />);
    expect(screen.getByText('Gate selection unavailable')).toBeTruthy();
    for (const button of screen.getAllByRole<HTMLButtonElement>('button')) {
      expect(button.disabled).toBe(true);
      fireEvent.click(button);
    }
    expect(props.onChoose).not.toHaveBeenCalled();
    rerender(<GateOperation {...props} canChoose />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ash arch' }));
    expect(props.onChoose).toHaveBeenCalledExactlyOnceWith('gate-ash');
  });

  it('shows only the supplied private Gate clues and leaves absent clues unknown', () => {
    const props = fixture();
    const { container, rerender } = render(<GateOperation {...props} />);
    expect(screen.getByRole('heading', { name: props.incidentTitle })).toBeTruthy();
    expect(screen.getByText('Private · Gate Operator')).toBeTruthy();
    const clues = () => Array.from(container.querySelectorAll('dl > div')).map((row) => row.textContent);
    expect(clues()).toEqual(['Safe gateReed passage', 'Corrupted gateSlate door']);
    expect(container.textContent).not.toMatch(/Route Operator|Repair|Sabotage|Archivist|Static|public result/i);
    rerender(<GateOperation {...props} safeGateId={null} corruptedGateId="not-a-supplied-gate" />);
    expect(clues()).toEqual(['Safe gateUnknown', 'Corrupted gateUnknown']);
  });

  it.each([null, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('keeps unknown time %s unknown', (remainingSeconds) => {
    render(<GateOperation {...fixture({ remainingSeconds })} />);
    expect(screen.getByText('Time remaining: Unknown')).toBeTruthy();
    expect(screen.queryByText('Choice time expired')).toBeNull();
  });

  it('displays supplied seconds without inventing a local clock or result', () => {
    const props = fixture();
    const { rerender } = render(<GateOperation {...props} />);
    expect(screen.getByText('Time remaining: 13 seconds')).toBeTruthy();
    rerender(<GateOperation {...props} remainingSeconds={3.1} />);
    expect(screen.getByText('Time remaining: 4 seconds')).toBeTruthy();
    expect(props.onChoose).not.toHaveBeenCalled();
  });

  it('renders approved art and named honest fallbacks for null or blank art', () => {
    const props = fixture();
    const choices = props.choices.map((choice) => choice.id === 'gate-slate'
      ? { ...choice, icon: { src: '   ', alt: 'Slate gate symbol' } } : choice);
    const { container } = render(<GateOperation {...props} choices={choices} />);
    const image = screen.getByRole('img', { name: 'Ash gate symbol' });
    expect(image.tagName).toBe('IMG');
    expect(image.getAttribute('src')).toBe('/ash.svg');
    expect(screen.getByRole('img', { name: 'Reed passage' }).textContent).toBe('Icon unavailable');
    expect(screen.getByRole('img', { name: 'Slate gate symbol' }).textContent).toBe('Icon unavailable');
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')))
      .toEqual(['Ash arch', 'Reed passage', 'Slate door']);
  });

  it('replaces failed art honestly and retries only when the supplied source changes', () => {
    const props = fixture();
    const { rerender } = render(<GateOperation {...props} />);
    fireEvent.error(screen.getByRole('img', { name: 'Ash gate symbol' }));
    expect(screen.getByRole('img', { name: 'Ash gate symbol' }).textContent).toBe('Icon unavailable');
    rerender(<GateOperation {...props} selectedId="gate-ash" />);
    expect(screen.getByRole('img', { name: 'Ash gate symbol' }).tagName).toBe('SPAN');
    const choices = props.choices.map((choice) => choice.id === 'gate-ash'
      ? { ...choice, icon: { src: '/replacement.svg', alt: 'Replacement gate symbol' } } : choice);
    rerender(<GateOperation {...props} choices={choices} />);
    expect(screen.getByRole('img', { name: 'Replacement gate symbol' }).getAttribute('src')).toBe('/replacement.svg');
    expect(props.onChoose).not.toHaveBeenCalled();
  });

  it('leaves an empty supplied choice list without invented controls or clues', () => {
    const props = fixture({ choices: [] });
    render(<GateOperation {...props} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.getAllByText('Unknown')).toHaveLength(2);
    expect(props.onChoose).not.toHaveBeenCalled();
  });
});
