import type { ReactElement } from 'react';
import './styles.css';

export interface ResultsRosterProps {
  readonly matchEnded: boolean;
  readonly players: readonly {
    readonly id: string;
    readonly alias: string;
    readonly role: 'archivist' | 'static-operative' | 'null';
  }[];
  readonly rounds: readonly {
    readonly round: number;
    readonly outcome: 'repair' | 'sabotage' | 'anomaly';
    readonly summary: string;
  }[];
}

const roleLabels = {
  archivist: 'Archivist',
  'static-operative': 'Static operative',
  null: 'The Null',
} as const;

const outcomeLabels = { repair: 'Repair', sabotage: 'Sabotage', anomaly: 'Anomaly' } as const;

export function ResultsRoster({ matchEnded, players, rounds }: ResultsRosterProps): ReactElement {
  if (!matchEnded) {
    return <section className="results-roster" aria-label="Match results">
      <h2>Match results</h2>
      <p>Results are unavailable until Match End.</p>
    </section>;
  }

  const aliasCounts = new Map<string, number>();
  for (const player of players) {
    aliasCounts.set(player.alias, (aliasCounts.get(player.alias) ?? 0) + 1);
  }
  const orderedRounds = [...rounds].sort((left, right) => left.round - right.round);

  return <section className="results-roster" aria-label="Match results">
    <h2>Match results</h2>
    <section aria-label="Final alignments">
      <h3>Final alignments</h3>
      {players.length === 0 ? <p>Final roster unavailable.</p> :
        <ul className="results-roster__list" aria-label="Final roster">
          {players.map((player) => <li key={player.id}>
            <span>{player.alias}</span>
            {(aliasCounts.get(player.alias) ?? 0) > 1 && <span> (ID: {player.id})</span>}
            <span className="results-roster__detail">{roleLabels[player.role]}</span>
          </li>)}
        </ul>}
    </section>
    <section aria-label="Public round timeline">
      <h3>Public round timeline</h3>
      {orderedRounds.length === 0 ? <p>Round timeline unavailable.</p> :
        <ol className="results-roster__list" aria-label="Round timeline">
          {orderedRounds.map((round, index) => <li key={`${round.round}-${index}`}>
            <span>Round {round.round}: {outcomeLabels[round.outcome]}</span>
            <p className="results-roster__detail">{round.summary}</p>
          </li>)}
        </ol>}
    </section>
  </section>;
}
