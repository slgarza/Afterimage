import type { ReactElement } from 'react';
import './styles.css';

export interface VoteFeedbackProps {
  readonly state: 'not-cast' | 'pending' | 'recorded' | 'timeout-recorded' | 'unavailable';
  readonly selectedAlias: string | null;
  readonly publicDrawExplanation: string | null;
  readonly message: string | null;
}

const statusText = {
  'not-cast': 'No local vote has been cast.',
  pending: 'Vote pending. Waiting for authority acknowledgement; acceptance is not confirmed.',
  recorded: 'Your sealed vote has been recorded by the authority.',
  'timeout-recorded': 'The deadline passed. The authority recorded an eligible vote for you after timeout.',
  unavailable: 'Vote feedback is unavailable. Your vote status cannot be confirmed.',
} as const;

export function VoteFeedback(props: VoteFeedbackProps): ReactElement {
  const showSelection = props.state === 'pending' || props.state === 'recorded'
    || props.state === 'timeout-recorded';

  return (
    <section className="vote-feedback" aria-label="Local sealed vote feedback">
      <div role="status" aria-live="polite" aria-atomic="true">
        <p className="vote-feedback__status">{statusText[props.state]}</p>
        {showSelection && (
          <p>{props.selectedAlias === null
            ? 'Selected alias: unknown.'
            : <>Selected alias: <span>{props.selectedAlias}</span></>}</p>
        )}
        {props.message !== null && <p>{props.message}</p>}
      </div>
      {props.publicDrawExplanation !== null && (
        <section className="vote-feedback__draw" aria-label="Public draw explanation">
          <p>{props.publicDrawExplanation}</p>
        </section>
      )}
    </section>
  );
}
