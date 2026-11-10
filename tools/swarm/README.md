# Local swarm control plane

This is the first safety rail for the Telnyx X Prize pilot. It is deliberately
small: a task file produces one branch, one isolated git worktree, and one
ownership lease. Workers edit only there. The integrator alone validates,
commits, pushes, opens PRs, and merges.

## Commands

Run from the repository root:

```sh
node tools/swarm/swarm.mjs status
node tools/swarm/swarm.mjs prepare P03
node tools/swarm/swarm.mjs validate P03
node tools/swarm/swarm.mjs release P03
```

`prepare` rejects a task whose dependencies are not validated or whose declared
paths overlap a current lease. It links the already-installed root
`node_modules` into the worktree, so validation uses the explicitly pinned
Node 24/npm 11 environment without a worker downloading dependencies.

The generated `SWARM-TASK.md` is the worker handoff. A worker must not commit,
push, create a PR, or touch main. After a worker reports back, the integrator
runs `validate`, inspects the diff, and performs the GitHub actions.

`release` removes the worktree and lease but deliberately preserves its local
branch so the integrator can inspect, commit and push the worker's diff. A later
`prepare` for the same task reuses that branch.

## Task schema

Tasks live in `tools/swarm/tasks/<ID>.json`:

```json
{
  "id": "P03",
  "title": "Short task name",
  "ownership": ["packages/engine"],
  "dependsOn": [],
  "prompt": "Bounded worker instructions.",
  "acceptance": ["Concrete, independently verifiable outcome."]
}
```

Runtime state is in `.swarm/`, intentionally ignored by Git. It records
leases, worktrees and validation reports for the final contest evidence.

## Daytona provider adapter

`daytona_runner.py` is the cloud-execution boundary. It has no model credential
and cannot commit, push, open a PR, or modify `main`. It creates one ephemeral
sandbox, records the sandbox id/output/exit status under `.swarm/daytona-runs`,
then destroys the sandbox.

On Sergio's Mac only, run it through the Keychain-backed wrapper:

```sh
tools/swarm/run_daytona.sh smoke
tools/swarm/run_daytona.sh prepare P03
```

`smoke` verifies the image has Node, npm and Git. `prepare` also proves a worker
can clone the public repository and create an isolated task branch. It does not
launch Codex yet: a cloud-safe model/runtime credential is a separate required
boundary and must be injected through Daytona secrets, never committed or
passed in task prompts.
