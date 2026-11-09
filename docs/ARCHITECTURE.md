# Architecture

## Repository target

```text
apps/client/          # React + Vite + Capacitor shell
packages/engine/      # pure game reducer, RNG, invariants, tests
packages/protocol/    # event/state contracts shared by client and server
packages/ui/          # reusable accessible visual components
functions/            # Firebase Cloud Functions and validation boundary
docs/                 # product, ADRs, licenses, swarm evidence
```

## Authority boundary

The browser is a renderer and input collector, never the authority for roles, draws, secret state, round resolution, or victory. The engine must be deterministic and independently testable. Cloud Functions validate requests, invoke the engine, persist allowed events, and redact private fields for each recipient.

## Engineering contracts

1. A game event is validated before it mutates durable state.
2. Engine code cannot import Firebase, browser, Capacitor, or UI packages.
3. UI cannot compute hidden game outcomes.
4. Every feature adds tests at its lowest meaningful layer.
5. Production credentials are never committed. `.env.example` documents names only.
6. CI is green before a PR joins the merge queue.

## Initial tooling decisions

- Package manager, test runner, linting, and deployment details are ADRs to make in the bootstrap PR.
- Firebase emulator is mandatory before live Firebase integration.
- The initial web vertical slice works without Firebase; realtime arrives only after engine contracts exist.

