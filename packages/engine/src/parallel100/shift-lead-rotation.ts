export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

// Read only own data properties, so malformed inputs cannot invoke accessors.
function data(value: unknown, key: PropertyKey): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export function nextShiftLead(input: {
  readonly seats: readonly { readonly id: string; readonly active: boolean }[];
  readonly previousLeadId: string | null;
}): Result<{ readonly leadId: string }> {
  const invalid = (): Result<{ readonly leadId: string }> =>
    ({ ok: false, error: { code: 'invalid-input' } });
  try {
    const seats: unknown = data(input, 'seats');
    const previous: unknown = data(input, 'previousLeadId');
    if (!Array.isArray(seats) || (previous !== null && !isId(previous))) return invalid();
    const length = data(seats, 'length');
    if (typeof length !== 'number' || length === 0) return invalid();

    const snapshot: { id: string; active: boolean }[] = [];
    const ids = new Set<string>();
    let previousIndex = -1;
    for (let index = 0; index < length; index++) {
      const seat = data(seats, String(index));
      const id = data(seat, 'id');
      const active = data(seat, 'active');
      if (!isId(id) || typeof active !== 'boolean' || ids.has(id)) return invalid();
      ids.add(id);
      snapshot.push({ id, active });
      if (id === previous) previousIndex = index;
    }
    if (previous !== null && previousIndex === -1) return invalid();
    for (let offset = 1; offset <= length; offset++) {
      const seat = snapshot[(previousIndex + offset) % length];
      if (seat?.active) return { ok: true, value: { leadId: seat.id } };
    }
    return invalid();
  } catch {
    // Reflective failures (for example revoked proxies) are malformed input too.
    return invalid();
  }
}
