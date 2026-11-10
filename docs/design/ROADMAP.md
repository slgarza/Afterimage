# Afterimage — Roadmap durable

> **Estado:** planificación aprobada por Sergio el 2026-11-09.  
> **Nombre de trabajo:** `Afterimage` — validar marca y disponibilidad antes de publicar.  
> **Objetivo:** juego original de deducción social, multiplataforma (web, iOS y Android), y demostración competitiva de un swarm de agentes que entrega PRs verdes de verdad.

## La decisión de producto

No es un remake de *Secret Hitler*. Usamos la experiencia aprendida del género, pero no se reutiliza su marca, arte, UI, texto, personajes, lore, nombres de roles ni estructura de juego.

**Premisa:** una ciudad existe dentro de una red de memorias fallando. Los **Archivists** intentan estabilizarla antes del amanecer; **The Static** se infiltra para reescribirla. The Static son antagonistas deliberados: buscan borrar/controlar la ciudad, no una facción incomprendida que cree estar salvándola.

**Core loop propuesto**

1. De 5 a 10 jugadores entran a una sala y reciben rol privado.
2. Se abre una **Transmission**: la mesa debate qué dos jugadores deben enlazarse.
3. Esos jugadores resuelven una escena y determinan qué recuerdo se vuelve canónico.
4. El tablero avanza hacia estabilidad o corrupción; la información incompleta habilita deducción, engaño y alianzas.
5. Archivists ganan estabilizando 5 memorias; The Static gana corrompiendo 5 o activando el apagón mediante el **Witness**.

El game design definitivo debe hacer que Transmissions, condiciones de victoria y roles sean propios; no un reskin de mecánicas ajenas.

## Dirección creativa

- **Vibra:** misterio elegante: ciudad futurista nocturna colapsando, CRT, glitch, radio, cassette y memoria rota. La tensión viene de una conversación contenida y sospecha creciente, no de humor meme o caos caricaturesco. La ciudad debe sentirse cada vez menos confiable conforme se corrompen recuerdos.
- **Chrome vigente:** negro profundo, gris carbón y blanco frost para fondo,
  glass y controles. Logo, iconos, avatares, ciudad, badges y logros usan color
  pleno original; no confundir UI neutra con arte desaturado.
- **Audio:** pistas de Abstraction/Tallbeard seleccionadas por licencia; efectos de Kenney.
- **UX:** party game inmediato, pero con tensión y lectura social; interfaz clean glass, primero escritorio móvil/web, sin UI específica de plataforma.
- **Identidad visual:** todo asset gráfico propio (iconos, badges, logros, fondos y arte de UI) se crea con ImageGen y se registra con prompt/origen antes de integrarse. No se reutiliza arte de otros juegos.

### Derechos y atribución

- **Abstraction:** adquirir la música legalmente; acreditar canción + `Abstraction` + enlace a su web/Bandcamp; contactar al artista antes de integrar y verificar que el álbum/pista no esté excluido de videojuegos. Si hay monetización, apoyar Patreon como pide el autor. No redistribuir audio crudo.
- **Kenney:** descargar packs desde origen y guardar la licencia del pack. Sus assets publicados como CC0 pueden usarse comercialmente; incluiremos crédito voluntario y manifiesto de procedencia.
- **Antes de nombre, icono o tienda:** búsqueda de marca y conflictos en App Store, Google Play, Steam y web. `Afterimage` sigue siendo sólo nombre de trabajo.

## Arquitectura objetivo

```text
afterimage/
  apps/client/              # React + TypeScript + Capacitor
  packages/engine/          # reglas deterministas, sin UI ni Firebase
  packages/protocol/        # tipos y contratos de eventos
  functions/                # Firebase Cloud Functions: autoridad/anti-cheat
  packages/ui/              # design system y componentes compartidos
  docs/                     # GDD, ADRs, assets/licencias, runbooks
```

