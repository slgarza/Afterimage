# Bounded ten-agent Modal pilot

Each ticket runs a separate Codex process in a Modal VM with its own checkout of
one exact base commit. The controller validates disjoint ownership and open
GitHub issues, verifies merged dependencies, and atomically claims work in the
SQLite ledger shared by this repository's Git worktrees. Duplicate work, stale
P03/P05/P06 assignments, and concurrent local dispatchers are rejected.

## Start and review

Use Python3.12 with `tools/swarm/requirements-pilot.txt`, Node24 and npm11.
Modal workspace authentication and the `afterimage-openai` secret already exist.
Deploy the gateway, then run the bounded compatibility probe once:

```sh
modal deploy tools/swarm/pilot_gateway.py
python tools/swarm/probe_gateway.py --gateway-url https://YOUR-GATEWAY.modal.run
```

Obtain the origin with `modal.Function.from_name("afterimage-swarm-gateway", "gateway").get_web_url()`. Use that origin below. Do not print or
persist tokens returned by the gateway administration functions.

```sh
git fetch origin main:refs/remotes/origin/main
python tools/swarm/modal_runner.py plan T01 T02 T03 T04 T05 T06 T07 T08 T09 T10 --workers 10 --synchronized
python tools/swarm/modal_runner.py run T01 T02 T03 T04 T05 T06 T07 T08 T09 T10 --workers 10 --synchronized --model gpt-6.1-sol --timeout 300 --model-budget 17.00 --gateway-url https://YOUR-GATEWAY.modal.run
```

The paid pilot admits at most ten tasks. `plan` can describe future cohorts up
to 100 without launching them. A synchronized batch requires exactly one task
per worker; all prepared checkouts cross a barrier before their agents start.
A failed preparation aborts the barrier. Workers have 300 seconds of agent time
and at most 1200 seconds total for installation, coordination, checks and recovery.
Each VM requests 0.5 CPU/512 MiB and is capped at 2 CPU/2048 MiB. Outbound domains
are limited to GitHub, npm and the gateway. No GitHub/local ChatGPT credential
or real OpenAI key reaches a worker. The trusted gateway holds the project key;
workers receive only individual expiring budget credentials.

## Budget and state

This user's cumulative USD25 authorization is split into USD18 model allowance
and USD7 infrastructure reserve. Each compatibility probe reserves USD0.50 for models; the cohort may use only
the remaining cumulative allowance (USD17.50 after one probe, USD17 after two).
The VM ceiling costs about USD0.111 per worker at the checked Modal resource
rates; admission reserves USD0.30 per cohort worker plus USD1 overhead. SQLite records both model and
infrastructure allocations before provisioning, including smoke runs. Allocations
are not reset/refunded automatically after failure. Worker/model limits and the
conservative infrastructure reserve are admission controls, not provider invoice
verification. Export safe gateway status and reconcile both providers' billing.
The gateway's independent durable per-request accounting is documented in
[GATEWAY.md](GATEWAY.md). Never create another gateway run to evade an exhausted
allowance. Later 25/50/100 stages require new budgets and reviewed ready backlog.

Evidence lives in the original repository's ignored `.swarm/modal-runs/batch-*/`:
manifest, timestamped agent events, reports, exact patches, SHA256 digests, logs,
budget start/end reports and summary. Logs redact key-shaped values and should
remain private. `validated` means the worker's checks passed; it is not a merged
PR. Process overlap and overlap after first completed command are reported
separately, and neither implies uninterrupted useful coding.

For each validated patch, inspect the complete diff and acceptance tests. Then
integrate sequentially so each candidate includes every prior merged change:

```sh
python tools/swarm/pilot_integrate.py plan ARTIFACT_DIR
python tools/swarm/pilot_integrate.py prepare ARTIFACT_DIR
python tools/swarm/pilot_integrate.py publish ARTIFACT_DIR --reviewed-patch-sha REVIEWED_SHA256
# Wait for GitHub Actions on the exact published head.
python tools/swarm/pilot_integrate.py merge ARTIFACT_DIR --reviewed-patch-sha REVIEWED_SHA256
```

