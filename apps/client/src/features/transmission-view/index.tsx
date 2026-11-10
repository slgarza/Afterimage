export interface Outcome {
  readonly id: string;
  readonly label: string;
}

export interface Transmission {
  readonly id: string;
  readonly title: string;
  readonly scenario: string;
  readonly outcomes: readonly [Outcome, Outcome, Outcome];
}

export interface TransmissionViewProps {
  readonly transmission: Transmission | null;
  readonly resolvedOutcomeId: string | null;
  readonly statusText: string;
}

export function TransmissionView({
  transmission,
  resolvedOutcomeId,
  statusText,
}: TransmissionViewProps) {
  if (transmission === null) {
    if (resolvedOutcomeId !== null) {
      throw new RangeError('A resolved outcome requires a Transmission.');
    }
  } else {
    const ids = transmission.outcomes.map((outcome) => outcome.id);
    if (
      ids.length !== 3 ||
      new Set(ids).size !== 3 ||
      ids.some((id) => !/^[A-Za-z0-9_-]{1,64}$/.test(id))
    ) {
      throw new RangeError('A Transmission requires three distinct valid outcome IDs.');
    }
    if (resolvedOutcomeId !== null && !ids.includes(resolvedOutcomeId)) {
      throw new RangeError('The resolved outcome must belong to the Transmission.');
    }
  }

  return (
    <section aria-label="Transmission">
      {transmission === null ? (
        <p>Waiting for a public Transmission to arrive.</p>
      ) : (
        <>
          <h2>{transmission.title}</h2>
          <p>{transmission.scenario}</p>
          <ul>
            {transmission.outcomes.map((outcome) => (
              <li key={outcome.id}>
                <span>{outcome.label}</span>
                {resolvedOutcomeId === outcome.id && <span> — Resolved outcome</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      <p role="status" aria-live="polite" aria-atomic="true">{statusText}</p>
    </section>
  );
}
