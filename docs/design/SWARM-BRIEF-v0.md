# Afterimage — Swarm Brief v0

## Mission

Build **Afterimage**, a mobile-first social-deduction game for web/iOS/Android.
It must feel like an active, cinematic city emergency—not a reskinned board
game. The working product is currently a React/Vite clickthrough in
`ui-prototype`; the production repo is `repo` / `slgarza/Afterimage`.

## Source of truth (read before any ticket)

1. `GDD-v0.md` — world, factions and win direction.
2. `RULES-SPEC-v1.md` — canonical phase machine, deterministic incidents,
   matrices, tracks, powers, tie/timeout and acceptance examples.
3. `SCREEN-FLOW-v0.md` — user flows and UI state contracts.
4. `VISUAL-SYSTEM-v0.md` — black/neutral-frost chrome, modal-first rules.
5. `AUDIO-SPEC-v0.md` — adaptive music/SFX/haptics events and asset rules.
6. `MOMENT-SPEC-v0.md` — mandatory full-colour Repair/Sabotage event moments.
7. `ACHIEVEMENTS-SPEC-v0.md` — achievement/asset behavior.
8. `MONETIZATION-SPEC-v0.md` — ad/IAP boundaries, privacy and adapter rules.
9. `ROADMAP.md` — architecture, constraints and swarm operation.

If two documents conflict, stop and open a design-decision ticket. Do not make
up core rules or visual direction to finish a task.

## Product non-negotiables

- No visible account/login. Alias is temporary and aliases may repeat; avatar
  distinguishes players.
- Solo bots and multiplayer both exist. Firebase is an invisible authority for
  multiplayer, but **must not be configured until Sergio creates the project**.
- UI chrome is black/charcoal + neutral frost glass. Expressive content
  (city, avatars, logos, achievements, outcome states) is full colour.
- Modal-first: decisions, settings, details and Match End use glass popups over
  a complete blurred/dimmed background. No background CTA remains active.
- Game is always live online: there is no global pause. Game Menu is local UI.
- A Shift Lead rotates deterministically. Players vote by tapping an eligible
  player card; two top votes form Repair Crew. No Cast/Continue confirmation
  gates. At deadline, missing votes become recorded random eligible votes.
- Host/server authority owns timers and state transitions. Never trust clients
  to resolve a multiplayer deadline.
- Repair Crew never receives literal Repair/Sabotage buttons. Route Operator
  selects one of three incident-specific Routes and Gate Operator selects one
  of three incident-specific Gates, using complementary private diagnostics;
  the engine alone combines the pair into a public Repair/Sabotage/Anomaly
  result. Neither selection is exposed to the other crew member during the
  match.
- Every named Route and Gate is a first-class original **full-colour icon**,
  not plaintext or an A/B/C/1/2/3 substitute. The asset lane owns the 36
  operational icons, six incident emblems and their provenance/contact-sheet
  review. The UI must use typed semantic keys, not image paths.
- Every material action has visual + semantic audio feedback; never generic
  beeps. Respect Music/SFX/Haptics and accessibility settings.
- Free build uses one always-mounted fixed bottom banner dock across menus,
  lobby, live game, modals and cinematic transitions; design every viewport
  above its reserved adaptive height and safe area. Interstitials can occur
  only after Match End has been read and the player chooses to leave. Never
  interrupt live gameplay, reveal, timer or City Moment. Remove Ads is a
  one-time platform IAP with Restore Purchases.
- Every Repair/Sabotage track node has an original full-colour icon, named city
  moment, dramatic motion/SFX and persistent board consequence. A score bar
  alone is never sufficient feedback.
- Never reveal another player’s secret alignment during a match.
- At Sabotage 4 and 5, the Shift Lead can permanently **Disconnect** an active
  player (not themselves). Disconnected players become silent spectators:
  watch the match but cannot vote, act, enter Crew or use game chat/reactions.
  They do not reveal alignment. If The Null is disconnected, Archivists win
  immediately. This requires server authority and audited target/phase checks.

## Prototype boundary

`ui-prototype` demonstrates desired UX: selection on player cards, bot
activity, animated city states, automatic round pacing, Match End modal and
match-entry transition. Its bot choices, outcomes and timers are deterministic
hardcode **only**. Production replaces them with engine and authority contracts
while preserving visible states.

## Workstream gates

| Gate | Work | Must be true before scaling workers |
| --- | --- | --- |
| G0 | Swarm control plane | worktree isolation, leases, local validation, PR status and cost log work for 3 agents |
| G1 | Rules specification | one canonical phase/action/eligibility/tie/timeout/win spec; test cases approved |
| G2 | Local vertical slice | pure deterministic engine drives one complete solo match; UI follows engine events |
| G3 | Asset/audio foundation | asset bible, manifest format, 1–2 approved gold assets, semantic audio adapter |
| G4 | Firebase multiplayer | Sergio-created project, emulators/rules/Functions, authoritative deadline/reconnect tests |
| G5 | Platform/release | Capacitor wrappers, iOS/Android/web checks, credits/provenance and E2E |

Do not launch 10 workers until G0 and G1 are green. Do not launch Firebase
workers until Sergio supplies the Firebase project.

## First pilot: 3 bounded workers

1. **Rules editor:** convert approved game direction into `packages/engine`
   phase/state/action types plus exhaustive acceptance examples. No Firebase.
2. **Control-plane worker:** build `tools/swarm` queue/worktree/validation/status
   skeleton using the known Node 24/npm 11 and `CODEX_HOME` requirements.
3. **Prototype migration worker:** extract neutral UI primitives and semantic
   event boundaries from `ui-prototype`; no production game logic or assets.
4. **Incident asset worker (after G3):** create the original Route/Gate icon
   library from the approved asset bible; submit a contact sheet and manifest,
   never unreviewed art directly into production.

Integrator validates every result locally, owns commits/push/PRs, and does not
grant workers direct write access to `main`.

## Inputs still needed—not worker guesses

1. Playtest/balance review of the approved deterministic matrices; workers may
   not invent new incidents or outcomes.
2. Firebase project when G4 starts (not before).
3. Asset bible approval: logo final + 1–2 ImageGen gold-standard assets.
4. Tallbeard track selection later; every selected file enters audio manifest.

## Definition of done per ticket

- Narrow acceptance criteria fulfilled without violating this brief.
- Tests appropriate to risk; `npm run check` stays green where applicable.
- No secret/config/audio/art asset committed without an approved manifest.
- Worker report records files touched, validation, known limitation and next
  dependency. Integration opens a PR only after local verification.
