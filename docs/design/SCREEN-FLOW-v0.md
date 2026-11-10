# Afterimage — Screen Flow v0

> Preproducción. Este documento define qué debe existir antes de mockups y PRs
> de UI. Cada pantalla tendrá wireframe antes de arte final.

## Ruta de primer uso

```text
Launch
  → Alias + avatar
  → Home
      ├→ Single-player setup → Role reveal → Match
      └→ Multiplayer
          ├→ Create lobby → Lobby room → Role reveal → Match
          └→ Join by code → Lobby room → Role reveal → Match
Match → Round resolution / Anomaly → Match
Match end → Results + badges → Home
```

## Pantallas críticas para mock v1

### Regla visual aprobada: quiet shell, focused glass

La interfaz no debe parecer un dashboard. La ciudad y la señal viven en el
fondo; cada estado mantiene sólo la información indispensable y una acción
principal. Detalles, acciones secundarias, perfiles, evidencia y Anomalías se
abren en pop-ups/sheets de glass translúcido con blur del fondo. Cuando un
overlay aparece, **todo** el juego entra en segundo plano —ciudad, HUD,
avatares, barras y CTAs— con blur, desaturación y oscurecimiento uniformes.
La modal es el único foco interactivo y visual hasta cerrarse o resolverse.
Evitar tarjetas persistentes, barras y copy simultáneo que compitan por
atención.

### Patrón global: modal-first

Siempre que una acción requiera atención o pause el flujo, se resuelve en un
pop-up/sheet glass bloqueante, no abriendo una pantalla llena ni agregando
controles al HUD. Aplica a decisiones de juego, Anomalías, pausa, perfiles,
detalles de evidencia, reglas contextuales, settings/audio, errores y victoria.
El tablero/fondo permanece como contexto dramático, pero completamente
inactivo y desenfocado; la modal ofrece una sola intención clara. Sólo se
usa navegación a pantalla completa para entrar/salir de una partida o para el
reveal privado de rol.

### 1. Launch / city signal
- Logo de trabajo, ciudad nocturna colapsando y animación muy breve de señal.
- CTA: `Enter the signal`.
- Sin login, sin cuenta y sin paywall.

### 2. Alias + avatar
- Alias sugerido por defecto, editable; nombres duplicados válidos.
- Avatar inicial generado/seleccionado, configurable desde `Tap to change`.
  Ese control abre un selector glass con opciones, no un reroll que cambie el
  alias sin intención. El avatar, no un sufijo numérico, distingue duplicados
  visualmente.
- Guardado local de la preferencia, no identidad permanente.
- **Minimalismo aprobado:** no eyebrow, título ni párrafo explicativo en el
  cuerpo. El avatar, alias y CTA explican el paso; conservar únicamente back
  circular dentro del safe area y labels accesibles no visibles.

### 3. Home
- Fondo negro/casi negro con profundidad radial navy, sin ilustración de ciudad
  en esta pantalla; el logo abstracto centrado es el ancla.
- Toggle segmentado `Solo` / `Multiplayer` arriba de un único botón grande
  `Play`. El toggle define el destino del CTA, en lugar de competir con dos
  CTAs equivalentes.
- Navegación inferior glass persistente: `Home`, `How to Play` (tutorial
  interactivo), `Achievements` y `Settings` (incluye audio/créditos).
- Debe sentirse como home táctil de juego, no landing cinematográfico ni
  dashboard.

### 4. Single-player setup
- Elegir **número de jugadores** con control menos/número/más (mínimo 5,
  máximo 10), dificultad de bots y duración. No presentar presets 5/7/9 como
  si fueran modos distintos.
- Explicar en una frase que bots siguen las mismas reglas e información que
  humanos; nunca enseñar roles ajenos.
- CTA: `Start simulation`.
- **Prototype contract:** al confirmar Alias en modo Solo se llega aquí. La UI
  inicial expone el stepper de 5–10 y un temperamento de bots; iniciar partidas
  reales queda bloqueado hasta que exista engine/bot policy, no por Firebase.
  `Start simulation` entra mientras tanto al mismo clickthrough hardcodeado de
  Role Reveal → City Board → Transmission para probar el flujo offline.

