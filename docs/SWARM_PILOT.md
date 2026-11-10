# Swarm pilot

## Why not 100 agents now

A swarm on an empty repository produces overlapping scaffolds and fake velocity. The first run is a 10-agent pilot over independently verifiable work. It establishes real throughput, conflict, test, and merge metrics before scaling.

## Shared rules

- One issue, one branch, one ownership area, one PR.
- Do not modify files outside a ticket's declared ownership without a dependency/coordination note.
- Every PR states its acceptance criteria, tests run, and whether it changes a public contract.
- No agent commits credentials, downloaded music/SFX, or copied third-party content.
- Failed CI returns the task to repair; it is not counted as delivered.

## Pilot tickets

| ID | Ownership | Deliverable | Acceptance signal |
| --- | --- | --- | --- |
| P01 | repo root | TypeScript workspace/tooling decision ADR | install + baseline commands documented |
| P02 | `packages/protocol` | event/state contract v0 | compile-time contract tests |
| P03 | `packages/engine` | deterministic game state and seeded RNG | repeatable unit tests |
| P04 | `packages/engine` | transition/invariant framework | invalid transitions rejected |
| P05 | `apps/client` | Vite/React/Capacitor shell | web app starts and renders |
| P06 | `packages/ui` | tokenized theme + accessible primitives | visual smoke story/page |
| P07 | `apps/client` | local lobby and room-code flow | browser E2E happy path |
| P08 | `apps/client` | local round/Transmission screen | browser E2E action state |
| P09 | root/CI | lint, typecheck, test GitHub workflow | workflow runs on PR |
| P10 | docs | asset provenance/credits template | no asset is accepted without source/license |

## Metrics to record

- Tickets started/completed; PRs opened/merged/green.
- Median task time and CI time.
- Conflicts, repair loops, and reverted work.
- Model/infrastructure cost per green PR.
- Human intervention needed per merge.

## Scale gates

Move 10 → 25 only when at least 80% of pilot PRs merge green and no credential/IP breach occurs. Move 25 → 50 only when the merge queue and dashboard identify conflicts and repair ownership. Reach 100+ only when every active agent, task, branch, CI state, and merge is observable.


## Completed batch: T01–T10

The earlier P01–P10 table describes initial work areas, not ten fresh tasks.
P03 is merged in PR5; P06 in PR7; P05 is superseded by the merged client scaffold.
The first executable cohort was `swarm/tasks/T01.json` through `T10.json`.
All ten are now marked merged and reference PR21–PR30; they must not be dispatched
again. See the [delivery report](swarm/pilot10-2026-11-10.md).
[The exact contracts](PILOT10_CONTRACTS.md) narrow ownership before dispatch.

Coordination decision: the controller owns the root test dependencies/lockfile,
Python CI, UI React/DOM compilation support, and separate protocol/UI test typechecks.
These shared changes land before the cohort. T01 alone may remove the protocol's
zero-tests allowance. Other workers may not edit manifests, shared barrels, or
App.tsx. The integrator later connects reviewed modules in a separate ticket.
Engine production remains ES2022-only. Tests may use Node/DOM tooling separately.

The user's USD25 authorization covers this ten-agent pilot: a cumulative USD18
model allowance (two USD0.50 compatibility probes plus USD17 cohort), and USD7
reserved for Modal. Persisted admission allocates infrastructure conservatively
before each launch; VM CPU/memory and lifetime are bounded. Reservations are
conservative limits, not provider invoices; reconcile billing for the final metric.
No 25/50/100-agent paid batch is authorized by this allowance.

A synchronized launch waits until all ten checkouts are ready, then starts ten
separate Codex processes. Event timestamps and completed commands distinguish
live processes from sessions that have actually executed work. Neither count
proves continuous useful activity. Patches require semantic review and full
combined checks, followed by green GitHub Actions before sequential merge.

The local durable scheduler is shared by Git worktrees. Only this controller may
dispatch; a different clone/machine or the legacy CLI is outside its locking scope.
The controller now lives in [swarm-control](https://github.com/slgarza/swarm-control).
Run instructions and scale requirements live in that repository. Afterimage is
a target project configured by [`swarm.toml`](../swarm.toml); its completed tasks
remain under `swarm/tasks/`.

Post-pilot coordination: the controller owns event-stream receipt logging, the
delivery report, task status reconciliation, and excluding ignored `.swarm/`
runtime worktrees from the root linter. The T05 review added a panel
background and a failing-before/passing-after contrast regression before PR25
merged. That repair is attributed separately from the worker's preserved patch.
No shared gameplay contract changed during integration.

## Controller extraction

The user authorized moving the swarm implementation to its own repository. This
coordination change moves controller code/tests/operations out of Afterimage,
updates CI to validate the game workspaces, and retains project-specific contracts,
task metadata and the original delivery report here. No gameplay API changed.

The original ignored `.swarm/` directory, Git worktrees, artifacts and budget
ledger remain on the operator's machine. The new controller resolves that same
Git common directory; extraction does not reset allocations or completed claims.
The project profile disables live execution and retains the original cloud app,
secret-name and gateway-ledger identifiers. No new paid run accompanies migration.
