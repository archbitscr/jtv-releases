# Brief de contexto — JTV.app (Electron + Vite IPTV)

> Documento de traspaso para continuar trabajando en este proyecto.
> No es un resumen cronológico — es el criterio de decisión usado hasta ahora,
> para que puedas extrapolarlo a problemas nuevos, no solo repetir lo ya hecho.
> Última actualización: tras el bloque de Autotuner + fix de assets en producción.

## 1. Qué es este proyecto

Aplicación de escritorio Electron + Vite para IPTV. El dueño se autodefine como
"vibe coder": el proyecto creció orgánicamente, sin arquitectura planeada desde
el inicio. Eso explica varios de los problemas que aparecen abajo.

## 2. Qué falta — backlog pendiente (léelo primero)

### Bugs/regresiones sin resolver
- **Canales nuevos no sintonizan** (IDs 5002–5027): los datos se ven idénticos
  en el editor a los canales que sí funcionan, pero estos no conectan. Nunca
  se investigó la causa. Hipótesis sin confirmar: algo hardcodeado en la
  construcción del URL/scraping que asume un rango de IDs o cachea fuentes
  resueltas.

### Autotuner — parcialmente completo
✅ Hecho: reordenamiento de fuentes, reintento de fuente 1, sistema
anti-black-screen (ver sección 4).
❌ Pendiente:
- **Multifuentes de respaldo**: agregar URLs de otros sitios web (no solo
  daddylive) por canal en el editor, como fallback cuando la fuente principal
  cae por completo.
- **Diagnóstico de barrido general**: no se construyó como herramienta
  dedicada, solo se mejoró el comportamiento implícito del failover.

### CRUD Developer (sin empezar)
- Secciones desplegables en editor de canales.
- Activar/desactivar canales por idioma (rendimiento + curación).
- Orden arrastrable del filtro "Eventos" (alfabético + favoritos fijados
  manualmente por el usuario — *ojo*: el usuario pidió esto para Eventos en
  los dropdowns del sidebar también, ver sección 6).
- Rediseño del componente "Asignación de Filtros": hoy mezcla "selección
  manual para aplicar filtro nuevo" con "mostrar qué canales ya tienen tal
  filtro" — son dos modos que deberían ser independientes. Bug conocido:
  los checkmarks no reflejan el estado real de selección (cambia el color
  del ítem pero no el array de seleccionados — sospecha: dos fuentes de
  verdad desincronizadas, mismo patrón que otros bugs ya resueltos en este
  proyecto).
- Control parental con PIN + auto-declaración de edad para contenido 3X.

### HUD (parcialmente completo)
✅ Hecho: badges de categoría (`hud-filter-badge`), highlight visual del
canal activo en sidebar y landing, auto-scroll al canal activo.
❌ Pendiente:
- Botón PIN visible en el HUD.
- Opacidad glassmorph ajustable (se ve muy opaca, el usuario quiere más
  translúcido).
- Spacebar como hotkey para mostrar info de canal temporalmente (reemplazó
  la idea original de tecla "0" — confirmado, no hace falta volver a
  preguntar cuál usar).
- Gestor de hotkeys configurable por el usuario (sección nueva en Ajustes).
- Gestor de tooltips (solo dev mode): activar/desactivar selectivamente por
  elemento, y definir posición fija por botón (ej. los de canal arriba/abajo
  siempre a la derecha).

### Filtros del sidebar (dropdowns Idioma/Género/Eventos) — sin empezar
Comportamiento específico pedido por el usuario, no estándar de un `<select>`:
- El dropdown en estado **cerrado** siempre muestra el nombre fijo de la
  categoría ("Idioma", "Género", "Eventos") como título — **no** cambia para
  reflejar la opción seleccionada (distinto al comportamiento típico de HTML).
- Al abrir, "Todos" es la primera opción disponible, luego el resto.
- Para **Eventos** específicamente: orden = Todos → favoritos fijados
  manualmente por el usuario en Ajustes (ej. "Fifa 2026") → resto en orden
  alfabético. Esto depende de construir primero el "orden arrastrable" del
  CRUD Developer (ver arriba) — son la misma feature vista desde dos lugares.
