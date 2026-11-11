export type Role = 'archivist' | 'static-operative' | 'null';
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

type Player = { readonly id: string; readonly active: boolean; readonly role: Role };

// Read data properties only, so malformed runtime inputs cannot execute getters.
function data(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

/** Applies a power already triggered and authorized by the authority layer. */
export function disconnectPlayer(input: {
  readonly actorId: string;
  readonly authorizedLeadId: string;
  readonly targetId: string;
  readonly phaseAllowsPower: boolean;
  readonly players: readonly Player[];
}): Result<{
  readonly players: readonly Player[];
  readonly winner: 'archivists' | null;
  readonly publicEffect: {
    readonly targetId: string;
    readonly spectator: true;
    readonly nullVictory: boolean;
  };
}> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  const forbidden = { ok: false, error: { code: 'forbidden' } } as const;
  try {
    const actorId = data(input, 'actorId');
    const authorizedLeadId = data(input, 'authorizedLeadId');
    const targetId = data(input, 'targetId');
    const phaseAllowsPower = data(input, 'phaseAllowsPower');
    const roster = data(input, 'players');
    if (!isId(actorId) || !isId(authorizedLeadId) || !isId(targetId)
      || typeof phaseAllowsPower !== 'boolean' || !Array.isArray(roster)) return invalid;

    const players: Player[] = [];
    const ids = new Set<string>();
    for (let index = 0; index < roster.length; index += 1) {
      const player = data(roster, String(index));
      const id = data(player, 'id');
      const active = data(player, 'active');
      const role = data(player, 'role');
      if (!isId(id) || typeof active !== 'boolean'
        || (role !== 'archivist' && role !== 'static-operative' && role !== 'null')
        || ids.has(id)) return invalid;
      ids.add(id);
      players.push({ id, active, role });
    }
    const target = players.find((player) => player.id === targetId);
    if (actorId !== authorizedLeadId || !phaseAllowsPower || actorId === targetId
      || !target || !target.active) return forbidden;

    const nullVictory = target.role === 'null';
    return {
      ok: true,
      value: {
        players: players.map((player) => ({ ...player, active: player.id === targetId ? false : player.active })),
        winner: nullVictory ? 'archivists' : null,
        publicEffect: { targetId, spectator: true, nullVictory },
      },
    };
  } catch {
    return invalid;
  }
}
