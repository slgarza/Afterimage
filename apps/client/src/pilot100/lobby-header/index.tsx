import type { ReactElement } from 'react';
import './styles.css';

export interface LobbyHeaderProps {
  readonly name: string;
  readonly code: string;
  readonly connected: number;
  readonly capacity: number;
  readonly canCopy: boolean;
  readonly canShare: boolean;
  readonly feedback: string | null;
  readonly onCopy: () => void;
  readonly onShare: () => void;
  readonly onLeave: () => void;
}

export function LobbyHeader(props: LobbyHeaderProps): ReactElement {
  return (
    <header className="pilot-lobby-header">
      <h1 className="pilot-lobby-header__name">{props.name}</h1>
      <p className="pilot-lobby-header__code">
        <span>Room code</span>
        <strong dir="auto">{props.code}</strong>
      </p>
      <p className="pilot-lobby-header__count">
        {props.connected} / {props.capacity} players connected / configured
      </p>
      <div className="pilot-lobby-header__actions">
        <button type="button" disabled={!props.canCopy}
          onClick={() => { if (props.canCopy) props.onCopy(); }}>
          Copy room code
        </button>
        <button type="button" disabled={!props.canShare}
          onClick={() => { if (props.canShare) props.onShare(); }}>
          Share room
        </button>
        <button type="button" onClick={() => props.onLeave()}>Leave lobby</button>
      </div>
      <p className="pilot-lobby-header__feedback" role="status" aria-atomic="true">
        {props.feedback}
      </p>
    </header>
  );
}
