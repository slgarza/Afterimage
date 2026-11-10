# Design reconciliation for A001-A100

The owner confirmed that the rules and screens are documented and ready to use.
On 2026-11-10 the implementation backlog was reconciled with the owner-provided
OpenClaw project. Eleven original Markdown documents were copied unchanged into
[`design/`](design/); their original SHA256 values are recorded in
[`SOURCE-MANIFEST.json`](design/SOURCE-MANIFEST.json). No credentials, runtime
logs, remote application code, music or production artwork were imported.

## Which source governs implementation

[`RULES-SPEC-v1.md`](design/RULES-SPEC-v1.md) is the canonical implementation
contract, as explicitly confirmed by the later Rules handoff in
[`ROADMAP.md`](design/ROADMAP.md#plan-del-swarm--telnyx-x-prize).
[`SWARM-BRIEF-v0.md`](design/SWARM-BRIEF-v0.md) is the concise product handoff.
Use the screen flow, visual, audio, City Moment, achievement and monetization
documents for their respective contracts. Preserve the source snapshots; record
future decisions in new reviewed documents rather than editing their history.

The source pack contains earlier drafts and an explicitly hardcoded prototype.
The following differences have an explicit later contract or narrower scope:

| Earlier material | Implementation contract |
| --- | --- |
| Five marks, Witness, approval votes or a four-round demo | Six Repair / six Sabotage, The Null, one direct candidate vote, real engine outcomes |
| Both operators choosing an interchangeable route | One Route Operator and one Gate Operator, with complementary private diagnostics and the six fixed 3x3 matrices |
| Old Relay/Connector terminology | Rotating Shift Lead and Repair Crew in the production rules |
| Local prototype deadlines/outcomes | Injected local authority in Solo; verified backend authority for multiplayer |
| Earlier no-bots scope | Solo bots and configured multiplayer bot filling, using only legal recipient-visible information |
| Earlier no-ads Home prose | Current Monetization contract and Swarm Brief require the persistent native free-app dock; web defaults to a no-op adapter |
| Earlier outer glass card around the directory | Visual System's explicit directory exception keeps the directory on the background, with a blocking Create Lobby modal |
| Earlier full-screen or Pause wording | Explicit Role Reveal/Game Menu blocking overlays; the online game continues behind the local menu |
| Old controller paths, model and pilot-zero instructions | The current separate `swarm-control` repository, target `swarm.toml`, existing durable budget and completed pilot report |

The completed T01-T10 interfaces remain compatibility history. Their tests must
continue to pass; new versioned modules implement v1 rather than silently
reinterpreting the old command parser or five-mark presentation components.

## Narrow decisions still needed

These are concrete boundary cases absent from the supplied contract. Affected
tasks name the same ID in `blockedBy`; they must not choose a rule silently.
The task issue itself is the design-decision discussion for that affected slice.

| ID | Source and exact question | Affected work |
| --- | --- | --- |
| `D-ELIGIBLE-POOL` | Rules sections 3/6: what happens when cooldown, Jam and permanent Disconnect leave fewer than two eligible Crew members? | Crew selection and phase orchestration |
| `D-CONTAINMENT` | R5: threshold, tie handling, vote changes, deadline fallback and whether Jam changes participation in the all-active containment vote are unspecified. | R5 and orchestration |
| `D-I04-JAM-TARGET` | I04: one active player is Jammed next round, but who selects that target and by what deterministic policy? | Incident Anomaly and orchestration |
| `D-TIMER-COMPOSITION` | I01 shortens the next round by 10s; S5 subtracts 15s with a 30s floor. Phase budgets, stacking order and the I01 floor for a 30s round need one explicit policy. | Deadline, Anomaly and Blackout timing |
| `D-AUDIT-NO-HISTORY` | R4 lists safe/corrupted/neutral/timeout, but gives no result for a target with no previous operation. | Audit and orchestration |
| `D-GHOST-RESONANCE` | GDD/Roadmap describe later two-candidate Resonance; v1 supplies no trigger or candidate policy. | Later Resonance remains deferred; initial Static-operative ally knowledge is specified and can be implemented |
| `D-ACHIEVEMENT-RECONCILIATION` | Achievement 22 asks one voter to vote for both Crew members in one round, while v1 permits one candidate; several older Blackout/last-vote conditions also need v1 predicates. | The 48-entry catalogue; do not invent unlocks |

The owner can resolve a decision in the relevant issue or a reviewed rule update.
Record the exact evidence, update the affected task criteria, and only then clear
the blocker. Clearing a design blocker does not merge a code dependency.

## External delivery gates

| ID | Required evidence |
| --- | --- |
| `D-FIREBASE-PROJECT` | The owner creates/provides the project for G4, followed by the reviewed adapter/emulator setup. Pure engine, Solo and provider-free authority tasks do not need this project. No project/configuration is created by these tasks. |
| `D-APPROVED-INCIDENT-ART` | G3 asset bible/contact-sheet approval and original 36 Route/Gate icons plus six emblems with provenance and exports. The coding task integrates approved delivery; it does not call an image API. |
| `D-APPROVED-MOMENT-IDENTITY-ART` | Approved twelve City Moment icons and avatar/working-logo inventory. Mockup PNGs are visual references, not automatically approved production assets. |
| `D-APPROVED-ACHIEVEMENT-ART` | Approved original 48-badge delivery with catalogue mappings, contact-sheet evidence, provenance and export hashes. |
| `D-NATIVE-APP-CONFIG` | Owner-supplied app identifiers, reviewed platform dependencies and actual native build tooling. Values remain local/ignored, outside tracked source. |
| `D-AD-STORE-CONFIG` | Owner-supplied ad/store/privacy configuration and reviewed native consent/billing adapters. Development uses test/no-op ports; production identifiers and receipts are not committed. |

Screen implementation follows the documented flow and the owner's instruction to
use this pack. There is no additional blanket screen-approval gate. Final asset,
accessibility and native acceptance still require their actual evidence.

Selected music/SFX delivery is separate from audio tooling. A092 validates and
stages only owner-selected, per-file approved input into ignored build output;
it never downloads tracks or commits raw licensed audio. Empty development
manifests stay silent. A release still needs the actual delivery and mix review.

## Derived screen index

The source uses numbered sections and support headings, rather than 24 literal
screen IDs. The following stable IDs index its routes and overlays for task
coverage; they do not invent additional gameplay screens.

| ID | Surface | Source |
| --- | --- | --- |
| S01 | Launch | Screen Flow 1 |
| S02 | Alias and avatar | 2 |
| S03 | Avatar picker | 2 / Visual System avatar picker |
| S04 | Home and mode selection | 3 |
| S05 | Solo setup | 4 |
| S06 | Lobby directory | 5 |
| S07 | Join by code/passcode | 5 / 5a |
| S08 | Create Lobby modal | 5a |
| S09 | Lobby room | 6 |
| S10 | Lobby settings | 6 |
| S11 | Match-entry handoff | Match-entry transition |
| S12 | Private hold-to-reveal | 7 |
| S13 | City Board | 8 |
| S14 | Direct Repair Crew vote | 8 / 9 and Rules 3 |
| S15 | Private Route/Gate operation | 9 and Rules 4/5 |
| S16 | Resolution, evidence and Anomaly | 10 |
| S17 | City Moment | Moment Spec |
| S18 | Power-target modal | Rules 6 / Screen Flow 10 |
| S19 | Silent spectator | Rules 6 / Screen Flow 10 |
| S20 | Match End | 11 |
| S21 | Local Game Menu | 8 / Visual System |
| S22 | Settings and Credits | Support screens |
| S23 | Achievements and detail modal | Support screens / Achievement Spec |
| S24 | How to Play | Support screens |