- **Cliente:** React, TypeScript, Vite, Capacitor (web/iOS/Android).
- **Realtime:** Firebase/Firestore para presencia/lobby y Cloud Functions para transiciones críticas. No habrá pantalla de login ni cuentas en el MVP: el jugador elige un alias temporal al entrar. Cuando toque esta fase, Sergio creará el proyecto Firebase; no se configura ni se comitea nada de Firebase antes.
- **Integridad:** el cliente nunca decide roles, mazos, resultados ni cambios de turno. El engine recibe estado/evento y devuelve estado/eventos deterministas; Functions son la autoridad.
- **Calidad:** unit tests del engine; contract/integration tests de Functions; E2E de un flujo completo; CI bloquea merges rojos.

### Referencia local de implementación

Para decisiones de Capacitor, builds nativos, pruebas y release, la referencia vigente es el rebuild **Gem Swap Ultimate 2.0.1** en:

`/Users/slgarza/Developer/GemSwapUltimate-smooth-local`

Esa copia incluye pruebas nativas locales que no están en `GemSwapUltimate-release-16`. Es una referencia de arquitectura y tooling; Afterimage debe implementar su propio código, diseño e identidad.

## Alcance MVP

### Entra

- Single-player contra bots locales antes de conectar servicios.
- Directorio opt-in de lobbies + lobby por código, 5–10 jugadores y host,
  estilo party-game: alias editable con uno sugerido por defecto; sin
  login/registro. Los aliases pueden repetirse; un avatar aleatorio
  (configurable por jugador) diferencia a los participantes. El host configura
  nombre, asientos, bots, visibilidad y passcode antes de crear sala.
- Presencia, reconexión y recuperación de sesión por alias/sesión temporal.
- Asignación privada de roles y un modo base completo.
- Rondas/Transmissions, votación, resolución de escena y condición final.
- Chat/reacciones mínimos y audit log de partida para depuración.
- Web deployable y builds Capacitor de prueba para iOS/Android.
- Instrumentación de errores y métricas de fun/abandon/reconnect.

### No entra antes de validar el core

- Cuenta permanente, amigos, matchmaking automático, ranking/ELO. Un directorio
  opt-in de lobbies no equivale a matchmaking: sólo lista salas visibles.
- Monetización, tienda, anuncios, battle pass o cosméticos.
- Varios modos, temporadas, bots avanzados, voice chat o moderación compleja.

## Preproducción obligatoria — antes de tickets de gameplay

No se despachan agentes para construir gameplay hasta aprobar un **preproduction
pack**. El swarm puede construir su control plane en paralelo, pero no inventa
producto.

1. **Game design:** core loop, roles, condiciones de victoria, número de
   jugadores/bots, duración, pantallas de resultado y límites de contenido.
2. **Information architecture:** mapa completo de pantallas y navegación:
   splash → alias/avatar → home → single-player o lobby → sala → partida →
   resultado/logros.
3. **Visual system:** moodboard, paleta, tipografía, clean-glass tokens, logo,
   icono y reglas de UI. Todo asset gráfico se genera con ImageGen, se aprueba
   y se registra con prompt/origen antes de entrar al repo.
4. **Mocks navegables:** wireframes primero; después 4–6 mockups visuales de
   las pantallas críticas. No se implementa una pantalla hasta que su flujo y
   estado vacío/error estén decididos.
5. **Backlog aprobado:** cada mock/flujo se traduce a issues pequeños con
   acceptance criteria; entonces el swarm recibe trabajo, no ambigüedad.

**Estado:** GDD v0 y mapa de pantallas v0 ya existen en el workspace
(`GDD-v0.md`, `SCREEN-FLOW-v0.md`). Siguiente gate: aprobar wireframes de Alias
+ Avatar, Home, Lobby, City Board, Connector Transmission y Match End.

### Dirección de turnos (propuesta para validar en GDD)

