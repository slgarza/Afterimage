import { nextRandom } from '../index.js';

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

type Kind = 'vote' | 'operation' | 'power-target';
type Pending = { readonly actorId: string; readonly legalOptionIds: readonly string[] };
type Reason = 'timeout_vote' | 'timeout_operation' | 'timeout_power_target';
type Completion = { readonly actorId: string; readonly optionId: string; readonly reason: Reason };

// Read only own data properties: malformed boundary values must not invoke getters.
function record(value: unknown, keys: readonly string[]): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== keys.length) return;
  const copy: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !('value' in descriptor)) return;
    copy[key] = descriptor.value;
  }
  return copy;
}

function array(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value)) return;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const length: unknown = Object.getOwnPropertyDescriptor(value, 'length')?.value;
  if (typeof length !== 'number' || Reflect.ownKeys(descriptors).length !== length + 1) return;
  const copy: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !('value' in descriptor)) return;
    copy.push(descriptor.value);
  }
  return copy;
}

/** Caller must first pass a separate trusted deadline gate. No clock is accepted here. */
export function completeTimedOutActions(input: {
  readonly kind: Kind;
  readonly pending: readonly Pending[];
  readonly rng: { readonly value: number };
}): Result<{ readonly completions: readonly Completion[]; readonly rng: { readonly value: number } }> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  const decoded = record(input, ['kind', 'pending', 'rng']);
  if (!decoded) return invalid;
  const { kind } = decoded;
  if (kind !== 'vote' && kind !== 'operation' && kind !== 'power-target') return invalid;
  const seed = record(decoded.rng, ['value'])?.value;
  if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    return invalid;
  }
  const pending = array(decoded.pending);
  if (!pending) return invalid;
  const actors = new Set<string>();
  const validated: Pending[] = [];
  let empty = false;
  for (const entry of pending) {
    const actor = record(entry, ['actorId', 'legalOptionIds']);
    if (!actor || typeof actor.actorId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(actor.actorId)
      || actors.has(actor.actorId)) return invalid;
    actors.add(actor.actorId);
    const options = array(actor.legalOptionIds);
    if (!options) return invalid;
    const legalOptionIds: string[] = [];
    const seen = new Set<string>();
    for (const option of options) {
      if (typeof option !== 'string' || option.length === 0 || seen.has(option)) return invalid;
      seen.add(option);
      legalOptionIds.push(option);
    }
    empty ||= legalOptionIds.length === 0;
    validated.push({ actorId: actor.actorId, legalOptionIds });
  }
  if (empty) {
    return kind === 'vote'
      ? { ok: false, error: { code: 'decision-required', decisionId: 'D-ELIGIBLE-POOL' } }
      : invalid;
  }
  const reasons: Record<Kind, Reason> = {
    vote: 'timeout_vote', operation: 'timeout_operation', 'power-target': 'timeout_power_target',
  };
  let rng = { value: seed };
  const completions: Completion[] = [];
  for (const actor of validated) {
    const [random, next] = nextRandom(rng);
    // Validation guarantees a dense, nonempty legal set and nextRandom returns [0, 1).
    const optionId = actor.legalOptionIds[Math.floor(random * actor.legalOptionIds.length)]!;
    completions.push({ actorId: actor.actorId, optionId, reason: reasons[kind] });
    rng = next;
  }
  return { ok: true, value: { completions, rng } };
}
