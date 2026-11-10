# Preparation and local benchmark — 2026-11-10

This is a preparation report. No new Modal coding cohort ran, no new game feature
was counted as delivered, and no 100-agent/AFK efficiency claim is established.
The [machine-readable report](preparation-2026-11-10.json) contains the selected
measurements, source hashes and public evidence links; private original receipts
remain ignored under `.swarm/`.

## Published scope

| Item | Verified result |
| --- | --- |
| Source design documents | 11 unchanged snapshots with original hashes |
| Screen/overlay coverage | 24 indexed surfaces |
| New GitHub tasks | [100 open issues](https://github.com/slgarza/Afterimage/issues?q=is%3Aissue%20label%3Apilot100) |
| Local implementation prerequisites | 11 ready, 89 blocked by dependencies or named gates |
| Candidate classification | 85 feature candidates, 15 supporting tasks; no delivery credit yet |
| First candidate cohort | [A001](https://github.com/slgarza/Afterimage/issues/34), [A004](https://github.com/slgarza/Afterimage/issues/36), [A026](https://github.com/slgarza/Afterimage/issues/59) |
| New Modal worker runs | 0 |
| Current product | Foundation implementation; the source prototype is design-only |

See the [full task index](../PILOT100_TASKS.md), [source/decision register](../DESIGN_RECONCILIATION.md)
and [preparation PR33](https://github.com/slgarza/Afterimage/pull/33).

## Measured local verification

The benchmark used clean input commit `ed61f328de6a1f0b31c7f36222a959d9c4d6e06a`.
Source identities remained unchanged across the run. It measured metadata
validation, the benchmark tool's nine tests and the workspace baseline; this
is not the end-to-end feature-delivery clock.

| Phase | Outcome | Monotonic duration |
| --- | --- | --- |
| metadata | passed | 0.124 s |
| benchmark-tests | passed | 2.278 s |
| baseline | passed | 35.610 s |
| Local validation interval | passed | 38.146 s |

The workspace baseline passed lint, typecheck, **291 tests** and build. The free
three-task local plan passed in 0.141 s and reports live execution
disabled. Actual open-issue/provider/budget admission remains a separate gate.
The separately pinned controller passed **135 unit tests**, Ruff and Python compilation; [controller PR2](https://github.com/slgarza/swarm-control/pull/2) contains the code and final-check receipt recovery. The JSON retains both local validation attempts, not only the last one.
Final source publication is checked through [PR CI](https://github.com/slgarza/Afterimage/pull/33/checks).

## Publication span and missing measurements

GitHub created the first issue at `2026-11-10T22:45:46+00:00` and the last at
`2026-11-10T22:51:01+00:00`: an observed issue-publication span of
**315 seconds** at one-second server timestamp precision.
That span excludes earlier planning, source recovery, label setup and the final
local checkpoint. The full earlier preparation start was not instrumented, so
its duration stays **unknown**, rather than being reconstructed from issue times.

Gross cost, actual billed cost, confirmed token exemption and contest-eligible
cost are **unmeasured/null**. No reservation or budget ceiling substitutes for a
bill. Feature PRs/hour, PRs/dollar, useful 100-agent overlap and AFK comparison
remain unmeasured. The original budget/runtime identifiers and disabled live
flag were preserved.

The owner supplied the separate design location; the changed SSH address was
recovered by matching the stored public host key. A legacy GitHub CLI PR-metadata edit was also recovered through the supported
REST endpoint. These preparation/publication interventions have no measured
duration. No credentials, remote application code, mockup PNGs,
raw worker logs or licensed audio were imported into this report.

## Next measured work

Use the [mandatory benchmark policy](../SWARM_BENCHMARK.md) for every attempt.
Resolve only the gates relevant to a selected cohort, confirm a preserved
explicitly authorized allowance, freeze the workload/clock/acceptance/cost policy,
and start the bounded candidate pilot. Retain failure, review, repair, CI and
cleanup evidence. A qualifying scale run and paired strong-AFK comparison follow
only after their actual readiness and budget gates; this preparation is not that
result.
