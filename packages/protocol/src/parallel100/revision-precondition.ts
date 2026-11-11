export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

/** Evaluate inside the storage transaction; this does not provide atomicity. */
export function revisionPrecondition(input: {
  readonly actualRevision: number;
  readonly expectedRevision: number;
}): Result<{ readonly nextRevision: number }> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  if (typeof input !== 'object' || input === null) return invalid;

  // Read data properties only, without invoking caller-provided accessors.
  let actual: unknown;
  let expected: unknown;
  try {
    const actualProperty = Object.getOwnPropertyDescriptor(input, 'actualRevision');
    const expectedProperty = Object.getOwnPropertyDescriptor(input, 'expectedRevision');
    if (!actualProperty || !('value' in actualProperty)
      || !expectedProperty || !('value' in expectedProperty)) return invalid;
    actual = actualProperty.value;
    expected = expectedProperty.value;
  } catch {
    return invalid;
  }

  if (typeof actual !== 'number' || !Number.isSafeInteger(actual) || actual < 0
    || typeof expected !== 'number' || !Number.isSafeInteger(expected) || expected < 0) {
    return invalid;
  }
  if (actual !== expected) return { ok: false, error: { code: 'stale' } };
  if (actual === Number.MAX_SAFE_INTEGER) return invalid;
  return { ok: true, value: { nextRevision: actual + 1 } };
}