- Hay mucho espacio vacío debajo de la fila de filtros cuando está colapsada
  vs. expandida — el usuario lo señaló pero no se llegó a tocar (distinto del
  margen ya corregido entre filtros y lista de canales, eso sí está resuelto).

### Infraestructura — sin empezar
- OTA updates (vía `electron-updater`, integración estándar dado que ya se
  usa `electron-builder`). Motivación: poder empujar fixes de fuente sin que
  cada usuario regenere su propio exe.
- Traducción completa a inglés + soporte multi-idioma en Ajustes (dejar para
  el final, después de que el resto de UI esté estable — evita traducir dos
  veces lo que cambie en las fases anteriores).

### Feature en duda (no implementar todavía)
- "Hall of Fame" / sección "all time" en favoritos: destacar siempre arriba
  los canales con más `watchTime` acumulado, como bloque separado del resto
  de la lista. El usuario no está seguro de implementarlo — le preocupa que
  genere conflicto visual, sobre todo en el sidebar (que hoy es lista plana
  sin secciones). No proponer esto de nuevo sin que el usuario lo retome él
  mismo.

## 3. Estado de la app — qué SÍ funciona y fue verificado en producción real

- Refactor de modularización de `renderer.js` legacy → módulos ES en
  `renderer/` (ver sección 5 para el detalle técnico de esa fase).
- Lista de canales del sidebar: orden alfabético, número de canal como badge
  a la derecha (clase compartida con badges del HUD), highlight del canal
  activo, auto-scroll centrado al abrir el menú.
- Landing/dashboard: mismo highlight y auto-paginación que el sidebar,
  unificados bajo una sola fuente de verdad de estado (ver sección 5).
- Badges de categoría en el HUD inferior (idioma + tipo de contenido),
  leídos de `channel.categories`.
- Hotkeys completos: flechas (zapping + cambio de fuente), `+`/`-`/`*`
  (volumen/mute), `Escape`, `Ctrl+F`. Suscritos vía IPC (`onAppHotkey`) y
  vía DOM `keydown`, ambos caminos unificados en `handleHotkeyAction(key)`.
- Autotuner: orden de fuentes `[stream, watch, player, plus, cast, casting]`
  (prioridad 1,3,6,4,2,5 — `cast`/`casting` casi nunca funcionan pero a
  veces sí, por eso quedan como último recurso en vez de eliminarse).
  Reintento de fuente 1 antes de continuar el barrido. Sistema
  anti-black-screen con dos triggers independientes que conviven (ver
  sección 4 para el detalle de diseño — **importante leerlo antes de tocar
  failover.js otra vez**).
- Wallpapers, tarjetas del Home Dashboard, y logo de Google del buscador VOD
  cargan correctamente en el `.exe` empaquetado (instalador y portable) — ver
  sección 5 para la causa raíz y el fix, era un bug de build, no de UI.

## 4. Diseño del sistema Anti-Black-Screen (autotuner) — leer antes de tocar

Dos triggers independientes que pueden coexistir, ambos respetan
`state.failoverInProgress` para no dispararse dos veces:

- **Trigger A (freeze de video)**: reacciona a la señal `guest-frozen`
  (currentTime estancado). Si ya se confirmó reproducción
  (`hasStartedPlaying`), da una ventana de gracia de 4s antes de actuar —
  si pasados los 4s no se recupera Y no hay audio (vía IPC
  `isCurrentlyAudible`), dispara failover. Si hay audio, es falso positivo
  (pantalla negra pero el audio sigue vivo) y se ignora.
- **Trigger B (silencio sostenido, independiente de freeze)**: monitoreo
  periódico (cada 2s) de audio vía IPC. Si hay 10 segundos continuos de
  silencio Y el usuario no tiene mute activado manualmente, dispara
  failover — esto cubre el caso real reportado (fuente 2 con pantalla negra
  pero `currentTime` avanzando con normalidad, donde `guest-frozen` nunca se
  activaría).
