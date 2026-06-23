# Brief de contexto â€” JTV.app (Electron + Vite IPTV)

> Documento de traspaso para continuar trabajando en este proyecto.
> No es un resumen cronolÃ³gico â€” es el criterio de decisiÃ³n usado hasta ahora,
> para que puedas extrapolarlo a problemas nuevos, no solo repetir lo ya hecho.
> Ãšltima actualizaciÃ³n: tras el bloque de Autotuner + fix de assets en producciÃ³n.

## 1. QuÃ© es este proyecto

AplicaciÃ³n de escritorio Electron + Vite para IPTV. El dueÃ±o se autodefine como
"vibe coder": el proyecto creciÃ³ orgÃ¡nicamente, sin arquitectura planeada desde
el inicio. Eso explica varios de los problemas que aparecen abajo.

## 2. QuÃ© falta â€” backlog pendiente (lÃ©elo primero)

### Bugs/regresiones sin resolver
- **Canales nuevos no sintonizan** (IDs 5002â€“5027): los datos se ven idÃ©nticos
  en el editor a los canales que sÃ­ funcionan, pero estos no conectan. Nunca
  se investigÃ³ la causa. HipÃ³tesis sin confirmar: algo hardcodeado en la
  construcciÃ³n del URL/scraping que asume un rango de IDs o cachea fuentes
  resueltas.

### Autotuner â€” parcialmente completo
âœ… Hecho: reordenamiento de fuentes, reintento de fuente 1, sistema
anti-black-screen (ver secciÃ³n 4).
âŒ Pendiente:
- **Multifuentes de respaldo**: agregar URLs de otros sitios web (no solo
  daddylive) por canal en el editor, como fallback cuando la fuente principal
  cae por completo.
- **DiagnÃ³stico de barrido general**: no se construyÃ³ como herramienta
  dedicada, solo se mejorÃ³ el comportamiento implÃ­cito del failover.

### CRUD Developer (sin empezar)
- Secciones desplegables en editor de canales.
- Activar/desactivar canales por idioma (rendimiento + curaciÃ³n).
- Orden arrastrable del filtro "Eventos" (alfabÃ©tico + favoritos fijados
  manualmente por el usuario â€” *ojo*: el usuario pidiÃ³ esto para Eventos en
  los dropdowns del sidebar tambiÃ©n, ver secciÃ³n 6).
- RediseÃ±o del componente "AsignaciÃ³n de Filtros": hoy mezcla "selecciÃ³n
  manual para aplicar filtro nuevo" con "mostrar quÃ© canales ya tienen tal
  filtro" â€” son dos modos que deberÃ­an ser independientes. Bug conocido:
  los checkmarks no reflejan el estado real de selecciÃ³n (cambia el color
  del Ã­tem pero no el array de seleccionados â€” sospecha: dos fuentes de
  verdad desincronizadas, mismo patrÃ³n que otros bugs ya resueltos en este
  proyecto).
- Control parental con PIN + auto-declaraciÃ³n de edad para contenido 3X.

### HUD (parcialmente completo)
âœ… Hecho: badges de categorÃ­a (`hud-filter-badge`), highlight visual del
canal activo en sidebar y landing, auto-scroll al canal activo.
âŒ Pendiente:
- BotÃ³n PIN visible en el HUD.
- Opacidad glassmorph ajustable (se ve muy opaca, el usuario quiere mÃ¡s
  translÃºcido).
- Spacebar como hotkey para mostrar info de canal temporalmente (reemplazÃ³
  la idea original de tecla "0" â€” confirmado, no hace falta volver a
  preguntar cuÃ¡l usar).
- Gestor de hotkeys configurable por el usuario (secciÃ³n nueva en Ajustes).
- Gestor de tooltips (solo dev mode): activar/desactivar selectivamente por
  elemento, y definir posiciÃ³n fija por botÃ³n (ej. los de canal arriba/abajo
  siempre a la derecha).

