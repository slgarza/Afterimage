export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function validGeneration(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** Membership must be verified separately. This restores network presence only.
 * Consumers must discard private caches before accepting the new generation's views.
 */
export function reconnectPresence(input: {
  readonly verifiedPlayerId: string; readonly boundPlayerId: string;
  readonly previousGeneration: number; readonly requestedGeneration: number;
  readonly permanentlyDisconnected: boolean;
}): Result<{ readonly connected: true; readonly generation: number; readonly active: boolean; readonly discardPrivateCache: true }> {
  try {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      return { ok: false, error: { code: 'invalid-input' } };
    }
    // Inspect only required own data fields; never consume old private payloads or getters.
    const read = (key: string): unknown => {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    };
    const verifiedPlayerId = read('verifiedPlayerId');
    const boundPlayerId = read('boundPlayerId');
    const previousGeneration = read('previousGeneration');
    const requestedGeneration = read('requestedGeneration');
    const permanentlyDisconnected = read('permanentlyDisconnected');
    if (!validId(verifiedPlayerId) || !validId(boundPlayerId)
      || !validGeneration(previousGeneration) || !validGeneration(requestedGeneration)
      || typeof permanentlyDisconnected !== 'boolean') {
      return { ok: false, error: { code: 'invalid-input' } };
    }
    if (verifiedPlayerId !== boundPlayerId) return { ok: false, error: { code: 'forbidden' } };
    if (requestedGeneration <= previousGeneration) return { ok: false, error: { code: 'stale' } };
    return {
      ok: true,
      value: { connected: true, generation: requestedGeneration, active: !permanentlyDisconnected, discardPrivateCache: true },
    };
  } catch {
    return { ok: false, error: { code: 'invalid-input' } };
  }
}
