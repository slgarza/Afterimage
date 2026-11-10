# Independent domain and policy contracts for B051–B100

These fifty independently implementable leaves form the domain half of the
[B001–B100 preparation](PILOT100_READY.md). They decompose existing A-series
scope rather than claiming fifty additional unrelated product features. The
`replacesScopeFrom` lists in task JSON reserve that exact part of the older
implementation ticket for consumption during later integration. Do not run the
older broad implementation in parallel or duplicate the same implementation.

Every API below is **frozen preparation input**, not existing application code.
All source and tests belong to one task; there are no imports from unmerged
A/B modules. Engine modules may import `nextRandom` from existing
`packages/engine/src/index.ts` via `../index.js`; no cross-workspace relative
source imports or new package exports are needed during this cohort. Client
leaves are pure policies that later adapters/components consume. Committing a
leaf does not mean it is wired into App, Firebase or native services.

## Shared structural vocabulary

Each leaf locally declares only the following aliases that its own signature
uses. Identical structural shapes allow a later adapter to compose leaves
without requiring a shared implementation to merge before the run. Do not add
a central shared file or silently change another task's API.

```ts
export type Role = 'archivist' | 'static-operative' | 'null';
export type IncidentId = 'I01' | 'I02' | 'I03' | 'I04' | 'I05' | 'I06';
export type Phase = 'ROUND_START' | 'VOTE_OPEN' | 'CREW_LOCKED'
  | 'OPERATION_LOCKED' | 'RESOLUTION' | 'CITY_MOMENT' | 'MATCH_END';
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };
```

The two functions whose signatures return a fixed safe summary directly
(B081/B090) do not wrap it in `Result`. Every other function returns `Result`;
known malformed runtime values must fail without echoing submitted data. IDs
represent player/principal/request identities only when a signature names them:
ASCII `[A-Za-z0-9_-]{1,64}`. Semantic option/asset IDs have their own stated
bounds. Aliases and other display strings are never identity. Arrays and nested
outputs are detached; do not mutate the input or share writable authority state.
No caller-provided getter or string conversion should run on a decoder boundary.
Use the repository's current strict TypeScript settings, including
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.

Names, transport limits and UI-default values explicitly frozen here are adapter
contracts, not new core game rules. Unknown rules (`D-ELIGIBLE-POOL`,
`D-CONTAINMENT`, `D-I04-JAM-TARGET`, `D-TIMER-COMPOSITION`,
`D-AUDIT-NO-HISTORY`) stay unresolved exactly where noted. These leaves do not
remove any design/external gate or permit live Firebase/native configuration.

## Independent acceptance and useful delivery

Each task must implement the exported behavior and adversarial cases below in
its owned tests; tests alone or a constant stub are insufficient. Semantic tests
should check externally specified results, fail against a missing/stubbed
implementation, and cover privacy/authority boundaries. Later integration must
exercise these APIs through a real gameplay/application consumer before claiming
a connected application feature. Do not count a broad A parent and its B leaves
twice in benchmark feature totals. B077 revision preconditions, B090 request
summary and B094 asset-record validation are explicitly supporting work
(`countsAsFeatureDelivery:false`), not independently counted product feature
deliveries. Public reports retain both accepted backlog
items and the exact frozen PR granularity.

## B051: Allocate the exact v1 role table with reproducible private assignments

Owned paths:

- `packages/engine/src/parallel100/role-allocation.ts`
- `packages/engine/tests/parallel100/role-allocation.test.ts`

Frozen API:

```ts
export function allocateRoles(input: {
  readonly playerIds: readonly string[];
  readonly rng: { readonly value: number };
}): Result<{ readonly assignments: readonly { readonly playerId: string; readonly role: Role }[]; readonly rng: { readonly value: number } }>;
```

Use the six exact 5–10-player distributions in Rules §1. Shuffle the role deck with existing nextRandom from ../index.js using Fisher–Yates; return advanced RNG and detached seat-order assignments. This is trusted authority-only data, never a public event. Do not add roles or derive identity from alias.

Acceptance cases:

- All six player counts produce exact Archivist/Static/Null counts, unique player assignments and exactly one Null.
- A repeated input/RNG produces identical assignment and next RNG; another permitted RNG can permute assignments without changing counts.
- Reject 4/11 seats, duplicate/empty IDs and invalid uint32 RNG; preserve all input arrays.

Reserved parent scope: A006.

## B052: Project private initial role and Static ally knowledge by recipient

Owned paths:

- `packages/engine/src/parallel100/initial-role-knowledge.ts`
- `packages/engine/tests/parallel100/initial-role-knowledge.test.ts`

Frozen API:

```ts
export function initialRoleKnowledge(input: {
  readonly assignments: readonly { readonly playerId: string; readonly role: Role }[];
  readonly recipientId: string;
}): Result<{ readonly ownRole: Role; readonly staticAllyIds: readonly string[] }>;
```

Only a Static operative receives other Static-operative IDs; omit self. Archivists and The Null receive no allies. Validate the exact canonical count table and unique identities before returning detached data; there is no deferred Ghost Resonance candidate feature.

Acceptance cases:

- Static recipients see every other Static operative and never The Null.
- Archivist and Null recipients receive empty ally lists and their own exact role only.
- Unknown recipient, duplicate identities or an impossible role distribution fails with no assignment payload in the error.

Reserved parent scope: A006, A025.

## B053: Rotate Shift Lead through fixed active seat order

Owned paths:

- `packages/engine/src/parallel100/shift-lead-rotation.ts`
- `packages/engine/tests/parallel100/shift-lead-rotation.test.ts`

Frozen API:

```ts
export function nextShiftLead(input: {
  readonly seats: readonly { readonly id: string; readonly active: boolean }[];
  readonly previousLeadId: string | null;
}): Result<{ readonly leadId: string }>;
```

Initial null selects first active seat; otherwise begin strictly after the previous seat and wrap. Permanent spectators are inactive; Jam/cooldown do not remove a still-active player from lead rotation. Reject no-active-seat states rather than inventing a new victory.

Acceptance cases:

- Initial, middle and wraparound selection follow the original seat array without sorting aliases.
- An inactive previous lead still supplies its old seat position; inactive candidates are skipped.
- Empty/duplicate seats, a non-null unknown previous lead and all-inactive input fail without mutation.

Reserved parent scope: A008.

## B054: Derive voting Crew and chat capabilities from active statuses

Owned paths:

- `packages/engine/src/parallel100/round-capabilities.ts`
- `packages/engine/tests/parallel100/round-capabilities.test.ts`

Frozen API:

```ts
export function roundCapabilities(input: {
  readonly players: readonly { readonly id: string; readonly active: boolean; readonly jammed: boolean; readonly crewCooldown: boolean }[];
}): Result<{ readonly players: readonly { readonly id: string; readonly mayVote: boolean; readonly mayServe: boolean; readonly mayChat: boolean }[]; readonly eligibleCrewIds: readonly string[]; readonly unresolvedDecision: 'D-ELIGIBLE-POOL' | null }>;
```

Active non-Jammed players may vote; serving additionally excludes one-round Crew cooldown. Active players retain chat despite Jam/cooldown; permanent spectators receive none of these capabilities. Return D-ELIGIBLE-POOL when fewer than two Crew candidates remain, with no invented replenishment or phase advance.

Acceptance cases:

- Exercise the active/Jammed/cooldown status truth table, including an otherwise-eligible current Shift Lead.
- A spectator has every action denied and is excluded from Crew regardless of other flags.
- A depleted pool preserves exact candidates and reports D-ELIGIBLE-POOL; duplicate IDs and malformed flags fail.

Reserved parent scope: A008, A025, A100.

## B055: Record one direct Crew vote with phase revision and actor checks

Owned paths:

- `packages/engine/src/parallel100/crew-vote-ledger.ts`
- `packages/engine/tests/parallel100/crew-vote-ledger.test.ts`

Frozen API:

```ts
export function recordCrewVote(input: {
  readonly phase: Phase; readonly revision: number; readonly expectedRevision: number;
  readonly actorId: string; readonly candidateId: string;
  readonly voterIds: readonly string[]; readonly eligibleCrewIds: readonly string[];
  readonly votes: readonly { readonly voterId: string; readonly candidateId: string }[];
}): Result<{ readonly revision: number; readonly votes: readonly { readonly voterId: string; readonly candidateId: string }[] }>;
```

Accept one candidate in VOTE_OPEN from an authorized voter to an eligible candidate. The local tap locks the vote per Screen Flow and A009: reject a changed or duplicate second vote; request-level deduplication belongs to the separate authority boundary. Advance revision once. Return private ledger only, not generic public choice events.