### Filtros del sidebar (dropdowns Idioma/GÃ©nero/Eventos) â€” sin empezar
Comportamiento especÃ­fico pedido por el usuario, no estÃ¡ndar de un `<select>`:
- El dropdown en estado **cerrado** siempre muestra el nombre fijo de la
  categorÃ­a ("Idioma", "GÃ©nero", "Eventos") como tÃ­tulo â€” **no** cambia para
  reflejar la opciÃ³n seleccionada (distinto al comportamiento tÃ­pico de HTML).
- Al abrir, "Todos" es la primera opciÃ³n disponible, luego el resto.
- Para **Eventos** especÃ­ficamente: orden = Todos â†’ favoritos fijados
  manualmente por el usuario en Ajustes (ej. "Fifa 2026") â†’ resto en orden
  alfabÃ©tico. Esto depende de construir primero el "orden arrastrable" del
  CRUD Developer (ver arriba) â€” son la misma feature vista desde dos lugares.
- Hay mucho espacio vacÃ­o debajo de la fila de filtros cuando estÃ¡ colapsada
  vs. expandida â€” el usuario lo seÃ±alÃ³ pero no se llegÃ³ a tocar (distinto del
  margen ya corregido entre filtros y lista de canales, eso sÃ­ estÃ¡ resuelto).

### Infraestructura â€” sin empezar
- OTA updates (vÃ­a `electron-updater`, integraciÃ³n estÃ¡ndar dado que ya se
  usa `electron-builder`). MotivaciÃ³n: poder empujar fixes de fuente sin que
  cada usuario regenere su propio exe.
- TraducciÃ³n completa a inglÃ©s + soporte multi-idioma en Ajustes (dejar para
  el final, despuÃ©s de que el resto de UI estÃ© estable â€” evita traducir dos
  veces lo que cambie en las fases anteriores).

### Feature en duda (no implementar todavÃ­a)
- "Hall of Fame" / secciÃ³n "all time" en favoritos: destacar siempre arriba
  los canales con mÃ¡s `watchTime` acumulado, como bloque separado del resto
  de la lista. El usuario no estÃ¡ seguro de implementarlo â€” le preocupa que
  genere conflicto visual, sobre todo en el sidebar (que hoy es lista plana
  sin secciones). No proponer esto de nuevo sin que el usuario lo retome Ã©l
  mismo.

## 3. Estado de la app â€” quÃ© SÃ funciona y fue verificado en producciÃ³n real

- Refactor de modularizaciÃ³n de `renderer.js` legacy â†’ mÃ³dulos ES en
  `renderer/` (ver secciÃ³n 5 para el detalle tÃ©cnico de esa fase).
- Lista de canales del sidebar: orden alfabÃ©tico, nÃºmero de canal como badge
  a la derecha (clase compartida con badges del HUD), highlight del canal
  activo, auto-scroll centrado al abrir el menÃº.
- Landing/dashboard: mismo highlight y auto-paginaciÃ³n que el sidebar,
  unificados bajo una sola fuente de verdad de estado (ver secciÃ³n 5).
- Badges de categorÃ­a en el HUD inferior (idioma + tipo de contenido),
  leÃ­dos de `channel.categories`.
- Hotkeys completos: flechas (zapping + cambio de fuente), `+`/`-`/`*`
  (volumen/mute), `Escape`, `Ctrl+F`. Suscritos vÃ­a IPC (`onAppHotkey`) y
  vÃ­a DOM `keydown`, ambos caminos unificados en `handleHotkeyAction(key)`.
- Autotuner: orden de fuentes `[stream, watch, player, plus, cast, casting]`
  (prioridad 1,3,6,4,2,5 â€” `cast`/`casting` casi nunca funcionan pero a
  veces sÃ­, por eso quedan como Ãºltimo recurso en vez de eliminarse).
  Reintento de fuente 1 antes de continuar el barrido. Sistema
  anti-black-screen con dos triggers independientes que conviven (ver
  secciÃ³n 4 para el detalle de diseÃ±o â€” **importante leerlo antes de tocar
  failover.js otra vez**).