- **Puente IPC**: `main/ipc/registerAudioIpc.js` expone
  `isCurrentlyAudible()` (usa `event.sender.isCurrentlyAudible()` de
  Electron) vía `window.jtvAPI` en `app-preload.cjs`.
- **Reset de ambos triggers**: centralizado en `resetAntiBlackScreen()`,
  llamado al inicio de `mountRemotePlayer()` (cubre cambio de canal, zapping,
  cambio manual de fuente, VOD) y también desde `navigation.js` al destruir
  el `playerContainer` (volver al Dashboard).
- **Verificado en ejecución real** (no solo diseño): Trigger B confirmado
  con logs reales mostrando el conteo de silencio 2s→10s, el disparo del
  failover, y la recuperación tras reintentar la fuente. Trigger A solo
  verificado por revisión de código, no se forzó un freeze real todavía —
  si se quiere confirmar, usar el mismo método de inyección por IPC que
  funcionó para Trigger B (ver sección 6, nota sobre DevTools).
- **No tocar los timeouts de conexión inicial** (`failoverMain`/`failoverAlt`)
  — son distintos a la ventana de 4s del Trigger A, que solo aplica a corte
  súbito de una fuente que ya estaba funcionando, no a la conexión inicial.

## 5. Decisiones de arquitectura tomadas (y por qué)

- **`channels` se mantiene como buffer local mutable** (`let channels =
  state.channels`) en `eventListeners.js`, NO como `state.channels` directo
  en cada uso. El código original reasigna `channels = channels.filter(...)`
  en varios puntos para CRUD; migrar a reasignación directa de
  `state.channels` rompería el vínculo con el estado real.
- **`zapSourceTab`** (valores `'channels'`/`'favorites'`) es la **única**
  fuente de verdad para "qué lista está activa" — landing y sidebar. Antes
  existían dos variables separadas (`dashboardNavMode` con valores
  `'all'`/`'favorites'`, y `zapSourceTab`) que podían desincronizarse; se
  unificaron en una sola. Se persiste en `jtv_data.json`, default `'channels'`
  en instalación fresca. Cualquier cambio de canal (desde donde sea: landing,
  sidebar, hotkeys, Home) debe actualizar esta variable, nunca leer el DOM
  para inferir el modo activo.
- **Favoritos del landing se ordenan por `watchTime` descendente** (no
  alfabético, a diferencia del sidebar). Es decisión de diseño confirmada,
  no bug — el canal más visto sube solo a la primera página, lo que
  funciona como una forma implícita de "recordar dónde estabas".
- **Paginación y contenido del landing deben leer de la MISMA función**
  (`getFilteredLiveChannels()` en `favoritesGrid.js`) — había un bug donde
  el botón "siguiente" tenía `c.favorite` hardcodeado mientras el contenido
  sí respetaba `zapSourceTab`, causando que el conteo de páginas no
  coincidiera con lo mostrado. Patrón a vigilar: cualquier componente nuevo
  que filtre/pagine debe centralizar el filtrado en una sola función, nunca
  duplicarlo entre el render y los controles de navegación.
- **`addFilterToChannel`** se movió de `eventListeners.js` a
  `filterManager.js` como `bindAddFilterToChannel({ getChannels,
  getCurrentEditingChannelId, renderAll })` — dependencias explícitas, NO
  closures. Patrón a seguir para cualquier handler suelto que se descubra.
- **`updateSourceSwitcherUI`** vivía en el `renderer.js` legacy (nunca
  migrado). Se extrajo a `renderer/player/sourceSwitcher.js`. Patrón: crear
  el módulo correspondiente, no parchear donde se descubrió el error.
- **Bug recurrente de "doble fuente de verdad"**: ya apareció tres veces en
  este proyecto (badges de canal nunca conectados pese a tener CSS listo,
  `dashboardNavMode`/`zapSourceTab` divergiendo, paginación vs. contenido del
  landing con filtros distintos). Antes de dar por bueno un componente que
  "casi funciona", buscar explícitamente si hay dos piezas leyendo de fuentes
  de datos distintas.
