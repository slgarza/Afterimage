# Afterimage — GDD v0

> Estado: borrador de preproducción. Resume decisiones aprobadas al 2026-11-09.
> Nada de esta versión autoriza gameplay hasta revisar el flujo y mocks.

## Pitch

En una ciudad futurista nocturna que se está borrando, 5–10 personas intentan
reconstruir recuerdos antes del amanecer. Algunas pertenecen a **The Static** y
quieren borrar/controlar lo que quede de la ciudad. Nadie tiene una cuenta: se
entra con un alias temporal y un avatar aleatorio configurable.

**Afterimage** es deducción social elegante, no party-chaos: un comité de
emergencia intenta reparar una ciudad durante un apagón mientras saboteadores
infiltrados buscan dejarla caer. Conversaciones tensas, evidencia ambigua,
radios rotas, neón y cristal oscuro.

## Regla de claridad: ficción misteriosa, reglas obvias

El lore puede hablar de memoria, señales y una ciudad borrándose; la mecánica
base no debe requerir descifrar vocabulario:

- **Reparar / estabilizar la ciudad = bueno.**
- **Sabotear / corromper la ciudad = malo.**
- Archivists son el equipo que quiere reparar; The Static son saboteadores.
- The Null es la amenaza principal protegida por Static, aunque no conoce a sus
  aliados al inicio.

Los nombres de ficción quedan como capa visual o secundaria. La primera vez que
un jugador ve una acción, debe entenderla como una guardia de emergencia:
formar cuadrilla, reparar el distrito, descubrir quién está saboteando.

## Plataformas y modos

- Web, iOS y Android desde la misma base Capacitor.
- **Single-player:** 1 humano + bots; se completa mesa hasta el mínimo de 5.
- **Multiplayer:** crear/unirse por código de lobby; alias repetidos permitidos.
- Firebase será autoridad de lobbies y game state cuando el core local esté
  validado. Sergio crea el proyecto Firebase en esa fase, no antes.

## Roles

| Tamaño de mesa | Archivists | Static operativos | The Null |
| ---: | ---: | ---: | ---: |
| 5 | 3 | 1 | 1 |
| 6 | 4 | 1 | 1 |
| 7 | 4 | 2 | 1 |
| 8 | 5 | 2 | 1 |
| 9 | 5 | 3 | 1 |
| 10 | 6 | 3 | 1 |

- **Archivists** restauran la ciudad.
- **The Static** son antagonistas explícitos: quieren corromper y controlar la
  ciudad, no salvarla.
- Operativos Static se reconocen mediante **Ghost Channel**.
- **The Null** no conoce sus aliados y nadie conoce con certeza a The Null al
  comenzar. Conforme sube la corrupción, operativos reciben una Resonancia con
  dos posibles identidades: una real y un falso eco.

## Condiciones de victoria

- Archivists: alcanzar **6 Repair** o desconectar a **The Null**.
- Static: alcanzar **6 Sabotage**. Sabotage 5 abre Blackout Order, una ventana
  de peligro con un segundo Disconnect antes del nodo final.
- A Disconnect de The Null revela su identidad sólo como condición de victoria
  y termina la partida de inmediato en triunfo Archivist.

## Core loop de una ronda

1. El **Shift Lead** (Coordinador de turno) rota obligatoriamente y en orden.
2. Shift Lead declara la emergencia del distrito; no designa trabajadores.
3. La mesa discute y cada jugador emite **un voto** para una persona elegible.
   Los dos candidatos con más votos forman la **Repair Crew**.
4. Repair Crew recibe información incompleta sobre la emergencia y toma una
   decisión privada simultánea. Cada miembro escoge una de tres **rutas físicas
   de emergencia** (por ejemplo North Relay, Core Bypass, Reservoir), no un
   botón “Repair/Sabotage”. Ambos ven pistas parciales distintas; Static además
   recibe Ghost Resonance que puede ayudar a empujar el distrito al colapso.
   Nadie ve la ruta elegida por el otro. El servidor combina rutas + condición
   oculta del incidente y publica sólo Repair, Sabotage o Anomaly.
5. El servidor resuelve la emergencia, publica evidencia ambigua y mueve el
   marcador de **Repair** o **Sabotage**, o activa una Anomalía.
