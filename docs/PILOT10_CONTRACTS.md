# Ten-agent pilot contracts

> Scope: completed T01-T10 compatibility only. New A001-A100 work uses
> [the full design pack](DESIGN_RECONCILIATION.md) and its own declared ownership.
> Preserve these APIs/tests; do not reinterpret them as the new six-node rules.

This document fixes the implementation contracts for T01–T10 before concurrent
work begins. It refines the ownership table in `SWARM_PILOT.md` for this batch.
Read `README.md`, `AGENTS.md`, `GDD.md`, and `ARCHITECTURE.md` as well. This is a
foundation and local-preview batch, not a complete playable game or a Firebase
integration. Roles, faction distribution, vote thresholds, private choices,
Transmission resolution, and the Witness endgame remain outside this batch.

## Shared implementation rules

- Each task owns only the paths in its task JSON. Do not change shared barrels,
  manifests, configuration, dependencies, `App.tsx`, or another task's files.
  T01 has one explicit manifest exception described below.
- Export each new API from its own module. Folder-owned tasks use a local
  `index.ts` or `index.tsx`. No task imports another task's new implementation.
  The coordinator connects these modules and publishes package exports later.
- Define the types needed by your own module. Structural compatibility is
  sufficient for this batch; do not introduce a shared contract file during it.
- Keep public input validation, presentation, and authoritative game decisions
  separate. No browser component assigns roles, resolves a round, or declares a
  winner. A callback from a form expresses intent only.
- No network services, credentials, assets, real participants, or telemetry are
  needed. Test fixtures must be synthetic and original.
- Use readonly input types and preserve inputs. Use explicit allowlists when
  crossing a privacy or persistence boundary.
- Do not install packages. The shared base supplies React 19 and its types,
  Testing Library React 16.3.3, user-event 14.6.9, and jsdom 26.1.0. DOM test files
  must begin with `// @vitest-environment jsdom` and explicitly register
  `afterEach(cleanup)` with imports from Vitest and Testing Library. Do not assume
  Jest globals or jest-dom matchers; use Vitest assertions on DOM properties.
- Engine tests belong in `packages/engine/tests/`, never in production `src`.
  Engine production code has ES2022 types only and no Node, DOM, React, Firebase,
  or platform dependencies. T04 may import the existing P03 RNG API.
- Run scoped tests, lint, and typecheck. The complete repository must also pass
  `npm run check`. Report files changed, commands and outcomes, public API
  additions, and limitations. Do not commit, push, create PRs, or spawn agents.

## Shared value conventions

These are pilot transport conventions, not additional gameplay rules.

| Value | Canonical representation |
| --- | --- |
| Room code | Exactly six ASCII characters matching `^[A-Z0-9]{6}$` |
| Player or outcome ID | `^[A-Za-z0-9_-]{1,64}$` |
| Display name | Trimmed string, 1–24 Unicode code points, no Unicode control characters (`\p{Cc}`) |
| Revision | Nonnegative JavaScript safe integer |
| Player count | Minimum five and maximum ten, as specified in the GDD |
| Public board mark | Integer from zero through five, inclusive |

Room-entry UI trims surrounding whitespace and uppercases room codes. Display
names are trimmed without changing their case or internal spacing. Protocol,
engine, and storage boundaries validate canonical values rather than silently
normalizing them. Count Unicode code points with iteration, not UTF-16 length.
Errors must not echo raw input or private state. A remembered player ID is not
authentication, and a room code is not proof of authorization.

## T01: public command parser

Files: `packages/protocol/src/commands.ts`,
`packages/protocol/tests/commands.test.ts`, and `packages/protocol/package.json`.
The only permitted manifest change removes `--passWithNoTests` from its test
script; retain every other field and command.

Export `PublicCommand`, `CommandParseResult`, and
`parseCommand(input: unknown): CommandParseResult`. The command union is:

```ts
type PublicCommand =
  | { readonly type: 'join-room'; readonly roomCode: string; readonly displayName: string }
  | { readonly type: 'rename-player'; readonly displayName: string; readonly expectedRevision: number }
  | { readonly type: 'nominate-link'; readonly playerIds: readonly [string, string]; readonly expectedRevision: number }
  | { readonly type: 'cast-link-vote'; readonly approve: boolean; readonly expectedRevision: number };
type CommandParseResult =
  | { readonly ok: true; readonly value: PublicCommand }
  | { readonly ok: false; readonly error: { readonly code: 'invalid_command'; readonly path: string } };
```

