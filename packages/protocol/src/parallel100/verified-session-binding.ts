export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

function field(value: unknown, key: string): unknown {
  if (value === null || typeof value !== 'object') return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

/** Binds trusted verifier output only; this function does not authenticate it. */
export function bindVerifiedPrincipal(input: {
  readonly verifiedPrincipal: { readonly subjectId: string } | null;
  readonly memberships: readonly { readonly subjectId: string; readonly playerId: string; readonly active: boolean }[];
}): Result<{ readonly playerId: string; readonly active: boolean }> {
  const forbidden = { ok: false, error: { code: 'forbidden' } } as const;
  try {
    const subject = field(field(input, 'verifiedPrincipal'), 'subjectId');
    const memberships = field(input, 'memberships');
    if (!isId(subject) || !Array.isArray(memberships)) return forbidden;
    const length = field(memberships, 'length');
    if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0) return forbidden;
    const subjects = new Set<string>();
    const players = new Set<string>();
    let binding: { readonly playerId: string; readonly active: boolean } | undefined;
    for (let index = 0; index < length; index += 1) {
      const membership = field(memberships, String(index));
      const subjectId = field(membership, 'subjectId');
      const playerId = field(membership, 'playerId');
      const active = field(membership, 'active');
      if (!isId(subjectId) || !isId(playerId) || typeof active !== 'boolean'
        || subjects.has(subjectId) || players.has(playerId)) return forbidden;
      subjects.add(subjectId);
      players.add(playerId);
      if (subjectId === subject) binding = { playerId, active };
    }
    return binding ? { ok: true, value: binding } : forbidden;
  } catch {
    return forbidden;
  }
}