- **Bug recurrente de "Vite no procesa rutas dinámicas/CSS sin barra
  inicial"**: assets en `assets/` (sin pasar por `public/`) se rompían en
  producción porque Vite los hasheaba en JS pero no en strings dinámicos, y
  en CSS sin `/` inicial los dejaba sin resolver. Fix: mover toda la carpeta
  a `public/assets/` (Vite la copia tal cual, sin tocar rutas) — más simple
  y seguro que reescribir cada referencia. Para CSS específicamente, las
  rutas a `public/` necesitan barra inicial (`url('/assets/...')`).
- **Ningún agente de IA puede ver la interfaz gráfica del `.exe` empaquetado.**
  Una "verificación visual" reportada por un modelo sin capturas de pantalla
  reales (vía automatización) debe tratarse como no confirmada hasta que el
  usuario la vea con sus propios ojos.

## 6. Principios de proceso que funcionaron (replicar)

- **Evidencia antes que exploración ciega.** Nunca pedir "revisa todo el
  proyecto" — siempre: ejecutar, leer consola/logs real, trabajar desde ahí.
- **Verificar antes de asumir, incluso con patrones que parecen obvios.**
- **Separar "investigar" de "aplicar fix".** Reporte de hallazgos y pausa
  explícita antes de tocar código, sobre todo en piezas delicadas (failover,
  IPC entre procesos).
- **Sub-bloques pequeños con commit + recarga + consola después de cada uno.**
- **Git como red de seguridad obligatoria** antes de cualquier fix con
  alcance amplio.
- **Cuando un test automatizado da un resultado inesperado, repórtalo como
  fallo explícito** — no lo envuelvas dentro de un resumen de "éxito". Pasó
  una vez con la paginación del landing (resultó ser expectativa del test
  mal calculada, no bug real, pero el reporte inicial lo escondió).
- **Distinguir "ejecución real" de "ejemplo ilustrativo de cómo se vería
  el log"** — un modelo puede mostrar un log de consola que nunca ocurrió,
  como muestra de "esto es lo que debería pasar". Pedir confirmación
  explícita de si algo se verificó en runtime real o no.
- **Nota sobre DevTools en este proyecto**: `Ctrl+Shift+I` no abre las
  DevTools de forma confiable (interferencia de `getTypingState()`,
  posible config de ventana, foco del `<webview>` del reproductor). La forma
  confiable de verificar comportamiento en runtime es el mecanismo de
  automatización ya existente (`run-automation-script.tmp` +
  `main/diagnostics/watchers.js`), incluyendo inyectar valores falsos
  directo en el handler de IPC cuando hace falta simular una condición
  (como se hizo para forzar silencio y probar el Trigger B).
- **Plan de relevo entre IDEs**: un solo IDE corriendo a la vez sobre la
  carpeta del proyecto, nunca en simultáneo. Cerrar procesos huérfanos
  (`electron`, `JTV`, `node`) antes de cambiar de herramienta. Hacer commit
  de todo lo pendiente antes del cambio.
- **Punto y aparte para regenerar el exe**: cada vez que se acumulan ~3+
  commits funcionales, o antes/después de tocar audio/video/reproducción,
  conviene regenerar `dist/win-unpacked/JTV.exe` y probarlo a mano (no solo
  confiar en automatización) antes de seguir acumulando cambios.

## 7. Modelos usados en este proyecto

Trabajo hecho en el IDE Trae (no tiene modelos de Anthropic disponibles),
alternando entre **MiniMax-M3** y **Gemini 3.1 Pro Preview** según
disponibilidad de cuota. Ambos mostraron fortalezas similares (buena
investigación antes de aplicar fixes, manejo correcto de decisiones de
arquitectura una vez señaladas) y tropiezos puntuales distintos — ninguno
se ha mostrado claramente superior todavía. Trae tiene activado "Turbo Mode"
(ejecución automática, lista de denegación en vez de aprobación explícita),
lo que a veces causa que se salte instrucciones de "solo investigar, no
apliques fix todavía" — vale la pena repetir esa instrucción explícitamente
en cada prompt cuando se quiere pausa antes de ejecutar.

