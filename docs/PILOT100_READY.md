# Parallel 100 preparation: B001-B100

This is a second set of 100 task issues for Afterimage. The original A001-A100
backlog remains preserved. B001-B100 decompose its broad implementation scope
into independent product modules with frozen local contracts. They are not 200
different promised features, and there have not been 100 live workers.

**Preparation only. Live execution is disabled. The user explicitly requested
that no 100-agent run start yet.** Passing static checks does not clear the
budget, quota, review, product, or benchmark gates below.

## Independent work on one frozen base

All 100 workers will receive the same reachable Afterimage commit and exactly
one B-series issue. No B task depends on an unmerged A/B implementation. The
two frozen contract documents specify module-local readonly input/output types,
exports, error semantics and recipient-safe data boundaries:

- [UI contracts](PILOT100_UI_CONTRACTS.md): B001-B050.
- [Domain contracts](PILOT100_DOMAIN_CONTRACTS.md): B051-B100.

Read the contract's shared rules/vocabulary and your assigned B section before
implementation; the complete frozen document remains available for audit. A
worker does not need to reread all 99 other API sections to implement its own.

Existing installed React/TypeScript/Vitest tooling suffices. Each task owns
different source/test paths and exports from its own module. Workers must not
edit manifests, lockfiles, shared barrels, App.tsx, task definitions, contracts,
benchmark policy or other tasks. They may import existing baseline exports and
their own files only; no future-module imports or placeholder implementations of
another worker's responsibility. Engine code stays ES2022-only and deterministic.

UI modules are controlled views: recipient-safe props and typed callbacks,
without claiming server authority. Domain modules implement bounded policy or
canonical rules from explicit inputs, not provider authentication or an entire
match reducer. Unspecified rules return the frozen `decision-required` result
where applicable, never invented policy. Native/Firebase/art delivery remains
unavailable without its actual gate; workers must not provision it.

The final combined acceptance must connect these modules through explicit
adapters. Module delivery alone does not make the current App playable. Controlled
views, standalone domain policies and an integrated user journey are reported
separately. Replacing prototype state with real authority is still necessary.

## Avoid duplicate work

Every B task includes `replacesScopeFrom` tracing its exact prior A task scope.
Do not dispatch those A tasks alongside the B cohort. Replan the remainder of
the A scope to consume reviewed B modules after they merge. A-series issue
history is preserved; neither A nor B may claim the same implementation twice.
Use the [batch manifest](../swarm/parallel100.json) and generated task index,
not a filter that blindly dispatches all open issues.

This initial cohort has disjoint ownership. It can establish 100 useful parallel
workers only with actual execution evidence. It does not exercise live same-file
collision repair. A later deliberately scoped shared-file integration experiment
must measure that separately; offline collision tests are insufficient proof.

## Safe preparation commands

From Afterimage with the controller's virtual environment active:

```sh
node tools/prepare-parallel100.mjs --require-issues
node --test tools/prepare-parallel100.test.mjs
node tools/benchmark-pilot.mjs --profile full
```

The full benchmark profile validates both task inventories, tests the evidence
and preparation tools, and runs `npm run check`. It freezes every task JSON,
cohort manifest, contract, profile and policy digest in a new private receipt.
These are local preparation measurements, not accepted PRs/hour or agent runs.
The benchmark's internal `--workload-only` validation checks the same immutable
task/contract bindings without requiring the future authorized profile to remain
disabled. It never grants execution permission. The explicit preparation command
above additionally requires disabled execution, preventing preparation from
silently enabling a cohort. This separation keeps future authorized worker and
integration final checks usable after a separately reviewed release.

Generate a 100-worker plan without any cloud operation using the frozen IDs:

```sh
python3 - <<'PY'
import json, subprocess
from pathlib import Path
cohort = json.loads(Path('swarm/parallel100.json').read_text())
subprocess.run(['swarm-control', 'plan', *cohort['taskIds'], '--project',
                'swarm.toml', '--workers', '100', '--synchronized',
                '--base', 'HEAD'], check=True)
PY
```

