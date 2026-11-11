import { nextRandom } from '../index.js';

export type IncidentId = 'I01' | 'I02' | 'I03' | 'I04' | 'I05' | 'I06';
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

const incidents: readonly IncidentId[] = ['I01', 'I02', 'I03', 'I04', 'I05', 'I06'];

function ownValue(record: unknown, key: string): unknown {
  if (typeof record !== 'object' || record === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function isIncident(value: unknown): value is IncidentId {
  return incidents.some((id) => id === value);
}

export function nextIncident(input: {
  readonly remaining: readonly IncidentId[]; readonly previous: IncidentId | null;
  readonly rng: { readonly value: number };
}): Result<{ readonly incidentId: IncidentId; readonly remaining: readonly IncidentId[]; readonly rng: { readonly value: number } }> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  const supplied = ownValue(input, 'remaining');
  const previous = ownValue(input, 'previous');
  const rngValue = ownValue(ownValue(input, 'rng'), 'value');
  if (!Array.isArray(supplied) || (previous !== null && !isIncident(previous)) ||
      typeof rngValue !== 'number' || !Number.isInteger(rngValue) ||
      rngValue < 0 || rngValue > 0xffffffff) return invalid;

  const length = ownValue(supplied, 'length');
  if (typeof length !== 'number' || length > incidents.length) return invalid;
  const queue: IncidentId[] = [];
  for (let index = 0; index < length; index++) {
    const entry = ownValue(supplied, String(index));
    if (!isIncident(entry) || queue.includes(entry)) return invalid;
    queue.push(entry);
  }
  let rng = { value: rngValue };
  if (queue.length > 0) {
    if (queue[0] === previous) return invalid;
  } else {
    queue.push(...incidents);
    for (let index = queue.length - 1; index > 0; index--) {
      const [random, next] = nextRandom(rng);
      rng = next;
      const other = Math.floor(random * (index + 1));
      [queue[index], queue[other]] = [queue[other]!, queue[index]!];
    }
    if (queue[0] === previous) [queue[0], queue[1]] = [queue[1]!, queue[0]!];
  }
  return { ok: true, value: { incidentId: queue[0]!, remaining: queue.slice(1), rng } };
}
