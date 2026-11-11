// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VoteFeedback, type VoteFeedbackProps } from './index';

afterEach(cleanup);

const base: VoteFeedbackProps = Object.freeze({
  state: 'not-cast', selectedAlias: null, publicDrawExplanation: null, message: null,
});

describe('VoteFeedback', () => {
  it.each([
    ['not-cast', 'No local vote has been cast.'],
    ['pending', 'Vote pending. Waiting for authority acknowledgement; acceptance is not confirmed.'],
    ['recorded', 'Your sealed vote has been recorded by the authority.'],
    ['timeout-recorded', 'The deadline passed. The authority recorded an eligible vote for you after timeout.'],
    ['unavailable', 'Vote feedback is unavailable. Your vote status cannot be confirmed.'],
  ] as const)('announces the distinct %s state without voting controls', (state, text) => {
    const { container } = render(<VoteFeedback {...base} state={state} />);
    const status = screen.getByRole('status');
    expect(within(status).getByText(text)).toBeTruthy();
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(container.querySelector('button, input, a, [role="dialog"]')).toBeNull();
  });

  it.each(['pending', 'recorded', 'timeout-recorded'] as const)(
    'keeps a missing %s selection unknown', (state) => {
      render(<VoteFeedback {...base} state={state} />);
      expect(screen.getByText('Selected alias: unknown.')).toBeTruthy();
    },
  );

  it('uses only new authority props when pending becomes recorded then unavailable', () => {
    const pending = Object.freeze({ ...base, state: 'pending', selectedAlias: 'North' } as const);
    const { rerender, container } = render(<VoteFeedback {...pending} />);
    expect(screen.getByText('North')).toBeTruthy();
    expect(screen.queryByText(/has been recorded/)).toBeNull();
    rerender(<VoteFeedback {...base} state="recorded" selectedAlias="River" />);
    expect(screen.queryByText('North')).toBeNull();
    expect(screen.getByText('River')).toBeTruthy();
    rerender(<VoteFeedback {...base} state="unavailable" selectedAlias="Stale private alias" />);
    expect(container.innerHTML).not.toContain('Stale private alias');
    expect(screen.queryByText('River')).toBeNull();
    expect(pending).toEqual({ ...base, state: 'pending', selectedAlias: 'North' });
  });

  it('does not expose a stale selection before casting', () => {
    const { container } = render(<VoteFeedback {...base} selectedAlias="Stale selection" />);
    expect(container.innerHTML).not.toContain('Stale selection');
  });

  it('renders supplied public explanation and message as text, then removes them', () => {
    const explanation = 'A public seeded draw resolved the remaining tie.';
    const message = '<img src=x onerror=alert(1)>';
    const { container, rerender } = render(
      <VoteFeedback {...base} state="recorded" selectedAlias="<North>"
        publicDrawExplanation={explanation} message={message} />,
    );
    expect(within(screen.getByRole('region', { name: 'Public draw explanation' }))
      .getByText(explanation)).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.getByText('<North>')).toBeTruthy();
    expect(container.querySelector('img, script')).toBeNull();
    expect(container.textContent).not.toMatch(/Shift Lead|seed:/i);
    rerender(<VoteFeedback {...base} />);
    expect(screen.queryByRole('region', { name: 'Public draw explanation' })).toBeNull();
    expect(screen.queryByText(message)).toBeNull();
  });
});
