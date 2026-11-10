# Afterimage

An original cross-platform social-deduction game about restoring a collapsing network of memories before dawn.

`Afterimage` is a working title. This repository contains only original game design and implementation work; it is **not** a remake or reskin of another game.

## Product in one minute

Five to ten players enter a room as either **Archivists**, trying to stabilize shared memories, or **The Static**, infiltrators trying to corrupt them. Every round the table chooses a pair of players to resolve a Transmission. Their choice changes a public stability/corruption board while private roles and incomplete information fuel deduction.

See [the GDD](docs/GDD.md), [the architecture](docs/ARCHITECTURE.md), and [the swarm pilot](docs/SWARM_PILOT.md).

## Planned stack

- React + TypeScript + Vite + Capacitor for web, iOS, and Android.
- A pure deterministic TypeScript game engine.
- Firebase Auth, Firestore, and Cloud Functions for realtime state and server authority.
- Unit, integration, and E2E tests gated by CI.

## Status

Planning and foundation only. No Firebase project, production credentials, proprietary source assets, or music files belong in this repository.

## Local development

Use Node 24 (`nvm use` if available) and npm 11. Install from the repository root:

```sh
npm install
npm run dev
```

Vite serves the neutral client shell at the local URL printed in the terminal.
The engine provides deterministic RNG/replay primitives; the UI package provides
semantic theme tokens. The ten-agent pilot extends these foundations under
[explicit contracts](docs/PILOT10_CONTRACTS.md). Complete gameplay and Firebase
integration are still pending.

## Validation

Run from the repository root:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run check` runs all four in sequence. Scope a command with, for example,
`npm run typecheck --workspace @afterimage/engine`. Each workspace has explicit
lint, typecheck, test, and build scripts. Empty packages currently permit zero
tests; the client has a render smoke test. Builds write ignored `dist/` outputs.
Preview the built client with `npm run preview --workspace @afterimage/client`.

Tooling choices, ownership coordination, and the pending lockfile/validation
limitation are recorded in [ADR 0001](docs/adr/0001-typescript-workspace.md).

