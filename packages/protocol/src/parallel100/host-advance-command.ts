export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function validCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/**
 * Checks supplied authority facts, without authenticating the player or changing time.
 * The storage adapter must recheck these facts inside the final mutation transaction.
 */
export function hostAdvancePermission(input: {
  readonly verifiedPlayerId: string; readonly hostPlayerId: string;
  readonly actualRevision: number; readonly expectedRevision: number;
  readonly trustedNowMs: number; readonly persistedDeadlineMs: number;
  readonly terminal: boolean;
}): Result<{ readonly mayAdvance: boolean }> {
  const invalid: Result<never> = { ok: false, error: { code: 'invalid-input' } };
  try {
    if (input === null || typeof input !== 'object') return invalid;
    // Snapshot own data fields so getters cannot execute or change the checked facts.
    const fields: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of ['verifiedPlayerId', 'hostPlayerId', 'actualRevision',
      'expectedRevision', 'trustedNowMs', 'persistedDeadlineMs', 'terminal']) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor)) return invalid;
      fields[key] = descriptor.value;
    }
    const { verifiedPlayerId, hostPlayerId, actualRevision, expectedRevision,
      trustedNowMs, persistedDeadlineMs, terminal } = fields;
    if (!validId(verifiedPlayerId) || !validId(hostPlayerId)
      || !validCounter(actualRevision) || !validCounter(expectedRevision)
      || !validCounter(trustedNowMs) || !validCounter(persistedDeadlineMs)
      || typeof terminal !== 'boolean') return invalid;
    if (verifiedPlayerId !== hostPlayerId) return { ok: false, error: { code: 'forbidden' } };
    if (actualRevision !== expectedRevision) return { ok: false, error: { code: 'stale' } };
    return { ok: true, value: { mayAdvance: !terminal && trustedNowMs >= persistedDeadlineMs } };
  } catch {
    return invalid;
  }
}
