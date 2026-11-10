# Afterimage — Visual System v0

> Preproducción. Una fuente de verdad para mocks y UI; no es todavía una guía
> final de implementación ni un brand pack público.

## Idea

**Misterio elegante, no cyberpunk ruidoso.** Una ciudad nocturna pierde su
memoria; la interfaz sólo interviene cuando el jugador debe actuar. El mundo
vive detrás, la decisión aparece al frente.

## Marca de trabajo

- Dirección aprobada: **abstracta y elegante**.
- Candidato de trabajo: el emblema central de
  `mockups/logo/afterimage-logo-exploration-v1.png`: dos ecos interrumpidos,
  como memoria desplazada/señal rota.
- No es marca final todavía. Debe validarse en 24 px, icono de app y sobre
  fondo claro antes de producir wordmark o assets finales.
- Nunca usar una ciudad, radio, ojo, personaje o glitch genérico como logo
  literal.

## Paleta

| Token | Hex | Uso |
|---|---:|---|
| `void` | `#070707` | fondo profundo |
| `charcoal` | `#1B1B1B` | profundidad radial y superficies oscuras |
| `frost` | `#F0F0F0` | texto primario / luz tenue |
| `muted` | `#A6A6A6` | texto secundario y trazos inactivos |
| `glass` | `rgba(255,255,255,.08)` | superficie translúcida neutral |
| `edge` | `rgba(255,255,255,.26)` | borde/sombra de foco |

**Chrome/UI base: monocromo estricto.** Fondo, glass, texto, contenedores,
controles y navegación viven en negro, gris carbón y frost neutral. Pero esto
**no aplica al contenido expresivo**: logo, iconos de producto, avatares,
ciudad, badges, logros y arte ImageGen pueden y deben usar color pleno para
dar identidad. La comprensión de un control nunca depende sólo del color: la
selección se expresa también por elevación, borde, contraste y movimiento.

## Tipografía

- Display/UI titles: **Space Grotesk**, semibold; geométrica, sobria y clara.
- Body/datos: **Inter**, regular/medium; legibilidad primero.
- Números de ronda/timers: Inter tabular. Sin fuentes "futuristas" ilegibles.

## Capas y glass

1. **City layer:** arte vivo, oscuro, profundo, máxima atmósfera.
2. **Quiet HUD:** sólo ronda, Relay, progreso y avatares esenciales.
3. **Glass action layer:** modal/sheet translúcido charcoal, borde frost fino,
   sombra blanda y radio generoso.
4. **Focus scrim:** al abrir glass bloqueante, TODO lo que queda debajo recibe
   blur + dim + desaturación uniforme y queda inerte.

El glass nunca compite con más glass. Una acción bloqueante = una modal nítida
= una intención primaria.

## Componentes

- **Primary button:** píldora frost/charcoal, copy corto con verbo (`Continue`,
  `Confirm`, `Enter`).
- **Secondary button:** contorno/frosted; nunca parece disabled.
- **Destructive/risk:** contraste neutral + icono/confirmación explícita.
- **Avatares:** discos abstractos generados, siluetas distinguibles; alias se
  puede repetir.
- **Avatar picker:** `Tap to change` abre un popup glass con opciones en
  squircles frost; el fondo entero queda blur/dim/inactivo. No usar reroll
  automático ni alterar el alias al cambiar avatar.
- **Badges/logros:** emblemas abstractos ImageGen con silueta clara a 32 px.
- **Iconos:** trazo simple de 1.5–2 px, esquinas suaves; no emojis como UI.

## Navegación y foco

- Preferir pop-up/sheet glass para: decisiones, pausa, victoria, perfiles,
  evidencia, settings, errores y logros.
- Full screen sólo para launch/entrada, alias-avatar, lobby, reveal de rol y
  salir de la partida.
- Una CTA primaria por estado. No mostrar CTAs de fondo cuando una modal está
  abierta.