Acceptance cases:

- A valid tap appends one vote and advances exactly one revision, leaving input untouched.
- Wrong phase/revision, unauthorized actor, ineligible target and a second vote all fail without changing ledger.
- Reject forged duplicate existing voter records and unsafe/max-safe revisions; no boolean approval or pair nomination input exists.

Reserved parent scope: A009.

## B056: Resolve both Crew seats using vote history and seeded draws

Owned paths:

- `packages/engine/src/parallel100/crew-selection.ts`
- `packages/engine/tests/parallel100/crew-selection.test.ts`

Frozen API:

```ts
export function selectRepairCrew(input: {
  readonly candidates: readonly { readonly id: string; readonly votes: number; readonly lastCrewRound: number | null }[];
  readonly currentRound: number; readonly rng: { readonly value: number };
}): Result<{ readonly crewIds: readonly [string, string]; readonly draws: readonly { readonly candidates: readonly string[]; readonly selectedId: string }[]; readonly rng: { readonly value: number } }>;
```

Order highest votes first, then oldest lastCrewRound (null means never served), then seeded visible draw among the still-tied candidates. Preserve supplied fixed candidate order for draw indexing; use existing nextRandom. Choose second seat from remaining candidates. Fewer than two candidates returns decision-required D-ELIGIBLE-POOL; never appoint a Shift Lead tie-break.

Acceptance cases:

- Highest totals win; a second-seat tie chooses longest-since-Crew, with never-served older than any recorded round.
- Exact history ties consume reproducible RNG and emit candidate/selected evidence; untied choices do not consume RNG.
- Reject duplicate IDs, negative/noninteger totals, future history and invalid RNG; no fallback is invented for fewer than two candidates.

Reserved parent scope: A010.

## B057: Assign distinct public Route and Gate operators reproducibly

Owned paths:

- `packages/engine/src/parallel100/crew-operator-assignment.ts`
- `packages/engine/tests/parallel100/crew-operator-assignment.test.ts`

Frozen API:

```ts
export function assignCrewOperators(input: {
  readonly crewIds: readonly [string, string]; readonly rng: { readonly value: number };
}): Result<{ readonly routeOperatorId: string; readonly gateOperatorId: string; readonly rng: { readonly value: number } }>;
```

Use one existing nextRandom draw to choose the Route operator from the supplied two-seat order; the remaining player becomes Gate operator. This public assignment contains no role, diagnostic or operation choice.

Acceptance cases:

- Exactly two distinct operators are assigned from the supplied Crew for both possible draw halves.
- Replaying an RNG reproduces public assignment and advanced RNG, with no global randomness.
- Duplicate/empty identities, an invalid tuple and non-uint32 RNG fail without secret data or mutation.

Reserved parent scope: A011.

## B058: Encode all six original incident options matrices and semantic keys

Owned paths:

- `packages/engine/src/parallel100/incident-catalogue.ts`
- `packages/engine/tests/parallel100/incident-catalogue.test.ts`

Frozen API:

```ts
export function incidentDefinition(id: 'I01' | 'I02' | 'I03' | 'I04' | 'I05' | 'I06'): Result<{
  readonly id: string; readonly name: string;
  readonly routes: readonly { readonly id: string; readonly label: string; readonly iconKey: string }[];
  readonly gates: readonly { readonly id: string; readonly label: string; readonly iconKey: string }[];
  readonly safe: { readonly routeId: string; readonly gateId: string };
  readonly corrupted: { readonly routeId: string; readonly gateId: string };
  readonly anomaly: 'shorter-next-round' | 'shuffle-vote-cards' | 'redact-feed-line' | 'jam-next-round' | 'obscure-map-route' | 'suppress-last-ten-audio';
}>;
```

Encode Rules §5 verbatim in domain data: exact names and safe/corrupted pairs; option IDs use incident-scoped semantic keys, never A/B/C or 1/2/3. No image paths, final art or new balance outcomes. Return detached structures, including iconKey equal to the semantic option ID.

Acceptance cases:

- Verify all six names, 36 option labels, unique semantic keys, safe and corrupted pairs against the frozen table.
- Every incident has three Routes, three Gates and two distinct exact pair outcomes; the remaining seven pairs are implicit Anomaly.
- An unknown runtime ID rejects with fixed invalid-input; mutating a returned object cannot corrupt later results.

Reserved parent scope: A004, A079.

## B059: Cycle a seeded six-incident queue without an immediate repeat

Owned paths:

- `packages/engine/src/parallel100/incident-queue.ts`
- `packages/engine/tests/parallel100/incident-queue.test.ts`

Frozen API:

```ts
export function nextIncident(input: {
  readonly remaining: readonly IncidentId[]; readonly previous: IncidentId | null;
  readonly rng: { readonly value: number };
}): Result<{ readonly incidentId: IncidentId; readonly remaining: readonly IncidentId[]; readonly rng: { readonly value: number } }>;
```

Consume a nonempty unique remaining queue as supplied. When empty, Fisher–Yates shuffle all six using existing nextRandom, then if first equals previous swap with the next entry. That swap consumes no extra randomness. Previous is trusted authority history, never exposed as a seed; no copied policy-card deck.

Acceptance cases:

- Each fresh cycle yields all six incidents once and a second cycle cannot immediately repeat its predecessor.
- A nonempty queue consumes its head without RNG advancement and retains remaining order.
- A replay matches exact queue/RNG; reject invalid IDs, duplicate remaining entries, invalid RNG and a head equal to previous.

Reserved parent scope: A005.

## B060: Lock one operator choice without revealing the partner input

Owned paths:

- `packages/engine/src/parallel100/private-operation-lock.ts`
- `packages/engine/tests/parallel100/private-operation-lock.test.ts`

Frozen API:

```ts
export function lockOperationChoice(input: {
  readonly phase: Phase; readonly revision: number; readonly expectedRevision: number;
  readonly actorId: string; readonly routeOperatorId: string; readonly gateOperatorId: string;
  readonly routeOptionIds: readonly string[]; readonly gateOptionIds: readonly string[];
  readonly choiceId: string; readonly routeChoice: string | null; readonly gateChoice: string | null;
}): Result<{ readonly revision: number; readonly routeChoice: string | null; readonly gateChoice: string | null }>;
```

Within CREW_LOCKED, the authenticated Route actor may lock only a Route option and the Gate actor only a Gate option. Each actor locks once; once both are non-null, orchestration elsewhere enters OPERATION_LOCKED. This is private authority state; do not return it as a recipient or generic event payload.

Acceptance cases:

- Route and Gate locks update only their own slot and one revision, regardless of actor order.
- Reject partner/outsider, cross-kind option, second lock, wrong phase/revision and duplicate operator IDs.
- Failed checks preserve both choices and input arrays; no API accepts literal Repair/Sabotage or outcome overrides.

Reserved parent scope: A012.

## B061: Resolve a locked Route Gate pair with deterministic trace classification

Owned paths:

- `packages/engine/src/parallel100/operation-outcome.ts`
- `packages/engine/tests/parallel100/operation-outcome.test.ts`

Frozen API:

```ts
export function resolveOperationPair(input: {
  readonly selected: { readonly routeId: string; readonly gateId: string };
  readonly routes: readonly string[]; readonly gates: readonly string[];
  readonly safe: { readonly routeId: string; readonly gateId: string };
  readonly corrupted: { readonly routeId: string; readonly gateId: string };
}): Result<{ readonly outcome: 'repair' | 'sabotage' | 'anomaly'; readonly repairDelta: 0 | 1; readonly sabotageDelta: 0 | 1; readonly trace: 'safe' | 'corrupted' | 'mixed' }>;
```

Exact safe pair yields Repair+1 and trace safe; exact corrupted pair yields Sabotage+1 and trace corrupted; every other valid pair is Anomaly, zero deltas and trace mixed. Validate two distinct diagnostic pairs and exactly three unique Route/Gate options. No randomness, per-operator choice output, role inference or I04 targeting belongs here.

Acceptance cases:

- Independently enumerate all nine pairs for representative supplied matrices: one Repair, one Sabotage, seven Anomalies.
- Trace exposes only pair classification and no selected Route/Gate identity.
- Unknown options, overlapping safe/corrupt definitions and malformed catalogues reject without mutation or hidden draws.

Reserved parent scope: A013, A018.

## B062: Complete missing authority choices with audited seeded legal actions

Owned paths:

- `packages/engine/src/parallel100/timeout-completion.ts`
- `packages/engine/tests/parallel100/timeout-completion.test.ts`

Frozen API:

