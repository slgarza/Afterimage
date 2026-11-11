# B001–B100 acceptance and measurement candidate

This policy describes acceptance for the prepared unpaired module scale pilot.
It supplements the immutable task-specific acceptance and
[benchmark policy](SWARM_BENCHMARK.md); it grants no deployment, execution,
budget or product-decision approval. Its proposed PR granularity, full-delivery
deadline and 24-hour quality window require owner agreement in a private frozen
release before workers start. The [launch packet](SWARM100_LAUNCH.md) records the
remaining gates. No acceptance has occurred for B001–B100.

## Input and unit of work

Accept only the exact 100 B task objects pinned by
[`deployment100.json`](../swarm/deployment100.json), using their original
ownership, prompt, canonical source references, acceptance and frozen export
contracts. Fifty tasks implement controlled React views; fifty implement pure
domain/client policies. New dependencies, App/shared-barrel edits, future-module
imports, contract/task metadata edits or another worker's files are out of scope.
Unspecified rule cases retain the contract's explicit `decision-required` result.
Missing assets/provider/native services remain honestly unavailable.

The proposed granularity is **one B task per PR**, at most one accepted delivery
credit for that task across retries, repairs and replacement PRs. Preserve all
attempts/PRs but count the accepted final task once. B077, B090 and B094 are
supporting tasks and remain supporting work even when merged. Report both the
total accepted merged-green B PRs (up to 100) and the product-module subtotal
(up to 97), with supporting PRs separate. Headline product-delivery efficiency
uses that subtotal; it does not call isolated modules integrated game features.
Include the full cohort's cost and tail in its denominator. This proposed metric
policy must be frozen equally for any later AFK comparison; do not change it after
seeing results or claim it is already organizer approved.

Every B task reserves explicit scope from older A tasks. Review the
`replacesScopeFrom` mapping; exclude duplicated parent/leaf implementation from
aggregate feature claims. Follow-on adapters/App integration have separate scope,
acceptance and measured attempts, without recounting the module implementation.

## Responsibility and independence

| Role | Responsibility | Credentials and evidence |
| --- | --- | --- |
| Owner, Sergio | Approves concrete release/budget, acceptance protocol and unresolved product decisions | Actual private approval; never inferred from this document |
| Trusted Codex coordinator | Runs controller, schedules separate review, retains evidence, handles assisted repairs and credentialed integration | GitHub/provider authority remains outside workers; record each intervention |
| Separate review agent | Reviews a task it did not implement; checks semantics, tests, ownership, privacy and frozen exports on the candidate | Sanitized patch/source only; actual reviewer/session identity and receipt required |
| Coding worker | Implements one owned B task and returns truthful handoff and observed validation | Bounded gateway authority; no GitHub/provider/admin key; no self-acceptance |
| One trusted integrator | Validates combined current base, publishes reviewed PR, waits for exact-head checks and merges | May be the coordinator; explicitly assisted, serial workflow |

The independent reviewer must differ from the implementer for every task. If the
coordinator repaired it, another review agent reviews that repair. Review capacity
does not add to the claim of 100 coding contributors. Record the actual identities
and any availability gap before release; a proposed role is not a completed
independent review or a preauthorized paid review agent.

## Required acceptance for every task

1. Bind the task/session/sandbox/base and original patch digest to the handoff.
   Inspect actual changed paths and reject ownership escape, hidden metadata
   changes, committed secrets, missing recovery or fabricated successful checks.
   Retain all failures and missing evidence as explicit gaps.
2. Read the task's exact canonical sources and contract section, then inspect
   behavior and exports rather than relying on test counts. Verify all specified
   acceptance cases and meaningful adversarial inputs. A constant stub, empty
   component, tests without implementation or skipped failing cases is rejected.
   Reviewer observations must be attributable, reproducible and independently
   recorded. Preserve any added acceptance fixtures privately or in a separately
   scoped review change; do not silently modify another task.
3. For UI, exercise supplied/changed controlled props, semantic callbacks,
   busy/error/empty/unavailable states, keyboard/accessible labels and applicable
   reduced motion. Recipient-private data must stay out of hidden DOM, ARIA,
   data attributes and logs when access is denied. Local views cannot claim
   authority, store success, global modal ownership or complete App integration.
4. For engine/protocol/client policies, check exact readonly structural API,
   detached/nonmutating outputs, canonical input bounds, deterministic replay
   where applicable, malformed/stale/forbidden cases and explicit unknown rule
   decisions. Decoder boundaries must not invoke caller getters/conversion or
   leak secrets. Trusted verifier input is not cryptographic/provider verification.
5. Preserve actual scoped lint/typecheck/meaningful-test outcomes and the worker's
   full benchmark receipt. Independently run configured combined checks during
   integration on the current target base; worker reports alone do not establish
   the combined result. Retain the original/applied patch hashes and tested
   base/tree/head. Reject semantic or integration failures even with green tests.
6. Review the actual applied candidate, publish a single-purpose PR, verify all
   required checks on its exact reviewed head, merge into designated `main`, and
   record actual merge SHA/time plus combined-result checks. A stale base needs
   a new validated attempt. Only after review, merge and green evidence can a
   candidate enter the delivery count, subject to the quality window below.

