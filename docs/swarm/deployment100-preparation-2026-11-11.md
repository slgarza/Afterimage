# Deployment preparation — 2026-11-11

The 100-task source preparation passed. No new swarm, deployment, image build,
compatibility probe or budget migration ran. Live execution remains disabled.
The [release packet](../../swarm/deployment100.json),
[launch guide](../SWARM100_LAUNCH.md) and
[independent acceptance policy](../SWARM100_ACCEPTANCE.md) describe the proposed
run and its remaining gates. [Machine-readable measurements](deployment100-preparation-2026-11-11.json)
retain separate attempts and unknowns.

## Verified preparation

- B001–B100 still correspond to 100 open issues, with no dependencies or owned
  path collisions. There are 97 product-module candidates and three supporting
  tasks. These modules do not by themselves establish a complete integrated app.
- Read-only preflight made 103 GitHub GETs: it checked the cohort, absence of
  duplicate task PRs, reachability of the frozen source and green exact-base CI.
- The controller passed 235 unit tests, Ruff and Python compilation. Tests cover
  rate queues, cancellation, retained reservations, extended runtime bounds and
  refusal to launch against an incompatible gateway.
- The deployment validator passed 12 tests and verified 108 current hash
  bindings, 106 identical frozen-base inputs, 16 source references and all 100
  task identities. CI also checks the pinned target/controller Git objects.
- The frozen source passed the full local benchmark, including metadata,
  benchmark-tool tests, lint, typecheck, application tests and build. The first
  attempt detected preparation files changing during validation; its failed
  receipt remains preserved. The successful repeat used an isolated clean Git
  worktree at `79404fe6d4ed5cf1b59b5610a3aebbe9d1f8021f`.
- Modal authentication and the configured secret's existence were checked
  without invoking compute. The gateway was stopped; no active sandboxes were
  observed. Effective workspace quota and current secret validity remain
  unverified. The original durable ledger and retained allocations are intact.

After the initial read-only audit, the owner reported upgrading the paid Modal
tier. Modal's published Team tier advertises 5,000 concurrent containers, giving
nominal headroom for this inventory. Actual workspace activation, applicable
sandbox/functions quota and deployed capacity remain separate observations.
See [Modal's published plans](https://modal.com/pricing). Retain subscription
charges separately and predeclare full/amortized attribution to the pilot;
neither a subscription payment nor included credits establishes available funds.

The new controller's [read-only preflight](https://github.com/slgarza/swarm-control/blob/main/docs/DEPLOYMENT_PREFLIGHT.md)
separates passing source checks from budget, provider capacity and launch
authorization. Exit zero cannot authorize a deployment. Local validation and
simulated sessions are preparation evidence; they are not observed cloud agents
or delivered feature PRs.

## Candidate within the owner's USD200 planning ceiling

| Proposed allowance/reservation | USD |
| --- | ---: |
| Cohort model reservation | 145.00 |
| Cohort infrastructure admission reserve | 31.00 |
| One compatibility probe | 1.85 |
| Subtotal | 177.85 |
| Remaining setup/CI/explicit repair envelope | 22.15 |

The USD200 answer constrained the proposal; it did not approve spending. The
candidate separates a USD150 model envelope and USD50 infrastructure envelope.
Original reservations remain included in a possible cumulative migration; no
increase was applied. These amounts are local controls, not provider invoices or
remaining credit. Actual attributable cost remains unknown.

The owner reported 1,000,000 TPM and 5,000 RPM for the selected model. The proposed
gateway paces traffic to 800,000 TPM and 4,000 RPM, counting input-token preflight
requests and verified input plus maximum output token weights. It keeps one
shared 300-second admission deadline and retains monetary reservations on pacing
failure. Rate history is process-local; restart and other account traffic can
still cause provider throttling. The batch-queue label is not an interactive
daily token allowance.

The proposal explicitly selects 1,800-second coding sessions and a 2,700-second
lifecycle/gateway TTL. The controller default remains 300 seconds. All waits,
failed attempts, model retries and compute occupancy belong in future measured
time/cost. Longer sessions do not establish that all 100 agents work usefully at
the same instant.

## Release and contest limits

Before paid setup, obtain actual owner authorization and confirm effective Modal
capacity for 100 sandboxes plus gateway/helpers. Then perform the authorized
cumulative migration, gateway/image preparation and compatibility probe. Verify
the authenticated deployed settings. Confirm reviewers, repair scope, delivery
deadline and quality window, notify the owner and obtain the separate 100-worker
release before dispatch. No automatic replacement cohort or refill is authorized.

This is an unpaired scale-pilot proposal. It has no new accepted feature
deliveries, useful-100-agent overlap, same-file collision-repair result, reconciled
cost or AFK comparison. PRs/hour and PRs/dollar remain null. A contest efficiency
claim still requires the strong agreed baseline, equal frozen work and complete
delivery/quality/cost measurements.

Private evidence retains command start/end, monotonic wall time, failures,
source/receipt hashes and original account observations. The original overall
preparation start was not recorded, so this report does not invent a total
preparation duration. Published data is a reviewed allowlist; raw worker logs,
credentials, runtime state and billing account detail stay outside Git.