La partida tendrá rondas con un **Relay** que rota obligatoriamente, en orden,
por todos los jugadores. No se vota, no se retiene y no se salta a nadie. El
Relay no manda sobre el juego: abre la Transmission de la ronda y fija la
crisis, pero la mesa elige a los dos **Connectors** que enfrentan la señal. Las
personas conectadas entran en cooldown, no se repite pareja en la ventana de
cooldown, y cada jugador tiene influencia finita. Así ningún bando puede
acaparar turnos, conversación o acciones; la información y el control circulan
por la mesa.

No hay un equivalente fijo de Presidente/Canciller: Relay y Connectors son
funciones temporales distintas. El primer prototipo comparará voto público
contra selección simultánea de Links; se elegirá la variante que genere más
deducción, bluff y coaliciones cambiantes sin volver el juego incomprensible.

La mecánica final debe ser propia de Afterimage: no reproduce cargos, mazos ni
secuencia de otro juego de deducción social.

**Restricción de diseño:** una Transmission no puede resolver con un botón
binario de “restaurar/corromper” elegido por ambos conectados. Un resultado
coincidente revelaría demasiado sobre la pareja y rompería la deducción.
La resolución debe conservar ambigüedad incluso para sus participantes.

Propuesta a prototipar: cada Transmission contiene una memoria con estado real
oculto en el servidor. Los conectados reciben pistas parciales y eligen una
**ruta** neutral —por ejemplo Anchor, Veil o Pulse—, no un bando. La combinación
de rutas decide cuánta información se expone, qué coste se paga y cómo se
resuelve la memoria. Static puede usar cualquier ruta para ocultar/manipular;
Archivists puede usar cualquier ruta para investigar/proteger. El resultado
público no demuestra automáticamente lo que eligió ni el bando de nadie.

### Tablero de colapso y escalamiento (dirección aprobada)

El tablero no será un contador pasivo. A medida que se estabilizan o corrompen
recuerdos, la ciudad desbloquea **Anomalías**: poderes con lectura/manipulación
de huellas de memoria, influencia o registros públicos. El progreso activa
tensión, pero las Anomalías no deben copiar poderes, nombres ni secuencias de
otros juegos de deducción social.

El tablero cambia por tamaño de partida: rutas compactas para 5–6 jugadores,
más bifurcaciones y herramientas para 7–8, y una ruta larga con Anomalías
adicionales para 9–10. Cada diseño debe equilibrar duración, información y
capacidad de remontada; no es sólo alargar el mismo track.

Primeras familias de Anomalías a prototipar (sin cerrar números todavía):

- **Echo Scan:** leer la huella reciente de una acción, no revelar una facción
  directamente.
- **Signal Jam:** limitar influencia o participación de una señal en la ronda
  siguiente.
- **Record Splice:** alterar/ocultar parte de un registro público para producir
  evidencia ambigua.
- **Blackout:** evento final de alto riesgo que abre una ventana de victoria o
  remontada, sujeto a contrajuego de la mesa.

### Información de The Static (dirección aprobada)

The Static usa un **Ghost Channel**. Sus operativos se reconocen entre sí, pero
su figura central, **The Null**, no conoce identidades aliadas. Al inicio nadie
puede identificar con certeza a The Null. Conforme sube la corrupción, los
operativos reciben una **resonancia** con dos identidades posibles: una es The
Null y otra es un falso eco. Deben proteger/coordinar al líder sin exponerlo y
sin confiar por completo en su propia lectura.

Esta asimetría conserva la tensión de un líder vulnerable, pero es una mecánica
propia: la información se adquiere tarde, es ambigua y puede alterar el tablero
mediante Anomalías.

### Condiciones de victoria (dirección aprobada)

- **Archivists:** estabilizan cinco memorias clave o aíslan a The Null mediante
  consenso sustentado por evidencia de juego.