- Wallpapers, tarjetas del Home Dashboard, y logo de Google del buscador VOD
  cargan correctamente en el `.exe` empaquetado (instalador y portable) â€” ver
  secciÃ³n 5 para la causa raÃ­z y el fix, era un bug de build, no de UI.

## 4. DiseÃ±o del sistema Anti-Black-Screen (autotuner) â€” leer antes de tocar

Dos triggers independientes que pueden coexistir, ambos respetan
`state.failoverInProgress` para no dispararse dos veces:

- **Trigger A (freeze de video)**: reacciona a la seÃ±al `guest-frozen`
  (currentTime estancado). Si ya se confirmÃ³ reproducciÃ³n
  (`hasStartedPlaying`), da una ventana de gracia de 4s antes de actuar â€”
  si pasados los 4s no se recupera Y no hay audio (vÃ­a IPC
  `isCurrentlyAudible`), dispara failover. Si hay audio, es falso positivo
  (pantalla negra pero el audio sigue vivo) y se ignora.
- **Trigger B (silencio sostenido, independiente de freeze)**: monitoreo
  periÃ³dico (cada 2s) de audio vÃ­a IPC. Si hay 10 segundos continuos de
  silencio Y el usuario no tiene mute activado manualmente, dispara
  failover â€” esto cubre el caso real reportado (fuente 2 con pantalla negra
  pero `currentTime` avanzando con normalidad, donde `guest-frozen` nunca se
  activarÃ­a).
- **Puente IPC**: `main/ipc/registerAudioIpc.js` expone
  `isCurrentlyAudible()` (usa `event.sender.isCurrentlyAudible()` de
  Electron) vÃ­a `window.jtvAPI` en `app-preload.cjs`.
- **Reset de ambos triggers**: centralizado en `resetAntiBlackScreen()`,
  llamado al inicio de `mountRemotePlayer()` (cubre cambio de canal, zapping,
  cambio manual de fuente, VOD) y tambiÃ©n desde `navigation.js` al destruir
  el `playerContainer` (volver al Dashboard).
- **Verificado en ejecuciÃ³n real** (no solo diseÃ±o): Trigger B confirmado
  con logs reales mostrando el conteo de silencio 2sâ†’10s, el disparo del
  failover, y la recuperaciÃ³n tras reintentar la fuente. Trigger A solo
  verificado por revisiÃ³n de cÃ³digo, no se forzÃ³ un freeze real todavÃ­a â€”
  si se quiere confirmar, usar el mismo mÃ©todo de inyecciÃ³n por IPC que
  funcionÃ³ para Trigger B (ver secciÃ³n 6, nota sobre DevTools).
- **No tocar los timeouts de conexiÃ³n inicial** (`failoverMain`/`failoverAlt`)
  â€” son distintos a la ventana de 4s del Trigger A, que solo aplica a corte
  sÃºbito de una fuente que ya estaba funcionando, no a la conexiÃ³n inicial.

## 5. Decisiones de arquitectura tomadas (y por quÃ©)

- **`channels` se mantiene como buffer local mutable** (`let channels =
  state.channels`) en `eventListeners.js`, NO como `state.channels` directo
  en cada uso. El cÃ³digo original reasigna `channels = channels.filter(...)`
  en varios puntos para CRUD; migrar a reasignaciÃ³n directa de
  `state.channels` romperÃ­a el vÃ­nculo con el estado real.
