# Swarm evidence and benchmark policy

Document and benchmark every stage of swarm work: source reconciliation, backlog
preparation, issue publication, local validation, worker execution, review,
integration, repair and cleanup. Keep the measured stage explicit. Preparing 100
issues or passing local tests does not demonstrate 100 useful live agents or an
advantage over an AFK pipeline.

This policy applies through `AGENTS.md` and the target profile's instruction list.
It adds evidence requirements, not permission to run paid workers, change a
budget, clear an external gate or publish private artifacts. Task ownership and
the [source reconciliation](DESIGN_RECONCILIATION.md) still apply.

## Record each attempt

Use a unique attempt/cohort ID and private evidence directory under the target's
ignored `.swarm/`. Preserve failed and superseded attempts; never overwrite them
with the final successful result. The controller's existing common-directory
ledger remains authoritative for prior allocations and claims.

| Record | Required evidence |
| --- | --- |
| Stage and input | Purpose, target/controller commit and dirty-state identity, exact base, frozen task/issue IDs, task/design manifest hashes, tool versions and configuration hashes |
| Clock | Timezone-aware UTC start/end, timestamp source/precision and monotonic elapsed duration where measured |
| Actions | Commands or operation identities, exit/outcome, duration, input/output hashes and private log locations; include issue/review/merge operations and failures |
| Worker | Task, unique session/sandbox, repository/base, preparation/agent/check timestamps, command/model activity, original patch digest, changed paths and handoff |
| Integration | Reviewed worker and applied patch digests, tested base/tree/head, independent acceptance, PR, exact-head/combined checks, actual merge SHA/time |
| Exceptions | Queueing, throttle/disconnect, conflicts, failed checks, retries, repairs, reverts, lost/missing evidence and cleanup failures |
| Intervention | Human/coordinator/automation identity, affected tasks, start/end or duration, reason and action; distinguish preconfigured automation from runtime judgment |
| Cost | Actual gross usage and billed amounts by service, credits/exemptions/allocation policy, reconciliation state and supporting private receipt hashes |

Workers must return a concise handoff with files, contract changes, commands and
results, unresolved limitations and repair needs. The controller captures its
private `last-message.txt` and events; workers do not edit task metadata or
shared evidence files outside their ownership. An unavailable measurement is
`null`/unknown with a reason. An empty list alone does not establish that there
were no interventions or failures; confirm that explicitly in the final receipt.

Hash original patches/logs/receipts before deriving a summary and retain the
original bytes. Redacted exports have their own hashes and retain a private
mapping to originals. Never commit `.swarm/`, raw worker logs, credentials,
credential hashes from gateway administration, customer code or billing account
details. Publish only reviewed aggregates and allowed source/PR links.

## Measure the complete delivery clock

Freeze the clock definition before either pipeline starts. Release the prepared
workload at `T0`; stop at the predeclared deadline or after the final accepted
merge and required checks at `T1`. Include dispatch, environment startup, model
calls, integration/review, CI queues and execution, failed attempts, retries,
repairs and the integration tail. Do not restart the clock at the first successful
worker, exclude intervention time or silently remove failed work.

Measure preparation, compatibility probes and builds outside that primary clock
separately, with their duration and cost. Also report a setup-inclusive view.
Declare the same full/amortized allocation rule for both pipelines. Preserve
separate measurements when a stage is rerun. Local command wall time is a local
validation measurement, not a delivery-rate denominator for merged feature PRs.

## Count useful work and accepted delivery

Retain per-worker queued/preparing/working/waiting/checking/finished states and
actual command/model events where available. Compute overlap from aware UTC
intervals with distinct identities and the same repository/base. Report peak,
sustained overlap and seconds at or above 100 separately from useful contribution
counts. Include missing timestamps and observation gaps. Idle VMs, sequential
tasks, browser test contexts and a requested worker count do not prove scale.
Sampled first-to-last activity spans can contain idle gaps; preserve that limit.

