export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

// Read data properties without invoking caller-provided getters.
function dataProperty(input: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function isNonterminalTrack(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5;
}

export function advanceCityTracks(input: {
  readonly repair: number; readonly sabotage: number;
  readonly outcome: 'repair' | 'sabotage' | 'anomaly';
  readonly nullDisconnected: boolean;
}): Result<{ readonly repair: number; readonly sabotage: number; readonly winner: 'archivists' | 'static' | null; readonly momentKey: string | null }> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: { code: 'invalid-input' } };
  }
  const repair = dataProperty(input, 'repair');
  const sabotage = dataProperty(input, 'sabotage');
  const outcome = dataProperty(input, 'outcome');
  const nullDisconnected = dataProperty(input, 'nullDisconnected');
  if (!isNonterminalTrack(repair) || !isNonterminalTrack(sabotage)
    || (outcome !== 'repair' && outcome !== 'sabotage' && outcome !== 'anomaly')
    || typeof nullDisconnected !== 'boolean') {
    return { ok: false, error: { code: 'invalid-input' } };
  }
  if (nullDisconnected) {
    return { ok: true, value: { repair, sabotage, winner: 'archivists', momentKey: null } };
  }
  const nextRepair = repair + (outcome === 'repair' ? 1 : 0);
  const nextSabotage = sabotage + (outcome === 'sabotage' ? 1 : 0);
  return {
    ok: true,
    value: {
      repair: nextRepair,
      sabotage: nextSabotage,
      winner: nextRepair === 6 ? 'archivists' : nextSabotage === 6 ? 'static' : null,
      momentKey: outcome === 'repair' ? `city.repair.r${nextRepair}`
        : outcome === 'sabotage' ? `city.sabotage.s${nextSabotage}` : null,
    },
  };
}
