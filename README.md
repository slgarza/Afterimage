# Afterimage

An original cross-platform social-deduction game about restoring a collapsing network of memories before dawn.

`Afterimage` is a working title. This repository contains only original game design and implementation work; it is **not** a remake or reskin of another game.

## Product in one minute

Five to ten players enter as **Archivists**, **Static operatives** or **The Null**.
Direct player-card votes select a two-person Repair Crew; complementary private
Route/Gate diagnostics drive a deterministic incident outcome. Archivists win
at six Repair or by disconnecting The Null; Static wins at six Sabotage.
Solo uses fair bots and local authority; multiplayer uses verified server authority.
These are the implementation targets, not completed gameplay.

Read the [canonical Rules v1](docs/design/RULES-SPEC-v1.md),
[screen flow](docs/design/SCREEN-FLOW-v0.md),
[source reconciliation](docs/DESIGN_RECONCILIATION.md),
[architecture](docs/ARCHITECTURE.md) and [swarm pilot](docs/SWARM_PILOT.md).

## Planned stack

- React + TypeScript + Vite + Capacitor for web, iOS, and Android.
- A pure deterministic TypeScript game engine.
- Firebase Auth, Firestore, and Cloud Functions for realtime state and server authority.
- Unit, integration, and E2E tests gated by CI.

## Status

Foundation components and separately reviewed modules are implemented; complete
gameplay and Firebase integration remain pending.
Use the [public swarm evidence index](docs/swarm/README.md) for the current
demo/pilot/contest status, task issues, preparation measurements and review links.
The [first ten-agent Modal pilot](docs/swarm/pilot10-2026-11-10.md) delivered ten
reviewed PRs with passing CI. The [100-worker pilot](docs/swarm/pilot100-2026-11-11.md)
ran on November 11: all 100 original reports failed validation, with 63 nonempty
patches and 37 empty patches. The six-hour observation closed **cutoff-censored**
with recovery incomplete: 56 provisional product modules and two support tasks,
including 22 separately attributed coordinator repairs. B096 remained unresolved
in CI and four later nonempty candidates were not attempted in recovery. The
completed-workload T1, 24-hour acceptance, actual attributable cost and advantage
over a strong AFK pipeline remain unknown. No Firebase project, production
credentials, proprietary source assets or licensed music belong in this repository.

## Local development

Use Node 24 (`nvm use` if available) and npm 11. Install from the repository root:

```sh
npm ci
npm run dev
```

Vite serves the neutral client shell at the local URL printed in the terminal.
The engine provides deterministic RNG/replay, lobby and deck primitives. The UI
and client include tested controls, room entry, roster, board and Transmission
components under [explicit contracts](docs/PILOT10_CONTRACTS.md). These components
are not yet connected into the client shell; complete gameplay and Firebase
integration are still pending.

## Validation

Run from the repository root:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run check` runs all four in sequence. Scope a command with, for example,
`npm run typecheck --workspace @afterimage/engine`. Each workspace has explicit
lint, typecheck, test, and build scripts. All four workspaces have tests;
the historical ten-agent pilot recorded 291 passing tests. Current checks cover
the current tree; consult their receipts rather than treating that historical
count as a current total. Builds write ignored `dist/` outputs.
Preview the built client with `npm run preview --workspace @afterimage/client`.

Every swarm activity, including backlog preparation, implementation, review,
repairs and integration, must record its outcome, elapsed time, validation and
known cost. Follow the [benchmark policy](docs/SWARM_BENCHMARK.md). Local check
receipts measure the commands that actually ran; a successful full validation
profile does not demonstrate 100 live coding agents or an AFK efficiency win.

For recorded swarm validation after all task issues are linked, run:

```sh
node tools/benchmark-pilot.mjs --profile full
```

This runs backlog metadata validation and `npm run check`, recording command
durations and exit codes in a new private `.swarm/benchmarks/` receipt. It retains
failed attempts, does not save raw command output and leaves unmeasured model
usage, billing, deliveries and agent concurrency unknown.

Tooling choices, ownership coordination, and the resolved bootstrap installation
limitation are recorded in [ADR 0001](docs/adr/0001-typescript-workspace.md).


## Swarm integration

The reusable controller lives in [slgarza/swarm-control](https://github.com/slgarza/swarm-control).
Afterimage contains only its project configuration (`swarm.toml`), tasks under
`swarm/tasks/`, contracts and pilot report. Install the controller from its own
repository, then inspect this target without cloud resources:

```sh
swarm-control plan T01 --project /path/to/Afterimage/swarm.toml --base HEAD
```

T01–T10 are completed and live execution is disabled. The original local `.swarm/`
evidence and cumulative budget ledger stay in place. Controller development and
Python tests belong to the separate repository; this project's CI checks the game.

## 100-worker pilot and remaining backlog

The executed [B001-B100 cohort](docs/PARALLEL100_TASKS.md) contains 100
independent module tasks on one frozen source base, with exact
[UI](docs/PILOT100_UI_CONTRACTS.md) and
[domain](docs/PILOT100_DOMAIN_CONTRACTS.md) contracts. See the
[preparation and launch runbook](docs/PILOT100_READY.md) for the frozen protocol,
and the [actual results, methods and limits](docs/swarm/pilot100-2026-11-11.md)
for what happened. Observations of 100 running sandboxes and command-bearing
sessions do not establish 100 simultaneous useful contributors or an AFK win.
The tracked historical profile remains disabled, and the cumulative accounting
history is preserved. These leaves consume existing A scope without duplicate
feature credit; module delivery does not connect App.

```sh
node tools/prepare-parallel100.mjs --require-issues
node tools/benchmark-pilot.mjs --profile full
```

[A001-A100](docs/PILOT100_TASKS.md) implement the retrieved full design pack with
explicit scope, acceptance, dependencies and source hashes. The
[backlog guide](docs/PILOT100_BACKLOG.md) explains staged execution, concrete edge
decisions and external delivery gates. Validate with
`node tools/validate-pilot100.mjs`; live execution remains disabled.
Preserve preparation and execution receipts under the ignored `.swarm/`
directory, including failed attempts and unknown measurements. Report delivery
throughput from accepted merged green PRs over the full delivery clock; dollar
rates additionally require reconciled eligible cost.
