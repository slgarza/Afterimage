export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

/** Compares injected authority time against an already approved persisted deadline. */
export function authorityDeadlineDecision(input: {
  readonly trustedNowMs: number; readonly deadlineMs: number;
  readonly action: 'player-input' | 'host-advance';
}): Result<{ readonly allowed: boolean; readonly deadlineReached: boolean }> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  try {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) return invalid;
    // Inspect data properties without executing caller-supplied accessors.
    const nowField = Object.getOwnPropertyDescriptor(input, 'trustedNowMs');
    const deadlineField = Object.getOwnPropertyDescriptor(input, 'deadlineMs');
    const actionField = Object.getOwnPropertyDescriptor(input, 'action');
    if (!nowField || !('value' in nowField)
      || !deadlineField || !('value' in deadlineField)
      || !actionField || !('value' in actionField)) return invalid;
    const now: unknown = nowField.value;
    const deadline: unknown = deadlineField.value;
    const action: unknown = actionField.value;
    if (typeof now !== 'number' || !Number.isSafeInteger(now) || now < 0
      || typeof deadline !== 'number' || !Number.isSafeInteger(deadline) || deadline < 0
      || (action !== 'player-input' && action !== 'host-advance')) return invalid;

    const deadlineReached = now >= deadline;
    return { ok: true, value: {
      allowed: action === 'host-advance' ? deadlineReached : !deadlineReached,
      deadlineReached,
    } };
  } catch {
    return invalid;
  }
}