```ts
export function completeTimedOutActions(input: {
  readonly kind: 'vote' | 'operation' | 'power-target';
  readonly pending: readonly { readonly actorId: string; readonly legalOptionIds: readonly string[] }[];
  readonly rng: { readonly value: number };
}): Result<{ readonly completions: readonly { readonly actorId: string; readonly optionId: string; readonly reason: 'timeout_vote' | 'timeout_operation' | 'timeout_power_target' }[]; readonly rng: { readonly value: number } }>;
```

After a separate trusted deadline gate, visit pending actors in supplied fixed seat order, use one existing nextRandom draw per actor and select floor(random*legalOptions.length). Validate the entire pending list before consuming RNG. Empty legal options is decision-required D-ELIGIBLE-POOL for votes, otherwise invalid-input; never choose an ineligible default.

Acceptance cases:

- Replaying a pending batch yields identical option choices and exactly advanced RNG plus kind-specific audit reasons.
- No pending actors consumes no RNG; accepted choices always belong to that actor’s supplied legal set.
- A duplicate actor/option, empty legal set or malformed RNG fails atomically; no client wall clock or hidden authority override is accepted.

Reserved parent scope: A015.

## B063: Advance six-node tracks and resolve immediate exact victories

Owned paths:

- `packages/engine/src/parallel100/track-advance.ts`
- `packages/engine/tests/parallel100/track-advance.test.ts`

Frozen API:

```ts
export function advanceCityTracks(input: {
  readonly repair: number; readonly sabotage: number;
  readonly outcome: 'repair' | 'sabotage' | 'anomaly';
  readonly nullDisconnected: boolean;
}): Result<{ readonly repair: number; readonly sabotage: number; readonly winner: 'archivists' | 'static' | null; readonly momentKey: string | null }>;
```

Operate only on nonterminal integer tracks0–5. Null Disconnect wins immediately for Archivists without applying another operation; otherwise increment exactly the result track and emit city.repair.rN or city.sabotage.sN (Anomaly no moment). Six wins; no five-mark/Witness rules or random victories.

Acceptance cases:

- Repair5→6 and Sabotage5→6 yield their exact winner; other advances and Anomaly keep winner null.
- nullDisconnected wins Archivists independently of current nonterminal scores and does not add a track point.
- Reject terminal/negative/fractional/NaN tracks and invalid outcomes; never allow dual wins or mutate input.

Reserved parent scope: A016.

## B064: Consume Safeguard against one future Jam or Disconnect

Owned paths:

- `packages/engine/src/parallel100/safeguard-effect.ts`
- `packages/engine/tests/parallel100/safeguard-effect.test.ts`

Frozen API:

```ts
export function applySafeguard(input: {
  readonly protectedPlayerId: string | null;
  readonly targetId: string; readonly targetActive: boolean;
  readonly effect: 'jam' | 'disconnect';
}): Result<{ readonly prevented: boolean; readonly protectedPlayerId: string | null; readonly applyEffect: boolean }>;
```

Protection is consumed only when a future Jam/Disconnect actually targets that active protected player. Other targets leave it intact; inactive targets are invalid rather than wasting protection. This does not select or authorize a power target.

Acceptance cases:

- The first protected Jam and first protected Disconnect are each prevented and clear protection.
- A different active target applies the effect and keeps existing protection; null protection allows the effect.
- Inactive/empty targets and invalid effect values fail; prevent/apply booleans are never simultaneously true and inputs remain unchanged.

Reserved parent scope: A019.

## B065: Project sealed and open Crew vote activity without early choice leaks

Owned paths:

- `packages/engine/src/parallel100/sealed-vote-view.ts`
- `packages/engine/tests/parallel100/sealed-vote-view.test.ts`

Frozen API:

```ts
export function crewVoteView(input: {
  readonly sealed: boolean; readonly resolved: boolean; readonly recipientId: string;
  readonly votes: readonly { readonly voterId: string; readonly candidateId: string; readonly timeout: boolean }[];
}): Result<{ readonly castCount: number; readonly ownVote: { readonly candidateId: string; readonly timeout: boolean } | null; readonly disclosedVotes: readonly { readonly voterId: string; readonly candidateId: string; readonly timeout: boolean }[] }>;
```

S2 hides every other player’s candidate until deadline/resolution. A recipient retains their own submitted candidate; generic castCount never proves alignment. Unsealed or resolved voting may show the vote ledger. Return detached allowlisted data; require unique voters and bounded IDs.

Acceptance cases:

- Sealed unresolved projection exposes castCount and the recipient’s own vote while disclosedVotes stays empty.
- Resolved sealed and unsealed projections disclose exact allowed records with timeout provenance.
- Search serialized sealed projection for opponent candidate IDs; malformed/duplicate records fail with no payload echo and no input mutation.

Reserved parent scope: A009, A022, A067.

## B066: Return private safe corrupted neutral or timeout audit evidence

Owned paths:

- `packages/engine/src/parallel100/private-audit-evidence.ts`
- `packages/engine/tests/parallel100/private-audit-evidence.test.ts`

Frozen API:

```ts
export function auditOperationEvidence(input: {
  readonly requesterIsAuthorizedLead: boolean; readonly targetActive: boolean;
  readonly latest: { readonly chosenClass: 'safe' | 'corrupted' | 'neutral'; readonly timeout: boolean } | null;
}): Result<{ readonly result: 'safe' | 'corrupted' | 'neutral' | 'timeout' }>;
```

Only an independently authenticated authorized Shift Lead can receive the active target’s latest operation classification; timeout overrides the chosen class. No alignment label, partner choice, seed or raw operation is returned. latest:null is decision-required D-AUDIT-NO-HISTORY, not fabricated neutral evidence.

Acceptance cases:

- Every chosenClass maps exactly, while any timed-out input maps timeout without exposing its underlying class.
- Unauthorized requester and inactive target fail before returning evidence.
- No history returns D-AUDIT-NO-HISTORY; malformed classes fail and serialized outputs contain no role or diagnostic.

Reserved parent scope: A020.

## B067: Apply an authorized permanent Disconnect and Null victory

Owned paths:

- `packages/engine/src/parallel100/permanent-disconnect.ts`
- `packages/engine/tests/parallel100/permanent-disconnect.test.ts`

Frozen API:

```ts
export function disconnectPlayer(input: {
  readonly actorId: string; readonly authorizedLeadId: string;
  readonly targetId: string; readonly phaseAllowsPower: boolean;
  readonly players: readonly { readonly id: string; readonly active: boolean; readonly role: Role }[];
}): Result<{ readonly players: readonly { readonly id: string; readonly active: boolean; readonly role: Role }[]; readonly winner: 'archivists' | null; readonly publicEffect: { readonly targetId: string; readonly spectator: true; readonly nullVictory: boolean } }>;
```

For an already-triggered authorized S4/S5 power, reject self, absent/inactive target and nonlead. Mark the target inactive forever; if target is The Null return immediate Archivist victory. Private players remain authority data; publicEffect reveals no alignment except the explicitly winning Null case. Do not implement unresolved R5 vote policy.

Acceptance cases:

- A legal non-Null target becomes inactive and emits a role-free public spectator effect, with all others unchanged.
- Null targeting yields immediate Archivist victory and the permitted terminal nullVictory flag.
- Wrong actor/phase, self/absent/alreadyinactive targets and duplicate IDs reject without mutation or alignment echo.

Reserved parent scope: A023, A021.

## B068: Derive the six specified Anomaly effects without inventing missing policy

Owned paths:

- `packages/engine/src/parallel100/anomaly-effects.ts`
- `packages/engine/tests/parallel100/anomaly-effects.test.ts`

Frozen API:

```ts
export function incidentAnomalyEffect(input: {
  readonly incidentId: IncidentId;
}): Result<{ readonly effect: 'reduce-next-round-by-10' | 'shuffle-vote-cards' | 'redact-one-feed-line' | 'obscure-map-route' | 'suppress-last-ten-audio-once'; readonly decisionRequired: 'D-TIMER-COMPOSITION' | null }>;
```

Emit only the semantic board consequence stated in Rules §5: I01 duration modifier with D-TIMER-COMPOSITION still pending, I02 visual-only shuffle, I03 redaction, I05 map obscuration, I06 one warning suppression. I04 returns decision-required D-I04-JAM-TARGET. This module never computes final deadlines, picks a victim, changes authoritative seat order or advances tracks.

Acceptance cases:

- Each specified non-I04 incident returns its exact semantic effect; I01 explicitly preserves the timer-composition question.
- I04 returns the named unresolved decision instead of inventing a deterministic Jam target.
- Unknown incident rejects; no effect returns role/choice payloads, RNG or Repair/Sabotage changes.

Reserved parent scope: A017, A014.

