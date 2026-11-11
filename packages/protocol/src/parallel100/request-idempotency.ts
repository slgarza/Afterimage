export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

// Inspect own data properties without invoking caller getters or coercions.
function fields(value: unknown, names: readonly string[]): readonly unknown[] | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const result: unknown[] = [];
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !('value' in descriptor)) return null;
    result.push(descriptor.value);
  }
  return result;
}

function identity(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}(?![\s\S])/.test(value);
}

function digest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}(?![\s\S])/.test(value);
}

/**
 * Consumes a trusted actor and injected cryptographic request digest.
 * The adapter must atomically persist the record with its mutation; this
 * decision neither authenticates the actor nor provides persistence.
 */
export function idempotencyDecision(input: {
  readonly actorId: string; readonly requestId: string; readonly requestDigest: string;
  readonly existing: {
    readonly actorId: string; readonly requestId: string; readonly requestDigest: string;
    readonly resultReference: string;
  } | null;
}): Result<{ readonly action: 'execute' | 'replay'; readonly resultReference: string | null }> {
  try {
    const decoded = fields(input, ['actorId', 'requestId', 'requestDigest', 'existing']);
    if (decoded) {
      const [actorId, requestId, requestDigest, existing] = decoded;
      if (identity(actorId) && identity(requestId) && digest(requestDigest)) {
        if (existing === null) {
          return { ok: true, value: { action: 'execute', resultReference: null } };
        }
        const record = fields(existing, ['actorId', 'requestId', 'requestDigest', 'resultReference']);
        if (record) {
          const [storedActor, storedRequest, storedDigest, resultReference] = record;
          if (identity(storedActor) && identity(storedRequest) && digest(storedDigest)
            && typeof resultReference === 'string') {
            if (actorId !== storedActor || requestId !== storedRequest || requestDigest !== storedDigest) {
              return { ok: false, error: { code: 'forbidden' } };
            }
            return { ok: true, value: { action: 'replay', resultReference } };
          }
        }
      }
    }
  } catch {
    // Hostile proxy reflection failures are malformed input, never raw errors.
  }
  return { ok: false, error: { code: 'invalid-input' } };
}
