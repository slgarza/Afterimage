# Afterimage — Audio & Music Contract v0

**Status:** approved direction for prototype → swarm implementation.  
**Goal:** every consequential game state has a dramatic, readable sonic identity;
audio must make the city feel alive without turning the game into a noisy arcade.

## Principles

1. **Music is atmospheric; actions are legible.** Background music establishes
   mystery. Short effects confirm input, authority, risk and consequence.
2. **No generic UI beeps.** Effects are derived from the world: fractured radio,
   electrical infrastructure, distant sirens, glass resonance, signal packets.
3. **The full mix responds to game state.** A repair lifts the scene; sabotage
   drains/warps it. The timer tightens tension near zero.
4. **Audio never carries required information alone.** Every sound has visible
   UI/animation and Reduced Motion must not disable essential feedback.
5. **User control is first-class.** Separate Music, Sound Effects and Haptics;
   settings persist locally first and later in a non-identifying session profile.

## Music system

- Source: Tallbeard **Music Loop Bundle** only after each selected track is
  recorded in the asset manifest (bundle is CC0/public domain; Credits still
  names the source).
- A game scene uses 2–3 compatible stems/loops where possible, not constant
  track restarts. Crossfade over 350–800 ms.
- `Home / lobby`: sparse, elegant nocturnal loop; no urgency.
- `Match entry`: crossfade lobby loop out and City Board bed in during the
  two-second `Entering the blackout` handoff; add one restrained signal-rise
  stinger. This is the audible threshold between menus and active gameplay.
- `City Board`: tense but restrained base loop.
- `Vote open`: a subtle pulse layer enters.
- `Bots voting`: heartbeat/signal pulse grows, then cuts for result.
- `Crew deploy`: rising electrical/radio sweep aligned with map packet travel.
- `Repair`: warm lift, glass-harmonic resolve, music opens briefly.
- `Sabotage`: low distortion/dropout, corrupted burst, music narrows briefly.
- `Blackout / final danger`: reduced harmonic range and paced alarm texture;
  never painful or excessively loud.
- `Match End`: one short stinger based on winner, then return to calm loop.

## SFX cue sheet

| Event | Sonic intention | Visual partner |
| --- | --- | --- |
| UI tap / back / navigation | soft glass tick, never a default beep | button elevation/frost response |
| Open repair vote | alert chime + distant infrastructure wake-up | city map wakes / eligible cards pulse |
| Choose a player card | focused signal lock | selected card frame/glow |
| Local vote cast | sealed relay click | card locks and event feed updates |
| Bot vote | staggered tiny signal pings (not five identical beeps) | bot cards light in sequence |
| Crew confirmed | two-note confirmation | both crew cards gain gold route frame |
| Crew deploy | rising packet/sweep | packet moves across route to District 04 |
| District repaired | broad harmonic bloom + power-on texture | teal/green district bloom, Repair meter grows |
| District sabotaged | sharp corrupted snap then low sub drop | red breach/shake, Sabotage meter grows |
| Last 10 seconds | sparse clock pulse, escalating gently | timer emphasis, no flashing-only warning |
| Match victory | concise luminous stinger | Match End glass/reveal |
| Match defeat | restrained broken-signal sting | Match End glass/reveal |
| Achievement unlocked | signature crystalline swell | full-colour badge glow/modal |

## Haptics

- Light: player selection, menu confirmation.
- Medium: vote locked, crew confirmed.
- Heavy (opt-in and platform-supported): repair/sabotage resolution and match
  end only. Never vibrate continually for timers.

## Implementation contract for swarm

- Create a pure `audio-event` protocol (`ui.tap`, `vote.open`, `vote.cast`,
  `bot.vote`, `crew.deploy`, `district.repair`, `district.sabotage`,
  `match.win`, `match.loss`, etc.). UI/engine emit semantic events; a platform
  audio adapter owns files, volume and Capacitor/native behavior.
- Keep an `assets/audio/manifest.json` with source, license, attribution text,
  loop points, loudness target and associated event. Do not commit raw
  unverified/licensed material.
- Build a silent/no-op adapter for tests and web preview. Tests assert emitted
  semantic events, not playback timing.
- Respect Settings toggles, system mute and reduced-motion preference. No music
  should autoplay before a user gesture on web.
- Add deterministic audio-event assertions to engine/UI tests and a manual
  mix-review checklist before release.

## Current prototype status

The playable City Board has visual staging only. It intentionally contains no
audio files or fake playback. Its event sequence is the acceptance reference:
open vote → select card (or timeout auto-vote) → bot votes → crew deploys →
repair/sabotage resolves → automatic next emergency / Match End. The future engine replaces its hardcoded result script,
while the semantic audio contract stays stable.