Only accept ordinary objects or null-prototype records, with exactly the required
own string keys. Reject symbol keys, unknown fields, unknown discriminants,
missing fields, arrays in place of records, and values outside the shared
conventions. `playerIds` contains exactly two distinct valid IDs. `approve` must
be a boolean. Return freshly constructed command objects and tuple arrays.
Invalid input returns the error union, not a thrown validation error. Error paths
may contain only `$`, `type`, or a known schema field name, optionally with the
fixed tuple index `[0]` or `[1]`; never repeat an unknown key or submitted value.

The server will supply the authenticated actor separately. Reject fields such
as `actorId`, `role`, `seed`, and other attempted authority overrides. This parser
does not check room membership, voting eligibility, revision freshness, or vote
results. Cover all four commands, format boundaries, duplicate nominees, malformed
objects, authority fields, canonical names, safe integers, and safe error output.

## T02: recipient snapshot projection

Files: `packages/protocol/src/snapshots.ts` and
`packages/protocol/tests/snapshots.test.ts`.

Export `AuthoritativeSnapshotState`, `PublicSnapshot`, `PrivateSnapshot`,
`RecipientSnapshot`, and
`projectSnapshot(state: AuthoritativeSnapshotState, viewerId: string | null): RecipientSnapshot`.
Define the module's own types with these exact fields:

```text
AuthoritativeSnapshotState
  roomCode: string; revision: number
  players: readonly { id, displayName, connected, faction, roleId }[]
  board: { stability: number; corruption: number }
  transmission: null | { id, title, scenario, outcomes: readonly [Outcome, Outcome, Outcome] }
  link: readonly [string, string] | null
  seed: number; deck: readonly string[]
  privateChoices: Readonly<Record<string, string>>
Outcome: { id: string; label: string }
faction: 'archivists' | 'static'; connected: boolean; other player fields: string

PublicSnapshot
  roomCode; revision
  players: readonly { id: string; displayName: string; connected: boolean }[]
  board; transmission; link
PrivateSnapshot
  playerId: string; faction: 'archivists' | 'static'; roleId: string
RecipientSnapshot
  public: PublicSnapshot; private: PrivateSnapshot | null
```

All interfaces and nested collections should be readonly. Inputs are trusted,
typed authoritative data; this task is a projection boundary, not another
general-purpose schema validator. `viewerId: null` is a spectator and receives no
private data. A non-null viewer must match a roster ID or the function throws an
error without including private data. For a member, copy only that player's
three allowed private fields. The service must authenticate `viewerId` before
calling this function; the projection itself provides no authentication.

Construct every exposed object and array from explicit allowed fields. Extra
properties on state, players, board, Transmission, and outcomes must not survive.
Seeds, deck order, private choices, and other players' roles/factions must never
appear. Returned object/array containers must be detached from inputs, so mutating
a returned container cannot mutate authoritative state. Tests must inspect both
shape and serialized output for multiple recipients, a spectator, extra nested
properties, unknown viewers, and input/output mutation isolation.

## T03: deterministic local lobby reducer

Files: `packages/engine/src/lobby.ts` and
`packages/engine/tests/lobby.test.ts`.

Export `LobbyPlayer`, `LobbyState`, `LobbyEvent`, `LobbyReadiness`,
`createLobbyState()`, `reduceLobby(state, event)`, and `getLobbyReadiness(state)`.

```ts
interface LobbyPlayer {
  readonly id: string;
  readonly displayName: string;
  readonly connected: boolean;
}
interface LobbyState {
  readonly revision: number;
  readonly players: readonly LobbyPlayer[];
}
type LobbyEvent =
  | { readonly type: 'join'; readonly playerId: string; readonly displayName: string }
  | { readonly type: 'leave'; readonly playerId: string }
  | { readonly type: 'rename'; readonly playerId: string; readonly displayName: string }
  | { readonly type: 'set-connected'; readonly playerId: string; readonly connected: boolean };
interface LobbyReadiness {
  readonly playerCount: number;
  readonly availableSlots: number;
  readonly hasMinimumPlayers: boolean;
}
```

Initial state is revision zero and an empty roster. Join appends a connected
player, validates canonical ID/name, and rejects duplicate IDs or an eleventh
player. Other events require an existing valid player ID; rename validates the
name. Duplicate display names are permitted. Leave preserves remaining order.
Each accepted event, including an update to an existing value, returns a new
state and increments revision once. Invalid events throw without mutating state.
Do not mutate event objects or state. Readiness reports count, `10 - count`, and
whether count is at least five; disconnected players remain members and count.
It does not authorize game start, elect a host, or assign factions.

