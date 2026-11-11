# Pilot 100 operator recovery methods

This is public export v2 of the operator glue used after all 100 original
workers ended `needs_repair`. It exposes the assisted review/integration algorithm;
it is separate from the unchanged worker/controller runtime at
`979026cbb0d405623c30cdbf4bcf0c9e937bcf01`, and is not a new controller release or
production API. Original failed reports and patches remain private and unchanged.

`source-provenance.json` records each actual runtime file SHA256, exported source
SHA256, capture time, v1 parameterized-source hashes and v2 published-source
hashes. Private v1 changed paths plus the test import adapter only; reversing
those edits reproduced every runtime byte at capture. V2 additionally applies
Ruff formatting, safe import cleanup/UTC alias modernization and narrowly
explained lint annotations. Published bytes therefore differ from runtime bytes.
Host path fragments are represented by their hashes, without publishing operator
home directories.
No run state, original reports, patches, raw logs, credentials, credential hashes,
account financial records or application source is included.

| File | Actual responsibility |
| --- | --- |
| `recover-reviewed-phase.py` | `plan/prepare/publish/merge` for unchanged nonempty failed-worker patches with original helper checks passing; bind original report/patch and new independent review; copy originals unchanged; verify frozen tasks/contracts, ownership and direct application; recheck durable policy, candidate and cutoff before writes. |
| `repair-reviewed-phase.py` | Explicit coordinator code/test repair with separate original, repaired and coordinator-delta hashes, new independent repaired review, current-base full validation and truthful assisted-recovery PR attribution. |
| `recover-reviewed-queue.py` | Serialize approved unchanged/repaired attempts, preserve quality-corrective history, wait for exact-head CI, verify actual merged tree and observe combined CI; uncertain merges pause for read-only reconciliation. |

Both lanes use the pinned controller integrator and its local integration lock,
base/head/tree/ownership/secret/CI checks. The selected profile must have
`[budget] live_enabled = false` and match the existing durable cumulative policy;
recovery does not authorize new model work, migrate budgets or refund reservations.
Original worker outcomes are never changed to validated or merged by these lanes.
An accepted recovery is separately attributed; PR count alone is not proof of
feature acceptance or a completed 24-hour quality window.

## Disclosed export changes

The v1 baseline parameterized operator paths and adapted one offline test import:

- `SWARM_RECOVERY_RUN`: private evidence/run directory, replacing script-parent
  inference. Queue phase scripts remain located inside that configured directory,
  preserving the actual operator layout.
- `SWARM_RECOVERY_TARGET_ROOT`: target checkout used for GitHub GET operations.
- `SWARM_RECOVERY_CONTROLLER_ROOT`: installed controller checkout; its `.venv`
  supplies Python and the unchanged lane checks its exact pinned Git revision.
- `SWARM_RECOVERY_PROFILE`: existing target TOML profile, with execution disabled
  and the unchanged cumulative policy. The profile determines the target Git root.

The unchanged phase consumes RUN/controller/profile; the repair phase consumes
RUN/profile; the queue consumes all four. Values are required environment inputs,
with no host defaults. For example, an operator may supply paths relative to their
own checkout; setting them supplies locations, not execution authorization.
The test-only import adapter uses the test directory temporarily instead of a
real private run. V2 then sorts imports, removes unused `sys`/`timezone` imports,
uses the equivalent `datetime.UTC` singleton and applies Ruff formatting. Eleven
line-scoped `noqa` comments retain the exact original broad exception boundaries,
unused unpacking, implicit `check=False`, generator expression and fixture AST
execution; their reasons are written beside the code and in provenance. They do
not disable checks globally. All six Python sources have exact body AST equality
with v1 after ignoring import nodes and normalizing `timezone.utc` to `UTC`. No
admission, accounting, review, CI or merge algorithm changed.

## Offline checks

Use Python 3.12 with the pinned controller and its existing development dependencies
installed. From this directory, these tests use temporary synthetic fixtures and
mock external operations; they create no genuine approvals or paid resources:

```sh
python test-recovery-queue.py
python test-repair-generic.py
python test-recover-reviewed-phase.py
python -m py_compile recover-reviewed-queue.py recover-reviewed-phase.py repair-reviewed-phase.py
ruff check --isolated .
```

At snapshot validation, 33 queue guards, 18 repaired-phase guards and 9 unchanged-
phase unittest methods passed. Counts describe offline guard coverage, not real
feature deliveries. The two AST-based guard suites also write synthetic validation
receipts beside their test scripts; those generated receipts are not part of this
source package. Full Ruff and compilation pass for v2. The parameterization-only
v1 preserved the original 23 lint findings; its private baseline and hashes are
retained. The published v2 deviations are disclosed rather than described as
byte-identical to the runtime.

## Limits that remain visible

Recovery depends on trusted independent semantic review. The repaired lane binds
the reviewed complete patch and delta hashes but does not reconstruct the delta
into the repaired patch itself; a metadata summary is insufficient review. It also
does not independently require a nonempty original patch, so such an input requires
explicit coordinator attribution rather than original-worker delivery credit.
The current CSS/test repair inputs had nonempty original patches.

The queue prefers an unchanged approval when both lanes have approvals, so revoked
unchanged approvals must remain revoked for code-repair tasks. Completed-review
markers are coordinator evidence, not cryptographic attestations. The shared lock
covers this checkout's worktrees, not another host/clone or an external main writer;
a race with an external writer can only be detected after an irreversible merge
by the merged-tree check. Uncertain outcomes pause and must not be blindly retried.
Costs remain unreconciled unless supported by separate provider evidence. Original
worker failures and coordinator repairs remain part of the full delivery clock.