### 5. Multiplayer entry
- Primero mostrar un **directorio de lobbies**. Si no hay salas visibles,
  declarar el estado vacío y ofrecer una CTA clara para crear una.
- También aceptar código corto para unirse a una sala privada/invisible.
- `Create a lobby` abre configuración, no crea una sala opaca con defaults.
- Alias/avatar ya elegidos, editables antes de entrar. El logo no se repite:
  la identidad visual deja respirar el contenido.
- **Prototype contract:** al confirmar Alias en modo Multiplayer se llega aquí.
  Una tarjeta glass muestra el directorio/estado vacío, `Create a lobby` y un
  input de código. Es UX local hasta que Firebase provea creación, presencia y
  autoridad de sala.

### 5a. Create lobby
- Se abre como **modal glass bloqueante** sobre el directorio, no como pantalla
  separada. El directorio completo queda blur/dim/inactivo; cerrar vuelve al
  mismo estado de lista.
- Nombre de lobby editable.
- Número de jugadores mediante stepper 5–10.
- Timer de ronda mediante stepper en bloques de 30 segundos: 30 / 60 / 90 /
  120. El host lo configura al crear la sala; nunca lo cambian clientes ya
  dentro de una partida activa.
- Toggle `Fill empty seats with bots` y selector de dificultad de bots.
- Toggle `Show in lobby directory`: si se apaga, la sala sólo entra por código.
- Toggle `Require passcode`, que sólo revela input de passcode cuando está
  activo. La passcode nunca se muestra en el directorio.
- CTA `Create lobby`. Al crearse, el host pasa a la sala; Firebase será dueño
  de visibilidad, passcode hash, presencia, deadline de ronda y permisos de
  host. Sólo el host puede solicitar avances de estado; el backend valida que
  el deadline haya vencido antes de resolver/avanzar, para evitar carreras
  entre clientes.

### 6. Lobby room
- Código grande con copy/share; lista de participantes por avatar/alias.
- Host define tamaño de mesa y permite bots para completar lugares.
- Estado ready, expulsar sólo desde host y CTA `Begin` al cumplir mínimo 5.
- El timer configurado cuenta hacia un deadline autoritativo. Cuando vence, la
  partida avanza sola desde la autoridad del host/backend; no desde un botón de
  cada jugador.
- Nunca mostrar facciones/roles aquí.
- **Prototype contract:** al crear lobby, entrar directo a esta sala. Mostrar
  código, contador `connected / configured players`, host, slots abiertos y
  mensaje distinto para seats que pueden llenarse con bots. `Lobby settings`
  será modal; Firebase aporta presencia, ready, copiado/compartido y autoridad
  de inicio.

### 7. Role reveal
- Pop-up glass privado y bloqueante sobre fondo difuminado; gesto de
  hold-to-reveal.
- Explica objetivo propio, condiciones de victoria y lo que el jugador sí sabe.
- Ghost Channel/Resonance sólo aparece para Static según reglas; no filtrar
  identidad de The Null por diseño visual o timing.
- **Prototype contract:** empieza con confirmación privada (`Hold to reveal`),
  revela el rol dentro del popup y sólo entonces permite entrar a City Board.
  El texto/rol actual es evidencia de UX, no distribución final de roles.

### 8. Match: city board
- Centro: la ciudad/Transmission activa; estabilidad/corrupción resumida.
- Arriba: Shift Lead actual, ronda y una sola emergencia activa.
- Participantes en rail mínimo de avatar/alias; detalles/cooldown viven en
  pop-up glass, no ocupan tablero fijo.
- **Cambio aprobado:** City Board muestra una mesa de cards con alias y avatar
  de todos los jugadores. Cada card enseña únicamente el **rol operativo de
  ronda** (Shift Lead, Repair Crew, Eligible, Cooldown), nunca su facción
  secreta. Durante Repair Vote, cards elegibles se vuelven touch targets y la
  seleccionada se ilumina con borde/glow; el mismo voto aparece en modal para
  accesibilidad y confirmación.