Test deterministic replay, frozen inputs, roster order, 4/5/10/11 boundaries,
duplicate IDs versus duplicate names, names with Unicode, missing players,
connection updates, and failed events preserving the previous state.

## T04: deterministic deck helpers

Files: `packages/engine/src/deck.ts` and
`packages/engine/tests/deck.test.ts`. Dependency: P03 must already be integrated
and green in the immutable base commit before dispatch.

Import `nextRandom` and type `RngState` from `./index.js`. The existing API is
`nextRandom(rng): readonly [value: number, next: RngState]`, not an object.
Export:

```ts
function shuffle<T>(items: readonly T[], rng: RngState): { items: T[]; rng: RngState };
function draw<T>(deck: readonly T[], count: number): { drawn: T[]; remaining: T[] };
```

Shuffle uses a copied array and descending Fisher–Yates: for `i = n - 1` down to
one, obtain the next random tuple, choose `floor(value * (i + 1))`, and swap.
Consume exactly `max(0, n - 1)` random advances. Empty and singleton inputs leave
the RNG value unchanged. Return the resulting RNG explicitly. Items themselves
are opaque: preserve their values/references, do not deep-clone or edit them.

Draw takes the first `count` items in order into a new array and returns the
remainder in another new array. Reject negative, fractional, non-finite, unsafe,
or oversized counts with `RangeError`; zero and the entire deck are valid.
Neither helper modifies input arrays or RNG, accesses time, or calls global
randomness. Test fixed shuffle fixtures and resulting RNG, identical seeds,
multiset preservation including duplicates, empty/singleton decks, frozen
inputs, exact advancement, and draw boundaries. No content or faction rules.

## T05: accessible reusable controls

Ownership: `packages/ui/src/controls/` and
`packages/ui/tests/controls.test.tsx`. Export components and their prop types from
`packages/ui/src/controls/index.ts` or `index.tsx` only.

`ActionButtonProps` extends native button attributes with optional `busy:boolean`.
`ActionButton` renders a native button, defaults `type` to `button`, preserves
children and ordinary button attributes, and is disabled when either `disabled`
or `busy` is true. Busy sets `aria-busy=true` and keeps its accessible name;
inactive busy must not announce true. Respect explicit `type="submit"`.

`TextFieldProps` requires `id:string`, `label:string`, `value:string`, and
`onValueChange(value:string):void`; optional fields are `hint:string`,
`error:string`, `name:string`, and `disabled:boolean`. It renders a controlled
native text input, visible associated label, and the nonempty hint/error text.
Use `${id}-hint` and `${id}-error` for their IDs. `aria-describedby` references
only rendered messages, hint before error. Set `aria-invalid=true` only for a
nonempty error. Forward name and disabled and emit the current string on change.
The caller provides a nonempty unique ID.

Use existing theme tokens from `../theme.js` for chrome and retain native visible
keyboard focus. Do not add a CSS asset that the existing TypeScript package build
cannot distribute; inline styles are sufficient. Test actual interactions,
disabled/busy behavior, labels, message associations, controlled updates, and
submission type. Do not modify the shared UI barrel or add game semantics.

## T06: local room-entry form

Ownership: `apps/client/src/features/room-entry/`; export `RoomEntryForm` and
`RoomEntryFormProps` from the folder's local entrypoint.

```ts
interface RoomEntryFormProps {
  readonly busy?: boolean;
  readonly onCreate: (input: { displayName: string }) => void;
  readonly onJoin: (input: { roomCode: string; displayName: string }) => void;
}
```

Provide Create and Join modes, defaulting to Create, using labeled native buttons
with `aria-pressed` or an equally complete accessible selection pattern. Display
name is required in both; room code is required and shown in Join only. Native
form submission supports Enter. Normalize name/code as specified above before
validating; emit one corresponding callback with only canonical allowed fields.
Invalid input does not call either callback. Show field-specific errors, connect
them with `aria-describedby`, mark invalid fields, and preserve entered values.
Clear stale errors when switching modes. Use React `useId` or equivalent to avoid
colliding IDs when multiple forms render. Busy disables mode changes and submit
and prevents callbacks even if a submit event is dispatched directly.

No fetch, storage, room creation, role assignment, or dependency on T01/T05.
Test create and join, Enter, whitespace/case normalization, Unicode names,
boundary lengths, invalid codes, accessible errors, and busy submissions.

## T07: public lobby roster view

Ownership: `apps/client/src/features/lobby-view/`; export `LobbyRoster` and its
props type from the folder entrypoint. Props are readonly `players` containing
`{id:string, displayName:string, connected:boolean}`, `currentPlayerId:string|null`,
and `hostPlayerId:string|null`.

