# Afterimage — City Moment / Track Event Spec v0

## Rule

Every Repair or Sabotage advancement is a **city moment**, not a score-bar
increment. The player must instantly understand that the world changed.

When a track node resolves, present a short full-screen-over-game treatment:

1. City Board remains visible as context, then dims/blur-pulses.
2. A large original full-colour event icon enters with a distinct, high-impact
   motion profile.
3. Show event title, one short consequence sentence, and an optional visual
   countdown/phase hint—not a confirmation button.
4. Play the matching semantic SFX/music sting/haptic.
5. Collapse back into the active board automatically; event feed and map retain
   the consequence. The authoritative timer may continue underneath, but input
   is temporarily blocked during the brief presentation.

Glass UI remains neutral. Icons, city effects, particles and outcome glow use
full colour. Use colour **plus** icon, label and motion so accessibility does
not depend on colour alone.

## Presentation duration

- Ordinary Repair/Sabotage node: 1.0–1.6 seconds.
- Major power/Blackout/Containment: 1.8–2.6 seconds.
- Match-ending node: flow directly into Match End glass modal.
- Respect Reduce Motion: replace fall/shake/flash with quick opacity/scale
  transition and preserve icon/title/text/audio feedback.

## Required event catalog

| Track | Node | Event title | Original asset direction | Entrance / map consequence |
| --- | ---: | --- | --- | --- |
| Repair | 1 | **First Light** | teal/gold power relay coming alive | radial bloom rises from District 04 |
| Repair | 2 | **Trace Online** | prismatic forensic waveform / magnifier | scan sweeps left-to-right, vote history gains clarity |
| Repair | 3 | **Safeguard** | luminous shield around a city node | shield expands outward, protected signal marker remains |
| Repair | 4 | **Audit Window** | glass lens splitting a corrupted signal | lens folds open, evidence panel gains an audit marker |
| Repair | 5 | **Containment Protocol** | white-gold locking geometry / Null target reticle | geometry descends and locks, global containment vote becomes available |
| Repair | 6 | **City Restored** | sunrise-like city core, never a literal flag | wide bloom and skyline wake-up; transition to Match End |
| Sabotage | 1 | **Signal Breach** | red/magenta crack crossing a grid node | crack tears down from top, district flickers |
| Sabotage | 2 | **Signal Jam** | broken antenna / interference rings | interference drops from above, next vote becomes obscured |
| Sabotage | 3 | **Grid Failure** | fractured electrical grid / snapped transmission tower | large icon **falls from above**, hits with screen-impact shake, affected signal is Jammed for one round |
| Sabotage | 4 | **Signal Sever** | severed luminous cable / broken player signal | cable drops and snaps with a hard impact; Shift Lead permanently disconnects one other active signal |
| Sabotage | 5 | **Blackout Order** | eclipsed city core / collapsing power halo | halo implodes, music narrows; Shift Lead performs a second permanent disconnect and Blackout danger begins |
| Sabotage | 6 | **City Lost** | city core consumed by static, no gore | hard signal cut + corrupted bloom; transition to Match End |

## Implementation contract

- Engine emits semantic track events, e.g. `track.repair.trace_online` and
  `track.sabotage.grid_failure`; UI must not infer event identity from score
  alone.
- Define a typed `CityMoment` registry: id, track, node, icon asset key,
  title, copy, animation preset, audio event, haptic intensity, reduced-motion
  preset, persistent board effect.
- Asset lane creates original ImageGen icon art for every registry entry. Each
  asset includes prompt/provenance, transparent/full-size export and small
  icon variant. No copied Secret Hitler imagery, naming or layouts.
- Animation lane implements reusable presets (`rise-bloom`, `scan-sweep`,
  `shield-expand`, `descend-impact`, `fog-roll`, `implosion`, `signal-cut`),
  rather than hand-coded one-offs scattered through UI.
- Audio lane maps every `CityMoment` to `AUDIO-SPEC-v0.md` semantic events.
- Tests assert registry completeness (6 Repair + 6 Sabotage), semantic event
  emission and reduced-motion fallback; visual QA checks the event cannot leave
  background input active.

## Incident-operation icon contract

Every Route/Gate named in `RULES-SPEC-v1.md` needs a full-colour original icon
as well as its text label. The icons are gameplay affordances, not decorative
badges: they appear in the private Crew Operation popup at a tappable size,
may animate as the selected infrastructure path, and are reused in the public
recap without exposing the secret choice. The asset lane delivers the 36 Route
and Gate icons as a coherent incident-specific system, with provenance,
accessible labels and master/small exports. Never replace them with A/B/C or
1/2/3 glyphs alone.

## Prototype requirement

The initial hardcoded demo must show at least:

- **District Restored** / Repair bloom;
- **Grid Failure**: falling full-colour grid icon, impact, Jammed marker;
- **Signal Sever**: permanent spectator transition with the selected player card
  visibly breaking away from the active table;
- **Blackout Window**: map implosion and danger countdown;
- Match End modal over a fully blurred City Board.

These are visual contracts. They do not decide final engine balance or role
secrecy.
