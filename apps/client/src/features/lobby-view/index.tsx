export interface LobbyRosterProps {
  readonly players: readonly {
    readonly id: string;
    readonly displayName: string;
    readonly connected: boolean;
  }[];
  readonly currentPlayerId: string | null;
  readonly hostPlayerId: string | null;
}

export function LobbyRoster({ players, currentPlayerId, hostPlayerId }: LobbyRosterProps) {
  const neededPlayers = 5 - players.length;

  return (
    <section aria-label="Lobby roster">
      <h2>Players</h2>
      <p>{players.length} / 10 players</p>
      {players.length === 0 && <p>Waiting for players to join the lobby.</p>}
      <p>
        {neededPlayers > 0
          ? `${neededPlayers} more ${neededPlayers === 1 ? 'player is' : 'players are'} needed to reach the minimum player count.`
          : 'Minimum player count reached.'}
      </p>
      <ol aria-label="Players">
        {players.map((player) => (
          <li key={player.id}>
            <span>{player.displayName}</span>{' '}
            {player.id === currentPlayerId && <span>You </span>}
            {player.id === hostPlayerId && <span>Host </span>}
            <span>{player.connected ? 'Connected' : 'Disconnected'}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
