export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
    readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
    readonly decisionId?: string;
  } };

function field(record: unknown, key: string): unknown {
  if (record === null || typeof record !== 'object') return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

/** Public handles are supplied by the adapter, never derived from join credentials. */
export function lobbyDirectoryView(input: {
  readonly rooms: readonly { readonly id: string; readonly name: string; readonly listed: boolean; readonly joinable: boolean; readonly seats: number; readonly connected: number; readonly requiresPasscode: boolean }[];
}): Result<readonly { readonly id: string; readonly name: string; readonly seats: number; readonly connected: number; readonly requiresPasscode: boolean }[]> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  try {
    const rooms = field(input, 'rooms');
    if (!Array.isArray(rooms)) return invalid;
    const length = field(rooms, 'length');
    if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0) return invalid;
    const value: { id: string; name: string; seats: number; connected: number; requiresPasscode: boolean }[] = [];
    const handles = new Set<string>();
    for (let index = 0; index < length; index += 1) {
      const room = field(rooms, String(index));
      const listed = field(room, 'listed');
      const joinable = field(room, 'joinable');
      if (typeof listed !== 'boolean' || typeof joinable !== 'boolean') return invalid;
      // Hidden entries do not influence the directory or expose their other fields.
      if (!listed || !joinable) continue;
      const id = field(room, 'id');
      const name = field(room, 'name');
      const seats = field(room, 'seats');
      const connected = field(room, 'connected');
      const requiresPasscode = field(room, 'requiresPasscode');
      if (typeof id !== 'string' || id.length === 0 || handles.has(id)
        || typeof name !== 'string' || typeof requiresPasscode !== 'boolean'
        || typeof seats !== 'number' || !Number.isInteger(seats) || seats < 5 || seats > 10
        || typeof connected !== 'number' || !Number.isInteger(connected) || connected < 0 || connected > seats) return invalid;
      handles.add(id);
      value.push({ id, name, seats, connected, requiresPasscode });
    }
    return { ok: true, value };
  } catch {
    return invalid;
  }
}