Render a semantic list preserving roster order and a visible player count out of
ten. Label the current player with text such as "You" and host with "Host";
unknown/null IDs produce no label. Every row has a textual Connected/Disconnected
status. For fewer than five members, state exactly how many more are needed;
otherwise state that the minimum player count is reached, without claiming game
start authorization. An empty roster has a concrete waiting message. Disconnected
players still count. Inputs are trusted public data; duplicate display names
remain separate by ID. No roles, vote calculations, navigation, or actions.
Test empty, 4/5/10 players, identity labels, disconnected counts, duplicate names,
order, and rendering user-provided names as text rather than HTML.

## T08: public Stability/Corruption board

Ownership: `apps/client/src/features/board-view/`; export `BoardView` with props
`{readonly stability:number; readonly corruption:number}`.

Both values must be integers from zero to five; otherwise throw `RangeError`.
Render separate Stability and Corruption labels and visible numeric counts out
of five. Use accessible meter/progress semantics with named values and bounds
zero/five, and ensure meaning is conveyed without color. Decorative marks must
not duplicate announcements. No inferred winner, outcome, state mutation,
effects, or callbacks, including at 5/5. Test zero, intermediate values, 5/5,
accessible names/value bounds, malformed values, and absence of winner claims.

## T09: public Transmission view

Ownership: `apps/client/src/features/transmission-view/`; export
`TransmissionView`, its props, and local `Transmission`/`Outcome` types.

```ts
interface Outcome { readonly id: string; readonly label: string }
interface Transmission {
  readonly id: string;
  readonly title: string;
  readonly scenario: string;
  readonly outcomes: readonly [Outcome, Outcome, Outcome];
}
interface TransmissionViewProps {
  readonly transmission: Transmission | null;
  readonly resolvedOutcomeId: string | null;
  readonly statusText: string;
}
```

Render the public title, scenario, and three outcomes as ordinary React text.
Require three distinct outcome IDs and, when non-null, a resolved ID belonging
to those outcomes; throw `RangeError` on violations. A null Transmission requires
null resolved ID and presents a concrete waiting message. Mark a resolved outcome
with visible "Resolved outcome" text. Render the caller's nonempty status text
using `role="status"`, `aria-live="polite"`, and `aria-atomic="true"`.
The caller supplies public status; do not infer game phases. No choice controls,
hidden state, HTML injection, or result calculations. Test waiting, three public
outcomes, resolution, duplicate/missing references, accessible status, escaping,
and omission of unexpected private properties attached to input fixtures.

## T10: nonsecret persisted session hint

Ownership: `apps/client/src/features/session-hint/`; export `SessionHint`,
`SessionHintStorage`, `SESSION_HINT_KEY`, `loadSessionHint`, `saveSessionHint`, and
`clearSessionHint` from the local folder entrypoint.

```ts
interface SessionHint { readonly roomCode: string; readonly playerId: string }
interface SessionHintStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
const SESSION_HINT_KEY = 'afterimage.session-hint.v1';
function loadSessionHint(storage: SessionHintStorage): SessionHint | null;
function saveSessionHint(storage: SessionHintStorage, hint: SessionHint): boolean;
function clearSessionHint(storage: SessionHintStorage): boolean;
```

Store JSON with exactly `{version:1,roomCode,playerId}` and canonical valid field
values. Saving constructs this allowed shape, ignores unexpected extra input
properties, and returns false for invalid required fields or storage errors.
Validation failure leaves existing storage unchanged. Loading returns a freshly
constructed hint, excluding the version. A missing entry returns null. Malformed
JSON, wrong schema/version, unknown fields, or invalid values returns null and
attempts to remove only this entry. Reading or removal exceptions also yield
null. Clear returns true when removeItem succeeds and false on storage failure.
No clock, browser globals, network, authentication, secrets, or writes to other
keys. A future caller must revalidate membership with the authoritative service.

Test roundtrip, exact stored fields, corrupt JSON, unknown version/keys,
invalid formats, absent data, read/write/remove exceptions, preservation of other
entries and valid existing data on invalid save, and exclusion of extra tokens,
roles, or private choices. Use an injected in-memory storage fake.

## Integration and evidence

The coordinator handles package export wiring and a separate local preview that
connects these independently tested modules. That follow-up is not one of the ten
worker deliveries. Record worker start/end, agent activity, artifacts, scoped and
repository checks, PR/merge state, repair attempts, and reconciled model/Modal
costs. A validated patch is not a merged green PR. This pilot does not establish
an AFK baseline or satisfy the contest's 100-concurrent-agent requirement.
