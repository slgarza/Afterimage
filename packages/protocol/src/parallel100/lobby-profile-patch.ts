export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

function invalid(): Result<never> {
  return { ok: false, error: { code: 'invalid-input' } };
}

/** Decodes display-only intent; membership and revision authority belong to the caller. */
export function decodeLobbyProfilePatch(input: unknown, allowedAvatarKeys: readonly string[]): Result<{
  readonly alias: string; readonly avatarKey: string; readonly expectedRevision: number;
}> {
  try {
    if (!Array.isArray(allowedAvatarKeys)
      || Object.getPrototypeOf(allowedAvatarKeys) !== Array.prototype) return invalid();
    const length = Object.getOwnPropertyDescriptor(allowedAvatarKeys, 'length');
    if (!length || !('value' in length) || length.value === 0) return invalid();
    if (Reflect.ownKeys(allowedAvatarKeys).length !== length.value + 1) return invalid();
    const avatars = new Set<string>();
    for (let index = 0; index < length.value; index += 1) {
      const entry = Object.getOwnPropertyDescriptor(allowedAvatarKeys, String(index));
      if (!entry || !('value' in entry) || typeof entry.value !== 'string'
        || entry.value.length === 0 || avatars.has(entry.value)) return invalid();
      avatars.add(entry.value);
    }

    if (input === null || typeof input !== 'object') return invalid();
    const prototype: unknown = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return invalid();
    const keys = Reflect.ownKeys(input);
    const expected = ['alias', 'avatarKey', 'expectedRevision'];
    if (keys.length !== expected.length
      || keys.some((key) => typeof key !== 'string' || !expected.includes(key))) return invalid();
    const fields: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of expected) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor)) return invalid();
      fields[key] = descriptor.value;
    }
    const { alias, avatarKey, expectedRevision } = fields;
    if (typeof alias !== 'string' || alias !== alias.trim() || /[\p{Cc}\p{Cs}]/u.test(alias)) return invalid();
    const scalarCount = [...alias].length;
    if (scalarCount < 1 || scalarCount > 24) return invalid();
    if (typeof avatarKey !== 'string' || !avatars.has(avatarKey)) return invalid();
    if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision)
      || expectedRevision < 0) return invalid();
    return { ok: true, value: { alias, avatarKey, expectedRevision } };
  } catch {
    return invalid();
  }
}
