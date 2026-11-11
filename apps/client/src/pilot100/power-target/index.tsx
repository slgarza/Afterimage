import { useId } from 'react';
import './power-target.css';

export interface PowerTargetPromptProps {
  readonly powerId: string;
  readonly title: string;
  readonly instruction: string;
  readonly targets: readonly {
    readonly id: string;
    readonly alias: string;
    readonly eligible: boolean;
    readonly reason: string | null;
  }[];
  readonly canAct: boolean;
  readonly pending: boolean;
  readonly onChoose: (id: string) => void;
}

/** Content for the host's mandatory modal; the host owns focus containment. */
export function PowerTargetPrompt(props: PowerTargetPromptProps): import('react').ReactElement {
  const headingId = useId();
  const instructionId = useId();
  const reasonPrefix = useId();
  const available = props.canAct && !props.pending;

  return (
    <section className="power-target" aria-labelledby={headingId} aria-describedby={instructionId}>
      <h2 id={headingId}>{props.title}</h2>
      <p id={instructionId}>{props.instruction}</p>
      <p role="status">
        {props.targets.length === 0
          ? 'Target selection unavailable. Waiting for authority to supply targets.'
          : props.pending
            ? 'Target request pending.'
            : !props.canAct
              ? 'Target selection is currently unavailable.'
              : !props.targets.some((target) => target.eligible)
                ? 'No eligible targets supplied. Waiting for authority.'
                : 'Choose one eligible target to request this power.'}
      </p>
      {props.targets.length > 0 && (
        <ul className="power-target__targets">
          {props.targets.map((target, index) => {
            const reasonId = `${reasonPrefix}-${index}`;
            return (
              <li key={target.id}>
                <button
                  type="button"
                  disabled={!available || !target.eligible}
                  aria-describedby={target.reason !== null ? reasonId : undefined}
                  onClick={() => {
                    if (available && target.eligible) props.onChoose(target.id);
                  }}
                >
                  {target.alias}
                </button>
                {target.reason !== null && <p id={reasonId}>{target.reason}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
