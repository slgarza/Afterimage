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

/** Consumes an adapter-bound identity; does not authenticate it.
 * privateDiagnostics is a ceiling: recipient and phase checks still apply.
 */
export function subscriptionCapabilities(input: {
  readonly boundPlayerId: string | null; readonly roomPlayerIds: readonly string[];
  readonly active: boolean; readonly connectionGeneration: number; readonly subscriptionGeneration: number;
}): Result<{ readonly publicView: boolean; readonly privateDiagnostics: boolean; readonly chatWrite: boolean; readonly revokeSubscription: boolean }> {
  const invalid: Result<never> = { ok: false, error: { code: 'invalid-input' } };
  try {
    if (input === null || typeof input !== 'object') return invalid;
    const fields: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    // Inspect only required own data properties; never execute submitted getters.
    for (const key of ['boundPlayerId', 'roomPlayerIds', 'active', 'connectionGeneration', 'subscriptionGeneration']) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor)) return invalid;
      fields[key] = descriptor.value;
    }
    const { boundPlayerId, roomPlayerIds, active, connectionGeneration, subscriptionGeneration } = fields;
    if ((boundPlayerId !== null && !validId(boundPlayerId)) || typeof active !== 'boolean'
      || !validGeneration(connectionGeneration) || !validGeneration(subscriptionGeneration)
      || !Array.isArray(roomPlayerIds)) return invalid;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(roomPlayerIds, 'length');
    const length: unknown = lengthDescriptor?.value;
    if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0) return invalid;
    const ids = new Set<string>();
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(roomPlayerIds, String(index));
      if (!descriptor || !('value' in descriptor) || !validId(descriptor.value)
        || ids.has(descriptor.value)) return invalid;
      ids.add(descriptor.value);
    }
    const currentMember = boundPlayerId !== null && ids.has(boundPlayerId)
      && connectionGeneration === subscriptionGeneration;
    return { ok: true, value: {
      publicView: currentMember,
      privateDiagnostics: currentMember && active,
      chatWrite: currentMember && active,
      revokeSubscription: !currentMember,
    } };
  } catch {
    // Reflection failures (including revoked proxies) cannot expose submitted data.
    return invalid;
  }
}
