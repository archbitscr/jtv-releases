# JTV.app — Brief de Contexto v2 (Junio 2026)

## Stack
- Electron + Vite, Windows desktop
- renderer.js como orquestador, módulos ES en renderer/
- Persistencia: jtv_data.json via app.getPath('userData') → %APPDATA%\jtv\
- Build: npm run build → dist/win-unpacked/JTV.exe
- Claude Code CLI activo en D:\Projects\JTV.app

## Flujo de trabajo actual
- Claude (esta interfaz) = supervisor/arquitecto
- Claude Code CLI = ejecutor directo con acceso al filesystem
- Verificación: exe portátil (win-unpacked), instalable cerrado durante pruebas
- No abrir ambas versiones simultáneamente (comparten jtv_data.json)

## Arquitectura de módulos clave
- renderer/player/failover.js — ciclo de failover y overlay
- renderer/player/playerController.js — webview, watchdogs, selectChannel
- renderer/player/sourceSwitcher.js — UI del HUD de fuentes
- renderer/ui/inactivity.js — timers de cursor/menu/HUD
- renderer/ui/eventListeners.js — listeners globales
- renderer/filters/filterManager.js — filtros y lista de canales
- renderer/filters/filterAssigner.js — asignación de filtros a canales
- renderer/services/stateManager.js — persistencia de estado
- renderer/render/renderAll.js — render tree
- guest-preload.cjs — watchdog dentro del webview
- app-preload.cjs — bridge IPC renderer↔main

## Estado del Autotuner/Failover (REDISEÑADO ESTA SESIÓN)

### Orden de fuentes interno (autotuner):
['stream', 'player', 'casting', 'plus', 'watch', 'cast']
### Orden visual en HUD (usuario ve):
1, 2, 3, 4, 5, 6 (mapeo visual independiente)

### Flujo del ciclo:
1. triggerFailover() llamado por watchdog (frozen, silence, HTTP error, load fail, initial timeout)
2. Guard: si cycleInProgress || retryTimeoutId → ignora
3. runFailoverCycle(channelId) → cycleInProgress = true
4. Overlay aparece inmediatamente con no-signal.png + "Buscando fuentes alternas..."
5. tryNextSource() itera las 6 fuentes secuencialmente
6. Cada fuente: selectChannel(channel, false) + timeout de waitTime+15s
7. Si guest-playing con videoWidth>0 && videoHeight>0 → signalRestored() → overlay se oculta
8. Si todas las fuentes fallan → scheduleNextCycle()

### Retry backoff:
- retryCount 0,1,2 → 1 minuto (3 intentos)
- retryCount 3-6 → 3 minutos (4 intentos)
- retryCount 7+ → 5 minutos indefinido
- Total antes de 5min: ~15 minutos

### Sin internet:
- Evento offline detectado globalmente → cancela ciclo → overlay no-internet.png
- Evento online → resumeFailoverOnce() → reinicia desde cero

### Overlay (#no-signal-overlay):
- Ubicado dentro de #video-container (z-index: 500)
- Menus/HUD quedan encima (z-index 1000-2000)
- .hover-trigger z-index: 600 (sobre el overlay)
- glass-card sin borde/fondo/sombra
- Imagen: <img id="no-signal-icon" src="./assets/no-signal.png" height:auto>
- Assets: public/assets/no-signal.png, public/assets/no-internet.png
- Puntos animados blancos (.retry-dot)
- Texto dinámico en #no-signal-retry-text

### Triggers del watchdog:
- Trigger A: guest-frozen IPC → freezeDelay (configurable via watchdogFreeze) → verifica audio
- Trigger B: silenceCheckInterval cada 2s → umbral configurable via watchdogSilence (default 10s)
- Trigger C: onWebviewHttpError (404, etc.) → triggerFailover() inmediato
- Trigger D: onWebviewLoadFailed → triggerFailover() inmediato  
- Trigger E: initialLoadTimeout 15s → si !hasStartedPlaying → triggerFailover()
- guest-playing solo válido si videoWidth>0 && videoHeight>0

### Protecciones:
- selectChannel(channel, false) NO resetea failover ni oculta overlay (solo resetSource=true lo hace)
- signalRestored() = función única que limpia todo el estado de failover
- try/finally en ramas de failover garantizan liberación de flags

## Filtros de Eventos Arrastrables (NUEVO ESTA SESIÓN)