## B069: Disclose pair-level Trace Online evidence after Repair two

Owned paths:

- `packages/engine/src/parallel100/trace-online-evidence.ts`
- `packages/engine/tests/parallel100/trace-online-evidence.test.ts`

Frozen API:

```ts
export function traceOnlineEvidence(input: {
  readonly repair: number; readonly operationResolved: boolean;
  readonly pairClass: 'safe' | 'corrupted' | 'mixed';
}): Result<{ readonly visible: boolean; readonly classification: 'safe' | 'corrupted' | 'mixed' | null }>;
```

R2 enables pair-level classification only after an operation is resolved. Before Repair2 or before resolution output invisible/null, even if authority has a pairClass. Never expose which operator chose what, a secret alignment or an inferred accusation.

Acceptance cases:

- Repair0/1 always hides classification; Repair2–6 resolved operations reveal exact safe/corrupted/mixed.
- An unresolved operation stays hidden at every Repair count.
- Malformed/out-of-range tracks or pair classes fail; allowlisted serialized output contains only visibility/classification.

Reserved parent scope: A018, A039.

## B070: Build a fair recipient observation with private fields explicitly allowlisted

Owned paths:

- `packages/engine/src/parallel100/recipient-observation.ts`
- `packages/engine/tests/parallel100/recipient-observation.test.ts`

Frozen API:

```ts
export function recipientObservation(input: {
  readonly recipientId: string; readonly phase: Phase;
  readonly players: readonly { readonly id: string; readonly alias: string; readonly avatarKey: string; readonly active: boolean; readonly role: Role }[];
  readonly ownDiagnostic: { readonly kind: 'route' | 'gate'; readonly safeOptionId: string; readonly corruptedOptionId: string } | null;
  readonly recipientIsOperator: boolean; readonly matchEnded: boolean;
}): Result<{ readonly recipientId: string; readonly players: readonly { readonly id: string; readonly alias: string; readonly avatarKey: string; readonly active: boolean; readonly revealedRole: Role | null }[]; readonly ownRole: Role; readonly ownDiagnostic: { readonly kind: 'route' | 'gate'; readonly safeOptionId: string; readonly corruptedOptionId: string } | null }>;
```

Require the two terminal signals to agree: (phase === MATCH_END) must equal matchEnded, otherwise reject invalid-input before any projection. Before terminal Match End, reveal only ownRole; every player.revealedRole is null. Terminal views may reveal all roles. Permanent spectators always lose diagnostics, and active operators receive their own supplied diagnostic only during CREW_LOCKED/OPERATION_LOCKED. Treat input diagnostic as already recipient-scoped; this function does not select from omniscient raw history. Human and bot consumers get identical shapes.

Acceptance cases:

- Pre-end serialized views never include another player’s role, and terminal views reveal exact assignments; either inconsistent phase/matchEnded combination rejects before projection.
- A nonoperator or permanent spectator gets no diagnostic even when one was accidentally supplied; wrong phases also erase it.
- Unknown/duplicate recipients and malformed player records fail; output is detached and contains no server seed, other diagnostics or raw audit.

Reserved parent scope: A025, A067, A076.

## B071: Bind a verified principal to room membership independently of alias

Owned paths:

- `packages/protocol/src/parallel100/verified-session-binding.ts`
- `packages/protocol/tests/parallel100/verified-session-binding.test.ts`

Frozen API:

```ts
export function bindVerifiedPrincipal(input: {
  readonly verifiedPrincipal: { readonly subjectId: string } | null;
  readonly memberships: readonly { readonly subjectId: string; readonly playerId: string; readonly active: boolean }[];
}): Result<{ readonly playerId: string; readonly active: boolean }>;
```

Consume only a principal produced by a real trusted verifier outside this module; no input here proves cryptographic authentication. Resolve unique subject membership and retain permanent active/spectator status. Alias is never an identity key. Missing principal or membership is forbidden with fixed public error, without listing subjects.

Acceptance cases:

- A trusted principal maps to exactly its existing player ID even when display aliases collide elsewhere.
- A spectator binding preserves active:false and does not restore permissions.
- Null/unknown principal and duplicate subject/player membership fail without echoing identities; no fake token or Firebase adapter is introduced.

Reserved parent scope: A053.

## B072: Decode safe exact lobby configuration and transient passcode input

Owned paths:

- `packages/protocol/src/parallel100/lobby-config-decoder.ts`
- `packages/protocol/tests/parallel100/lobby-config-decoder.test.ts`

Frozen API:

```ts
export function decodeLobbyConfiguration(input: unknown): Result<{
  readonly name: string; readonly seats: 5 | 6 | 7 | 8 | 9 | 10;
  readonly roundSeconds: 30 | 60 | 90 | 120;
  readonly fillBots: boolean; readonly difficulty: 'calm' | 'standard' | 'sharp';
  readonly listed: boolean; readonly requirePasscode: boolean; readonly passcode: string | null;
}>;
```

Exact own data keys match the signature. name is trimmed1–48 Unicode scalar values, no control characters. Passcode is transient1–64 scalars with no controls when required, otherwise null; never log or persist it. calm/standard/sharp are adapter temperament IDs, not new modes or claims of bot strength. Inspect property descriptors rather than executing getters; reject symbols, inherited/custom-prototype objects and unknown authority fields.

Acceptance cases:

- Accept all supported seat/timer boundaries, either directory visibility and bot-toggle state.
- Reject4/11 seats, unsupported timers, unknown keys and illegal passcode combinations with fixed errors.
- Accessor/symbol/prototype and proxy-inspection failures do not execute getters or echo passcodes; detached results preserve duplicate-alias compatibility.

Reserved parent scope: A054, A061, A078.

## B073: Decode canonical v1 match intent without client authority overrides

Owned paths:

- `packages/protocol/src/parallel100/match-intent-decoder.ts`
- `packages/protocol/tests/parallel100/match-intent-decoder.test.ts`

Frozen API:

```ts
export type MatchIntent =
  | { readonly type: 'crew-vote'; readonly candidateId: string; readonly expectedRevision: number }
  | { readonly type: 'operation-choice'; readonly optionId: string; readonly expectedRevision: number }
  | { readonly type: 'power-target'; readonly powerId: string; readonly targetId: string; readonly expectedRevision: number }
  | { readonly type: 'containment-vote'; readonly candidateId: string; readonly expectedRevision: number }
  | { readonly type: 'request-advance'; readonly expectedRevision: number };
export function decodeMatchIntent(input: unknown): Result<MatchIntent>;
```

Validate exact per-variant own data keys, nonempty bounded semantic option/power IDs (1–128 scalars), player IDs per common bound and safe nonnegative expectedRevision. Parsing containment-vote only validates shape and does not resolve D-CONTAINMENT. No actor, seed, role, deadline, Repair/Sabotage choice, nomination-pair or approval override may enter the intent.

Acceptance cases:

- Every five canonical variant shape succeeds with exact detached values and no aliases for legacy actions.
- Reject forged actor/role/seed/outcome fields, unsafe revisions, pair nominations and boolean approval.
- Accessors/symbols/custom prototypes and inspection exceptions fail safely without invoking getters or leaking submitted values.

Reserved parent scope: A002, A054.

## B074: Project a recipient-safe lobby roster with no private credentials

Owned paths:

- `packages/protocol/src/parallel100/public-lobby-view.ts`
- `packages/protocol/tests/parallel100/public-lobby-view.test.ts`

Frozen API:

```ts
export function publicLobbyView(input: {
  readonly code: string; readonly name: string; readonly configuredSeats: number;
  readonly hostPlayerId: string; readonly revision: number;
  readonly players: readonly { readonly id: string; readonly alias: string; readonly avatarKey: string; readonly ready: boolean; readonly connected: boolean }[];
}): Result<{ readonly code: string; readonly name: string; readonly configuredSeats: number; readonly hostPlayerId: string; readonly revision: number; readonly players: readonly { readonly id: string; readonly alias: string; readonly avatarKey: string; readonly ready: boolean; readonly connected: boolean }[] }>;
```

Copy an exact public allowlist from trusted room state. Duplicate aliases are legal; identity and host use stable player IDs. A room code is allowed inside its joined lobby, not a substitute for verified membership. Ignore extra private source properties rather than spreading them; validate 5–10 configured seats and roster within capacity.

Acceptance cases:

- Public roster contains aliases/avatars/ready/presence and stable host identity, including legal duplicate aliases.
- Extra source passcode/hash/subject/role/seed/diagnostic properties never appear in serialized output.
- Reject overcapacity/duplicate IDs/absent host/unsafe revision and return detached nested arrays.

Reserved parent scope: A057.

