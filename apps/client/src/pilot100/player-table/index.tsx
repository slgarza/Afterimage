import type { ReactElement } from 'react';
import './player-table.css';

export interface PlayerCardTableProps {
  readonly players: readonly {
    readonly id: string;
    readonly alias: string;
    readonly avatarLabel: string;
    readonly operationalStatus: 'shift-lead' | 'route-operator' | 'gate-operator' | 'eligible' | 'cooldown' | 'jammed' | 'spectator';
    readonly selectable: boolean;
  }[];
  readonly selectedId: string | null;
  readonly votingEnabled: boolean;
  readonly onVote: (id: string) => void;
  readonly onDetails: (id: string) => void;
}

const statusLabels = {
  'shift-lead': 'Shift Lead',
  'route-operator': 'Route Operator',
  'gate-operator': 'Gate Operator',
  eligible: 'Eligible',
  cooldown: 'Cooldown',
  jammed: 'Jammed',
  spectator: 'Spectator',
} as const;

export function PlayerCardTable({ players, selectedId, votingEnabled, onVote, onDetails }: PlayerCardTableProps): ReactElement {
  return (
    <section className="player-card-table" aria-label="Players">
      <p>Activate an available player card to request your vote.</p>
      {!votingEnabled && <p>Voting unavailable.</p>}
      {players.length === 0 && <p>No players available.</p>}
      <ul className="player-card-table__list">
        {players.map((player) => {
          const selected = player.id === selectedId;
          const canVote = votingEnabled && player.selectable && (
            player.operationalStatus === 'eligible' || player.operationalStatus === 'shift-lead' ||
            player.operationalStatus === 'route-operator' || player.operationalStatus === 'gate-operator'
          );
          return (
            <li key={player.id} className="player-card-table__card" data-selected={selected}>
              <button
                type="button"
                className="player-card-table__vote"
                disabled={!canVote}
                aria-pressed={selected}
                onClick={() => { if (canVote) onVote(player.id); }}
              >
                <strong>{player.alias}</strong>
                <span className="player-card-table__identity">Player ID: {player.id}</span>
                <span className="player-card-table__avatar" role="img" aria-label={player.avatarLabel}>
                  Avatar unavailable
                </span>
                <span>{statusLabels[player.operationalStatus]}</span>
                <span>{selected ? 'Selected' : 'Not selected'}</span>
                <span>{canVote ? 'Vote for this player' : 'Vote unavailable'}</span>
              </button>
              <button type="button" className="player-card-table__details" onClick={() => onDetails(player.id)}>
                Details for {player.alias} (Player ID: {player.id})
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