Prepare creates a fresh worktree, applies the checked patch, rechecks ownership
and secrets, runs npmci/full checks and Python tests, and binds validation to
the exact Git tree/base. Publish and merge require semantic review acknowledgment;
merge checks current main and successful CI on the exact head. GitHub guards the
head SHA atomically; its API has no atomic base-SHA condition. This pilot therefore
uses one integrator and checks main immediately before merge. Do not merge
concurrently through another client. A changed base requires a fresh validated
attempt, preserving prior artifacts. A failed or unmerged patch is not delivery.

Failed workers retain partial patches when retrieval succeeds and are terminated.
Inspect failed termination/recovery reports; provider loss can still lose unreceived
work. No automatic retry, credit reset, or stale-lock stealing is allowed. `--retry`
only permits an explicitly reviewed failed task with remaining cumulative budget.
Never use legacy `swarm.mjs release` on a dirty worktree: it forcibly removes it.

## Before scaling

10→25 requires at least 80% merged green and no credential/IP breach. 25→50 also
requires observable conflicts and repair ownership. 100 requires a real backlog,
account RPM/TPM and Modal capacity, global distributed scheduling/heartbeats,
durable checkpoints, collision/repair evidence, and 100 concurrently useful agents.
The current local pilot lock does not coordinate other clones/machines.

Benchmark the same initial commit/backlog/acceptance tests against an AFK pipeline.
Include CI/merge time, interventions, reverts, and reconciled model/infrastructure
cost per merged green PR. Disjoint tickets test dispatch initially; this is not
yet proof of same-file collision handling or a qualifying 100-agent submission.

## Validation

```sh
python -m unittest discover -s tools/swarm -p 'test_*.py'
npm run check
```

CI runs the Python suite with pinned dependencies as well as all workspace checks.

## Gateway compatibility evidence

The first live probe rejected the CLI request shape before any model call; its
run was stopped and Sandbox terminated. After adding strict namespaced local-tool
support, the second probe passed on 2026-11-10: two model requests, one completed
shell command, READY, clean workspace and confirmed cleanup. Conservative model
accounting was USD0.054613 (not an invoice). Both USD0.50 allocations remain in
the cumulative ledger; this cohort therefore receives USD17.00. The full local
Python suite passes 68 tests including the compatibility and admission regressions.

## Historical one-agent evidence (S01)

Verified on 2026-11-10: 12 offline regression tests, scoped Ruff lint, Python
compilation, and the repository's lint/typecheck/tests/build all pass. The live
Modal smoke run against `0670928531e6e84200d09341f489f1ea77a9a684` passed all
repository checks, retrieved its artifacts, and confirmed Sandbox termination.
With the image cached it took 16.687 seconds end to end; this is infrastructure
validation, not a coding-agent throughput benchmark. The environment reported
Node 24.6.0, npm 11.16.0, Codex CLI 0.166.0 and Git 2.39.5.

An authenticated `gpt-6.1-sol` run of P06 then completed successfully on the same
base commit. The agent produced five files within `packages/ui`, including typed
theme tokens and three contrast/palette tests. The independent runner's full
repository checks passed, the downloaded patch matched the checked digest,
recovery had no errors, and the Sandbox was terminated. Total worker cycle:
55.557 seconds (agent process: 41.921 seconds). Event-reported usage was 122,061
input tokens (101,475 cached; 20,565 cache-write tokens also reported), 2,369
output tokens and 256 reasoning-output tokens. These counters are recorded as
reported; they are not a billing calculation. Provider costs remain unverified.

This establishes one real agent's worker cycle. PR integration and CI time must
be measured separately; it is not evidence of 100 concurrent agents or an AFK
comparison. Runtime evidence remains in ignored `.swarm/modal-runs/`.