## B075: Filter opt-in lobby directory entries and hide private join material

Owned paths:

- `packages/protocol/src/parallel100/lobby-directory-view.ts`
- `packages/protocol/tests/parallel100/lobby-directory-view.test.ts`

Frozen API:

```ts
export function lobbyDirectoryView(input: {
  readonly rooms: readonly { readonly id: string; readonly name: string; readonly listed: boolean; readonly joinable: boolean; readonly seats: number; readonly connected: number; readonly requiresPasscode: boolean }[];
}): Result<readonly { readonly id: string; readonly name: string; readonly seats: number; readonly connected: number; readonly requiresPasscode: boolean }[]>;
```

Expose only listed and joinable rooms in input order, with occupancy/name and a passcode-required boolean. Directory IDs are opaque public directory handles, never secret room-code aliases; the later adapter performs actual join and passcode checks. No actual passcode/hash/code/host principal or match role is returned.

Acceptance cases:

- Unlisted and nonjoinable rooms disappear without revealing that hidden room exists; empty directory yields an honest empty array.
- Passcode protection is represented only by requiresPasscode, with no secret fields despite extra properties.
- Validate unique public handles and legal occupancy/seats; detached output cannot mutate room state.

Reserved parent scope: A057, A062.

## B076: Plan exactly-once request replay within a trusted actor namespace

Owned paths:

- `packages/protocol/src/parallel100/request-idempotency.ts`
- `packages/protocol/tests/parallel100/request-idempotency.test.ts`

Frozen API:

```ts
export function idempotencyDecision(input: {
  readonly actorId: string; readonly requestId: string; readonly requestDigest: string;
  readonly existing: { readonly actorId: string; readonly requestId: string; readonly requestDigest: string; readonly resultReference: string } | null;
}): Result<{ readonly action: 'execute' | 'replay'; readonly resultReference: string | null }>;
```

Classify a missing record as execute and an exact actor/request/digest match as replay of the existing opaque result reference. A changed digest or actor/request mismatch is forbidden. Digests are injected trusted cryptographic request digests (64 lowercase hex), never generated with a toy hash here. The storage adapter must atomically write the record with the mutation; this pure decision does not claim persistence.

Acceptance cases:

- First requests execute; exact retries replay their original result reference without requesting another mutation.
- Same request ID with another actor or payload digest rejects rather than leaking/reusing a private result.
- Malformed IDs/digests/references fail safely, with no raw payload returned; input remains unchanged.

Reserved parent scope: A059.

## B077: Guard atomic authority mutations against stale and overflow revisions

Owned paths:

- `packages/protocol/src/parallel100/revision-precondition.ts`
- `packages/protocol/tests/parallel100/revision-precondition.test.ts`

Frozen API:

```ts
export function revisionPrecondition(input: {
  readonly actualRevision: number; readonly expectedRevision: number;
}): Result<{ readonly nextRevision: number }>;
```

Require equal safe nonnegative integers and an incrementable actual revision. Unequal revisions return stale; Number.MAX_SAFE_INTEGER cannot advance. The function is used inside an eventual storage transaction, not a substitute for compare-and-swap or an external lock.

Acceptance cases:

- Equal0 and representative large safe revisions produce exactly+1 with no coercion.
- Stale/future expected revisions reject and do not disclose room contents.
- Negative/fractional/NaN/unsafe values and MAX_SAFE overflow reject without mutation or treating truthy strings as numbers.

Reserved parent scope: A058, A060.

## B078: Gate authority actions at an injected exact phase deadline

Owned paths:

- `packages/protocol/src/parallel100/authority-deadline-guard.ts`
- `packages/protocol/tests/parallel100/authority-deadline-guard.test.ts`

Frozen API:

```ts
export function authorityDeadlineDecision(input: {
  readonly trustedNowMs: number; readonly deadlineMs: number;
  readonly action: 'player-input' | 'host-advance';
}): Result<{ readonly allowed: boolean; readonly deadlineReached: boolean }>;
```

Given an already approved persisted deadline, player input is allowed strictly before it; a host advance is allowed at or after it. Both timestamp values are finite nonnegative safe integers in authority milliseconds. This module never reads Date.now, trusts client time or computes the unresolved I01/S5 timer composition.

Acceptance cases:

- At deadline−1 input is allowed and advance denied; at the exact deadline those decisions reverse.
- Later server times remain advance-eligible; input cannot extend or replace the stored deadline.
- Malformed/unsafe timestamps and unknown action reject, with no clocks or Firebase dependency.

Reserved parent scope: A060, A065.

## B079: Coalesce recipient views with bounded monotonic backpressure

Owned paths:

- `packages/protocol/src/parallel100/monotonic-view-buffer.ts`
- `packages/protocol/tests/parallel100/monotonic-view-buffer.test.ts`

Frozen API:

```ts
export function enqueueRecipientView(input: {
  readonly deliveredRevision: number; readonly pending: readonly { readonly revision: number; readonly payloadReference: string }[];
  readonly incoming: { readonly revision: number; readonly payloadReference: string };
  readonly maxPending: number;
}): Result<{ readonly pending: readonly { readonly revision: number; readonly payloadReference: string }[]; readonly discardedRevisions: readonly number[] }>;
```

Buffer only strictly increasing revisions above the delivered revision; stale incoming revisions are ignored with their revision recorded as discarded. maxPending1–32 is a transport buffer limit, not a gameplay rule. When full, retain the newest maxPending entries and discard oldest pending revisions; payloadReference is an opaque reference to an already recipient-redacted snapshot.

Acceptance cases:

- Monotonic arrivals queue in order; capacity overflow retains latest views and reports discarded revisions.
- Delivered/stale/duplicate arrivals never regress the recipient’s revision or restore private state.
- Invalid/nonmonotonic existing buffers, unsafe revisions/capacities or empty references fail atomically without raw snapshots.

Reserved parent scope: A073.

## B080: Revoke stale recipient subscriptions and spectator private channels

Owned paths:

- `packages/protocol/src/parallel100/subscription-capabilities.ts`
- `packages/protocol/tests/parallel100/subscription-capabilities.test.ts`

Frozen API:

```ts
export function subscriptionCapabilities(input: {
  readonly boundPlayerId: string | null; readonly roomPlayerIds: readonly string[];
  readonly active: boolean; readonly connectionGeneration: number; readonly subscriptionGeneration: number;
}): Result<{ readonly publicView: boolean; readonly privateDiagnostics: boolean; readonly chatWrite: boolean; readonly revokeSubscription: boolean }>;
```

An authenticated room member on the current connection generation may watch public state; only an active member may access later role-scoped diagnostics or write chat. Inactive spectators retain public watching. Missing/revoked membership or generation mismatch requires subscription revocation with every capability denied. privateDiagnostics is a capability ceiling; operation recipient/phase checks still apply.

Acceptance cases:

- Current active member gets public/action ceilings, while a permanent spectator retains public viewing only.
- A stale generation or missing membership revokes all capabilities and cannot reuse a reconnect subscription.
- Malformed/duplicate IDs and unsafe generations reject; the API does not simulate authentication or return roles.

Reserved parent scope: A064, A071, A073.

## B081: Translate internal service failures to fixed privacy-safe client errors

Owned paths:

- `packages/protocol/src/parallel100/safe-service-errors.ts`
- `packages/protocol/tests/parallel100/safe-service-errors.test.ts`

Frozen API:

```ts
export function publicServiceError(input: unknown): {
  readonly code: 'invalid-request' | 'unavailable' | 'retry';
  readonly retryable: boolean;
};
```

Whitelist exact internal string categories: invalid-input→invalid-request,false; stale→retry,true; all other/unknown/forbidden/missing-room/wrong-passcode/internal/provider errors→unavailable,false. Do not copy message, stack, object fields or submitted values; never call arbitrary toString/getters. The same unavailable response conceals whether a private room or credential exists.

Acceptance cases:

- Missing room, bad passcode and forbidden identity produce byte-equivalent unavailable responses.
- Exact stale and invalid-input map to the declared retry/validation categories.
- Error objects, accessor/proxy objects, strings containing private material and arbitrary primitives produce fixed responses without inspection or leaks.

Reserved parent scope: A055.

## B082: Normalize user room-code input without generating security tokens

Owned paths:

- `packages/protocol/src/parallel100/room-code-input.ts`
- `packages/protocol/tests/parallel100/room-code-input.test.ts`

Frozen API:

```ts
export function normalizeRoomCode(input: unknown): Result<{ readonly code: string }>;
```

