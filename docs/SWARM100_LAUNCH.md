# B001–B100 deployment release packet

This packet prepares one synchronized, unpaired scale pilot on Afterimage. It
does not authorize deployment, builds, compatibility probes, a budget increase or
workers. The retained profile has `live_enabled=false`; the machine-readable
[release packet](../swarm/deployment100.json) has `launchPermitted=false`.
Notify the owner before any 100-worker dispatch. The owner supplied a USD200
planning ceiling; that answer does not authorize spending or release the earlier
no-run instruction.

The workload is the exact B001–B100 inventory in
[parallel100.json](../swarm/parallel100.json), with 100 existing issue links and
100 distinct owned modules. It comprises 50 controlled UI modules, 20 engine
modules, 20 protocol modules and 10 client policies: 97 product-module candidates
and three supporting tasks. These are proposed deliveries, not implemented
screens or an integrated game. Follow the frozen
[UI](PILOT100_UI_CONTRACTS.md) and [domain](PILOT100_DOMAIN_CONTRACTS.md) contracts,
[acceptance policy](SWARM100_ACCEPTANCE.md), [preparation guide](PILOT100_READY.md)
and [benchmark policy](SWARM_BENCHMARK.md).

## Immutable inputs and source of truth

The release packet pins target source commit
`79404fe6d4ed5cf1b59b5610a3aebbe9d1f8021f` and records the exact controller
execution revision in `source.controllerCommit`. Initial preparation used
`3e95f30a3f4ad196f76edcd8c8cdf894d3ebd0a5`; the proposed paced/long-session
runtime requires a reviewed, tested controller revision and a refreshed execution
pin before live release. The target source is the existing
pushed implementation/contract base; this later documentation packet is an
external release record and does not add code to that base. Keep the source pin
when publishing the packet. A controller revision or source change requires a
new reviewed packet rather than quietly replacing a pin during dispatch.

Each task's original file bytes, issue number, feature/support classification,
the manifest, design manifest, frozen contracts, current profile and benchmark
policy have SHA256 bindings in the JSON. The workload-definition digest excludes
issue-publication bookkeeping, as defined in `tools/prepare-parallel100.mjs`;
the individual file digests include it. Source design file hashes are additionally
listed in `docs/design/SOURCE-MANIFEST.json`. The JSON is a release description,
not a supported `swarm-control` execution profile or a program that starts agents.

The target repository supplies workload/settings; the controller supplies the
execution, gateway, durable admission and integration implementation. The
original common-checkout `.swarm/control.sqlite3` supplies cumulative allocations.
Provider evidence supplies applicable quotas and charges. A local setting or
this document cannot establish a provider quota, credit balance or approval.

Do not dispatch broad A-series tasks overlapping the B manifest. Their exact
consumed scope is preserved in each B task's `replacesScopeFrom`; the reserved
A inventory is in the cohort manifest. Replan remaining A scope after delivery.

## Stage 1 — repeat read-only/local preflight

Record a new unique private preparation attempt before checks. Retain start/end,
monotonic durations, failures, versions, source/command hashes and unknowns under
the ignored `.swarm/` directory. Never publish raw logs, credentials or account
data. Existing preparation evidence remains intact.

Use the installed controller environment; its executable need not be on the
interactive shell's PATH. These commands create no provider resources or model
calls. The benchmark writes a new private local receipt and local build outputs.

```sh
# From the Afterimage checkout; change this path to the installed controller.
SWARM_CONTROLLER_DIR=/path/to/swarm-control
"$SWARM_CONTROLLER_DIR/.venv/bin/swarm-control" budget status --project swarm.toml --json
node tools/prepare-parallel100.mjs --require-issues
node tools/validate-deployment100.mjs --controller "$SWARM_CONTROLLER_DIR" --json
node tools/benchmark-pilot.mjs --profile full
SWARM_CONTROLLER_BIN="$SWARM_CONTROLLER_DIR/.venv/bin/swarm-control" python3 - <<'PY'
import json, os, subprocess
from pathlib import Path
release = json.loads(Path('swarm/deployment100.json').read_text())
subprocess.run([os.environ['SWARM_CONTROLLER_BIN'], 'plan', *release['taskIds'],
                '--project', 'swarm.toml', '--workers', '100', '--synchronized',
                '--timeout', str(release['runtime']['agentTimeoutSeconds']),
                '--base', release['source']['targetBaseSha']],
               check=True)
PY
```

Verify the packet's bytes against its pinned Git objects, check both repositories
are clean/pushed, and inspect current baseline CI on the pinned target base.
Read GitHub to confirm the exact 100 B issues remain open and no B work is already
claimed, implemented or published. Record the read time; old issue snapshots do
not establish current state. A changed issue/base requires reviewed replanning,
not an automatic replacement task. Check no other controller/clone is dispatching
or merging: locks cover one shared checkout, not multiple hosts/clones.

