export type Phase = 'ROUND_START' | 'VOTE_OPEN' | 'CREW_LOCKED'
  | 'OPERATION_LOCKED' | 'RESOLUTION' | 'CITY_MOMENT' | 'MATCH_END';
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
    readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
    readonly decisionId?: string;
  } };

type LockInput = {
  readonly phase: Phase; readonly revision: number; readonly expectedRevision: number;
  readonly actorId: string; readonly routeOperatorId: string; readonly gateOperatorId: string;
  readonly routeOptionIds: readonly string[]; readonly gateOptionIds: readonly string[];
  readonly choiceId: string; readonly routeChoice: string | null; readonly gateChoice: string | null;
};
type LockState = {
  readonly revision: number;
  readonly routeChoice: string | null;
  readonly gateChoice: string | null;
};
const keys = ['phase', 'revision', 'expectedRevision', 'actorId', 'routeOperatorId',
  'gateOperatorId', 'routeOptionIds', 'gateOptionIds', 'choiceId', 'routeChoice', 'gateChoice'];
const invalid = (): Result<never> => ({ ok: false, error: { code: 'invalid-input' } });
const identity = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
const option = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value !== 'Repair' && value !== 'Sabotage';

// Snapshot only data properties, so malformed callers cannot execute getters.
function options(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  const length: unknown = descriptors.length?.value;
  if (typeof length !== 'number') return null;
  const result: string[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !('value' in descriptor) || !option(descriptor.value)) return null;
    result.push(descriptor.value);
  }
  return result;
}

/** Private authority state only. Caller authenticates actorId; orchestration advances phase. */
export function lockOperationChoice(input: LockInput): Result<LockState> {
  try {
    if (typeof input !== 'object' || input === null) return invalid();
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (Reflect.ownKeys(descriptors).length !== keys.length) return invalid();
    const data: Record<string, unknown> = {};
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !('value' in descriptor)) return invalid();
      data[key] = descriptor.value;
    }
    const { phase, revision, expectedRevision, actorId, routeOperatorId, gateOperatorId,
      choiceId, routeChoice, gateChoice } = data;
    const routeOptions = options(data.routeOptionIds);
    const gateOptions = options(data.gateOptionIds);
    if (!identity(actorId) || !identity(routeOperatorId) || !identity(gateOperatorId)
      || routeOperatorId === gateOperatorId || !option(choiceId)
      || !routeOptions || !gateOptions
      || (routeChoice !== null && (!option(routeChoice) || !routeOptions.includes(routeChoice)))
      || (gateChoice !== null && (!option(gateChoice) || !gateOptions.includes(gateChoice)))
      || typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0
      || revision === Number.MAX_SAFE_INTEGER
      || typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision)
      || expectedRevision < 0) return invalid();
    if (phase !== 'CREW_LOCKED') return invalid();
    if (revision !== expectedRevision) return { ok: false, error: { code: 'stale' } };
    if (actorId === routeOperatorId && routeChoice === null && routeOptions.includes(choiceId)) {
      return { ok: true, value: { revision: revision + 1, routeChoice: choiceId, gateChoice } };
    }
    if (actorId === gateOperatorId && gateChoice === null && gateOptions.includes(choiceId)) {
      return { ok: true, value: { revision: revision + 1, routeChoice, gateChoice: choiceId } };
    }
    return { ok: false, error: { code: 'forbidden' } };
  } catch {
    return invalid();
  }
}
