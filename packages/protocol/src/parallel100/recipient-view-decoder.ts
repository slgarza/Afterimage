export type Role = 'archivist' | 'static-operative' | 'null';
export type Phase = 'ROUND_START' | 'VOTE_OPEN' | 'CREW_LOCKED'
  | 'OPERATION_LOCKED' | 'RESOLUTION' | 'CITY_MOMENT' | 'MATCH_END';
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
    readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
    readonly decisionId?: string;
  } };

type Player = {
  readonly id: string; readonly alias: string; readonly avatarKey: string;
  readonly active: boolean; readonly revealedRole: Role | null;
};
type RecipientView = {
  readonly version: 1; readonly recipientId: string; readonly revision: number;
  readonly phase: Phase; readonly active: boolean; readonly ownRole: Role;
  readonly players: readonly Player[];
};

const rootKeys = ['version', 'recipientId', 'revision', 'phase', 'active', 'ownRole', 'players'];
const playerKeys = ['id', 'alias', 'avatarKey', 'active', 'revealedRole'];

function record(input: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (input === null || typeof input !== 'object') return null;
  const prototype: unknown = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.length !== keys.length) return null;
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of ownKeys) {
    if (typeof key !== 'string' || !keys.includes(key)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !('value' in descriptor)) return null;
    result[key] = descriptor.value;
  }
  return result;
}

function role(value: unknown): value is Role {
  return value === 'archivist' || value === 'static-operative' || value === 'null';
}

function phase(value: unknown): value is Phase {
  return value === 'ROUND_START' || value === 'VOTE_OPEN' || value === 'CREW_LOCKED'
    || value === 'OPERATION_LOCKED' || value === 'RESOLUTION'
    || value === 'CITY_MOMENT' || value === 'MATCH_END';
}

function id(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function invalid(): Result<RecipientView> {
  return { ok: false, error: { code: 'invalid-input' } };
}

/** Decodes only the minimal wire view; this does not authenticate its sender. */
export function decodeRecipientView(input: unknown): Result<RecipientView> {
  try {
    const fields = record(input, rootKeys);
    if (!fields) return invalid();
    const { version, recipientId, revision, active, ownRole, players: roster } = fields;
    const currentPhase = fields.phase;
    if (version !== 1 || !id(recipientId) || typeof revision !== 'number'
      || !Number.isSafeInteger(revision) || revision < 0 || !phase(currentPhase)
      || typeof active !== 'boolean' || !role(ownRole) || !Array.isArray(roster)) return invalid();

    // Inspect dense array data slots, never its iterator or index getters.
    const lengthDescriptor = Object.getOwnPropertyDescriptor(roster, 'length');
    const length: unknown = lengthDescriptor?.value;
    if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0
      || Reflect.ownKeys(roster).length !== length + 1) return invalid();
    const players: Player[] = [];
    const ids = new Set<string>();
    let recipientFound = false;
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(roster, String(index));
      if (!descriptor || !('value' in descriptor)) return invalid();
      const player = record(descriptor.value, playerKeys);
      if (!player) return invalid();
      const { id: playerId, alias, avatarKey, active: playerActive, revealedRole } = player;
      if (!id(playerId) || ids.has(playerId) || typeof alias !== 'string'
        || typeof avatarKey !== 'string' || typeof playerActive !== 'boolean'
        || (revealedRole !== null && (currentPhase !== 'MATCH_END' || !role(revealedRole)))) {
        return invalid();
      }
      ids.add(playerId);
      if (playerId === recipientId) {
        if (playerActive !== active) return invalid();
        recipientFound = true;
      }
      players.push({ id: playerId, alias, avatarKey, active: playerActive, revealedRole });
    }
    if (!recipientFound) return invalid();
    return { ok: true, value: {
      version, recipientId, revision, phase: currentPhase, active, ownRole, players,
    } };
  } catch {
    // Inspection traps may throw private values; expose only the fixed error.
    return invalid();
  }
}