Accept a string, trim outer whitespace and uppercase ASCII a–z only, then require exactly six ASCII A–Z/0–9 characters per the existing room-code baseline. Reject interior whitespace, punctuation, Unicode confusables and nonstrings. This is a UI/protocol boundary codec, never code generation, entropy or authorization.

Acceptance cases:

- Six-character lowercase/uppercase/mixed ASCII codes normalize deterministically with outer whitespace removed.
- Five/seven characters, interior spaces, confusable fullwidth letters and punctuation reject.
- Nonstring/accessor objects never invoke conversion; errors do not echo potential passcodes and no RNG/credential state is touched.

Reserved parent scope: A054, A061, A062.

## B083: Decide verified room join admission without leaking private room existence

Owned paths:

- `packages/protocol/src/parallel100/join-admission-policy.ts`
- `packages/protocol/tests/parallel100/join-admission-policy.test.ts`

Frozen API:

```ts
export function roomJoinAdmission(input: {
  readonly principalVerified: boolean; readonly roomExists: boolean; readonly joinable: boolean;
  readonly passcodeRequired: boolean; readonly passcodeVerified: boolean;
  readonly configuredSeats: number; readonly occupiedSeats: number; readonly existingMember: boolean;
}): Result<{ readonly action: 'join' | 'resume' }>;
```

Only a separately verified principal can join an existing joinable room after any required passcode verifier succeeds. Existing verified members may resume without consuming another seat, but still require allowed joinable policy as supplied. Never hash passwords with a toy algorithm; passcodeVerified is a trusted verifier result. Fixed forbidden failures must not distinguish room-missing/bad-passcode/full states.

Acceptance cases:

- Valid unprotected and protected verifier-approved requests join when capacity remains.
- A verified existing member resumes at full capacity without adding a duplicate seat.
- Missing principal/room, disallowed phase, wrong passcode and full new-member room all return the same forbidden code; invalid seat bounds reject before mutation.

Reserved parent scope: A061, A062.

## B084: Validate member profile changes while allowing duplicate display aliases

Owned paths:

- `packages/protocol/src/parallel100/lobby-profile-patch.ts`
- `packages/protocol/tests/parallel100/lobby-profile-patch.test.ts`

Frozen API:

```ts
export function decodeLobbyProfilePatch(input: unknown, allowedAvatarKeys: readonly string[]): Result<{
  readonly alias: string; readonly avatarKey: string; readonly expectedRevision: number;
}>;
```

Exact own data keys alias/avatarKey/expectedRevision. Alias must already be trimmed,1–24 Unicode scalar values and contain no controls; duplicates across players remain legal. avatarKey must belong to the supplied approved registry. Validate without getters; no subject/player identity or role edits are accepted.

Acceptance cases:

- Valid Unicode aliases and registry avatars decode to detached values, independent of any other player alias.
- Empty/overlong/control aliases, unknown avatars and unsafe revisions reject.
- Forged actor/host/role fields, symbols/accessors/prototype objects and empty/duplicate avatar registry entries fail safely.

Reserved parent scope: A027, A054, A063.

## B085: Gate host-only lobby configuration and start requests

Owned paths:

- `packages/protocol/src/parallel100/host-lobby-permissions.ts`
- `packages/protocol/tests/parallel100/host-lobby-permissions.test.ts`

Frozen API:

```ts
export function hostLobbyPermission(input: {
  readonly verifiedPlayerId: string; readonly hostPlayerId: string;
  readonly phase: 'lobby' | 'match' | 'ended'; readonly action: 'configure' | 'kick' | 'start';
  readonly targetId: string | null; readonly playerIds: readonly string[];
  readonly configuredSeats: number; readonly readyPlayerIds: readonly string[]; readonly fillBots: boolean;
}): Result<{ readonly allowed: boolean; readonly reason: 'allowed' | 'host-only' | 'phase' | 'target' | 'not-ready' }>;
```

Only the verified host in lobby may configure/kick/start. Kick requires another existing player. Start requires at least five final seats, every human ready and either all configured seats occupied or trusted fillBots enabled; configuration uses seats5–10. This is an admission ceiling, not role assignment or trusted bot creation.

Acceptance cases:

- Only host-lobby actions succeed; nonhost and live-match requests receive fixed denied reasons.
- Start covers full ready tables and approved bot-filling with ready humans; unready humans or missing nonbot seats deny.
- Self/absent kick targets, duplicate IDs/readies, absent host and impossible capacities reject or deny deterministically without mutation.

Reserved parent scope: A063, A066.

## B086: Restore connection presence without resurrecting permanent spectators

Owned paths:

- `packages/protocol/src/parallel100/reconnect-presence.ts`
- `packages/protocol/tests/parallel100/reconnect-presence.test.ts`

Frozen API:

```ts
export function reconnectPresence(input: {
  readonly verifiedPlayerId: string; readonly boundPlayerId: string;
  readonly previousGeneration: number; readonly requestedGeneration: number;
  readonly permanentlyDisconnected: boolean;
}): Result<{ readonly connected: true; readonly generation: number; readonly active: boolean; readonly discardPrivateCache: true }>;
```

Bind reconnect to the same separately verified membership and require requestedGeneration strictly greater than previousGeneration. Network recovery can reconnect a spectator but cannot clear permanent game Disconnect. Always discard recipient-private caches before consuming fresh generation-scoped views.

Acceptance cases:

- An active member reconnects to a newer generation; a permanent spectator reconnects with active:false.
- Mismatched identity and nonincreasing generations reject rather than rebinding another player.
- Unsafe generations/empty identities reject; output always mandates private-cache discard and never contains old role/diagnostic payloads.

Reserved parent scope: A049, A064.

## B087: Decode a minimal safe recipient wire snapshot with exact privacy fields

Owned paths:

- `packages/protocol/src/parallel100/recipient-view-decoder.ts`
- `packages/protocol/tests/parallel100/recipient-view-decoder.test.ts`

Frozen API:

```ts
export function decodeRecipientView(input: unknown): Result<{
  readonly version: 1; readonly recipientId: string; readonly revision: number; readonly phase: Phase;
  readonly active: boolean; readonly ownRole: Role;
  readonly players: readonly { readonly id: string; readonly alias: string; readonly avatarKey: string; readonly active: boolean; readonly revealedRole: Role | null }[];
}>;
```

Exact own data keys as signature, with phase MATCH_END permitting revealedRole and every earlier phase requiring null for all player.revealedRole. Recipient must exist exactly once and its active flag agree. This minimal view intentionally excludes operation diagnostics; later composed envelopes must use reviewed separate codecs. No legacy Witness/five-mark shape, authority seed, passcode or raw history is accepted.

Acceptance cases:

- Canonical own-role snapshots decode across all phases; Match End permits exact role reveal.
- Any pre-end nonnull revealedRole, forged seed/passcode/diagnostic key or unknown recipient rejects.
- Descriptor-safe nested validation rejects symbols/accessors/duplicate IDs/unsafe revision without getters or raw-data echo.

Reserved parent scope: A056, A067.

## B088: Validate host deadline-advance requests without changing authoritative time

Owned paths:

- `packages/protocol/src/parallel100/host-advance-command.ts`
- `packages/protocol/tests/parallel100/host-advance-command.test.ts`

Frozen API:

```ts
export function hostAdvancePermission(input: {
  readonly verifiedPlayerId: string; readonly hostPlayerId: string;
  readonly actualRevision: number; readonly expectedRevision: number;
  readonly trustedNowMs: number; readonly persistedDeadlineMs: number;
  readonly terminal: boolean;
}): Result<{ readonly mayAdvance: boolean }>;
```

Only the verified current host at the current revision may request advance after the persisted deadline. terminal states cannot advance. Exact-boundary comparison uses injected trusted time; this function does not select missing actions, trust a browser deadline or compute timer modifiers. Final mutation must recheck inside the storage transaction.

Acceptance cases:

- Current host at or after deadline may advance a nonterminal phase; before deadline returns false.
- Nonhost, stale revision and terminal cases cannot advance or reset the deadline.
- Malformed IDs/revisions/timestamps reject with fixed errors; no Date.now or state mutation is performed.

Reserved parent scope: A060, A065.

## B089: Validate bounded public chat and reactions with spectator denial

Owned paths:

- `packages/protocol/src/parallel100/bounded-chat-policy.ts`
- `packages/protocol/tests/parallel100/bounded-chat-policy.test.ts`

Frozen API:

```ts
export function decodePublicChatAction(input: unknown, context: {
  readonly verifiedPlayerId: string; readonly active: boolean; readonly capabilityEnabled: boolean;
  readonly allowedReactionIds: readonly string[];
}): Result<{ readonly type: 'chat'; readonly text: string } | { readonly type: 'reaction'; readonly reactionId: string }>;
```