`plan` is offline, does not allocate budget and reports local eligibility rather
than proving provider admission. The profile explicitly sets worker and gateway
capacity to 100 while preserving `live_enabled=false`, the original ledger/app
identifiers and the original USD18 model/USD7 infrastructure limits.

## Launch gates: unresolved until independently verified

1. **Explicit user release.** No run, gateway deployment, paid compatibility
   probe or image build is authorized by this preparation request. Keep live
   disabled until the user separately authorizes execution and its budget.
2. **Cumulative budget.** The controller's minimum infrastructure admission
   reserve for 100 workers is USD31, before prior allocations. This is an
   admission reserve, not an invoice or total cost estimate. The old USD7
   cumulative infrastructure policy cannot admit the cohort. Confirm the actual
   remaining ledger allocations and approve a bounded incremental allowance;
   perform a supported explicit migration, preserving every prior allocation.
   Do not delete, replace, refund, reset or silently migrate either ledger.
   The model allowance must cover the selected 100-task reservation; the gateway
   per-run ceiling is USD180, not a new authorized allowance.
   The read-only local ledger snapshot during preparation contains USD18 model
   and USD6.70 infrastructure allocations. The old profile therefore has no
   unallocated model allowance and only USD0.30 infrastructure allowance. Its
   legacy schema has no `budget_policy` table. Those allocations were preserved;
   the controller now supplies an [explicit, offline migration workflow](https://github.com/slgarza/swarm-control/blob/main/docs/BUDGET_MIGRATION.md).
   Its inspection/proposal commands are read-only; applying a larger allowance
   requires separate actual owner authorization and preserves all allocations.
   No migration has been applied for this preparation. For admission alone, the infrastructure cumulative ceiling would
   need at least USD37.70 for this cohort, before additional setup/probes. This
   arithmetic is a proposal for review, not approval, remaining-provider credit,
   actual cost or an instruction to alter the ledger manually.
3. **Provider capacity.** Verify 100 simultaneous VMs and the model's applicable
   request/token limits. Verify that the actual deployed trusted gateway admits
   100 simultaneous upstream calls; a configured value and offline tests are
   not live quota evidence. Deployment itself waits for authorized execution.
4. **Frozen source and admission.** Pin a clean, pushed commit containing both
   contract hashes and all 100 real open issue links. Recheck baseline CI, issue
   state, no existing B PRs, and the complete 100-task local plan. Freeze that
   commit and workload definitions for both benchmark pipelines.
5. **Product and integration acceptance.** Review the canonical rule edge
   decisions and G0/G1/G2 gates with the owner. B leaf scope avoids unresolved
   cases; it does not clear the full-game gate. Name independent acceptance and
   repair owners. Review credentialed GitHub integration separately from
   uncredentialed workers. The existing integrator is assisted and serial;
   do not claim an autonomous high-throughput merge queue.
6. **Benchmark protocol.** Freeze full delivery clock, PR granularity, quality
   window, allowed resources, cost allocation and the strong AFK configuration.
   Keep AFK results unknown until it actually runs from the same base/backlog.

During execution retain unique task/session/VM identities, barrier release and
command/model timestamps, patch/check/review/merge evidence, all failed attempts,
repairs, interventions and cleanup. Report seconds with at least 100 observed
contributors and their actual accepted work; idle VMs and requested capacity do
not count. Follow [SWARM_BENCHMARK.md](SWARM_BENCHMARK.md). Billing reconciliation
is required for dollar rates; reservations are never substituted for invoices.

## Integration after the parallel coding phase

The integration owner must validate each reviewed patch on the current combined
base and retain worker/applied diff hashes. Group acceptance by compatible module
contracts; do not open 100 credentialed operations in worker containers. Enforce
the exact-head CI gate and preserve the full integration tail in the clock.

After leaf delivery, separately scope these dependent changes: engine phase
composition/replay, verified authority/storage adapters, public/private protocol
adapters, UI module exports/routing, the real App + Solo wiring, and independent
end-to-end acceptance. Those followups must reference actual merged modules and
receive their own measured attempts. No followup is implicitly delivered by a
green leaf-module PR or counted twice under its old A issue.
