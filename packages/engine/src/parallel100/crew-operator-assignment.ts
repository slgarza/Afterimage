import { nextRandom } from '../index.js';

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
    readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
    readonly decisionId?: string;
  } };

/** Read data properties without invoking caller-supplied accessors. */
function dataProperty(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function isIdentity(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

/** Assign the public operators using exactly one deterministic engine draw. */
export function assignCrewOperators(input: {
  readonly crewIds: readonly [string, string]; readonly rng: { readonly value: number };
}): Result<{
  readonly routeOperatorId: string; readonly gateOperatorId: string;
  readonly rng: { readonly value: number };
}> {
  const crew = dataProperty(input, 'crewIds');
  const first = dataProperty(crew, '0');
  const second = dataProperty(crew, '1');
  const rngValue = dataProperty(dataProperty(input, 'rng'), 'value');
  if (!Array.isArray(crew) || dataProperty(crew, 'length') !== 2
    || !isIdentity(first) || !isIdentity(second) || first === second
    || typeof rngValue !== 'number' || !Number.isInteger(rngValue)
    || rngValue < 0 || rngValue > 0xffffffff) {
    return { ok: false, error: { code: 'invalid-input' } };
  }

  const [draw, rng] = nextRandom({ value: rngValue });
  return {
    ok: true,
    value: {
      routeOperatorId: draw < 0.5 ? first : second,
      gateOperatorId: draw < 0.5 ? second : first,
      rng,
    },
  };
}
