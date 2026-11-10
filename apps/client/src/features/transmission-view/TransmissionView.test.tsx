// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TransmissionView } from './index.js';
import type { Outcome, Transmission } from './index.js';

afterEach(cleanup);

const transmission: Transmission = Object.freeze({
  id: 'signal-1',
  title: 'The missing courtyard',
  scenario: 'An archive records a courtyard where the map shows a wall.',
  outcomes: Object.freeze([
    Object.freeze({ id: 'restore', label: 'Restore the courtyard record' }),
    Object.freeze({ id: 'retain', label: 'Retain the map record' }),
    Object.freeze({ id: 'compare', label: 'Preserve both records for comparison' }),
  ] as const),
});

function view(data: Transmission | null = transmission, resolvedOutcomeId: string | null = null) {
  return <TransmissionView transmission={data} resolvedOutcomeId={resolvedOutcomeId} statusText="Waiting for the linked players to finish." />;
}

describe('TransmissionView', () => {
  it('gives a concrete waiting message without outcomes when data is null', () => {
    render(view(null));
    expect(screen.getByText('Waiting for a public Transmission to arrive.')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByText(/Resolved outcome/)).toBeNull();
  });

  it('renders the public title, scenario, and exactly three ordered outcomes without controls', () => {
    const { container } = render(view());
    expect(screen.getByRole('heading', { name: transmission.title })).toBeTruthy();
    expect(screen.getByText(transmission.scenario)).toBeTruthy();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(
      transmission.outcomes.map((outcome) => outcome.label),
    );
    expect(screen.queryByText(/Resolved outcome/)).toBeNull();
    expect(container.querySelector('button, input, select, textarea')).toBeNull();
  });

  it.each(transmission.outcomes)('marks only the supplied resolved outcome $id', (outcome) => {
    render(view(transmission, outcome.id));
    const items = screen.getAllByRole('listitem');
    expect(screen.getAllByText(/Resolved outcome/)).toHaveLength(1);
    for (const item of items) {
      expect(within(item).queryByText(/Resolved outcome/) !== null).toBe(
        item.textContent?.includes(outcome.label),
      );
    }
  });

  it('announces caller-supplied status politely and atomically, including updates', () => {
    const { rerender } = render(view(null));
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Waiting for the linked players to finish.');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    rerender(<TransmissionView transmission={transmission} resolvedOutcomeId={null} statusText="Public result received." />);
    expect(status.textContent).toBe('Public result received.');
    expect(screen.queryByText(/Resolved outcome/)).toBeNull();
  });

  it.each([0, 1, 2, 4])('rejects %i outcomes', (count) => {
    const outcomes = Array.from({ length: count }, (_, index) => ({ id: `outcome-${index}`, label: 'Public label' }));
    const malformed = { ...transmission, outcomes } as unknown as Transmission;
    expect(() => render(view(malformed))).toThrow(RangeError);
  });

  it('rejects duplicate outcome IDs', () => {
    const malformed: Transmission = { ...transmission, outcomes: [transmission.outcomes[0], transmission.outcomes[0], transmission.outcomes[2]] };
    expect(() => render(view(malformed))).toThrow(RangeError);
  });

  it.each(['', 'two words', '<tag>', 'é', 'x'.repeat(65)])('rejects invalid outcome ID %j', (id) => {
    const malformed: Transmission = { ...transmission, outcomes: [{ id, label: 'Public label' }, transmission.outcomes[1], transmission.outcomes[2]] };
    expect(() => render(view(malformed))).toThrow(RangeError);
  });

  it('accepts canonical outcome ID boundaries', () => {
    const outcomes: readonly [Outcome, Outcome, Outcome] = [
      { id: 'a', label: 'First' },
      { id: 'x'.repeat(64), label: 'Second' },
      { id: 'A0_-', label: 'Third' },
    ];
    render(view({ ...transmission, outcomes }, 'A0_-'));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it.each(['missing', ''])('rejects an unknown resolved ID %j', (id) => {
    expect(() => render(view(transmission, id))).toThrow(RangeError);
  });

  it('rejects resolution without a Transmission', () => {
    expect(() => render(view(null, 'restore'))).toThrow(RangeError);
  });

  it('renders public strings as text and omits extra private properties at every level', () => {
    const markup = '<img src=x onerror="alert(1)">';
    const fixture = {
      ...transmission,
      title: markup,
      scenario: '<script>privateScript()</script>',
      privateChoices: 'PRIVATE_CHOICES',
      seed: 'PRIVATE_SEED',
      outcomes: [
        { id: 'first', label: '<b>Literal outcome</b>', role: 'PRIVATE_ROLE' },
        transmission.outcomes[1],
        transmission.outcomes[2],
      ] as const,
    };
    const { container } = render(<TransmissionView transmission={fixture} resolvedOutcomeId={null} statusText="<em>Literal status</em>" />);
    expect(screen.getByRole('heading').textContent).toBe(markup);
    expect(screen.getByText(fixture.scenario)).toBeTruthy();
    expect(screen.getByText('<b>Literal outcome</b>')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('<em>Literal status</em>');
    expect(container.querySelector('img, script, b, em')).toBeNull();
    expect(container.innerHTML).not.toMatch(/PRIVATE_CHOICES|PRIVATE_SEED|PRIVATE_ROLE|privateChoices/);
  });
});