A delivery counts only when it implements the frozen backlog item, passes
independent acceptance, is reviewed and merged into the designated branch, and
has green checks for the exact reviewed head and the combined result. Review
compatible shared-file application on the current base and record both original
and applied patch digests. Combined failures/conflicts become attributed repair
attempts with their own timing/cost, not hidden coordinator work.

Freeze PR granularity and the quality observation window before execution.
Report accepted backlog items and merged green PRs together, plus failed,
unmerged, repaired and reverted work. Record post-merge checks/defects/reverts
through the agreed window; a missing acceptance receipt remains unknown.
Documentation, bookkeeping and independent test tasks retain their supporting
classification instead of inflating feature throughput. Explicit review remains
assisted operation while a human/coordinator must invoke it.

## Reconcile dollars before calculating efficiency

Collect actual model usage/billing, worker/gateway compute, builds, storage,
network, CI and other attributable services, including every failed attempt and
repair. Preserve gross economic cost, actual billed cost, credits and the declared
shared-resource/setup allocation. Budget allocations, gateway ceilings and
admission reserves are separate controls; none is a provider invoice.

Apply the contest's internal-token exemption only to specifically confirmed
charges. Retain who approved that classification, which charges qualify and the
confirmation hash. Calling OpenAI does not by itself establish an exemption.
Report both gross and eligible cost. Unknown billing produces null dollar rates;
zero denominators remain undefined rather than infinite efficiency.

For accepted deliveries `D`, full duration `T` seconds and reconciled eligible
cost `C` USD, compute `D * 3600 / T` and `D / C`. A win requires improvement in
both rates under the agreed quality/scale conditions. If either denominator or
the comparison is unverified, the conclusion remains unproven.

## Pair against a strong AFK baseline

Use the strongest practical organizer-approved AFK configuration, recording its
model/software versions, prompts, tools, preparation effort and capacity. Freeze
the same target/base, task objects/dependencies, acceptance and PR granularity,
required checks, observation window, allowed data/tools and resource/CI policy.
Start independent copies/branches from that base, without giving either pipeline
the other's solutions or repairs. Keep privacy, external gates, cost treatment
and human-approval rules equal; record unavoidable differences.

Run paired repetitions and alternate ordering when workload/budget permit;
retain every run, spread, failure and intervention rather than selecting a best
swarm/worst baseline pair. Current `swarm-control` does not run an AFK product.
Its offline comparison requires an AFK adapter's compatible receipts with the
same frozen task objects and protocol. A matching hash is supplied-rule
consistency, not independent approval or proof that a run occurred.

## Operator runbook

### 1. Benchmark preparation and local validation

From the target checkout, record a new local validation attempt:

```sh
node tools/validate-pilot100.mjs --require-issues
node tools/benchmark-pilot.mjs --profile full
swarm-control plan A001 A004 A026 --project swarm.toml --workers 3 --synchronized --base HEAD
```

The runner assigns a unique private receipt below the Git common checkout's
`.swarm/benchmarks/`; retain each attempt. An explicit `--output` must be an
unused path inside that directory, resolved from the checkout when relative.
The `full` profile measures linked metadata validation, the benchmark tool's
unit tests and `npm run check`, and writes a private receipt; it
does not launch workers, make accepted deliveries or establish contest metrics.
Inspect command outcomes, input/log hashes and unknown fields before describing
the result. Issue creation and this receipt belong to preparation, not feature
delivery. The profile's existing disabled live flag and durable budget remain
unchanged; a local plan is not authorization for a paid cohort.

The initial `docs/swarm/preparation-2026-11-10.md` and companion JSON may report
the verified 100-issue inventory, source/screen coverage, current ready/blocked
counts, measured local-check durations and sanitized receipt hashes/links. The
first-to-last GitHub issue creation time is an **issue-publication span**, not
the complete preparation clock. The earlier overall preparation start was not
measured and must remain null; do not invent it retrospectively. Preparation
does not imply a new Modal cohort, feature deliveries, known billing or an AFK
comparison. Future workload-release timestamps are mandatory from the actual
start. Public preparation reports are reviewed allowlists, never copies of the
private benchmark receipt or worker logs.

