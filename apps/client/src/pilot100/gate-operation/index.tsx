import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import './styles.css';

export interface GateOperationProps {
  readonly incidentTitle: string;
  readonly choices: readonly {
    readonly id: string;
    readonly label: string;
    readonly icon: { readonly src: string; readonly alt: string } | null;
    readonly available: boolean;
  }[];
  readonly safeGateId: string | null;
  readonly corruptedGateId: string | null;
  readonly selectedId: string | null;
  readonly canChoose: boolean;
  readonly remainingSeconds: number | null;
  readonly onChoose: (id: string) => void;
}

function GateIcon({ icon, label }: {
  readonly icon: GateOperationProps['choices'][number]['icon'];
  readonly label: string;
}): ReactElement {
  const [failed, setFailed] = useState(false);
  if (!icon?.src.trim() || failed) {
    return <span className="gate-operation__missing" role="img" aria-label={icon?.alt || label}>Icon unavailable</span>;
  }
  return <img src={icon.src} alt={icon.alt} width="80" height="80" onError={() => setFailed(true)} />;
}

export function GateOperation(props: GateOperationProps): ReactElement {
  const titleId = useId();
  const { remainingSeconds } = props;
  const knownTime = remainingSeconds !== null && Number.isFinite(remainingSeconds);
  const expired = knownTime && remainingSeconds <= 0;
  const clue = (id: string | null) =>
    id === null ? 'Unknown' : props.choices.find((choice) => choice.id === id)?.label ?? 'Unknown';

  return (
    <section className="gate-operation" aria-labelledby={titleId}>
      <p>Private · Gate Operator</p>
      <h2 id={titleId}>{props.incidentTitle}</h2>
      <dl className="gate-operation__diagnostics">
        <div><dt>Safe gate</dt><dd>{clue(props.safeGateId)}</dd></div>
        <div><dt>Corrupted gate</dt><dd>{clue(props.corruptedGateId)}</dd></div>
      </dl>
      <p>{expired ? 'Choice time expired' : knownTime ? `Time remaining: ${Math.ceil(remainingSeconds)} seconds` : 'Time remaining: Unknown'}</p>
      {!props.canChoose && <p>Gate selection unavailable</p>}
      <fieldset>
        <legend>Choose a gate</legend>
        <div className="gate-operation__choices">
          {props.choices.map((choice) => {
            const disabled = !props.canChoose || expired || !choice.available;
            const selected = props.selectedId === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                aria-label={choice.label}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => { if (!disabled) props.onChoose(choice.id); }}
              >
                <GateIcon key={choice.icon?.src} icon={choice.icon} label={choice.label} />
                <strong>{choice.label}</strong>
                {selected && <span>Selected</span>}
                {!choice.available && <span>Unavailable</span>}
              </button>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}
