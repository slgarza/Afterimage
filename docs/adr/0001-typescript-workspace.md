# ADR 0001: TypeScript workspace foundation

Status: accepted tooling decision; installation and validation pending registry access.

## Scope and coordination

Pilot-zero claims P01 only. The user explicitly extended its bootstrap scope to
empty package entry points, a neutral React/Vite shell, and the baseline CI
workflow. These touch P02/P03/P05/P06/P09 ownership solely to establish tooling;
they do not implement those tickets' game contracts, components, native setup,
or features. No public gameplay contract is introduced.

## Decisions

- Use npm workspaces with Node 24 and npm 11. pnpm is not installed. Root
  commands dispatch to every workspace without silently skipping missing scripts.
- Use strict TypeScript with ESM. Packages emit JavaScript and declarations to
  their own ignored `dist/`; the client uses Vite to bundle browser code. Packages
  are private and have empty public entry points until their owners define APIs.
- Use ESLint flat configuration with the recommended JavaScript and TypeScript
  rules. Engine compilation excludes DOM and ambient Node globals, and lint
  rejects known Firebase, platform, and UI imports. The engine has no dependencies.
- Use Vitest for future unit tests. The client has a service-free render smoke
  test. Empty packages explicitly allow no tests until their first behavior is
  added; owners must remove `--passWithNoTests` then. This is not gameplay coverage.
- Use Vite's built-in TSX transform for the minimal React shell. React Fast
  Refresh, Capacitor, browser E2E tests, deployment, and Firebase are deferred.
- CI installs dependencies and runs lint, typecheck, test, and build on pushes
  and pull requests with read-only repository permissions.

## Reproducibility follow-up

The bootstrap environment cannot resolve `registry.npmjs.org`, and its npm cache
lacks React and ESLint. A real dependency lockfile cannot be generated here.
CI temporarily uses `npm install`. Once registry access is available, run
`npm install`, commit the generated `package-lock.json`, switch CI to `npm ci`,
and rerun all checks before considering the P01 acceptance signal complete.
Do not fabricate lockfile integrity data or treat unexecuted checks as passing.

## Commands

See the root README for installation, development, and validation commands.
No deployment or production configuration is part of this decision.

## Bootstrap validation results

Attempted with Node 24.18.0 and npm 11.16.0:

| Command | Result |
| --- | --- |
| `npm install --fetch-retries=0 --fetch-timeout=10000 --cache /private/tmp/afterimage-p01-npm-cache` | Blocked: registry DNS lookup returned `ENOTFOUND` |
| `npm run lint` | Blocked: `eslint` unavailable; exit 127 |
| `npm run typecheck` | Blocked: `tsc` unavailable in all four workspaces; exit 127 |
| `npm test` | Blocked: `vitest` unavailable in all four workspaces; exit 127 |
| `npm run build` | Blocked: `tsc` unavailable in all four workspaces; exit 127 |
| `git diff --check` | Passed |

A dependency-free Node check also parsed all five package manifests and
TypeScript configurations and confirmed every required package script exists.
These static checks do not substitute for the blocked toolchain checks.