- **`zapSourceTab`** (valores `'channels'`/`'favorites'`) es la **Ãºnica**
  fuente de verdad para "quÃ© lista estÃ¡ activa" â€” landing y sidebar. Antes
  existÃ­an dos variables separadas (`dashboardNavMode` con valores
  `'all'`/`'favorites'`, y `zapSourceTab`) que podÃ­an desincronizarse; se
  unificaron en una sola. Se persiste en `jtv_data.json`, default `'channels'`
  en instalaciÃ³n fresca. Cualquier cambio de canal (desde donde sea: landing,
  sidebar, hotkeys, Home) debe actualizar esta variable, nunca leer el DOM
  para inferir el modo activo.
- **Favoritos del landing se ordenan por `watchTime` descendente** (no
  alfabÃ©tico, a diferencia del sidebar). Es decisiÃ³n de diseÃ±o confirmada,
  no bug â€” el canal mÃ¡s visto sube solo a la primera pÃ¡gina, lo que
  funciona como una forma implÃ­cita de "recordar dÃ³nde estabas".
- **PaginaciÃ³n y contenido del landing deben leer de la MISMA funciÃ³n**
  (`getFilteredLiveChannels()` en `favoritesGrid.js`) â€” habÃ­a un bug donde
  el botÃ³n "siguiente" tenÃ­a `c.favorite` hardcodeado mientras el contenido
  sÃ­ respetaba `zapSourceTab`, causando que el conteo de pÃ¡ginas no
  coincidiera con lo mostrado. PatrÃ³n a vigilar: cualquier componente nuevo
  que filtre/pagine debe centralizar el filtrado en una sola funciÃ³n, nunca
  duplicarlo entre el render y los controles de navegaciÃ³n.
- **`addFilterToChannel`** se moviÃ³ de `eventListeners.js` a
  `filterManager.js` como `bindAddFilterToChannel({ getChannels,
  getCurrentEditingChannelId, renderAll })` â€” dependencias explÃ­citas, NO
  closures. PatrÃ³n a seguir para cualquier handler suelto que se descubra.
- **`updateSourceSwitcherUI`** vivÃ­a en el `renderer.js` legacy (nunca
  migrado). Se extrajo a `renderer/player/sourceSwitcher.js`. PatrÃ³n: crear
  el mÃ³dulo correspondiente, no parchear donde se descubriÃ³ el error.
- **Bug recurrente de "doble fuente de verdad"**: ya apareciÃ³ tres veces en
  este proyecto (badges de canal nunca conectados pese a tener CSS listo,
  `dashboardNavMode`/`zapSourceTab` divergiendo, paginaciÃ³n vs. contenido del
  landing con filtros distintos). Antes de dar por bueno un componente que
  "casi funciona", buscar explÃ­citamente si hay dos piezas leyendo de fuentes
  de datos distintas.
- **Bug recurrente de "Vite no procesa rutas dinÃ¡micas/CSS sin barra
  inicial"**: assets en `assets/` (sin pasar por `public/`) se rompÃ­an en
  producciÃ³n porque Vite los hasheaba en JS pero no en strings dinÃ¡micos, y
  en CSS sin `/` inicial los dejaba sin resolver. Fix: mover toda la carpeta
  a `public/assets/` (Vite la copia tal cual, sin tocar rutas) â€” mÃ¡s simple
  y seguro que reescribir cada referencia. Para CSS especÃ­ficamente, las
  rutas a `public/` necesitan barra inicial (`url('/assets/...')`).
- **NingÃºn agente de IA puede ver la interfaz grÃ¡fica del `.exe` empaquetado.**
  Una "verificaciÃ³n visual" reportada por un modelo sin capturas de pantalla
  reales (vÃ­a automatizaciÃ³n) debe tratarse como no confirmada hasta que el
  usuario la vea con sus propios ojos.

## 6. Principios de proceso que funcionaron (replicar)

- **Evidencia antes que exploraciÃ³n ciega.** Nunca pedir "revisa todo el
  proyecto" â€” siempre: ejecutar, leer consola/logs real, trabajar desde ahÃ­.
- **Verificar antes de asumir, incluso con patrones que parecen obvios.**
- **Separar "investigar" de "aplicar fix".** Reporte de hallazgos y pausa
  explÃ­cita antes de tocar cÃ³digo, sobre todo en piezas delicadas (failover,
  IPC entre procesos).