6. Repair Crew entra en cooldown; no se repite pareja dentro de esa ventana.

### Autoridad y timer online

- Al crear lobby, el host elige timer de ronda en bloques de 30 segundos:
  **30, 60, 90 o 120 segundos**.
- Firebase/engine guarda un `roundDeadline` autoritativo; todos los clientes lo
  muestran, pero no pueden resolver ni avanzar por su cuenta.
- El host es el único controlador que puede solicitar inicio/avance de fase; el
  backend valida host, fase y deadline. Al vencer el timer, el backend asigna
  una elección aleatoria entre objetivos elegibles a cada jugador inactivo y
  ejecuta el avance idempotente. Así evitamos race conditions de varios
  clientes y botones de “continue” que rompen el ritmo.
- El tablero muestra cards persistentes de alias/avatar para toda la mesa y
  marca sólo roles de ronda visibles (Shift Lead, Repair Crew, Eligible,
  Cooldown). Las facciones permanecen ocultas hasta final de partida.

Shift Lead no nombra un subordinado y no existe un equivalente fijo de
Presidente/Canciller. La mesa forma la cuadrilla; el poder rota y se distribuye.

**Regla aprobada de selección:** voto público de una persona por jugador; los
dos totales más altos forman la Repair Crew. La resolución de empates
queda pendiente: no se concederá por defecto al Relay para evitar devolverle
poder de nombramiento.

### Regla de oro de información

No existe un botón “bueno/malo”. Un resultado de emergencia nunca debe probar
automáticamente qué ruta eligió el otro miembro de Repair Crew ni su bando.
Los jugadores pueden declarar qué vieron/elegieron, pero pueden mentir; las
pistas parciales y condición oculta evitan una confesión matemática inmediata.

## Tablero de colapso y Disconnect

El tablero cambia por tamaño de mesa:

- **5–6:** ruta corta y poderes tempranos.
- **7–8:** más bifurcaciones e información ambigua.
- **9–10:** ruta larga, Anomalías adicionales y más opciones de remontada.

Familias de Anomalías a prototipar:

- **Echo Scan:** leer huella de una acción reciente, no facción directa.
- **Signal Jam:** limitar influencia/señal una ronda.
- **Record Splice:** alterar u ocultar parte de un registro público.
- **Blackout:** final de alto riesgo con contrajuego.

### Disconnect (endgame)

- **Sabotage 4 — Signal Sever:** Shift Lead selecciona a otro jugador activo;
  ese jugador queda permanentemente desconectado y pasa a espectador.
- **Sabotage 5 — Blackout Order:** Shift Lead selecciona un segundo Disconnect
  mientras la ciudad entra en estado Blackout antes de Sabotage 6.
- Un espectador puede ver el resto y el reveal final, pero no votar, ser parte
  de Repair Crew, actuar, usar chat/reacciones ni revelar su rol.
- Shift Lead no puede elegirse a sí mismo. Target, fase y efecto deben ser
  validados por servidor y registrados en el audit log.
- Si el target es **The Null**, Archivists ganan inmediatamente. Esto hace los
  últimos nodos peligrosos para ambos bandos: incluso Static puede cortar a su
  propio líder porque no conoce su identidad al inicio.

## Dirección visual

- Ciudad futurista nocturna colapsando: neón que falla, anuncios
  contradictorios, arquitectura incompleta y recuerdos superpuestos.
- UI chrome clean glass: negro profundo, gris carbón y blanco frost. Ese
  minimalismo aplica a superficies, tipografía y controles, no al arte.
- Arte, logo, iconos, avatares, badges/logros y fondos: **full color**, creados
  con ImageGen y registrados con prompt/origen antes de integrarse.
- Música licenciada de Abstraction/Tallbeard y SFX Kenney sólo tras verificar
  procedencia/licencia; nunca se sube audio crudo sin permiso.

## Decisiones pendientes antes de mocks

1. ¿Cómo se resuelven empates al elegir Repair Crew sin concentrar poder?
2. ¿Qué tabla exacta combina las tres rutas con los estados ocultos de incidente
   sin revelar automáticamente bandos?
3. ¿Qué información muestran exactamente las pistas privadas y Ghost Resonance?
4. Duración objetivo: recomendar 8–12 minutos; validar.
5. Mapa de pantallas y primer set de 4–6 mocks críticos.
