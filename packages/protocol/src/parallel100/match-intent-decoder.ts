export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

export type MatchIntent =
  | { readonly type: 'crew-vote'; readonly candidateId: string; readonly expectedRevision: number }
  | { readonly type: 'operation-choice'; readonly optionId: string; readonly expectedRevision: number }
  | { readonly type: 'power-target'; readonly powerId: string; readonly targetId: string; readonly expectedRevision: number }
  | { readonly type: 'containment-vote'; readonly candidateId: string; readonly expectedRevision: number }
  | { readonly type: 'request-advance'; readonly expectedRevision: number };

function invalid(): Result<MatchIntent> {
  return { ok: false, error: { code: 'invalid-input' } };
}

function playerId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function semanticId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  let length = 0;
  for (const scalar of value) {
    // String iteration combines valid pairs but leaves lone surrogates intact.
    const point = scalar.codePointAt(0)!;
    if ((point >= 0xd800 && point <= 0xdfff) || ++length > 128) return false;
  }
  return length > 0;
}

/** Shape validation only; authentication, eligibility and D-CONTAINMENT remain external. */
export function decodeMatchIntent(input: unknown): Result<MatchIntent> {
  try {
    if (input === null || typeof input !== 'object') return invalid();
    const prototype: unknown = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return invalid();

    const fields: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of Reflect.ownKeys(input)) {
      if (typeof key !== 'string') return invalid();
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor)) return invalid();
      fields[key] = descriptor.value;
    }

    const { type, expectedRevision } = fields;
    let keys: readonly string[];
    switch (type) {
      case 'crew-vote':
      case 'containment-vote': keys = ['type', 'candidateId', 'expectedRevision']; break;
      case 'operation-choice': keys = ['type', 'optionId', 'expectedRevision']; break;
      case 'power-target': keys = ['type', 'powerId', 'targetId', 'expectedRevision']; break;
      case 'request-advance': keys = ['type', 'expectedRevision']; break;
      default: return invalid();
    }
    if (Object.keys(fields).length !== keys.length || keys.some((key) => !Object.hasOwn(fields, key))) {
      return invalid();
    }
    if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      return invalid();
    }

    switch (type) {
      case 'crew-vote':
      case 'containment-vote': {
        const { candidateId } = fields;
        if (!playerId(candidateId)) return invalid();
        return { ok: true, value: { type, candidateId, expectedRevision } };
      }
      case 'operation-choice': {
        const { optionId } = fields;
        if (!semanticId(optionId)) return invalid();
        return { ok: true, value: { type, optionId, expectedRevision } };
      }
      case 'power-target': {
        const { powerId, targetId } = fields;
        if (!semanticId(powerId) || !playerId(targetId)) return invalid();
        return { ok: true, value: { type, powerId, targetId, expectedRevision } };
      }
      case 'request-advance': return { ok: true, value: { type, expectedRevision } };
    }
  } catch {
    // Inspection traps may throw arbitrary private values; never return them.
    return invalid();
  }
}