Active verified members may submit only public text or allowlisted semantic reactions when capability is enabled. Text is trimmed1–280 Unicode scalars, rejects controls except newline, and is always treated as text, never HTML. Exact keys for chat(type,text) or reaction(type,reactionId); no supplied actor/role/recipient whisper/channel override. Rate limiting/storage remain adapter work.

Acceptance cases:

- Active chat and allowlisted reactions decode with bounded detached data; HTML-looking content remains inert text data.
- Permanent spectator and unavailable capability deny both actions without revealing any private role.
- Empty/overlong/control text, unknown reactions, forged identities, accessors and unknown keys reject without getters or payload echo.

Reserved parent scope: A100.

## B090: Produce an allowlisted request summary that never retains passcodes or game choices

Owned paths:

- `packages/protocol/src/parallel100/safe-request-summary.ts`
- `packages/protocol/tests/parallel100/safe-request-summary.test.ts`

Frozen API:

```ts
export function safeRequestSummary(input: unknown): {
  readonly kind: 'lobby-create' | 'lobby-join' | 'profile' | 'ready' | 'settings' | 'crew-vote' | 'operation-choice' | 'power-target' | 'containment-vote' | 'request-advance' | 'unknown';
  readonly requestId: string | null;
};
```

Inspect only own data descriptors for type/requestId and return a fixed kind allowlist plus a bounded ASCII requestId1–64 matching[A-Za-z0-9_-]. Do not traverse payload/intent or coerce arbitrary values. Summaries intentionally omit candidate, option, target, room code, alias, passcode, seed, raw request, and subject identity; missing/unsafe descriptors become unknown/null.

Acceptance cases:

- All supported type names preserve only the approved kind and safe request identity.
- A request carrying passcode, operation option or role properties never serializes those values in summary.
- Getter/proxy failures and invalid IDs/types return unknown/null without invoking user getters or throwing raw exceptions.

Reserved parent scope: A055, A059.

## B091: Decode and migrate local accessibility media and language preferences

Owned paths:

- `apps/client/src/pilot100/preference-codec/index.ts`
- `apps/client/src/pilot100/preference-codec/index.test.ts`

Frozen API:

```ts
export function decodePreferences(serialized: string | null): Result<{
  readonly version: 1; readonly music: boolean; readonly sfx: boolean; readonly haptics: boolean;
  readonly musicVolume: number; readonly sfxVolume: number;
  readonly reducedMotion: 'system' | 'on' | 'off'; readonly language: 'system' | 'en' | 'es';
  readonly appearance: 'system' | 'dark' | 'light';
}>;
```

Null or corrupt/unrecognized records return safe defaults: music/sfx true,haptics false,volumes0.7,reducedMotion system,language system,appearance system. A valid exact version1 record retains bounded0–1 volumes and declared enums. Unknown fields including identity/roles cause fallback, not retained payload. This pure codec receives storage bytes and never touches browser storage; wrapper persistence is later integration.

Acceptance cases:

- Exact valid v1 preferences round-trip, preserving off toggles and zero/full volumes.
- Null/corrupt/old-version/extra-identity/malformed values produce the complete declared safe defaults.
- Oversized serialized input above16KiB safely falls back and cannot keep partial private fields; repeated calls are deterministic and do not access storage.

Reserved parent scope: A085.

## B092: Plan semantic audio feedback while respecting gesture mute and preferences

Owned paths:

- `apps/client/src/pilot100/semantic-audio-policy/index.ts`
- `apps/client/src/pilot100/semantic-audio-policy/index.test.ts`

Frozen API:

```ts
export function audioFeedbackPlan(input: {
  readonly event: 'ui.tap' | 'vote.open' | 'vote.cast' | 'bot.vote' | 'crew.deploy' | 'district.repair' | 'district.sabotage' | 'timer.last-ten' | 'match.win' | 'match.loss' | 'achievement.unlock';
  readonly gestureUnlocked: boolean; readonly systemMuted: boolean; readonly sfxEnabled: boolean;
  readonly suppressLastTenOnce: boolean;
}): Result<{ readonly cue: string | null; readonly visualEvent: string; readonly consumeLastTenSuppression: boolean }>;
```

Emit semantic cue keys only, never generic beeps/files/playback. A locked gesture/system mute/SFX off silences audio but preserves an equal semantic visualEvent. I06 suppression applies exactly to timer.last-ten and consumes only that pending suppression; other events keep it unconsumed. visualEvent equals the input semantic event. Cue equals audio.<event> when allowed.

Acceptance cases:

- Every declared event has its exact semantic cue and visible partner when enabled.
- Gesture lock/mute/SFX-off preserves visible feedback with cue:null; no autoplay or SDK is invoked.
- Only a timer.last-ten event consumes pending warning suppression; invalid events/flags reject without affecting other cues.

Reserved parent scope: A082, A083.

## B093: Plan opt-in supported haptics without timer vibration or secret cues

Owned paths:

- `apps/client/src/pilot100/haptic-feedback-policy/index.ts`
- `apps/client/src/pilot100/haptic-feedback-policy/index.test.ts`

Frozen API:

```ts
export function hapticFeedbackPlan(input: {
  readonly event: 'selection' | 'menu-confirm' | 'vote-locked' | 'crew-confirmed' | 'repair' | 'sabotage' | 'match-end' | 'timer';
  readonly enabled: boolean; readonly heavyOptIn: boolean; readonly supported: boolean;
}): Result<{ readonly intensity: 'none' | 'light' | 'medium' | 'heavy' }>;
```

Opt-in and supported platform are required for all feedback. Selection/menu-confirm→light; vote-locked/crew-confirmed→medium; repair/sabotage/match-end→heavy only with heavyOptIn, otherwise none. timer always none. Output no secret-dependent waveform or platform SDK call.

Acceptance cases:

- Allowed event families select the exact documented intensities under enabled/support/opt-in combinations.
- Timer never vibrates; unsupported/disabled states are silent and heavy feedback requires explicit extra opt-in.
- Unknown events and malformed flags reject; no native import, credential or global vibration is used.

Reserved parent scope: A082, A084.

## B094: Validate semantic visual asset records and approved provenance without loading files

Owned paths:

- `apps/client/src/pilot100/asset-record-decoder/index.ts`
- `apps/client/src/pilot100/asset-record-decoder/index.test.ts`

Frozen API:

```ts
export function decodeVisualAssetRecord(input: unknown): Result<{
  readonly semanticKey: string; readonly label: string; readonly uiPath: string; readonly masterSha256: string;
  readonly source: string; readonly license: string; readonly approvalSha256: string;
}>;
```

Exact own data keys as signature. semanticKey is dotted original semantic ID1–128; label/source/license are bounded nonempty text; uiPath is repository-relative under assets/ with PNG/WebP extension, no URL,backslash,dot-segment or empty component. Both SHA fields are64lowercasehex and approval digest is an attestation reference, not proof the reviewer actually approved. Decoder never downloads/generates production art.

Acceptance cases:

- A valid approved-record shape decodes into a detached allowlisted record with its semantic label.
- Reject unsafe paths/URLs/unsupported formats, missing approval/master digests and empty provenance.
- Accessor/symbol/unknown fields fail without reads; no filesystem, art API or owner approval is fabricated.

Reserved parent scope: A079, A080, A081.

## B095: Derive safe deterministic Credits from approved media provenance records

Owned paths:

- `apps/client/src/pilot100/credits-projection/index.ts`
- `apps/client/src/pilot100/credits-projection/index.test.ts`

Frozen API:

```ts
export function creditsEntries(input: {
  readonly records: readonly { readonly semanticKey: string; readonly creator: string; readonly source: string; readonly license: string; readonly attribution: string; readonly approved: boolean }[];
}): Result<readonly { readonly creator: string; readonly source: string; readonly license: string; readonly attribution: string }[]>;
```

Include approved records only; deduplicate exact creator/source/license/attribution tuples and sort lexicographically by those raw strings for reproducibility. Never infer CC0 for unreviewed files, parse license legal text, fetch URLs or claim media exists. Empty approved inventory yields empty credits. Plain strings are display text, not HTML.

Acceptance cases:

- Approved records generate deterministic deduplicated credits independent of source ordering.
- Unapproved entries and duplicate semantic references cannot silently gain release approval; empty inventory is honest.
- Malformed/duplicate semantic keys and overlong/control provenance fail; outputs omit private staging paths and do not mutate records.

Reserved parent scope: A045, A092.

## B096: Enforce persistent-banner and post-match interstitial eligibility

Owned paths:

- `apps/client/src/pilot100/ad-eligibility/index.ts`
- `apps/client/src/pilot100/ad-eligibility/index.test.ts`