Pure views/policies are acceptable *module* work under their frozen contracts.
They do not require Firebase, store credentials, approved art or a completed match
reducer, and they must not fabricate those dependencies. The later integration
acceptance must demonstrate real consumers, authority boundaries and an App/Solo
journey before reporting a playable application. Do not rename module acceptance
as a full-game gate pass.

## Repair and failure handling

Classify every task as queued, prepared, working, checked, failed, needs-repair,
reviewed, published, merged-green, rejected or reverted from actual evidence.
Preserve chronology rather than overwriting a failed attempt with its successor.
Record acceptance unknown when evidence is absent; absence of a failure log is
not success. A worker command timeout or recovered patch is not automatically a
delivery.

No automatic retry, new worker, budget refill, allocation refund or ledger reset
is permitted. Assign an attributed repair only within its actual prior approved
scope/allowance, or wait for new specific approval. Record queue/CI delays,
coordinator/human/model interventions, conflict resolution and the repair's own
time/cost. A clean three-way application requires both original and applied diff
review. Record all attempted tasks, including those that remain unmerged.

## Clock, quality and overlap

The proposed primary clock starts at UTC `T0`, the actual workload release before
dispatch/admission/startup, and ends at UTC `T1`, after the final accepted cohort
merge and required combined green checks, or at a preapproved full-delivery
deadline. Its duration includes setup inside dispatch, all workers, failures,
queues, retries/repair, assisted review, GitHub/CI and the full integration tail.
Do not restart it at first useful worker activity or stop after coding. The
deadline is currently unset; its approval is a live-release gate, separate from
the revised candidate's explicit 1,800-second coding session. The default remains
300 seconds unless an authorized runtime profile and compatible reviewed
controller deliberately select the longer limit. Include model pacing waits,
quota failures and their compute occupancy in the clock and cost.

The candidate quality window is 86,400 seconds after **each actual merge**, with
checks/defects/reverts observed through at least the final merge's window end.
Quality observation is reported separately from primary delivery elapsed time;
its attributable service and repair costs still belong in reconciled totals.
Report provisional delivery until the agreed window closes. Remove rejected or
reverted items from final accepted counts and retain the failure/revert history;
publish later discovered defects with their discovery cutoff. Missing observation
or acceptance receipts leave the item's final acceptance unknown.

Preserve aware UTC timestamp source/precision, monotonic elapsed measurements,
barrier release, unique identities and actual command/model activity. Report peak
and sustained overlap and seconds at or above 100 observed contributors separately
from number of sandboxes and accepted deliveries. First-to-last event spans can
contain idle gaps; disclose observation gaps. Require all 100 identities to show
actual assigned-task activity and attributable patch work for a claim of 100
useful contributors; rejected/failed work and its limits remain visible. This
disjoint-ownership workload cannot prove live same-file collision repair.
The paced candidate proposes 800,000 TPM / 4,000 RPM below the supplied current
1,000,000 TPM / 5,000 RPM limits. All 100 participants must perform real assigned
work; waiting for model capacity does not establish useful simultaneous model
activity. Report active command/model events, queue waits and attributed accepted
work separately, without counting idle placeholder containers. A batch-queue token
limit does not establish an interactive daily token limit.

## Dollars and comparison

For accepted product-module PRs `D`, complete primary duration `T` in seconds
and actual reconciled eligible cohort cost `C` in USD, report `D × 3600 / T`
and `D / C`. Also publish the total accepted merged-green PR rate and the support
subtotal so readers can assess granularity. Unknown `T` or `C` produces a null
rate; zero eligible cost produces an undefined dollar rate rather than infinity.
No 100-agent rate or billed-cost efficiency has been measured yet.

The revised USD200 total new-spend envelope is a planning proposal, not approval.
Its candidate reservations are USD145 model, USD31 infrastructure and USD1.85
for one probe, leaving USD22.15 for bounded setup/CI/repair. It neither predicts
actual billed cost nor authorizes retries, refills, resource creation or a ledger
migration. Unknown cost stays unknown even when a reservation fits the envelope.

Collect actual gross/billed usage for model, workers, gateway, image builds,
storage, network, CI and every failure, intervention and repair. Freeze consistent
setup/full/amortized allocation rules before any comparison and publish a
setup-inclusive view. Document actual credits/exemptions with their confirmation;
calling an internal or OpenAI model alone does not qualify its charges as exempt.
Admission reservations, gateway estimates and organization-wide dashboard spend
cannot supply `C`. Keep original receipts and account detail private; publish only
reviewed aggregates, immutable source/PR/check links and sanitized evidence hashes.

This pilot is currently unpaired. A contest claim additionally requires the
strong organizer-approved AFK configuration, independently frozen identical
source/task objects, acceptance/PR policy, clock/window, allowed tools/data,
resources/CI and cost treatment, independent solution-free copies and recorded
paired repetitions where feasible. Configuration and results remain unknown;
passing the scale pilot or supplying a matching protocol hash proves neither
baseline execution nor a win in merged-green PRs/hour and PRs/dollar.
