# Afterimage implementation backlog: A001-A100

Exactly 100 new implementation tasks have been reconciled against the owner's
full design pack, retrieved on 2026-11-10. Browse the
[complete task index](PILOT100_TASKS.md), [batch manifest](../swarm/pilot100.json)
and [source/decision reconciliation](DESIGN_RECONCILIATION.md).

## Source and current scope

The eleven original documents under [design/](design/) cover Rules v1, screen
flows, visual direction, City Moments, audio, achievements and monetization.
Original SHA256 values are preserved in [SOURCE-MANIFEST.json](design/SOURCE-MANIFEST.json).
Every task is bound to that manifest's digest and cites its relevant sources.
The remote prototype, credentials, runtime state, raw audio and mockup PNGs were
not imported. Prototype scripts are UX references, never production authority.

Canonical mechanics are six-node Repair/Sabotage tracks, the exact 5-10-player
Archivist/Static-operative/Null table, direct one-candidate votes, deterministic
Crew ties, private Route/Gate matrices, seeded authority deadlines and silent
spectators after permanent Disconnect. Earlier five-mark/Witness rules and
completed T01-T10 contracts remain historical compatibility, not new gameplay.

| IDs | Implementation lane |
| --- | --- |
| A001-A025 | Versioned state/intents/replay, incidents, roles, votes, operations, deadlines, powers and recipient observations |
| A026-A050 | All 24 indexed screen/overlay surfaces, private controls, modal focus, navigation and semantic port integration |
| A051-A075 | Invisible identity, configured lobbies, transactions, host deadlines, recipient privacy and gated Firebase adapters |
| A076-A092 | Fair bots and Solo authority; package APIs, approved asset ingestion, audio/haptics, settings/i18n, achievements and monetization ports |
| A093-A099 | Independent rules/browser/emulator acceptance, guarded native wrappers and quality checks |
| A100 | Bounded public chat/reactions with permanent-spectator enforcement and optional multiplayer capability |

There are 85 proposed feature candidates and 15 supporting tasks. These are
classification proposals, not accepted deliveries. Actual feature counts require
independent acceptance, green reviewed PRs, merges and the observation window.

## Dependency and external gates

The initial graph has 11 tasks with no declared unmet prerequisites and 89 blocked
by code dependencies and, in specific cases, an explicit design/delivery gate.
Having 100 total tasks does not mean 100 useful agents can start simultaneously.

A `ready` task is locally implementable from the prepared source base. Live
admission additionally requires a real open issue, a committed reachable base,
passing baseline, provider capacity and an enabled policy with separately
authorized remaining budget. A `blocked` task is promoted only after its actual
predecessors have merged and their `pullRequest` metadata is recorded, and any
named decision/delivery evidence exists. Do not clear blockers just to fill a run.

The [reconciliation register](DESIGN_RECONCILIATION.md) names the narrow remaining
edge cases rather than declaring all rules unspecified. These include depleted
Crew eligibility, Containment voting policy, I04's Jam target, timer composition
and auditing a player with no previous operation. The affected task issue is the
place to resolve that question with source evidence; workers do not invent rules.

Firebase adapters explicitly wait for the owner-created G4 project. Pure engine,
provider-free authority and offline Solo have no Firebase requirement. Likewise,
no native app identifiers, ad/store configuration, final art or achievement
catalogue decision is a mandatory dependency of the offline Solo route. Optional
capabilities use honest unavailable/no-op states until their actual delivery.

## First bounded pilot

The first candidate cohort is **A001, A004 and A026**: versioned engine types,
the six exact incident matrices and neutral-frost/modal foundations. They have
separate ownership and derive directly from the supplied design. This is a
three-worker implementation pilot, not a new controller build or paid launch.
The completed ten-agent report remains historical evidence.

```sh
node tools/validate-pilot100.mjs
swarm-control plan A001 A004 A026 --project swarm.toml --workers 3 --synchronized --base HEAD
npm run check
# After real GitHub issues are linked:
node tools/validate-pilot100.mjs --require-issues
```

The free local plan reports potential concurrency and creates no cloud resources.
It does not establish provider readiness or authorize spending. G0/G1 evidence and
new authorized allowance are needed before scaling. Follow useful dependency
waves through 3 -> 10 -> 25 -> 50 -> 100; recheck all gates and efficiency each time.
The original `swarm.toml` budget/ledger are preserved, with live execution disabled.

## Ownership and integration

Each A-series JSON specifies exact owned paths and tests. The old prohibition on
shared barrels, manifests and App.tsx applied to T01-T10; an A-series task may
edit those files only where its own ownership explicitly includes them.

New APIs are versioned and legacy tests remain green. Cross-package consumers
use reviewed package exports, not arbitrary relative imports into another
workspace's source. Shared export/manifest/asset files can produce real conflicts:
serialize them or use the controller's explicit overlap mode, then apply on the
current base, validate the combined result and review the actual applied diff.
A conflict needs a named repair owner and a separately authorized attempt.

The reusable controller stays in the separate swarm-control repository. This
backlog does not recreate it, import raw runtime logs, alter budget history,
launch workers, provision Firebase, generate production art or deploy a site.
Asset tasks integrate separately approved original deliveries; coding workers
are not given an image-generation API credential. Audio staging remains ignored
and never commits raw licensed tracks/SFX.

## Publication and evidence

Publish one issue per task ID and store its real number/URL in the matching JSON.
Issue bodies include scope, acceptance, dependencies, sources and named gates.
The source-linked backlog definition is reviewable before execution; task
metadata is not proof of completed work. Keep this index/manifest synchronized
with the JSON and preserve original source hashes when updating decisions.

The validator checks exactly A001-A100, source hashes, task binding, safe paths,
source references, dependency cycles, ready-task prerequisites and unique issue
identities when requested. It makes no cloud calls and does not verify issue
state remotely; paid controller admission does that separately.

For each cohort preserve activity/patch/check/review/PR/merge evidence, failed
attempts, repair attribution, cleanup and reconciled actual billing. Use the same
frozen initial backlog and acceptance contract for a strong AFK comparison. Real
useful overlap and superior merged green PRs/hour and PRs/dollar still require a
measured live run; browser fixtures, plans and the 100-task count do not prove it.
