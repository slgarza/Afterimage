export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

export function traceOnlineEvidence(input: {
  readonly repair: number;
  readonly operationResolved: boolean;
  readonly pairClass: 'safe' | 'corrupted' | 'mixed';
}): Result<{
  readonly visible: boolean;
  readonly classification: 'safe' | 'corrupted' | 'mixed' | null;
}> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  if (typeof input !== 'object' || input === null) return invalid;

  // Read only own data properties: authority accessors must never execute.
  try {
    const repairField = Object.getOwnPropertyDescriptor(input, 'repair');
    const resolvedField = Object.getOwnPropertyDescriptor(input, 'operationResolved');
    const classField = Object.getOwnPropertyDescriptor(input, 'pairClass');
    if (!repairField || !('value' in repairField)
      || !resolvedField || !('value' in resolvedField)
      || !classField || !('value' in classField)) return invalid;

    const repair: unknown = repairField.value;
    const operationResolved: unknown = resolvedField.value;
    const pairClass: unknown = classField.value;
    if (typeof repair !== 'number' || !Number.isInteger(repair) || repair < 0 || repair > 6
      || typeof operationResolved !== 'boolean'
      || (pairClass !== 'safe' && pairClass !== 'corrupted' && pairClass !== 'mixed')) {
      return invalid;
    }

    const visible = repair >= 2 && operationResolved;
    return { ok: true, value: { visible, classification: visible ? pairClass : null } };
  } catch {
    // A proxy may reject descriptor inspection. Do not echo its exception.
    return invalid;
  }
}
