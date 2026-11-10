# Modal worker pilot (S01)

S01 owns only `tools/swarm/`: implement one bounded cloud-worker cycle and its
evidence. Gameplay contracts and existing P03 work are outside this ticket.

## What is implemented

One ticket runs in one Modal VM Sandbox, using a pinned Node 24/npm 11/Codex
image. The runner checks out an exact Git commit, installs the committed lockfile,
starts a real `codex exec --json` process, runs the repository checks, downloads
the patch and evidence, and terminates the Sandbox. The model is explicit.

The trusted helper never receives API credentials. The named Modal secret
`afterimage-openai` supplies `CODEX_API_KEY` only to the Codex process; its shell
environment excludes that key. No GitHub or local ChatGPT credentials are sent
to Modal. This is a controlled pilot over reviewed repository code, not a
credential isolation guarantee against adversarial agent code. Harden the model
boundary with a credential proxy before accepting untrusted tasks at scale.

The integrator alone reviews, commits, pushes, opens PRs and merges. A runner
result of `validated` means local worker checks passed, not that a PR merged.
CI and independent review still gate delivery. `smoke_passed` is infrastructure
evidence and is never counted as an agent's delivered feature.

## Setup and first run

Install `modal==1.6.3` in a Python 3.12 virtual environment. Authenticate Modal
with `modal token set` or `modal setup`. In the commands below, use that
environment's `python`.

```sh
python tools/swarm/setup_openai.py
git fetch origin main:refs/remotes/origin/main
python tools/swarm/modal_runner.py plan P06
python tools/swarm/modal_runner.py smoke P06
python tools/swarm/modal_runner.py run P06 --model gpt-6.1-sol --timeout 600
```

Setup prompts for a project OpenAI key without echo and stores it directly in
Modal's `main` environment. It verifies API authentication, not inference quota
or model billing. Use a dedicated API project with an appropriate spend limit.
It does not overwrite an existing secret. If the plugin connection is available,
the OpenAI Developers integration can provide project/API setup instead.

The runner uses the existing `afterimage-swarm-pilot` App; it does not replace
the deployment. Each worker requests 0.5 CPU/512 MiB, capped at 2 CPU/2048 MiB,
with an agent timeout plus 600 seconds for setup/checks/recovery. Image build
time is additional. Worker time/resource bounds are not dollar spend caps.

## Evidence and recovery

Outputs are under ignored `.swarm/modal-runs/batch-*/<ticket>/`:

- `manifest.json`: task, branch and exact base commit.
- `agent.jsonl`: Codex event stream; `report.json` includes event token usage,
  agent start/end times, wall time, Sandbox ID and termination outcome.
- `changes.patch` and `changes.json`: tracked, deleted, binary and new files,
  including partial work after failure, with ownership checks and patch digest.
- `checks.log`, `install.log`, toolchain `versions.json`, process logs and the
  agent's final handoff.

Logs redact OpenAI key-shaped strings. Treat local artifacts as private;
review before publishing. Cost fields remain `null` until reconciled with
provider billing. Wall time is not evidence of continuous productive activity.
No result is recorded as merged by this runner.

If artifact retrieval fails, the report states `needs_recovery` or `failed`;
the Sandbox is still terminated to bound cost. Provider loss can therefore lose
unretrieved work. Durable checkpoints are a later scale requirement. Inspect
`sandbox_terminated` and the Sandbox ID after interrupted runs.

Do not use the older `swarm.mjs release` on a dirty worktree: its forced removal
can delete uncommitted work. Recover/commit a reviewed diff first. This runner
does not invoke that command.

## Parallelism and the path to 100

`--workers N` is a concurrency ceiling (1–100), not an instruction to create
idle containers. Each worker needs a different task. A batch rejects duplicate
tickets, overlapping ownership and unresolved dependencies. A file lock excludes
another dispatcher in the same checkout. This is a single-dispatcher pilot;
other checkouts/machines and the older local CLI must not dispatch concurrently.

```sh
python tools/swarm/modal_runner.py plan P05 P06 --workers 100
python tools/swarm/modal_runner.py run P05 P06 --workers 2 --model gpt-6.1-sol
```

The first command correctly reports at most **two** active agents. Do not use
P03 as fresh work: PR #5 already implements it. P05 overlaps existing bootstrap
work and needs its remaining acceptance scope reviewed before dispatch.

Still required before a qualifying 100-agent run:

1. Enough useful, independently verifiable ready tickets, with explicit specs
   and a dependency graph; reconcile already implemented/bootstrap work first.
2. A durable shared scheduler with atomic claims, expiring leases, heartbeats,
   retries, cancellation and checkpoints. Smaller ownership boundaries must
   still allow legitimate concurrent changes to the same codebase.
3. A verified merged-commit ledger and integration queue that retests combined
   changes, rebases or assigns conflicts to repair, and confirms GitHub CI.
4. API project RPM/TPM capacity and actual Modal account concurrency capacity;
   handle 429s and capacity failures without counting queued agents as working.
5. A comparable AFK baseline on the same initial commit, backlog and acceptance
   tests. Count merged green PRs, feature completion, reverts, intervention and
   full infrastructure/model spend, not scaffolding or PR splitting.
6. Apply the existing 10 → 25 → 50 → 100 gates in `docs/SWARM_PILOT.md`, retaining
   timestamped evidence of at least 100 concurrently productive agents.

## Validation

```sh
python -m unittest discover -s tools/swarm -p 'test_modal_*.py' -v
python -m py_compile tools/swarm/modal_runner.py tools/swarm/modal_worker.py tools/swarm/setup_openai.py
npm run check
```

Verified on 2026-11-10: 12 offline regression tests, scoped Ruff lint, Python
compilation, and the repository's lint/typecheck/tests/build all pass. The live
Modal smoke run against `0670928531e6e84200d09341f489f1ea77a9a684` passed all
repository checks, retrieved its artifacts, and confirmed Sandbox termination.
With the image cached it took 16.687 seconds end to end; this is infrastructure
validation, not a coding-agent throughput benchmark. The environment reported
Node 24.6.0, npm 11.16.0, Codex CLI 0.166.0 and Git 2.39.5.

At this verification point, model execution remained blocked on configuring
`afterimage-openai`. No model-written change or merged PR is claimed by S01.

Coordination note for P09 (root/CI ownership): the existing GitHub workflow runs
the JavaScript workspace checks only. Add the Python regression command to CI
as that ticket's scoped follow-up; S01 runs those tests locally and does not
silently edit the workflow.

References: [Codex automation](https://learn.chatgpt.com/docs/non-interactive-mode),
[Modal Sandboxes](https://modal.com/docs/guide/sandboxes),
[Sandbox resources](https://modal.com/docs/guide/sandbox-resources).