- **Sub-bloques pequeÃ±os con commit + recarga + consola despuÃ©s de cada uno.**
- **Git como red de seguridad obligatoria** antes de cualquier fix con
  alcance amplio.
- **Cuando un test automatizado da un resultado inesperado, repÃ³rtalo como
  fallo explÃ­cito** â€” no lo envuelvas dentro de un resumen de "Ã©xito". PasÃ³
  una vez con la paginaciÃ³n del landing (resultÃ³ ser expectativa del test
  mal calculada, no bug real, pero el reporte inicial lo escondiÃ³).
- **Distinguir "ejecuciÃ³n real" de "ejemplo ilustrativo de cÃ³mo se verÃ­a
  el log"** â€” un modelo puede mostrar un log de consola que nunca ocurriÃ³,
  como muestra de "esto es lo que deberÃ­a pasar". Pedir confirmaciÃ³n
  explÃ­cita de si algo se verificÃ³ en runtime real o no.
- **Nota sobre DevTools en este proyecto**: `Ctrl+Shift+I` no abre las
  DevTools de forma confiable (interferencia de `getTypingState()`,
  posible config de ventana, foco del `<webview>` del reproductor). La forma
  confiable de verificar comportamiento en runtime es el mecanismo de
  automatizaciÃ³n ya existente (`run-automation-script.tmp` +
  `main/diagnostics/watchers.js`), incluyendo inyectar valores falsos
  directo en el handler de IPC cuando hace falta simular una condiciÃ³n
  (como se hizo para forzar silencio y probar el Trigger B).
- **Plan de relevo entre IDEs**: un solo IDE corriendo a la vez sobre la
  carpeta del proyecto, nunca en simultÃ¡neo. Cerrar procesos huÃ©rfanos
  (`electron`, `JTV`, `node`) antes de cambiar de herramienta. Hacer commit
  de todo lo pendiente antes del cambio.
- **Punto y aparte para regenerar el exe**: cada vez que se acumulan ~3+
  commits funcionales, o antes/despuÃ©s de tocar audio/video/reproducciÃ³n,
  conviene regenerar `dist/win-unpacked/JTV.exe` y probarlo a mano (no solo
  confiar en automatizaciÃ³n) antes de seguir acumulando cambios.

## 7. Modelos usados en este proyecto

Trabajo hecho en el IDE Trae (no tiene modelos de Anthropic disponibles),
alternando entre **MiniMax-M3** y **Gemini 3.1 Pro Preview** segÃºn
disponibilidad de cuota. Ambos mostraron fortalezas similares (buena
investigaciÃ³n antes de aplicar fixes, manejo correcto de decisiones de
arquitectura una vez seÃ±aladas) y tropiezos puntuales distintos â€” ninguno
se ha mostrado claramente superior todavÃ­a. Trae tiene activado "Turbo Mode"
(ejecuciÃ³n automÃ¡tica, lista de denegaciÃ³n en vez de aprobaciÃ³n explÃ­cita),
lo que a veces causa que se salte instrucciones de "solo investigar, no
apliques fix todavÃ­a" â€” vale la pena repetir esa instrucciÃ³n explÃ­citamente
en cada prompt cuando se quiere pausa antes de ejecutar.

## 8. Estado del repositorio

Sin remoto configurado (solo git local). Demasiados commits para listar
todos aquÃ­ â€” usar `git log --oneline -n 40` para ver la lÃ­nea completa.
Ãšltimos commits relevantes al cierre de esta sesiÃ³n:

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

El estado mÃ¡s antiguo (refactor de modularizaciÃ³n, Sub-bloques Aâ€“D) sigue
intacto mÃ¡s abajo en el historial â€” usar `git log --oneline` completo si
hace falta ese contexto tÃ©cnico especÃ­fico.
