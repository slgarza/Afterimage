# Afterimage — Rules Spec v1

**Status:** implementation contract for engine/playtests.  
**Principle:** outcomes are deterministic. Uncertainty comes from secret roles,
incomplete social trust and player choices—not a hidden dice roll.

## 1. Table and roles

| Players | Archivists | Static operatives | The Null |
| ---: | ---: | ---: | ---: |
| 5 | 3 | 1 | 1 |
| 6 | 4 | 1 | 1 |
| 7 | 4 | 2 | 1 |
| 8 | 5 | 2 | 1 |
| 9 | 5 | 3 | 1 |
| 10 | 6 | 3 | 1 |

- Archivists know only themselves.
- Static operatives know the other Static operatives through Ghost Channel.
- The Null knows no allies. Static operatives do **not** receive The Null's
  identity at match start.
- Secret alignment is never revealed until Match End, except the winning
  Disconnect of The Null.

## 2. Win conditions

- **Archivists win:** reach Repair 6, or Disconnect The Null.
- **Static win:** reach Sabotage 6.
- The game never resolves an alignment by chance.

## 3. Round state machine

`ROUND_START → VOTE_OPEN → CREW_LOCKED → OPERATION_LOCKED → RESOLUTION →
CITY_MOMENT → ROUND_START`

1. Shift Lead rotates in fixed seat order among active players.
2. A deterministic incident is pulled from the seeded incident queue.
3. All active, non-Jammed players vote for one eligible player by tapping their
   player card. The two highest vote totals form Repair Crew.
4. Crew enters Operation: one member is randomly assigned **Route Operator**,
   the other **Gate Operator**. This assignment is public; their choices are
   private.
5. Both choose before the deadline. Server resolves their exact pair.
6. A full City Moment plays; the next round opens automatically.

### Deadline rule

- An inactive voter receives a deterministic server-random **eligible** vote at
  deadline. It is audit-logged as `timeout_vote`.
- An inactive Crew member receives a deterministic server-random available
  route/gate at deadline, audit-logged as `timeout_operation`.
- The server seed and action sequence make timeouts replayable in tests while
  remaining unpredictable to clients during the match.

### Crew vote ties

1. Highest total wins first Crew seat.
2. For a tie at either seat, choose the tied player with the longest time since
   serving in Repair Crew.
3. If still tied, select via server-seeded visible draw. The UI names the draw;
   Shift Lead never breaks ties.

### Eligibility

- Current Shift Lead may vote and may serve unless blocked by a status.
- Previous Repair Crew enters a **one-round cooldown** and is ineligible for
  the next Crew selection.
- Jammed players cannot vote or serve for one round.
- Disconnected players are permanent silent spectators.

## 4. The deterministic Crew Operation

There are **no Repair/Sabotage buttons** and no policy-card stack.

Every incident contains:

- three named **Routes** (`A`, `B`, `C`), controlled by Route Operator;
- three named **Gates** (`1`, `2`, `3`), controlled by Gate Operator;
- one safe pair that yields Repair;
- one corrupted pair that yields Sabotage;
- seven remaining pairs that yield Anomaly.

The two operators receive complementary private diagnostics:

- Route Operator sees the safe route and corrupted route.
- Gate Operator sees the safe gate and corrupted gate.
- Static sees the same controls as everyone else; their advantage is role
  coordination, bluff and the ability to intentionally select corrupted inputs.

If both operators honestly communicate their diagnostics, they can choose the
safe pair and Repair. A Static can claim a false diagnostic, choose a corrupted
input, or deliberately choose safe to look credible. Results are deterministic:

| Chosen pair | Result |
| --- | --- |
| exact safe Route + exact safe Gate | Repair +1 |
| exact corrupted Route + exact corrupted Gate | Sabotage +1 |
| any other pair | Anomaly; no track advances, incident-specific board effect |

The table sees only the public result, not either private choice or diagnostic.
Crew may claim anything afterward; claims can be false. A player has evidence
from their own choice, but never a UI proof of another player's alignment.

## 5. Incident queue / matrices

The server shuffles a seeded queue of incident templates. A template chooses
its safe/corrupt pair deterministically and emits the listed City Moment.
No incident has a random result after both choices lock.

| ID | Incident | Routes | Gates | Safe pair → Repair | Corrupt pair → Sabotage | Anomaly consequence |
| --- | --- | --- | --- | --- | --- | --- |
| I01 | Power Surge | North Relay / Core Bypass / Reservoir | Phase Lock / Ground Bridge / Load Shed | Core Bypass + Ground Bridge | Reservoir + Phase Lock | district flickers; next Round starts with 10s less |
| I02 | Transit Cascade | Metro Loop / Freight Spine / Skyway | West Gate / Central Gate / East Gate | Metro Loop + East Gate | Freight Spine + Central Gate | transit map scrambles; next vote cards shuffle visually |
| I03 | Memory Leak | Archive Vault / Civic Cloud / Street Cache | Mirror Seal / Paper Trail / Cold Store | Civic Cloud + Cold Store | Street Cache + Mirror Seal | one event-feed line becomes redacted |
| I04 | Hospital Isolation | Triage Link / Surgical Grid / Emergency Battery | Sterile Gate / Backup Gate / Flood Gate | Emergency Battery + Backup Gate | Surgical Grid + Flood Gate | one active player gets Jammed next round |
| I05 | Flooded Substation | Upper Conduit / River Switch / Drain Relay | Pressure Lock / Sluice Gate / Dry Dock | Drain Relay + Sluice Gate | River Switch + Pressure Lock | map route is temporarily obscured |
| I06 | Signal Archive Fire | Cold Stack / Glass Array / Night Beacon | Halo Lock / Ember Gate / Ash Filter | Glass Array + Ash Filter | Night Beacon + Ember Gate | timer loses its last-10-second audio warning once |

