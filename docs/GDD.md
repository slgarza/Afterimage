# Game Design Document — Afterimage

## Product promise

Finish a tense, legible social-deduction game with friends in 20–35 minutes. Everyone has enough public information to make a theory and enough hidden information to doubt it.

## Setting

The city is a failing archive of collective memory. Before dawn, its fragments must be made coherent. **Archivists** preserve reality. **The Static** introduces convincing false memories so the city wakes up wrong.

## Players and session

- 5–10 players; 20–35 minutes.
- One host creates a room; others enter with a short room code.
- The game must survive refresh, backgrounding, and a short disconnect.

## First-mode rules (working design)

1. The service assigns a secret faction and role to every player.
2. At the start of a round, a public **Transmission** appears with a scenario and three possible outcomes.
3. The table nominates and votes on a two-player Link to resolve it.
4. The linked players receive a private choice constrained by their roles; the authoritative engine resolves a public outcome and updates the Stability/Static board.
5. Players discuss, use limited role abilities, then begin the next round.
6. Archivists win at five Stability marks. The Static wins at five Corruption marks or through its Witness endgame condition.

The implementation may change these rules after playtests. It must not import another game's role names, prose, art, UI, factions, win wording, or turn structure.

## UX rules

- The current player and the required action are always obvious.
- Private information never flashes, logs, or persists to another player.
- Waiting states give a concrete status, not a spinner with no explanation.
- Touch-first layout; desktop gains space but never changes the rules.

## MVP non-goals

No public matchmaking, accounts, voice chat, rankings, monetization, cosmetics, multiple modes, bots, or social graph before a closed playtest confirms the base game is fun.

## Asset policy

- Music is selected only after per-track license/provenance review and required credit copy is recorded.
- Kenney packs retain their included license and source manifest.
- No third-party game art, copy, logos, screenshots, or ripped assets.

