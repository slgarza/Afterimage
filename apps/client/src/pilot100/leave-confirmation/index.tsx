import { useId, type ReactElement } from 'react';
import './styles.css';

export interface LeaveConfirmationProps {
  readonly mode: 'solo' | 'multiplayer';
  readonly busy: boolean;
  readonly consequence: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/** Confirmation content; the composing host owns navigation and modal behavior. */
export function LeaveConfirmation(props: LeaveConfirmationProps): ReactElement {
  const titleId = useId();

  return (
    <section className="leave-confirmation" aria-labelledby={titleId}>
      <h2 id={titleId}>{props.mode === 'solo' ? 'Leave Solo?' : 'Leave the room?'}</h2>
      <p className="leave-confirmation__consequence">{props.consequence}</p>
      {props.mode === 'multiplayer' && (
        <p>The match continues for other players while you decide and after you leave.</p>
      )}
      <div className="leave-confirmation__actions">
        <button type="button" onClick={props.onCancel}>Stay</button>
        <button
          type="button"
          className="leave-confirmation__leave"
          disabled={props.busy}
          onClick={() => {
            if (!props.busy) props.onConfirm();
          }}
        >
          Leave
        </button>
      </div>
    </section>
  );
}