### 2. Freeze an experiment before authorized dispatch

Store one comparison protocol outside tracked source. The controller requires
these exact JSON fields:

```json
{
  "comparison_id": "afterimage-pair-1",
  "baseline_configuration_sha256": "<64 lowercase hex characters>",
  "acceptance_policy_sha256": "<64 lowercase hex characters>",
  "cost_policy_sha256": "<64 lowercase hex characters>",
  "clock_definition": "Workload release through final accepted merge and required checks",
  "observation_window_seconds": 86400
}
```

Replace digest placeholders with real hashes. The window is an example; use the
predeclared agreed value for both runs. Record `T0` when releasing the workload,
then retain the controller artifacts, original ledger and intervention record
through final checks/cleanup. Missing evidence is a gap to report, not permission
to reset a run, silently retry or replenish budget.

### 3. Collect acceptance and billing receipts

After independent review and the observation window, supply an acceptance list:

```json
[
  {
    "task_id": "A001",
    "patch_sha256": "<original worker SHA256>",
    "reviewed_head_sha": "<reviewed PR head Git SHA>",
    "merge_commit_sha": "<actual merge Git SHA>",
    "accepted": true,
    "post_merge_checks": "success",
    "reverted": false,
    "observation_ended_at": "2026-11-11T18:00:00-06:00",
    "evidence_sha256": "<independent acceptance evidence SHA256>"
  }
]
```

The timestamp is illustrative. Bind hashes to `integration.json`, cover the
protocol window after merge, and attach private check/review evidence. Do not
assert success/revert absence before observing it. Reconciled cost uses:

```json
{
  "reconciliation_status": "reconciled",
  "gross_total": 12.50,
  "confirmed_internal_token_exemption": 0,
  "contest_eligible_total": 12.50
}
```

These are example amounts. Positive exemptions additionally require
`exemption_evidence_sha256`, hashing the private approval identifying authority
and covered charges. Eligible cost equals gross minus the confirmed exemption.
Keep detailed invoices/credits/allocation private. Omit the cost receipt when
billing is unknown; do not substitute zero or an allocation ceiling.

### 4. Export, compare and report the limits

Use the recorded full delivery clock, not the example timestamps below:

```sh
swarm-control evidence collect .swarm/modal-runs/batch-ID \
  --pipeline swarm \
  --started-at 2026-11-10T17:00:00-06:00 \
  --ended-at 2026-11-10T18:00:00-06:00 \
  --protocol .swarm/benchmarks/comparison-protocol.json \
  --cost-receipt .swarm/benchmarks/reconciled-cost.json \
  --acceptance-receipts .swarm/benchmarks/acceptance.json \
  > .swarm/benchmarks/swarm-report.json
swarm-control evidence compare \
  .swarm/benchmarks/swarm-report.json .swarm/benchmarks/afk-report.json
```

These offline commands use the schema in the recorded controller version's
`docs/contest/EVIDENCE.md`. Both timestamps are required for hourly rates;
unavailable acceptance/billing remains null. The exporter checks recorded
interval coverage and receipt consistency but cannot authenticate local input
or observe the true workload release. It reports process and sampled contribution
overlap separately and leaves `scale_requirement_verified` false. Comparison
recomputes rates and requires matching repository/base/task/protocol hashes;
`contest_win_proven` remains false pending independent scale/baseline review.

Close each stage with a sanitized report naming measured scope, attempts,
accepted deliveries, full time, gross/eligible cost or unknowns, concurrency,
interventions, failures/repairs/reverts, cleanup and source receipt hashes.
Preserve private originals. Documentation and measured evidence must accompany
the work before claiming a completed stage or publishing benchmark results.