## 8. Estado del repositorio

Sin remoto configurado (solo git local). Demasiados commits para listar
todos aquí — usar `git log --oneline -n 40` para ver la línea completa.
Últimos commits relevantes al cierre de esta sesión:

```
fix: resolver rutas relativas de tarjetas del home en CSS anadiendo barra inicial
fix: mover assets/ a public/assets/ para que Vite los empaquete correctamente en produccion
feat: anti-black-screen con deteccion de freeze y silencio sostenido via IPC audio
feat: reordenar prioridad de fuentes y agregar reintento de fuente 1 en autotuner
refactor: unificar dashboardNavMode y zapSourceTab en zapSourceTab persistente
fix: unificar filtrado de landing (paginacion desincronizada) y resync automatico al entrar
feat: resaltar canal activo en grid del landing
feat: modo de zapping explicito basado en state.zapSourceTab
feat: auto-scroll al canal activo en menu lateral
feat: resaltar visualmente el canal activo en menu lateral
fix: corregir margen de filtros y comportamiento de toggle no persistente
fix: orden alfabetico de canales, numero como badge, ajuste de margenes
refactor: renombrar hud-filter-chip a hud-filter-badge
feat: implementar chips de categoria en HUD (Tarea 28)
```

El estado más antiguo (refactor de modularización, Sub-bloques A–D) sigue
intacto más abajo en el historial — usar `git log --oneline` completo si
hace falta ese contexto técnico específico.

## 9. Hallazgos post-build — pendientes para la próxima sesión

Detectados tras pruebas manuales en el exe empaquetado, al cierre de esta
conversación:

### Bugs confirmados en producción real
- **Sidebar favoritos no ordena por watchTime**: el landing sí lo hace
  correctamente, pero la lista de Favoritos en el sidebar sigue mostrando
  orden alfabético. El comportamiento correcto es: lista "Todos" → alfabético,
  lista "Favoritos" → watchTime descendente, **en ambos lugares** (landing Y
  sidebar). Solo falta aplicar el mismo criterio de ordenamiento que ya usa
  `favoritesGrid.js` a `channelList.js` para la pestaña de favoritos.

- **Mouse no se oculta al reproducir un canal**: regresión confirmada,
  nunca se investigó la causa. Estaba en el backlog desde el inicio como
  "probable regresión desde v2.0, agravada por el refactor".

- **Black screen sin overlay tras uso prolongado (Autotuner)**: al dejar
  la app corriendo horas, el canal quedó en pantalla negra sin el overlay
  de "sin señal". Diagnóstico: el ciclo de reintentos del Trigger B
  probablemente disparó failover varias veces y eventualmente quedó con
  `failoverInProgress` bloqueado en `true`, sin llegar nunca al estado
  final de "sin señal" (overlay). El sistema necesita un **estado final
  garantizado**: si se agotan todas las fuentes sin éxito, siempre debe
  mostrar el overlay, nunca quedarse en limbo de pantalla negra. La
  ausencia del overlay es la prueba de que el bug es de estado intermedio
  bloqueado, no de "no hay señal real".

### Verificación pendiente del Autotuner
- **Timeouts configurables en Ajustes vs. valores hardcodeados**: existe
  en Ajustes una opción para configurar manualmente los timeouts de menús
  y de intentos de sintonía (`failoverMain`/`failoverAlt`). No está
  confirmado si la ventana de 4s del Trigger A y los 10s del Trigger B
  del nuevo sistema anti-black-screen están conectados a esa configuración
  existente, o si quedaron hardcodeados en el código. Hay que verificarlo
  — si están hardcodeados, deben conectarse a los mismos ajustes
  configurables que ya controlan el resto del Autotuner.