### Patrón Home aprobado

- Fondo casi negro con profundidad radial `night`; sin ciudad para que el logo
  tenga peso.
- El logo/wordmark vive en Home (y splash si aplica), no como sello repetido en
  cada pantalla. Alias, lobby y juego priorizan contenido y espacio negativo.
- Setup Solo y entrada Multiplayer reutilizan una sola tarjeta glass centrada:
  pocos controles grandes, una CTA obvia y nada de paneles/ornamentos extra.
- **Excepción deliberada — directorio de lobbies:** no encerrar todo el
  directorio en una tarjeta madre. El estado vacío, `Create a lobby` y
  `Join with code` viven directamente sobre el fondo; cada control puede usar
  glass propio, pero la pantalla conserva aire y evita apariencia de dashboard.
- **Configuración de lobby:** `Create a lobby` abre una modal glass bloqueante
  y scrolleable en móvil; nunca navega a una pantalla completa. El directorio
  entero se desenfoca y oscurece para que la configuración sea el único foco.
- **Role Reveal y Game Menu:** ambos son pop-ups glass sobre el estado existente.
  Nunca presentar “Pause” en multiplayer: el menú es local y debe comunicar que
  la partida continúa para los demás.
- **Header invisible:** pantallas interiores llevan un header dentro del safe
  area: back circular a la izquierda y categoría/título a su lado (por ejemplo,
  `Multiplayer` / `Lobbies`). Sin card o franja de fondo; sólo ancla jerarquía y
  separación. Debe respetar `env(safe-area-inset-top)` para no caer en notch o
  camera cutout.
- Emblema abstracto centrado, toggle `Solo` / `Multiplayer`, un único `Play`
  grande.
- Glass nav inferior: Home, tutorial interactivo, logros y settings.
- Toggle grande/táctil: icono de una persona para Solo, grupo para Multiplayer;
  cada opción es un **squircle frost** propio dentro de un rail compartido. La
  opción elegida se eleva apenas (frost/contraste/sombra), la otra queda quieta;
  selección por borde/icono frost, no por relleno de color.
- Play y navegación usan glass gris humo, texto frost y borde pálido; no tienen
  fill de color.
- No monedas, inventario, stage cards, ads ni estadísticas en el home MVP.

## Motion y audio

- Transiciones: 180–240 ms; suave entrada de opacity/scale, nunca flashes.
- Fondo de ciudad: micro-movimiento lento; no distraer durante conversación.
- Acciones críticas: pulso háptico/audio corto opcional; respetar reduce motion
  y settings de audio.
- Dirección Home: instrumental misterioso/elegante en la línea de
  **Abstraction / Tallbeard**; debe arrancar contenido, sin competir con el
  botón Play, y atenuarse/detenerse al entrar a una partida.
- Licencia: la biblioteca general de Abstraction **no es CC0**, pero el
  [Music Loop Bundle de Tallbeard](https://tallbeard.itch.io/music-loop-bundle)
  sí declara **CC0/Public Domain** para la música contenida en ese pack, apta
  para proyectos comerciales o no comerciales. Atribución no es obligatoria,
  pero la haremos en Credits: título + Abstraction + enlace al bundle.
  Mantener un manifiesto de pistas/licencia en el repo. La política más
  restrictiva de la biblioteca general sigue aplicando a cualquier música que
  no provenga de este bundle.
- No subir archivos de audio al repo antes de seleccionar la pista exacta y
  pasar ese gate.

## Gate de mockups

Todo mock nuevo debe pasar estas preguntas:

1. ¿La ciudad vive sin robar la atención?
2. ¿Se entiende la única acción posible en menos de un segundo?
3. ¿Un overlay bloquea de verdad todo el fondo?
4. ¿Funciona sin depender de cyan/magenta para entender el estado?
5. ¿El símbolo/asset sigue siendo original y legible en miniatura?