- **The Static:** corrompe cinco memorias o, después de suficiente corrupción,
  The Null inicia un **Blackout** de dos rondas. Archivists pueden decodificar o
  cancelar la señal antes de su cierre; si no, The Static gana.

El Blackout crea un final de alto riesgo con contrajuego; no depende de ocupar
un cargo ni reemplaza la rotación del Relay.

### Tabla de mesa y roles (dirección aprobada)

| Jugadores | Archivists | Static operativos | The Null | Static total |
| ---: | ---: | ---: | ---: | ---: |
| 5 | 3 | 1 | 1 | 2 |
| 6 | 4 | 1 | 1 | 2 |
| 7 | 4 | 2 | 1 | 3 |
| 8 | 5 | 2 | 1 | 3 |
| 9 | 5 | 3 | 1 | 4 |
| 10 | 6 | 3 | 1 | 4 |

Single-player completa la mesa con bots hasta el mínimo de cinco; los bots
siguen exactamente el mismo contrato de rol, turno y evidencia que humanos.

## Fases y gates

| Fase | Entregable | Gate de salida |
| --- | --- | --- |
| 0. Preproducción | GDD de 2–4 páginas, nombre provisional, flujo de pantallas, mocks, logo/dirección visual y ADRs | core loop jugable en texto, 4–6 pantallas críticas aprobadas y sin similitud estructural intencional con Secret Hitler |
| 1. Vertical slice | Engine local determinista + una ronda visible en web | dos partidas simuladas completas, tests del engine y UI sin Firebase |
| 2. Multiplayer MVP | lobby, presencia, Functions autoritativas, reconexión | 5 jugadores reales terminan partida sin intervención manual |
| 3. Calidad/plataformas | E2E, assets licenciados, Capacitor iOS/Android | CI verde, build web + Android + iOS de prueba, crash-free playtest |
| 4. Closed playtest | 20–50 testers, telemetría y fixes priorizados | retención de una sesión y bugs críticos resueltos |
| 5. Release candidate | ficha, privacidad, créditos, marca verificada | cero bloqueadores de plataforma/legal y rollback plan listo |

## Plan del swarm / Telnyx X Prize

**Execution handoff:** `SWARM-BRIEF-v0.md` is the concise agent-facing contract
for product non-negotiables, source documents, gates, pilot workstreams and
definition of done. Workers must read it before accepting a ticket.

**Rules handoff:** `RULES-SPEC-v1.md` is now the canonical deterministic game
contract: six-node tracks, incident matrices, Repair Crew controls, powers,
timeouts, ties, Disconnect/spectator behavior and engine acceptance examples.
Workers must not implement alternative rules without an explicit design change.

### Estado operativo — 2026-11-09

