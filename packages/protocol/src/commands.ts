export type PublicCommand =
  | { readonly type: 'join-room'; readonly roomCode: string; readonly displayName: string }
  | { readonly type: 'rename-player'; readonly displayName: string; readonly expectedRevision: number }
  | { readonly type: 'nominate-link'; readonly playerIds: readonly [string, string]; readonly expectedRevision: number }
  | { readonly type: 'cast-link-vote'; readonly approve: boolean; readonly expectedRevision: number };

export type CommandParseResult =
  | { readonly ok: true; readonly value: PublicCommand }
  | { readonly ok: false; readonly error: { readonly code: 'invalid_command'; readonly path: string } };

type ErrorPath = '$' | 'type' | 'roomCode' | 'displayName' | 'expectedRevision'
  | 'playerIds' | 'playerIds[0]' | 'playerIds[1]' | 'approve';

function invalid(path: ErrorPath): CommandParseResult {
  return { ok: false, error: { code: 'invalid_command', path } };
}

function validName(value: unknown): value is string {
  return typeof value === 'string' && value === value.trim()
    && [...value].length >= 1 && [...value].length <= 24 && !/\p{Cc}/u.test(value);
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

/** Validates public intent only; authentication and game eligibility belong to the server. */
export function parseCommand(input: unknown): CommandParseResult {
  try {
    if (input === null || typeof input !== 'object') return invalid('$');
    const prototype: unknown = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return invalid('$');

    // Read data descriptors rather than invoking submitted getters.
    const fields: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of Reflect.ownKeys(input)) {
      if (typeof key !== 'string') return invalid('$');
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor)) return invalid('$');
      fields[key] = descriptor.value;
    }

    const type = fields.type;
    let keys: readonly string[];
    switch (type) {
      case 'join-room': keys = ['type', 'roomCode', 'displayName']; break;
      case 'rename-player': keys = ['type', 'displayName', 'expectedRevision']; break;
      case 'nominate-link': keys = ['type', 'playerIds', 'expectedRevision']; break;
      case 'cast-link-vote': keys = ['type', 'approve', 'expectedRevision']; break;
      default: return invalid('type');
    }
    if (Object.keys(fields).length !== keys.length || keys.some((key) => !Object.hasOwn(fields, key))
      || Object.keys(fields).some((key) => !keys.includes(key))) return invalid('$');

    if (type === 'join-room') {
      const { roomCode, displayName } = fields;
      if (typeof roomCode !== 'string' || !/^[A-Z0-9]{6}$/.test(roomCode)) return invalid('roomCode');
      if (!validName(displayName)) return invalid('displayName');
      return { ok: true, value: { type, roomCode, displayName } };
    }

    const { expectedRevision } = fields;
    if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision)
      || expectedRevision < 0) return invalid('expectedRevision');

    if (type === 'rename-player') {
      const { displayName } = fields;
      if (!validName(displayName)) return invalid('displayName');
      return { ok: true, value: { type, displayName, expectedRevision } };
    }
    if (type === 'cast-link-vote') {
      const { approve } = fields;
      if (typeof approve !== 'boolean') return invalid('approve');
      return { ok: true, value: { type, approve, expectedRevision } };
    }

    const { playerIds } = fields;
    if (!Array.isArray(playerIds) || playerIds.length !== 2
      || Reflect.ownKeys(playerIds).length !== 3) return invalid('playerIds');
    const first = Object.getOwnPropertyDescriptor(playerIds, '0');
    const second = Object.getOwnPropertyDescriptor(playerIds, '1');
    if (!first || !('value' in first) || !validId(first.value)) return invalid('playerIds[0]');
    if (!second || !('value' in second) || !validId(second.value)) return invalid('playerIds[1]');
    if (first.value === second.value) return invalid('playerIds');
    return { ok: true, value: { type, playerIds: [first.value, second.value], expectedRevision } };
  } catch {
    // Proxy traps and other inspection failures must not leak submitted data.
    return invalid('$');
  }
}
