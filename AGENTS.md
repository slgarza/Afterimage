# Afterimage agent contract

Read `README.md` and the relevant document under `docs/` before changing code.
Read and follow [the swarm evidence and benchmark policy](docs/SWARM_BENCHMARK.md)
for every preparation, implementation, validation, repair and integration attempt.

## Non-negotiable

- Preserve original IP. Do not copy games, their prose, visual identity, assets, role names, or UI.
- Never commit secrets, Firebase config, service account files, tokens, or raw licensed music/SFX.
- Keep the engine deterministic and independent from Firebase/UI.
- Run the scoped tests, lint, and typecheck before requesting merge.
- Keep PRs small and single-purpose; document tests and contract changes.
- Preserve per-attempt private evidence and measured time/outcomes, including failures, retries, interventions and repairs; report unknown cost as unknown and never commit raw logs or credentials.

## Collaboration

- Claim only one ticket at a time.
- Respect ownership boundaries in `docs/SWARM_PILOT.md`.
- Escalate a cross-package contract change instead of silently editing another agent's area.
- For B001-B100, follow `docs/PILOT100_READY.md` and the frozen UI/domain contract.
  Dispatch only the manifest's B task IDs; overlapping A scope must be replanned
  after B delivery. A green module PR does not establish App integration.