`plan` is offline and makes no reservation. It should report 100 locally eligible
tasks, configured worker/gateway caps of 100 and unverified launch readiness.
Static preparation success clears only the local workload gate.

Run the controller's read-only `preflight` against the isolated checkout at the
frozen worker base, using its disabled root preparation profile. The publication
checkout can advance when this operational packet is merged; preflight requires
the inspected checkout's HEAD to equal the selected worker base. Worktrees share
the original common-checkout ledger. Do not create a new ledger to clear a gate.
Pass the exact B task IDs, `--workers 100 --synchronized --timeout 1800`,
`--model-budget 145` and `--base` from the packet; `--online` permits GitHub GETs.
A successful source exit can coexist with insufficient retained allowance and
`launch_ready=false`. Keep the resulting report private.

## Stage 2 — owner authorization and cumulative policy

Start financial discussion from `budget status`. Local retained allocations are
admission reservations, not provider invoices. The prepared profile retains the
old cumulative USD18 model / USD7 infrastructure policy. Previously retained
allocations must remain accounted for; refresh their actual values locally rather
than resetting a ledger or deriving available credit from an account screenshot.
Provider credit and this cohort's actual billed cost are unknown.

The controller's 100-worker infrastructure admission reserve is USD31
(`1 + 100 × 0.30`), before existing allocations, authorized setup/probes or repair.
It is an admission amount, not a quoted invoice or proof that USD31 will be spent.
The owner's question about a USD200 maximum is a **planning constraint**, not
authorization. The revised candidate fits that total new-spend envelope:

| Proposed reservation/envelope | USD |
| --- | ---: |
| Cohort model allowance, USD1.45 per task | 145.00 |
| Cohort infrastructure admission reserve | 31.00 |
| One compatibility probe: model + infrastructure | 1.85 |
| Subtotal | 177.85 |
| Uncommitted remainder for bounded setup/builds, CI and explicitly scoped repair | 22.15 |
| Total new-spend planning ceiling | 200.00 |

These are unapproved reservation/envelope amounts, not a token forecast, invoice
or assurance that the remainder will suffice. The new model envelope is USD150
and infrastructure envelope USD50; after the cohort and one probe, their separate
remaining allowances would be USD4.50 model and USD17.65 infrastructure. Do not
shift between these envelopes without specific approval. With the retained USD18 model and
USD6.70 infrastructure allocations, their **draft cumulative** ceilings would be
USD168 / USD56.70, leaving USD200 in new local allowance. These historical
allocations are included once; they are not new spend or provider bills. Refresh
the ledger before any actual proposal: changed allocations invalidate this
arithmetic. The tracked USD18 / USD7 policy remains unchanged, with no migration.

The USD180 gateway per-run model ceiling is a software ceiling, not permission
to spend it. The older USD170 model candidate is superseded. No USD200 or USD250
spend has been approved here. No automatic retry or refill may consume the
remainder; every later action must fit the actual agreed envelope and scope.

Obtain an actual owner decision covering the incremental model and infrastructure
ceilings, setup/build/probe scope, any repair allowance, deadline and total
maximum. Preserve the private confirmation and bind its digest to a unique
release/authorization ID. If a reserve proposal exceeds that ceiling, revise the
plan or stop; do not invent an approval or silently raise it. Reconcile provider
account status independently. A provider-spend observation does not replenish
local policy or establish remaining credit.

