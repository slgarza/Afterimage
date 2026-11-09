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