### Mecanismo de Drag & Drop para Eventos:
- **Habilitación de arrastre**: En `renderSettingsFilters()` en [renderAll.js](file:///d:/Projects/JTV.app/renderer/render/renderAll.js), los elementos `.filter-list-item` correspondientes a eventos reciben el atributo `draggable="true"` y `data-filter-name`.
- **Manejo del ciclo de arrastre**: `initEventsDragAndDrop()` en [renderAll.js](file:///d:/Projects/JTV.app/renderer/render/renderAll.js) adjunta listeners de eventos HTML5 (`dragstart`, `dragover`, `dragend`, `drop`) en `#list-filter-events`.
- **Reordenación dinámica**: Durante `dragover`, la posición vertical del cursor determina si el elemento arrastrado se posiciona antes o después del elemento sobre el que está flotando, usando `container.insertBefore()` para dar retroalimentación visual en tiempo real.
- **Guardado y Persistencia**: Al soltar el elemento (`drop`), se lee el nuevo orden del DOM, se actualiza `state.filterEvents` con esta secuencia, se guardan los cambios mediante `saveChannelsAndFilters()`, y se invoca `renderAll(true)` para refrescar los dropdowns del sistema.
- **Sincronización en Dropdowns**: En `populateDropdowns()` de [filterManager.js](file:///d:/Projects/JTV.app/renderer/filters/filterManager.js), se omite la ordenación alfabética para los eventos (`isEvent`), respetando el orden manual establecido.

## Fixes aplicados esta sesión
1. ✅ Sidebar favoritos ordenado por watchTime desc (filterManager.js)
2. ✅ Cursor se oculta al reproducir — delay dinámico sobre zappingHUD (inactivity.js)
3. ✅ Failover robusto con try/finally + safety timeout 30s (failover.js)
4. ✅ Watchdog delays conectados a timeoutsConfig (playerController.js)
5. ✅ Lag al marcar filtros — saveChannelsAndFilters() sin vodCache (stateManager.js, filterAssigner.js)
6. ✅ HTTP 404 dispara failover via onWebviewHttpError (playerController.js)
7. ✅ Listener cleanup con unsubscribeHttpError/unsubscribeLoadFailed
8. ✅ initialLoadTimeout 15s para fuentes sin video element
9. ✅ Rediseño completo del ciclo de failover (failover.js)
10. ✅ Overlay persistente durante ciclo — selectChannel respeta resetSource=false
11. ✅ guest-playing requiere videoWidth>0 && videoHeight>0
12. ✅ signalRestored() como función unificada
13. ✅ Overlay layers corregidos — dentro de video-container, hover-trigger z-index 600
14. ✅ Retry backoff 1/3/5 min con 15min total antes de indefinido
15. ✅ Íconos PNG no-signal/no-internet en public/assets/
16. ✅ Evento offline cancela ciclo activo
17. ✅ window.timeoutsConfig incluye watchdogSilence: 10000
18. ✅ H2 dinámico "Sin Señal"/"Sin Internet" según tipo en showNoSignalOverlay (failover.js)
19. ✅ HUD source buttons reordenados para coincidir con orden interno del autotuner (index.html)
20. ✅ Filtros de Eventos Arrastrables: Implementación de Drag & Drop (HTML5) para ordenar visualmente los eventos en Ajustes, sincronizando en tiempo real con persistencia en `jtv_data.json` y actualizando el orden de los dropdowns en la barra lateral y landing.
21. ✅ Hotkey de Barra Espaciadora: Permite alternar (Toggle) la visibilidad del HUD del selector de fuentes de forma rápida (mostrar si está oculto / ocultar si está visible), manteniendo el auto-ocultamiento por inactividad.
22. ✅ Mejoras visuales de Glassmorphism: Ajustes de opacidad en tarjetas de canales y menús de navegación, más estilo hover pulido para `hud-action-btn`.
23. ✅ Semántica HTML y minimalismo en controles de volumen: Reemplazo de etiquetas `<span>` por `<button>` con `tabindex` y `aria-label` en index.html, y reseteo de estilos nativos de botón en style.css.
24. ✅ Flexibilización del Guardián de Resolución: Modificación de `checkResolution()` para verificar el viewport lógico (innerWidth/innerHeight) en vez de la pantalla física total, reducción del límite a 1024x720, eliminación de la cuenta regresiva de auto-cierre, y adición del botón de omisión (Bypass).
25. ✅ Consistencia de Volumen y Comportamientos de Silenciador (Mute): Verificado que el zapping preserve el volumen/mute, que bajar a 0 active Mute, que desmutar desde 0 suba a 10 (100%), y que subir volumen desde 0 incremente de forma natural a 1 (10%) según el comportamiento deseado.

## Pendientes
- Migración a Cursor IDE para workflow más cómodo
- Posible optimización renderAll() con dirty checking más granular
- VOD cache separado del save de filtros (ya implementado parcialmente)

## Patrones clave
- cycleInProgress = true durante ciclo, false al terminar o cancelar
- state.failoverInProgress = true durante ciclo (guard secundario)
- resetSource=true → cambio manual de canal (limpia todo)
- resetSource=false → llamado por failover (preserva overlay y estado)
- SOURCES orden interno ≠ orden visual HUD