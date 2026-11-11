export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

type LobbyPlayer = {
  readonly id: string;
  readonly alias: string;
  readonly avatarKey: string;
  readonly ready: boolean;
  readonly connected: boolean;
};

type Lobby = {
  readonly code: string;
  readonly name: string;
  readonly configuredSeats: number;
  readonly hostPlayerId: string;
  readonly revision: number;
  readonly players: readonly LobbyPlayer[];
};

const isId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);

/** Projects trusted state for an already verified lobby member. */
export function publicLobbyView(input: Lobby): Result<Lobby> {
  const invalid: Result<never> = { ok: false, error: { code: 'invalid-input' } };
  if (
    typeof input !== 'object' || input === null ||
    typeof input.code !== 'string' || typeof input.name !== 'string' ||
    !Number.isInteger(input.configuredSeats) ||
    input.configuredSeats < 5 || input.configuredSeats > 10 ||
    !isId(input.hostPlayerId) ||
    !Number.isSafeInteger(input.revision) || input.revision < 0 ||
    !Array.isArray(input.players) || input.players.length > input.configuredSeats
  ) return invalid;

  const ids = new Set<string>();
  const players: LobbyPlayer[] = [];
  for (const player of input.players) {
    if (
      typeof player !== 'object' || player === null ||
      !isId(player.id) || ids.has(player.id) ||
      typeof player.alias !== 'string' || typeof player.avatarKey !== 'string' ||
      typeof player.ready !== 'boolean' || typeof player.connected !== 'boolean'
    ) return invalid;
    ids.add(player.id);
    players.push({
      id: player.id, alias: player.alias, avatarKey: player.avatarKey,
      ready: player.ready, connected: player.connected,
    });
  }
  if (!ids.has(input.hostPlayerId)) return invalid;
  return {
    ok: true,
    value: {
      code: input.code, name: input.name, configuredSeats: input.configuredSeats,
      hostPlayerId: input.hostPlayerId, revision: input.revision, players,
    },
  };
}