- Repo: `https://github.com/slgarza/Afterimage` (público). PR #1 de fundación fue mergeada a `main`.
- Runner validado: `/Users/slgarza/.local/bin/codex`, con `CODEX_HOME=/Users/slgarza/.codex` y `-m gpt-6-astra`. El `CODEX_HOME` propio de OpenClaw oculta la sesión ChatGPT si no se sobreescribe explícitamente.
- Piloto cero P01 produjo scaffold en worktree aislado y fue rescatado a `chore/p01-workspace`. El integrador local lo validó con Node 24/npm 11: lint, typecheck, tests y build pasan; el lockfile quedó generado. [PR #2](https://github.com/slgarza/Afterimage/pull/2) pasó dos corridas de GitHub Actions y fue mergeada a `main` (commit `59754d5`).
- Restricción descubierta: sandbox Codex sin DNS para npm y sin permiso para lock Git común. Diseño del control plane: **worker edita sólo su worktree; integrador local instala, ejecuta checks, commitea, pushea y abre PR**. Nunca se otorga escritura directa a `main` al worker.
- Restricción adicional descubierta: el shell no interactivo toma Homebrew Node 22/npm 10, pero el repo exige Node 24/npm 11. El runner debe exportar `PATH=/Users/slgarza/.nvm/versions/node/v24.18.0/bin:$PATH` antes de instalar o validar.
- Próximo gate: construir P02, el control plane mínimo: cola de tareas local, worktree/branch por worker, contrato de ejecución con runtime explícito, validación local y reporte de estado. No se lanza el swarm de 10 hasta que P02 haya demostrado 3 workers sin pisarse.

El concurso no premia 100 procesos decorativos. Se necesita evidencia de 100 agentes activos sobre un repo real, con PRs verdes y métricas de throughput/calidad/costo.

### Preparación antes de escalar

1. Descomponer el backlog en tickets atómicos: aceptación, archivos/paquetes esperados, dependencias y test requerido.
2. Definir ownership por paquete y leases temporales de archivos para limitar conflictos.
3. Crear worktree/branch efímero por agente y un contrato de PR obligatorio.
4. Instrumentar dashboard: agente, ticket, lease, branch, estado de CI, conflictos, costo y PR mergeado.
5. Tener un merge queue y repair agents: las fallas vuelven a una cola de reparación, no se esconden.

### Escalamiento

| Etapa | Agentes | Objetivo |
| --- | ---: | --- |
| Pilot | 10 | probar colas, worktrees, ownership y CI sobre 20 tickets reales |
| Stress | 25 | medir conflictos y tiempo de integración por módulo |
| Pre-swarm | 50 | validar observabilidad, cuotas y merge queue |
| Submission run | 100+ | agentes activos en paralelo, PRs verdes, reporte comparable contra pipeline AFK |

**Distribución inicial para 100+ agentes:** 55 implementación, 20 tests/QA, 12 integración/repair, 8 review/seguridad y 5 release/observabilidad. Todos deben tener tarea rastreable en el mismo repositorio; los reviewers no sustituyen a workers ficticios.

## Backlog inicial (para convertir en tickets)

| Área | Meta de tickets | Ejemplos |
| --- | ---: | --- |
| Engine y reglas | 25 | state machine, seed RNG, roles, win conditions, invariants |
| Multiplayer/Firebase | 25 | room lifecycle, presence, reconnect, server validation, audit log |
| UX/UI | 20 | onboarding, lobby, Transmission, votos, estados de espera, a11y |
| Testing | 20 | unit, property tests, Functions integration, Playwright E2E |
| Seguridad/CI/observabilidad | 15 | rules, emulator suite, workflows, error reporting, dashboards |
| Audio/arte/localización/release | 15 | asset manifest, credits, settings, es/en, Capacitor builds |

La lista se refina tras la auditoría del repo nuevo; no se inventan 120 tickets sólo para inflar el conteo.

## Próximas acciones

1. **Cerrar preproducción:** GDD, flujo, mocks, logo y design system antes de gameplay.
2. **Implementar vertical slice:** engine + UI local + tests; nada realtime aún.
3. **Convertir diseño aprobado en issues:** dependencias, acceptance criteria y owner package.
4. **Pilot de 3 workers:** validar control plane sin pisadas; después 10 agentes.

### UI demo contract before engine tickets

The `ui-prototype` contains a deliberately hardcoded end-to-end visual match:
human vote → bot-voting animation → crew deployment → animated repair/sabotage
resolution → score progression → role reveal. It is a UX review tool, not
engine code. Swarm tickets must **not** preserve its timed transitions or
hardcoded outcomes; they replace them behind the same UI states with the pure
engine/Firebase-authoritative contracts. Preserve the visible UX sequence and
accessibility cues, not the mock implementation.

The live-loop UX has no `Cast vote` or `Continue` gates: a player taps an
eligible card to vote; on deadline the authority records a random eligible
vote for inactivity; bots resolve under their policy; the next emergency opens
automatically. Future engine/Firebase work must keep this pace while making the
timeout action server-authoritative and auditable.

Match start has a required two-second cinematic handoff: fade lobby/setup,
crossfade music, show `Entering the blackout`, then Role Reveal/City Board.
It makes the boundary from configuration to active gameplay unmistakable;
production may wait for host/server acknowledgement behind that same visual.

### Audio is a first-class swarm lane

`AUDIO-SPEC-v0.md` defines semantic audio events, adaptive music states, SFX
intent, haptic policy, accessibility controls and asset provenance. Audio work
is not a post-release polish task: engine/UI tickets must emit semantic events,
and a separate platform-adapter/asset-manifest lane resolves playback. The
Tallbeard CC0 bundle is the approved source candidate; tracks still require a
manifest entry and Credits attribution.

### Track events are city moments

`MOMENT-SPEC-v0.md` makes all 12 Repair/Sabotage nodes required full-colour
visual/audio events. It includes original icon direction, entry animation,
board consequence, reduced-motion fallback and typed registry requirements.
Workers must not reduce a node to a score bar increment.

## Registro de decisiones

| Fecha | Decisión | Motivo |
| --- | --- | --- |
| 2026-11-09 | Rehacer desde cero en Capacitor en vez de evolucionar Secret Hitler | independencia de IP, un solo codebase web/iOS/Android y mejor caso para el swarm |
| 2026-11-09 | Nombre de trabajo `Afterimage` | encaja con la dirección de memoria/glitch; pendiente validación de marca |
| 2026-11-09 | Firebase autoritativo + engine TypeScript puro | realtime rápido sin confiar en cliente; tests y paralelización sencillos |
| 2026-11-09 | MVP antes de swarm de 100 | no escalar orquestación sobre una base que todavía no compila o no sabe mergear |
| 2026-11-09 | No login; alias temporal para lobby | fricción mínima tipo party-game y sin administrar cuentas antes del core |
| 2026-11-09 | Single-player contra bots entra antes de multiplayer | permite validar el core loop sin red ni coordinación humana |
| 2026-11-09 | Arte gráfico propio generado con ImageGen | identidad visual coherente y trazabilidad de procedencia |
| 2026-11-09 | Firebase para autoridad de lobby y game state | backend invisible para el jugador; Sergio creará el proyecto cuando entremos a esa fase |
| 2026-11-09 | Aliases repetibles + avatar aleatorio configurable | priorizar diversión party-game sobre identidad de cuenta |
| 2026-11-09 | Deducción social de mesa + tono misterio elegante | discusión/votos como núcleo; microinteracciones sólo como sazón, no como minijuego central |
| 2026-11-09 | Ciudad futurista nocturna colapsando | escenario de memoria rota; la corrupción altera visualmente la ciudad |
| 2026-11-09 | Rondas con Relay rotativo y cooldown de conectados | evita acaparamiento de acciones/control por un bando |
| 2026-11-09 | Control coral: Relay abre crisis, mesa elige Connectors | más dinámica social y menor detectabilidad que un nominador con subordinado |
| 2026-11-09 | The Static son antagonistas explícitos | objetivo de corrupción/borrado por poder o control; conflicto moral legible y directo |
| 2026-11-09 | Tablero variable por 5–6 / 7–8 / 9–10 jugadores | escalamiento de Anomalías y tensión diseñado para cada tamaño de mesa |
| 2026-11-09 | Ghost Channel y The Null | operativos conocen su red; The Null no conoce aliados y se descubre mediante resonancias ambiguas |
| 2026-11-09 | Victoria por cinco memorias o Blackout | final con contrajuego: Archivists estabilizan/aislan; Static corrompe o sostiene Blackout dos rondas |
| 2026-11-09 | Proporciones 5–10 de mesa | Static total: 2 (5–6), 3 (7–8), 4 (9–10), siempre con The Null |
| 2026-11-09 | Demo visual terminable antes de engine | Validar City Board, bots, ritmo, resultado y Match End sin fingir que la lógica local es multiplayer/IA real |
