# Afterimage — Achievement System v0

> Contrato para swarm. No implementar arte final ni lógica de unlock hasta que
> engine y reglas de partida tengan eventos estables. Esta especificación evita
> una colección de badges genéricos o logros imposibles de verificar.

## Principios

- Crear una colección inicial de **48 logros**: 16 fáciles, 20 medios y 12
  difíciles/secretos. Deben cubrir aprender, deducir, cooperar, ganar desde
  ambos bandos, remontadas y jugadas memorables; no sólo contar partidas.
- Los nombres, descripciones y arte pertenecen al universo original de
  Afterimage: apagón urbano, distritos, reparación, sabotaje, huellas y señal.
  Nunca usar iconografía, nombres ni composición reconocible de otro juego.
- El desbloqueo se calcula localmente en v1, sin login. La fuente de verdad es
  el resumen firmado/autoritativo de partida cuando exista Firebase/engine; no
  confiar en el cliente para adjudicar logros competitivos.
- Cada logro debe tener una condición objetiva, evento fuente, texto para UI y
  test de engine. Ningún logro depende de leer intención humana o de un voto
  ambiguo imposible de probar.

## Presentación UI

- Achievements muestra grid de tiles compactos con arte original de ImageGen.
- **Desbloqueado:** arte original **full color**, nombre y progreso, sobre
  chrome glass neutro.
- **No desbloqueado:** arte negro/gris, silueta/ruido mínimo, sin filtrar el
  nombre si es público; los secretos sólo muestran `Unknown afterimage` hasta
  desbloquearse.
- Tap sobre cualquier tile abre un **modal glass bloqueante**: fondo entero
  blur/dim, arte ampliado, nombre, descripción, condición/progreso y fecha de
  unlock si existe. Nunca navegar a otra pantalla para ver un badge.
- Modal unlocked: halo/brillo animado sutil que toma una muestra de la paleta
  del arte del logro, lento y no competitivo con el copy. Con `Reduce Motion`,
  usar glow estático.
- Modal locked: sin brillo; mantener legibilidad y explicar progreso sólo si el
  logro no es secreto.
- Todos los assets son ImageGen originales con prompt, fecha, variante aprobada
  y hash registrados en `assets/manifest.json` antes de integrar.

## Starter catalogue (48)

### Easy — first contact (16)
1. **First Shift** — finish one match.
2. **Open Circuit** — cast a first Repair Crew vote.
3. **Steady Hands** — join a Repair Crew once.
4. **District Online** — be present for a repaired district.
5. **Fault Line** — be present for a sabotaged district.
6. **Night Signal** — finish a Solo simulation.
7. **Shared Frequency** — finish a multiplayer match.
8. **Full Table** — play in a 10-player room.
9. **Quiet Return** — return to the lobby after a match.
10. **Long Watch** — finish a 120-second-timer match.
11. **Fast Response** — finish a 30-second-timer match.
12. **Open Door** — create a public lobby.
13. **Closed Circuit** — create a passcode lobby.
14. **New Face** — change avatar before a match.
15. **Last Seat** — join a lobby as its final human player.
16. **Static in the Glass** — view the full role reveal at match end.

### Medium — evidence and coordination (20)
17. **Clean Record** — win as Archivist.
18. **Controlled Failure** — win as Static.
19. **First Responder** — be selected to Repair Crew in round one.
20. **Second Opinion** — be selected to Repair Crew in consecutive eligible
    rounds without repeating the same partner.
21. **Signal Trail** — participate in five distinct Repair Crew votes.
22. **Consensus** — vote for both eventual crew members in one round.
23. **Wrong Wire** — vote for a crew that produces sabotage, then win anyway.
24. **Emergency Measure** — win after corruption reaches the final warning
    threshold (exact threshold owned by engine).
25. **Stable Grid** — win without any sabotage result (engine-verifiable).
26. **Ghost in the Room** — as Static, be selected to Repair Crew and avoid
    triggering a role-revealing result.
27. **Silent Technician** — as Archivist, reach the end without joining Repair
    Crew, then win.
28. **Crossed Wires** — survive a tied Repair Crew vote resolved by the final
    tie policy.
29. **Night Crew** — finish a match with bots filling empty seats.
30. **Closed Loop** — win a private lobby match.
31. **Open Grid** — win a public-directory lobby match.
32. **Fault Diagnosis** — correctly contribute to The Null isolation event once
    that system is defined.
33. **After the Surge** — win immediately after an Anomaly resolves.
34. **No Loose Ends** — complete a match with no disconnect/replacement event.
35. **Same Signal, Different Face** — finish a match containing duplicate aliases.
36. **Shift Change** — experience every Shift Lead position in a full match.

### Hard / secret — memorable mastery (12)
37. **Blackout Cancelled** — help Archivists cancel Blackout on its final
    possible round.
38. **Two Minutes to Dawn** — win after the final timer-expiry auto-advance.
39. **Perfect Alibi** — as Static, win while never being selected to Repair
    Crew (only after balance validation).
40. **Under the Floodlights** — as Archivist, win after being selected to
    Repair Crew three times.
41. **False Dawn** — as Static, trigger a repair-looking outcome that enables
    the eventual Blackout (requires explicit engine event).
42. **Last Witness** — be the final valid vote that completes The Null
    isolation consensus.
43. **The Null Hypothesis** — win as The Null.
44. **No Signal Lost** — win a maximum-table match with all original human
    players still present.
45. **City of Strangers** — win a public lobby with no repeat aliases from the
    local recent-match history (privacy-safe local aggregate).
46. **Unbroken Shift** — achieve five wins with every timer setting at least
    once.
47. **Glass Archive** — unlock 24 non-secret achievements.
48. **Afterimage** — unlock every other achievement.

## Swarm implementation order

1. Define stable engine event schema (`match_finished`, `role_revealed`,
   `crew_selected`, `repair_resolved`, `anomaly_resolved`, `blackout_*`,
   `null_isolated`, lobby events). Do not build unlock code before this.
2. Implement achievement definition schema and reducer with deterministic unit
   tests per condition.
3. Persist local progress and migration version; future account/cloud sync is
   explicitly out of scope.
4. Build the tile grid, grayscale locked states and accessible modal.
5. Generate assets in a separate ImageGen batch with prompt/provenance review;
   insert only approved manifest entries.
6. Add subtle neutral glow, honoring Reduce Motion, then visual regression tests.

## Explicit non-goals for v1

- No monetization, premium achievement track, coins or unlock-gated gameplay.
- No colored rarity tiers: dificultad se comunica por copy/progreso, no por un
  sistema genérico de rarezas. Esto no limita el arte full color del logro.
- No achievement that exposes a secret role before a match ends.
