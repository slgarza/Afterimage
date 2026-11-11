// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ResultsRoster, type ResultsRosterProps } from './index';

afterEach(cleanup);

const players = Object.freeze([
  Object.freeze({ id: 'id-z', alias: 'Echo', role: 'archivist' as const }),
  Object.freeze({ id: 'id-a', alias: 'Echo', role: 'static-operative' as const }),
  Object.freeze({ id: 'id-n', alias: '<b>Secret alias</b>', role: 'null' as const }),
]);
const rounds = Object.freeze([
  Object.freeze({ round: 3, outcome: 'anomaly' as const, summary: 'Third public summary' }),
  Object.freeze({ round: 1, outcome: 'repair' as const, summary: 'First public summary' }),
  Object.freeze({ round: 2, outcome: 'sabotage' as const, summary: 'Second public summary' }),
]);
const props: ResultsRosterProps = { matchEnded: true, players, rounds };

describe('ResultsRoster', () => {
  it('omits every supplied result from markup before Match End and after revocation', () => {
    const { container, rerender } = render(<ResultsRoster {...props} matchEnded={false} />);
    const checkHidden = () => {
      for (const value of [...players.flatMap((p) => [p.id, p.alias, p.role]), ...rounds.map((r) => r.summary)]) {
        expect(container.innerHTML).not.toContain(value);
      }
      expect(screen.queryByRole('list')).toBeNull();
      expect(screen.getByText('Results are unavailable until Match End.')).toBeTruthy();
    };
    checkHidden();
    rerender(<ResultsRoster {...props} />);
    expect(screen.getByText('The Null')).toBeTruthy();
    rerender(<ResultsRoster {...props} matchEnded={false} />);
    checkHidden();
  });

  it('reveals all canonical roles and keeps duplicate identities stable across reorder', () => {
    const { container, rerender } = render(<ResultsRoster {...props} />);
    const rosterRows = () => within(screen.getByRole('list', { name: 'Final roster' })).getAllByRole('listitem');
    expect(rosterRows().map((row) => row.textContent)).toEqual([
      'Echo (ID: id-z)Archivist', 'Echo (ID: id-a)Static operative', '<b>Secret alias</b>The Null',
    ]);
    expect(container.querySelector('b')).toBeNull();
    rerender(<ResultsRoster {...props} players={[...players].reverse()} />);
    expect(rosterRows().map((row) => row.textContent)).toEqual([
      '<b>Secret alias</b>The Null', 'Echo (ID: id-a)Static operative', 'Echo (ID: id-z)Archivist',
    ]);
  });

  it('orders public rounds without mutating frozen arrays or records', () => {
    render(<ResultsRoster {...props} />);
    const rows = within(screen.getByRole('list', { name: 'Round timeline' })).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Round 1: RepairFirst public summary', 'Round 2: SabotageSecond public summary',
      'Round 3: AnomalyThird public summary',
    ]);
    expect(rounds.map((round) => round.round)).toEqual([3, 1, 2]);
    expect(players.map((player) => player.id)).toEqual(['id-z', 'id-a', 'id-n']);
  });

  it('reports independent unavailable sections and updates supplied data', () => {
    const { rerender } = render(<ResultsRoster matchEnded players={[]} rounds={[]} />);
    expect(screen.getByText('Final roster unavailable.')).toBeTruthy();
    expect(screen.getByText('Round timeline unavailable.')).toBeTruthy();
    rerender(<ResultsRoster {...props} rounds={[]} />);
    expect(screen.queryByText('Final roster unavailable.')).toBeNull();
    expect(screen.getByText('Round timeline unavailable.')).toBeTruthy();
    rerender(<ResultsRoster {...props} players={[]} />);
    expect(screen.getByText('Final roster unavailable.')).toBeTruthy();
    expect(screen.queryByText('Round timeline unavailable.')).toBeNull();
  });
});
