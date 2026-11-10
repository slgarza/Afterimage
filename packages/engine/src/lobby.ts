export interface LobbyPlayer {
  readonly id: string;
  readonly displayName: string;
  readonly connected: boolean;
}

export interface LobbyState {
  readonly revision: number;
  readonly players: readonly LobbyPlayer[];
}

export type LobbyEvent =
  | { readonly type: 'join'; readonly playerId: string; readonly displayName: string }
  | { readonly type: 'leave'; readonly playerId: string }
  | { readonly type: 'rename'; readonly playerId: string; readonly displayName: string }
  | { readonly type: 'set-connected'; readonly playerId: string; readonly connected: boolean };

export interface LobbyReadiness {
  readonly playerCount: number;
  readonly availableSlots: number;
  readonly hasMinimumPlayers: boolean;
}

function validateId(id: string): void {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    throw new Error('Invalid player ID.');
  }
}

function validateName(name: string): void {
  if (typeof name !== 'string' || name !== name.trim() ||
      [...name].length < 1 || [...name].length > 24 || /\p{Cc}/u.test(name)) {
    throw new Error('Invalid display name.');
  }
}

export function createLobbyState(): LobbyState {
  return { revision: 0, players: [] };
}

/** Apply one membership event, preserving the input state and roster order. */
export function reduceLobby(state: LobbyState, event: LobbyEvent): LobbyState {
  if (!Number.isSafeInteger(state.revision) || state.revision < 0 ||
      state.revision === Number.MAX_SAFE_INTEGER) {
    throw new Error('Lobby revision cannot advance.');
  }
  validateId(event.playerId);
  const index = state.players.findIndex((player) => player.id === event.playerId);
  let players: readonly LobbyPlayer[];

  if (event.type === 'join') {
    validateName(event.displayName);
    if (index !== -1) throw new Error('Player already belongs to the lobby.');
    if (state.players.length >= 10) throw new Error('Lobby is full.');
    players = [...state.players, {
      id: event.playerId, displayName: event.displayName, connected: true,
    }];
  } else {
    if (index === -1) throw new Error('Player is not in the lobby.');
    switch (event.type) {
      case 'leave':
        players = state.players.filter((_, playerIndex) => playerIndex !== index);
        break;
      case 'rename':
        validateName(event.displayName);
        players = state.players.map((player, playerIndex) => playerIndex === index
          ? { ...player, displayName: event.displayName } : player);
        break;
      case 'set-connected':
        if (typeof event.connected !== 'boolean') throw new Error('Invalid connection status.');
        players = state.players.map((player, playerIndex) => playerIndex === index
          ? { ...player, connected: event.connected } : player);
        break;
      default:
        throw new Error('Invalid lobby event.');
    }
  }
  return { revision: state.revision + 1, players };
}

/** Membership counts include disconnected players and do not authorize start. */
export function getLobbyReadiness(state: LobbyState): LobbyReadiness {
  const playerCount = state.players.length;
  return { playerCount, availableSlots: 10 - playerCount, hasMinimumPlayers: playerCount >= 5 };
}