- Timer autoritativo visible en el header. El prototipo decrementa y, al llegar
  a cero, avanza automáticamente a la siguiente ronda, rota Shift Lead y limpia
  la votación; engine/Firebase reemplaza este comportamiento con deadline real.
- Conversación, voto, evidencia y Anomalías se abren bajo demanda en sheets de
  glass con blur de ciudad.
- En estado base, sólo el Shift Lead ve `Call repair vote` cuando corresponde
  abrir la ronda; los demás ven un estado de espera claro. Si una Anomalía/modal está
  activo, el CTA de fondo se oculta o queda inerte: la modal es la única ruta de
  interacción hasta resolverla/cerrarla.
- **Prototype contract:** HUD mínimo de ronda/Shift Lead, barras de
  Repair/Sabotage, centro de emergencia, rail reducido de jugadores y una sola
  CTA para Shift Lead. La ciudad/arte final no entra hasta
  que la composición y el estado de juego estén aprobados.
- El botón de menú no pausa el juego online. Abre **Game Menu** como modal
  bloqueante local (How to Play, Settings, Leave lobby) y explica que la mesa
  sigue corriendo.

### 9. Repair Crew emergency
- Vista privada en pop-up glass sobre ciudad difuminada: información parcial y
  herramientas con consecuencias claras (reparar, contener riesgo o forzar una
  solución con costo), pero sin revelar automáticamente el bando de nadie.
- Timer claro, una confirmación local y espera sin revelar elección del otro.
- Resto de la mesa ve progreso de señal, no las pistas ni rutas elegidas.
- **UX prototype (hardcoded only):** City Board abre una modal de Repair Vote;
  cada jugador emite un voto para una persona elegible; los dos totales más altos
  forman Repair Crew. La UI bloquea el voto local y luego permite previsualizar una
  resolución pública. El resultado `District repaired` no prueba bando. El
  engine final decide elegibilidad, conteo, ties, rutas y resultado.

### 10. Resolution / Anomaly
- Resultado público de la Transmission, cambios de tablero y evidencia
  imperfecta; no delatar automáticamente a un Connector.
- Si aplica, interfaz de Anomalía (Echo Scan, Signal Jam, Record Splice,
  Blackout) con contrajuego visible.
- **Endgame Disconnect:** Sabotage 4 (`Signal Sever`) and Sabotage 5
  (`Blackout Order`) create a mandatory Shift Lead target-selection moment.
  The target's signal visibly fractures and leaves the active player board;
  they move to spectator-only mode. Spectators may watch the game and final
  reveal but cannot vote, act, enter Crew, use in-game chat or reveal their
  role. A disconnected The Null ends the match in Archivist victory.

### 11. Match end / afterimage
- Se abre como **modal glass bloqueante** sobre City Board blur/dim, no como
  otra pantalla de dashboard. Ciudad estabilizada, corrompida o en Blackout;
  reveal completo de roles y timeline de rondas.
- Badges/logros (ImageGen assets), estadísticas de partida y CTA `Again`.
- Salidas explícitas: `Back to lobby` para volver a la sala y jugar otra, o
  `Exit game` para regresar a Home. En Solo, la primera salida vuelve a setup.
- No progreso dependiente de login en v1; los logros viven localmente.

### 12. Playable visual-demo contract (pre-engine)

The UI prototype must include a **terminable, deterministic demo match** so
product/design reviews do not depend on imagining the game from static screens.
It is deliberately not the game engine and must remain isolated from the future
authoritative state machine.

- Entry: Solo setup → Role Reveal → City Board.
- Demo starts at Repair `2/5`, Sabotage `1/5`; it reaches a visible Archivist
  win within four short rounds: repair, sabotage, repair, repair.
