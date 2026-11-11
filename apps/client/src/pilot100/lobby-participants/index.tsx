import type { ReactElement } from 'react';
import './styles.css';

export interface LobbyParticipantsProps {
  readonly participants: readonly {
    readonly id: string;
    readonly alias: string;
    readonly avatarLabel: string;
    readonly host: boolean;
    readonly ready: boolean;
    readonly bot: boolean;
    readonly canKick: boolean;
  }[];
  readonly openSeats: number;
  readonly fillWithBots: boolean;
  readonly canBegin: boolean;
  readonly onKick: (id: string) => void;
  readonly onBegin: () => void;
}

export function LobbyParticipants({
  participants, openSeats, fillWithBots, canBegin, onKick, onBegin,
}: LobbyParticipantsProps): ReactElement {
  const validSeats = Number.isSafeInteger(openSeats) && openSeats >= 0;

  return (
    <section className="lobby-participants" aria-label="Lobby participants">
      <h2>Participants</h2>
      {participants.length === 0 && <p>No participants yet.</p>}
      <ul className="lobby-participants__list" aria-label="Participants">
        {participants.map((participant) => (
          <li className="lobby-participants__row" key={participant.id}>
            <div className="lobby-participants__identity">
              <span className="lobby-participants__avatar" role="img"
                aria-label={participant.avatarLabel || 'Avatar unavailable'}>
                Avatar unavailable
              </span>
              <strong>{participant.alias}</strong>
              <span className="lobby-participants__muted">ID: {participant.id}</span>
            </div>
            <div className="lobby-participants__statuses">
              {participant.host && <span>Host</span>}
              <span>{participant.ready ? 'Ready' : 'Not ready'}</span>
              <span>{participant.bot ? 'Bot' : 'Human'}</span>
            </div>
            <button type="button" disabled={!participant.canKick}
              aria-label={`Kick ${participant.alias} (ID: ${participant.id})`}
              onClick={() => { if (participant.canKick) onKick(participant.id); }}>
              Kick
            </button>
          </li>
        ))}
      </ul>
      <p>{validSeats ? `${openSeats} open ${openSeats === 1 ? 'seat' : 'seats'}.` : 'Open seat count unavailable.'}</p>
      <p className="lobby-participants__muted">
        {fillWithBots
          ? 'Bot fill enabled: open seats can be filled by bots when the game begins. Bots are not connected humans.'
          : 'Bot fill disabled: open seats remain available for people to join.'}
      </p>
      <button type="button" disabled={!canBegin}
        onClick={() => { if (canBegin) onBegin(); }}>Begin game</button>
    </section>
  );
}
