# Swarm demo, pilot and contest evidence

Public review entry point, updated 2026-11-11. Start with the status below, then
follow the source-linked tasks and measured reports.

## Current status

| Area | Verified scope |
| --- | --- |
| Production app | Foundation components and tests; the new complete game is not implemented yet |
| Design | Owner-supplied Rules v1, screen flows and visual/audio/monetization contracts imported with source hashes |
| Original backlog | A001-A100: 11 initially ready, 89 blocked; preserved scope must consume B modules without duplicating work |
| Additional prepared cohort | B001-B100: 100 independent, source-linked module tasks with frozen contracts and disjoint ownership |
| Next pilot | Authorized gateway/image setup and one compatibility probe passed; 100-worker dispatch remains held and live profiles disabled |
| Historical pilot | Ten reviewed, merged PRs documented separately below |
| Contest proof | 100 useful simultaneous agents and an efficiency win over a strong AFK baseline remain unproven |
| Billing | Unknown/unreconciled amounts remain `null`; budget reservations are not invoices |

The external UI prototype is a design reference. Its code and hardcoded game
results were not copied into production or deployed as a product demo by this
preparation. Local plans and browser fixtures do not establish agent concurrency.

## Review the backlog and its source

- [100-worker release packet](../../swarm/deployment100.json),
  [staged launch guide](../SWARM100_LAUNCH.md) and
  [independent acceptance policy](../SWARM100_ACCEPTANCE.md).
- [Parallel100 issues](https://github.com/slgarza/Afterimage/issues?q=is%3Aissue+label%3Aparallel100),
  [B task/issue index](../PARALLEL100_TASKS.md),
  [preparation and launch runbook](../PILOT100_READY.md) and
  [frozen cohort manifest](../../swarm/parallel100.json).
- [Pilot100 GitHub issues](https://github.com/slgarza/Afterimage/issues?q=is%3Aissue+label%3Apilot100)
  and [complete task/issue index](../PILOT100_TASKS.md).
- [Execution guide](../PILOT100_BACKLOG.md) and [batch manifest](../../swarm/pilot100.json),
  including ownership, dependency and readiness rules.
- [Canonical Rules v1](../design/RULES-SPEC-v1.md),
  [screen flow](../design/SCREEN-FLOW-v0.md),
  [design source hashes](../design/SOURCE-MANIFEST.json) and
  [source/decision reconciliation](../DESIGN_RECONCILIATION.md).
- [Preparation review PR #33](https://github.com/slgarza/Afterimage/pull/33) and
  [repository CI results](https://github.com/slgarza/Afterimage/actions/workflows/ci.yml).

## Read measurements with their limits

| Evidence | What it establishes |
| --- | --- |
| [Authorized setup and compatibility probe](setup100-2026-11-11.md) / [JSON](setup100-2026-11-11.json) | Approved cumulative policy with history preserved, deployed gateway/image, one real tool/model round trip and cleanup snapshot; no B worker or live 100-agent proof |
| [Deployment preparation](deployment100-preparation-2026-11-11.md) / [JSON](deployment100-preparation-2026-11-11.json) | Current open-issue/base preflight, tested pacing/runtime proposal and USD200 planning envelope; no authorized deployment or live cohort |
| [Parallel100 preparation report](parallel100-preparation-2026-11-10.md) / [JSON](parallel100-preparation-2026-11-10.json) | Second 100-task inventory, static independence, local checks and launch blockers; no live run |
| [Preparation report](preparation-2026-11-10.md) / [JSON](preparation-2026-11-10.json) | Task/issue inventory, source coverage and measured local validation; not a live cohort |
| [Historical ten-agent report](pilot10-2026-11-10.md) / [JSON](pilot10-2026-11-10.json) | The completed earlier assisted pilot and its stated measurement limits |
| [Benchmark policy and operator runbook](../SWARM_BENCHMARK.md) | Required evidence for every attempt, full delivery clocks, independent acceptance and reconciled cost |

Record preparation, execution, review, repairs, integration and cleanup, including
failures and interventions. Compare the same frozen workload against the approved
AFK configuration using accepted merged green PRs per hour and per eligible
dollar. Missing observations stay unknown. Publish reviewed aggregates and hashes;
retain raw logs, credentials, runtime state and billing details privately.
