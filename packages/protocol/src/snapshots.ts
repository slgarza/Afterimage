interface Outcome {
  readonly id: string;
  readonly label: string;
}

interface Board {
  readonly stability: number;
  readonly corruption: number;
}

interface Transmission {
  readonly id: string;
  readonly title: string;
  readonly scenario: string;
  readonly outcomes: readonly [Outcome, Outcome, Outcome];
}

type Faction = 'archivists' | 'static';

export interface AuthoritativeSnapshotState {
  readonly roomCode: string;
  readonly revision: number;
  readonly players: readonly {
    readonly id: string;
    readonly displayName: string;
    readonly connected: boolean;
    readonly faction: Faction;
    readonly roleId: string;
  }[];
  readonly board: Board;
  readonly transmission: Transmission | null;
  readonly link: readonly [string, string] | null;
  readonly seed: number;
  readonly deck: readonly string[];
  readonly privateChoices: Readonly<Record<string, string>>;
}

export interface PublicSnapshot {
  readonly roomCode: string;
  readonly revision: number;
  readonly players: readonly {
    readonly id: string;
    readonly displayName: string;
    readonly connected: boolean;
  }[];
  readonly board: Board;
  readonly transmission: Transmission | null;
  readonly link: readonly [string, string] | null;
}

export interface PrivateSnapshot {
  readonly playerId: string;
  readonly faction: Faction;
  readonly roleId: string;
}

export interface RecipientSnapshot {
  readonly public: PublicSnapshot;
  readonly private: PrivateSnapshot | null;
}

/** The caller must authenticate viewerId before requesting a member projection. */
export function projectSnapshot(
  state: AuthoritativeSnapshotState,
  viewerId: string | null,
): RecipientSnapshot {
  const viewer = viewerId === null ? undefined : state.players.find(({ id }) => id === viewerId);
  if (viewerId !== null && viewer === undefined) {
    throw new Error('Unknown snapshot viewer');
  }

  const transmission = state.transmission;
  const copyOutcome = (outcome: Outcome): Outcome => ({ id: outcome.id, label: outcome.label });

  return {
    public: {
      roomCode: state.roomCode,
      revision: state.revision,
      players: state.players.map((player) => ({
        id: player.id,
        displayName: player.displayName,
        connected: player.connected,
      })),
      board: { stability: state.board.stability, corruption: state.board.corruption },
      transmission: transmission === null ? null : {
        id: transmission.id,
        title: transmission.title,
        scenario: transmission.scenario,
        outcomes: [
          copyOutcome(transmission.outcomes[0]),
          copyOutcome(transmission.outcomes[1]),
          copyOutcome(transmission.outcomes[2]),
        ],
      },
      link: state.link === null ? null : [state.link[0], state.link[1]],
    },
    private: viewer === undefined ? null : {
      playerId: viewer.id,
      faction: viewer.faction,
      roleId: viewer.roleId,
    },
  };
}