An ignored root-level preparation profile may be copied from the original with
live disabled and the old limits intact. This local preparation may include the
proposed pacing settings and a read-only migration proposal; it authorizes no
spend. Freeze the migration plan against that exact root profile, then obtain
actual owner authorization before applying any increase.
Use the controller's
[budget migration workflow](https://github.com/slgarza/swarm-control/blob/main/docs/BUDGET_MIGRATION.md).
Its `budget inspect`/`budget plan` are read-only; `budget apply` is a distinct
offline mutation requiring the actual owner's separate bound authorization.
Include every retained allocation plus the approved future reservations in the
cumulative proposal. Preserve the original ledger and gateway ledger identifier.
After authorized application, update the authorized runtime profile's two limits
to the approved stored policy, with live still disabled, and retain before/after
hashes. Review this exact profile and its migration binding before applying: a
profile change invalidates a migration plan frozen against earlier bytes. The
packet's original prepared-profile hash stays historical.
Never copy runtime accounting, authorization or account observations into Git.

## Stage 3 — authorized deployment and capacity proof

Only after the owner authorizes the bounded setup stage, record a distinct
private release/profile with the exact changed limits and explicit live release.
The controller requires a profile directly at the target checkout root. Use an
ignored root-level `swarm.launch.toml`, adding it to the checkout's private
`.git/info/exclude` before creation, or a separately managed trusted target
checkout. A nested `.swarm/` profile is unsupported. Bind the reviewed root profile
and original common-checkout ledger to the authorization/migration evidence.
A disabled private preparation profile was created in an isolated worktree at
the frozen source commit, sharing the original common-checkout ledger. It adds
the proposed pacing settings and retains the original USD18 / USD7 policy.
No runtime profile has been enabled or budget migration applied.
Preserve app, environment, secret and ledger identities from `swarm.toml`; keep
real OpenAI/GitHub/administrative keys outside task and worker environments.
Keep the version-controlled preparation profile disabled; after migration its
old limits are historical and cannot be used for live admission against a new
stored policy. Use the reviewed root runtime profile for every admitted operation.
Do not substitute a new empty ledger.

Verify actual Modal access and account quota for 100 simultaneous sandboxes at
the configured request of 0.5 CPU / 512 MiB per worker (50 CPUs / 50 GiB total)
and maximum 2 CPU / 2048 MiB per worker (up to 200 CPUs / 200 GiB), plus
gateway/setup overhead. At least 101 simultaneous containers are needed for 100
workers plus one gateway; administrative helpers can raise the peak to 102 or
more. Verify the selected model/project's applicable request
and token limits from current authoritative account evidence against the proposed
100-worker token/request profile; 100 configured
gateway slots do not guarantee 100 provider admissions or useful work. A list
of existing apps or secrets proves access only, not capacity or secret validity.
The owner subsequently reported a paid-tier upgrade. The published Team plan's
5,000-container allowance provides nominal headroom, subject to activation and
applicable workspace sandbox/functions quota. Preserve the actual account
confirmation privately; published plan capacity alone is not a live-capacity
test. See [Modal pricing](https://modal.com/pricing). Account subscription charges
need their own declared setup/full/amortized cost allocation; they do not change
the USD200 incremental proposal or establish a remaining credit balance.
The current supplied model limit is 1,000,000 tokens/minute and 5,000
requests/minute. The candidate trusted gateway paces this cohort to 800,000
tokens/minute and 4,000 requests/minute, leaving 20% headroom. Bind the current
account/model evidence and pacing configuration in the release and verify other
traffic does not consume that headroom. The separately displayed 1.35M-token
**batch queue** limit is not evidence of an interactive daily token cap. Do not
apply it as interactive TPD without authoritative confirmation. Historical model
headers and a monthly spend reference do not establish current quotas or credit.

Deploy the exact trusted gateway application only within that setup release.
Match its HTTPS origin, environment, app and persistent ledger to the target.
Verify the deployed gateway's authenticated capacity advertises 100, rather than
assuming its previous deployment matches the newly configured value. Complete
one explicitly authorized compatibility probe and retain its limits/outcome.
The existing fixed probe reserves USD0.50 model / USD1.35 infrastructure; count
every attempt even when it fails. Image/setup builds can incur separate charges.
Do not run an unapproved capacity stress test or treat a one-agent probe as proof
of useful 100-agent overlap. Actual scale evidence can come only from the cohort.

The unchanged controller default remains a 300-second coding session. The revised
candidate explicitly requests 1,800 seconds for each coding session, a 2,700-second
worker lifecycle and 2,700-second gateway run TTL, within a proposed 3,600-second
TTL ceiling. It requires the new reviewed controller implementation; a historical
300-second-only execution pin cannot admit it. Preparation/final-check subprocesses
remain separately bounded at 240 seconds and the synchronized preparation barrier
remains 300 seconds, aborting the batch if a participant fails preparation. The
candidate gateway HTTP handler timeout is 900 seconds and worker model stream
idle timeout is 900 seconds to accommodate a **combined** bounded
pacing wait up to 300 seconds across count and inference, plus provider handling.
Do not permit two independent 300-second queues. The shared deadline also includes
the count request's elapsed time. Verify the effective settings,
expiry and cancellation behavior in the authorized compatibility stage.

Pacing trades latency/compute occupancy for compliance with a shared model quota.
All 100 real task-owning agents run; they may wait for their own model requests.
Do not create idle placeholder agents to claim scale. The earlier ten-agent pilot
observed about 1.815M input tokens; multiplying by ten gives an illustrative
18.15M input tokens, requiring at least 18.15 minutes at 1M TPM before output,
other calls or overhead (about 22.69 minutes at 800k TPM). These are different
tasks, so this arithmetic is not a forecast or proof of sufficiency. A 30-minute
session can still time out, and a longer session is not acceptance or an automatic
budget increase. Preserve queue waits and failures in the measurements.
These limits do not bound the later review/integration/CI tail; approve a
full-delivery deadline separately.

Local admission reserves money before the runner authenticates the remote
gateway capacity. An admission failure can therefore retain allocations. Inspect
quota/configuration before invoking `run`, and preserve all failed attempts;
failures do not automatically release or replenish allowance.

## Stage 4 — notify, then explicitly release exactly 100

Before dispatch, send the owner a concrete readiness notice: release/base/task
digests, approved ceilings, current quota/gateway evidence timestamps, probe
outcome, responsible reviewers, deadline and remaining gaps. Obtain the actual
100-worker release if the prior authorization covered setup only. Elapsed time
after a notice is not consent. Do not launch with a missing gate or an unapproved
changed scope. The current packet records every live gate as pending.

Freeze the private protocol and acceptance policy; the proposed 24-hour quality
window and one-B-task-per-PR granularity in the acceptance document need explicit
agreement before execution. A technical scale pilot may proceed without an AFK
product only when labeled **unpaired scale pilot**; its result cannot establish
the competition's efficiency requirement.

Resolve the exact 100 task IDs from this packet, using its pinned source base,
100 workers, synchronized start, the explicitly reviewed 1,800-second candidate
session/pacing settings, `gpt-6.1-sol`, a reviewed total model reservation
within the approved remaining allowance, and the verified gateway origin. Do
not scan all open issues, add A tasks, enable overlap, invoke retries or substitute
tasks. Record UTC workload-release `T0` before dispatch/admission/environment
startup. Preserve the resulting batch path and all per-task identities. Only one
controller host dispatches; the workers receive no real provider/GitHub key.

Observe 100 distinct contributors through sandbox/session identity, barrier
release, actual command/model events and accepted patch work. Report peak and
sustained overlap, measured seconds at or above 100 and observation gaps. A
requested cohort size, idle sandbox count or wide first-to-last event span is
insufficient. Preserve gateway throttles, budget stops, timeouts and failed checks.

## Stage 5 — independent acceptance, assisted integration and repair

The trusted Codex coordinator operates the controller, privately inspects artifacts
and performs credentialed integration. A separate review agent reviews each task
it did not implement against the frozen acceptance contract; the owner resolves
product decisions and approves exceptions. Confirm those actual review identities
and availability in the private release. Review agents receive sanitized source
and patches, without GitHub/provider credentials. Worker self-tests alone do not
constitute independent acceptance. See [the acceptance policy](SWARM100_ACCEPTANCE.md).

For each artifact, preserve worker/apply patch digests, handoff, ownership check,
baseline/current base, combined checks and independent acceptance. Use the
controller's explicit integration plan → prepare → reviewed publish → green
exact-head merge sequence. One credentialed integrator owns the merge lane.
Revalidate a changed combined base; never force a stale candidate through. Full
patch review and PR/CI operations remain assisted and serial. Include that tail,
all queueing and coordinator judgment in the full clock and intervention ledger.

Assign conflicts/failed semantics a new attributed repair attempt; retain the
failed original and do not auto-retry, refund, refill budgets or launch extra
agents. Repair must fit the preapproved scope/allowance or wait for a specific
new owner authorization. Review original and applied diffs for adapted patches.
An unmerged or unaccepted patch is not a delivery.

## Stage 6 — quality, billing, cleanup and public visibility

Keep the clock running through the last accepted merge and required combined
green checks, or stop at the declared deadline, including failures and repair.
Observe every merge for the agreed quality window, preserving defects, repairs
and reverts. A late failure changes the accepted outcome; do not hide it in a
separate best-case run. Record post-window cutoffs explicitly.

Terminate all cohort sandboxes, close the run's gateway authority, verify no
unexpected live resources remain and stop the gateway app when no other approved
work needs it. Record cleanup failures and continuing cost. Retain originals
under ignored `.swarm/`; publish only reviewed aggregates and source/issue/PR/CI
links in the public swarm evidence index after root review.

Reconcile model, workers/gateway, builds, storage, networking, CI, failures and
repair from actual attributable evidence. Report gross and contest-eligible
cost, credits and explicitly confirmed token exemptions separately. Unknown
billing keeps dollar rates null; admission reserves and aggregate dashboard
spend never replace invoices or attributed cost. Preserve a setup-inclusive view.

Report module deliveries and supporting work separately from later engine
composition, verified authority/storage, protocol adapters, UI exports/routing,
App/Solo wiring and E2E delivery. This cohort does not clear those later gates or
complete the visible app. Do not count both an A parent and the same B work.

For the competition, additionally freeze an organizer-approved strong AFK
configuration, matched source/backlog/acceptance/PR policy, resource and cost
allocation, independent copies and paired repetition protocol. Its configuration,
run and efficiency result are still unknown. This packet prepares the scale
experiment; winning readiness and live collision-repair proof remain unverified.
