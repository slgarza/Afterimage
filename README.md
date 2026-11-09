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

