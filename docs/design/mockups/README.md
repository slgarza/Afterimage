# Afterimage mockups

Preproduction visuals only. Nothing here is a production game asset until
explicitly approved and moved into the repository with provenance/attribution.

## `wireframes/afterimage-screen-storyboard-v0.png`

- **Purpose:** first structural review of six critical mobile screens: Alias +
  Avatar, Home, Lobby, City Board, Connector Transmission, and Match End.
- **Tool:** built-in ImageGen, 2026-11-09.
- **Prompt summary:** low-fidelity 3×2 portrait-phone storyboard; grayscale with
  muted cyan accent; prioritize hierarchy and controls; no final art, logo,
  copyrighted game references, or Secret Hitler terminology.
- **Status:** review draft. It establishes no final visual identity, text,
  mechanics, or production asset contract.

## Direction after v0 review

The v0 board was judged too dashboard-like. Next mock must use a minimal,
quiet city shell: keep only the immediate state visible and show actions,
details, evidence and Anomalies in translucent glass pop-ups/sheets with a
blurred/desaturated background. This is an approved design direction, not a
minor cosmetic preference.

## `afterimage-city-board-glass-v1.png`

- **Purpose:** high-fidelity direction check for the in-match City Board.
- **Tool:** built-in ImageGen, 2026-11-09.
- **Prompt summary:** portrait mobile screen; city-in-collapse as dominant
  background; tiny round/relay status strip and avatar rail; centered frosted
  glass Signal Anomaly pop-up; strong background blur; restrained cyan/magenta.
- **Status:** composition and interaction-density review only. Generated text
  is not final copy and must never be treated as a shipping localization.
- **Correction from review:** the visible `Open Transmission` CTA is valid only
  in the base board state and only for the current Relay. It must be hidden or
  inert when a blocking Signal Anomaly modal is on top; modal actions are then
  the only active choices.
- **Focus rule from review:** an active blocking overlay applies uniform blur,
  dimming and desaturation to the entire underlying game, including HUD,
  avatars and every background CTA. Do not blur only the city area behind the
  glass card; the player must have one unmistakable active call to action.
- **Global interaction rule:** prefer a blocking glass pop-up/sheet whenever a
  player needs to decide, inspect, pause, configure, recover from an error, or
  see results/victory. It keeps the city as dramatic context while making the
  current action the only sharp, tappable focus. Full screens are reserved for
  entering/leaving a match and private role reveal.

## `afterimage-city-board-glass-v2.png`

- **Purpose:** corrected interaction-direction mock for a blocking City Board
  modal.
- **Tool:** built-in ImageGen, 2026-11-09.
- **Prompt summary:** one portrait mobile board; the entire city, HUD and
  avatar rail uniformly blurred, dimmed and desaturated; one central sharp
  glass panel with two actions; no external CTA, no `Open Transmission`.
- **Status:** approved interaction direction for the modal-first UI pattern.
  Placeholder glyphs and lines are intentional; final copy/content is not in
  scope for this image.

## `logo/afterimage-logo-exploration-v1.png`

- **Purpose:** first identity-direction board, three abstract/elegant emblem
  candidates for Afterimage.
- **Tool:** built-in ImageGen, 2026-11-09.
- **Prompt summary:** a fractured afterimage halo, an interrupted memory echo,
  and a split signal aperture; deep black/navy with restrained cyan, magenta
  and silver highlights; no text, characters, buildings or literal radios.
- **Status:** exploration only. Sergio approved the *abstract/elegant* logo
  direction, not a final mark. Validate a candidate at app-icon scale before
  producing a production logo/wordmark.

## `afterimage-home-v1.png`

- **Purpose:** first high-fidelity Home mock applying Visual System v0.
- **Tool:** built-in ImageGen, 2026-11-09.
- **Prompt summary:** portrait mobile home; quiet rainy collapsing city, small
  abstract memory-echo emblem, generous negative space and a lower glass
  action sheet with `PLAY SOLO` / `ENTER A LOBBY`.
- **Status:** visual direction draft. It validates the city-as-context and
  quiet-glass-shell language; copy, final logo geometry, accessibility and
  responsive behavior remain implementation work.

## `afterimage-home-v2.png`

- **Purpose:** corrected Home hierarchy based on Sergio's reference: tactile
  game home, not a cinematic landing.
- **Tool:** built-in ImageGen, 2026-11-09. The user-provided Gem Swap screen
  was used only as a hierarchy/layout reference; its identity, assets, copy
  and art were explicitly excluded.
- **Prompt summary:** nearly black radial background, centered abstract broken
  echo mark, `Solo` / `Multiplayer` toggle, one large `Play`, and bottom glass
  nav for Home / tutorial / achievements / settings.
- **Status:** approved working Home direction. The generated emblem is still a
  placeholder candidate; source-specific font, contrast and responsive rules
  need normal implementation validation.

## `afterimage-home-v3.png`

- **Purpose:** corrected neutral-glass Home after Sergio rejected the green/
  teal cast of v2.
- **Tool:** built-in ImageGen, 2026-11-09.
- **Prompt summary:** near-black radial backdrop; neutral smoky glass; larger
  Solo/Multiplayer segmented toggle with person/group icons; cyan only on the
  selected outline; one neutral glass Play button and bottom nav.
- **Status:** current approved Home visual direction. The abstract emblem is a
  working candidate, not final production logo geometry.

## `afterimage-alias-avatar-v1.png`

- **Purpose:** first no-login entry mock after Home approval.
- **Tool:** built-in ImageGen, 2026-11-09.
- **Prompt summary:** neutral black/radial canvas, geometric signal avatar orb,
  editable suggested alias and one Continue CTA;
  no email/password/account state.
- **Status:** working direction. Aliases deliberately may repeat; avatar is the
  visual differentiator. The avatar itself is a placeholder for an eventual
  generated/configurable avatar system.

### Superseded interaction detail

The v1 reroll affordance is superseded: the live prototype uses **Tap to
change**, which opens a full-focus glass avatar picker. Final ImageGen avatar
assets will populate that picker later; placeholders are intentional during UI
iteration.