Frozen API:

```ts
export function adEligibility(input: {
  readonly platform: 'web' | 'native'; readonly adsRemoved: boolean; readonly consentAllowed: boolean;
  readonly completedMatches: number; readonly lastInterstitialAfterMatch: number | null;
  readonly matchEndRead: boolean; readonly exitingCompletedMatch: boolean;
  readonly livePhaseVisible: boolean; readonly blockingModal: boolean; readonly adAvailable: boolean;
}): Result<{ readonly reserveBannerDock: boolean; readonly mayRequestBanner: boolean; readonly mayShowInterstitial: boolean; readonly blockNavigation: false }>;
```

Web is an honest no-op. Native free build always reserves its banner dock regardless of consent/load; banner request requires consent. Interstitial requires consent, availability, explicit completed-match exit after reading Match End, no live phase/modal, completedMatches>=2 and at least two completed matches since the last shown interstitial (null treated as zero). Remove Ads disables all formats/dock. This never waits for an ad or invokes a native SDK.

Acceptance cases:

- Native free surfaces reserve dock through missing consent/load, while web/RemoveAds use no dock or ad requests.
- First-match, live-phase, unread result, blocked modal and unavailable-ad cases never permit interstitial or navigation blocking.
- At match2 with no previous interstitial and match4 after match2 eligibility opens; malformed/unsafe counters or future last-show counts reject.

Reserved parent scope: A088, A089.

## B097: Reduce verified platform entitlement events without trusting local purchase claims

Owned paths:

- `apps/client/src/pilot100/purchase-entitlement-state/index.ts`
- `apps/client/src/pilot100/purchase-entitlement-state/index.test.ts`

Frozen API:

```ts
export function purchaseEntitlementState(input: {
  readonly previous: { readonly platform: 'web' | 'ios' | 'android'; readonly adsRemoved: boolean; readonly revision: number };
  readonly event: { readonly type: 'verified-entitlement'; readonly platform: 'ios' | 'android'; readonly entitled: boolean; readonly revision: number } | { readonly type: 'unavailable' | 'cancelled' | 'failed' };
}): Result<{ readonly platform: 'web' | 'ios' | 'android'; readonly adsRemoved: boolean; readonly revision: number; readonly availability: 'verified' | 'unchanged' }>;
```

Only a separately verified store-adapter event for the same native platform with a strictly newer revision can update entitlement, including verified revocation. Cancel/fail/unavailable preserve prior entitlement/revision with unchanged availability. Web never gains native entitlement; no cross-store restoration promise or raw receipt persistence. This reducer is not receipt verification and must never be directly driven by an unverified UI success flag.

Acceptance cases:

- Verified purchase/restore updates same-platform adsRemoved and a later verified revocation clears it.
- Failed/cancelled/unavailable events preserve paid entitlement; stale revision cannot revoke or grant it.
- Wrong-platform/web verified events and unsafe revisions reject without echoing receipts or inventing store approval.

Reserved parent scope: A088, A090.

## B098: Choose reproducible bot actions from recipient-visible legal observations only

Owned paths:

- `apps/client/src/pilot100/fair-bot-policy/index.ts`
- `apps/client/src/pilot100/fair-bot-policy/index.test.ts`

Frozen API:

```ts
export function chooseFairBotAction(input: {
  readonly observation: { readonly ownRole: Role; readonly active: boolean; readonly legalActions: readonly { readonly kind: 'vote' | 'route' | 'gate' | 'power-target'; readonly optionId: string; readonly ownDiagnosticClass: 'safe' | 'corrupted' | 'neutral' | null }[] };
  readonly rng: { readonly value: number };
}): Result<{ readonly action: { readonly kind: 'vote' | 'route' | 'gate' | 'power-target'; readonly optionId: string } | null; readonly rng: { readonly value: number } }>;
```

Pure fair baseline policy: spectators or no legal actions return null without advancing RNG. For Route/Gate actions, Archivist/Null prefer known-safe options and Static prefers known-corrupted options when available; otherwise choose uniformly from supplied legal options using a module-local Mulberry32 step exactly matching the existing engine algorithm. One draw per selected action, fixed input order. No hidden role list, seed history, other private diagnostic, authoritative state or future outcome is accepted; strategy strength/balance is not claimed.

Acceptance cases:

- Same visible observation/RNG yields identical legal action and next state; hidden-world changes cannot affect output because API receives none.
- Recipient-private diagnostics influence only their permitted operation option; votes/powers use legal candidates without omniscient targeting.
- Inactive/empty observations return null without draws; malformed/duplicate legal action identities and invalid RNG reject without mutation or browser/global randomness.

Reserved parent scope: A076.

## B099: Reduce safe app navigation without claiming live authority or global pause

Owned paths:

- `apps/client/src/pilot100/local-navigation-policy/index.ts`
- `apps/client/src/pilot100/local-navigation-policy/index.test.ts`

Frozen API:

```ts
export function localNavigation(input: {
  readonly current: 'launch' | 'profile' | 'home' | 'solo-setup' | 'directory' | 'lobby' | 'match' | 'results';
  readonly mode: 'solo' | 'multiplayer';
  readonly event: 'enter' | 'profile-confirm' | 'play-solo' | 'play-multiplayer' | 'joined-lobby' | 'authority-match-start' | 'authority-match-end' | 'return-after-match' | 'again-after-match' | 'leave-confirmed' | 'back';
}): Result<{ readonly route: 'launch' | 'profile' | 'home' | 'solo-setup' | 'directory' | 'lobby' | 'match' | 'results'; readonly clearPrivateView: boolean; readonly requestFreshMatch: boolean }>;
```

Frozen route transitions: launch+enter→profile; profile+profile-confirm→home; home+play-solo→solo-setup; home+play-multiplayer→directory; directory+joined-lobby→lobby; solo-setup/lobby+authority-match-start→match; match+authority-match-end→results; lobby/match/results+leave-confirmed→home(clearPrivateView true). results+return-after-match→solo-setup in Solo or lobby in multiplayer, clearing private view. results+again-after-match follows the same return route and clear, but sets requestFreshMatch:true so the adapter requests a fresh authority session from that setup/lobby; it never routes straight to match or fabricates a winner. requestFreshMatch is false for every other accepted transition. back: profile→launch,solo-setup/directory→home; other combinations forbidden. No route action fabricates gameplay, globally pauses online state or skips explicit leave confirmation.

Acceptance cases:

- Every declared source/event transition reaches its exact destination; results return to the correct mode-specific setup/lobby and clear private cache, while Again additionally requests fresh authority without entering match directly.
- Plain back cannot leave live match/lobby/results or bypass leave confirmation, and user play does not fabricate authority-match-start.
- All undeclared pairs reject without route mutation; no hidden localStorage/session or game-clock access is used.

Reserved parent scope: A048, A049.

## B100: Invalidate private client state during reconnect leave and spectator changes

Owned paths:

- `apps/client/src/pilot100/private-recovery-state/index.ts`
- `apps/client/src/pilot100/private-recovery-state/index.test.ts`

Frozen API:

```ts
export function privateRecoveryState(input: {
  readonly previous: { readonly generation: number; readonly revision: number | null; readonly active: boolean; readonly privatePayloadReference: string | null; readonly connected: boolean };
  readonly event: { readonly type: 'connection-lost' | 'leave' | 'permanent-disconnect' } | { readonly type: 'recipient-view'; readonly generation: number; readonly revision: number; readonly active: boolean; readonly privatePayloadReference: string | null };
}): Result<{ readonly generation: number; readonly revision: number | null; readonly active: boolean; readonly privatePayloadReference: string | null; readonly connected: boolean }>;
```

connection-lost and leave advance generation and clear revision/private reference; leave also makes active false. permanent-disconnect clears private reference and makes active false while retaining current generation/revision and previous.connected. connection-lost and leave always set connected:false; an accepted recipient-view sets connected:true. A recipient-view must match current generation and strictly increase revision (null accepts any safe revision); a previously inactive session cannot be made active by a view. Spectator views discard private reference. Rejoining a new game requires a new explicitly constructed session outside this reducer, never automatic resurrection.

Acceptance cases:

- Network loss/leave clear private cache and reject late old-generation views; leave cannot silently reconnect into active play.
- Permanent Disconnect immediately drops private payload while preserving prior connection presence, and later same-generation active:true views reject rather than resurrect; loss/leave set connected:false and an accepted current-generation view sets connected:true.
- Monotonic current-generation spectator views remain observable without diagnostics; stale/unsafe revisions/generation overflow and invalid references reject atomically.

Reserved parent scope: A049, A064.