After I06, reshuffle the template order using the same server seed; do not
repeat the immediately previous template.

### 5.1 Incident icon system — required asset lane

Routes and Gates are **not** plaintext-only controls. Every incident receives
an original, full-colour, immediately readable icon family so the Crew popup
and city can be understood at a glance.

- Each Route and each Gate has its own reusable `iconKey`, label and short
  visual metaphor. Example: `north-relay` is a directional transmission
  tower; `phase-lock` is a segmented electrical lock; `ground-bridge` is a
  grounded power bridge. They must never be generic letter/number buttons.
- The Crew sees these icons at large touch size beside their labels; the same
  key appears on map districts, the action recap and City Moments when useful.
- All icon art is original and full colour. Neutral glass is the UI chrome,
  never a restriction on the incident art.
- Each incident gets a coherent local palette/shape language (e.g. Power
  Surge: electric gold/cyan; Hospital Isolation: sterile white/emerald;
  Flooded Substation: deep blue/warning amber) without changing the global
  black/frost interface.
- Asset delivery per icon: source prompt/provenance, 1024px master, transparent
  PNG/WebP export, 128px UI variant, accessible label and a reduced-motion-safe
  static presentation.
- The engine references only semantic keys (`incident.i01.route.north_relay`),
  never image paths. UI resolves keys through a typed registry.

Initial art inventory: 6 incidents × (3 Routes + 3 Gates) = **36 original
operational icons**, plus 6 incident emblems and the existing 12 track-event
icons. The asset swarm may batch-generate them only against an approved asset
bible and must submit contact sheets for human approval before integration.

## 6. Track moments and powers

All moments follow `MOMENT-SPEC-v0.md`: giant full-colour original icon,
named event, dramatic motion, semantic audio/haptic and persistent board state.

### Repair track

| Node | Moment | Rule |
| ---: | --- | --- |
| R1 | First Light | baseline City Moment; no extra power |
| R2 | Trace Online | after each future operation, reveal whether the Crew pair was **safe / corrupted / mixed**; never reveal which member chose what |
| R3 | Safeguard | Shift Lead may protect one active player from the next Jam or Disconnect; expires after it prevents one effect |
| R4 | Audit Window | Shift Lead scans one active player’s most recent operation and learns `safe`, `corrupted`, `neutral`, or `timeout`; no alignment label |
| R5 | Containment Protocol | once per game, all active players vote a target. If target is The Null: Archivists win. Otherwise target is permanently Disconnected and protocol is spent |
| R6 | City Restored | Archivists win immediately |

### Sabotage track

| Node | Moment | Rule |
| ---: | --- | --- |
| S1 | Signal Breach | baseline City Moment; no extra power |
| S2 | Signal Jam | next Crew vote is sealed: choices remain hidden until deadline/resolution, rather than animating immediately on cards |
| S3 | Grid Failure | current Shift Lead targets one other active player; target is Jammed for the next round |
| S4 | Signal Sever | current Shift Lead permanently Disconnects one other active player |
| S5 | Blackout Order | current Shift Lead permanently Disconnects one other active player; all remaining rounds run with a 15-second timer reduction (minimum 30s) |
| S6 | City Lost | Static wins immediately |

### Disconnect / spectator

- A Disconnect target may be any other active player, never Shift Lead.
- If target is The Null, Archivists immediately win.
- Otherwise, target moves to spectator mode: can watch city/map/final reveal but
  cannot vote, be Crew, use game chat/reactions, access private diagnostics or
  reveal their role.
- A target-selection deadline uses a seeded valid target; it is audit logged.

## 7. Engine acceptance examples

1. I01, Core Bypass + Ground Bridge → Repair exactly; no randomness.
2. I01, Reservoir + Phase Lock → Sabotage exactly; no randomness.
3. I01, North Relay + Ground Bridge → Anomaly exactly; no track changes.
4. Tie in second Crew seat chooses longest-since-Crew, then seeded draw.
5. Crew timeout locks a valid seeded input and labels it timeout in audit log.
6. S4/S5 target removes vote/Crew/chat authority immediately and preserves
   spectator view.
7. S4/S5 target The Null → `ARCHIVISTS_WIN`, regardless of current track.
8. R5 false containment Disconnects target; correct containment wins.
9. R6 → `ARCHIVISTS_WIN`; S6 → `STATIC_WIN`.

## 8. Explicit non-goals

- No Secret Hitler policy deck, President/Chancellor chain, or copied power
  sequence.
- No client-authoritative outcome/timer in multiplayer.
- No random Repair/Sabotage outcome after choices lock.