- Human casts one visible crew vote. Bots then visibly vote, form a two-person
  Repair Crew, deploy through the animated city, and resolve the district.
- Each resolution animates a colour-bearing District 04 state (restore or
  breach), updates score bars, event feed and player-card crew states, then
  opens the next emergency automatically. There is no `Cast vote` or
  `Continue` confirmation CTA in the game loop.
- A human votes by directly tapping an eligible player card. If their timer
  expires without a vote, the authority assigns a random **eligible** vote and
  records it as a timeout action; bots follow their own policy under the same
  authoritative deadline.
- At `5/5`, Match End is a blocking glass modal with full role reveal, return
  to lobby/setup and exit-to-home routes.
- The round timer and animation staging are local visual scaffolding only.
  Firebase Functions + deterministic engine later own deadlines, votes, bot
  policy, role secrecy, state transition and win evaluation.
- UI chrome stays neutral black/frost. The living city, district outcomes,
  avatars and player-card glow may use full colour; colour is never the only
  accessibility signal.

### Support screens: How to Play, Achievements, Settings
- **How to Play:** tutorial interactivo breve por pasos; enseña comité de
  emergencia, Shift Lead, Repair Crew y evidencia ambigua sin ser un muro de
  reglas. Repair is good; sabotage is bad; el misterio no está en descifrar
  los bandos sino en descubrir quién los está impulsando.
- **Achievements:** grid con chrome neutral. El asset pipeline ImageGen llena
  cada logro desbloqueado con arte original full color después de aprobar
  estilo/provenance; no se usan badges improvisados. Tap abre modal glass
  bloqueante con el fondo total blur/dim; unlocked usa brillo sutil derivado de
  su propio arte que respeta Reduce Motion, locked queda negro/gris. Ver
  `ACHIEVEMENTS-SPEC-v0.md`.
- **Settings:** Sound Effects, Music, Vibration/Haptics, Appearance
  (System/Dark/Light), Language (System/Español/English), Reduce Motion,
  Privacy Policy y Credits. Credits abre modal glass y la lista final viene de
  manifiesto de assets/audio, no de copy hardcodeado. El mock persiste la
  selección visual; integración de tema, audio nativo, haptics y localización
  corresponde al swarm después de los contratos de plataforma.
- **Navegación base:** Home, How to Play, Achievements y Settings comparten la
  misma barra inferior; sólo cambia el estado seleccionado. Alias, lobby y
  partida no la muestran porque son flujos inmersivos/operativos.

## Estados que los mocks deben cubrir

- Empty: nadie en lobby, lobby a media mesa, sin logros.
- Waiting: esperando jugadores, voto, Connectors, resolución, reconexión.
- Error: código de lobby inválido, sala llena, host se fue, desconexión.
- Accessibility: texto escalable, contraste de glass UI, no depender sólo de
  color para estabilidad/corrupción ni para decisiones.

## Orden de mockup

1. Alias + avatar
2. Home
3. Lobby room
4. Match: city board
5. Connector Transmission
6. Match end

Esas seis pantallas son el gate visual. Primero se aprueban wireframes; luego
se generan mocks con ImageGen, y cada asset se registra con prompt/origen.

## First wireframe artifact

`mockups/wireframes/afterimage-screen-storyboard-v0.png` is the first 3×2
portrait storyboard for the six critical screens. It is a structural review
draft only, not final art or an implementation spec.

## Match-entry transition (required)

Starting Solo or filling a Multiplayer lobby is a **mode transition**, not
another menu navigation. Before private Role Reveal, show a deliberately brief
two-second cinematic handoff:

1. Fade the setup/lobby out; crossfade the calm lobby music into the active
   City Board music bed.
2. Show a minimal `City signal acquired / Entering the blackout` loading state
   with city structures arriving and a signal loader.
3. Fade into the private Role Reveal, then quickly dissolve into the live city.

The transition is artificial/visual in the prototype. Production waits for the
authoritative match-start acknowledgement where needed, but preserves the
same handoff so the player unmistakably understands gameplay has begun.
