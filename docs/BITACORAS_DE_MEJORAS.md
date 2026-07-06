# Bitácora de Mejoras y Modificaciones - JTV.app

Este documento unifica de forma cronológica todas las mejoras, características de usabilidad, correcciones de errores, refactorizaciones y planes de seguridad implementados en el proyecto JTV.app, así como la hoja de ruta de tareas pendientes de desarrollo solicitadas por el usuario.

**Política de versionado (desde v2.3.9):** cada tarea de la hoja de ruta que se completa incluye como subtarea un bump del patch version (`package.json`, `package-lock.json`, `<title>` de `index.html`, footer "JTV Version" en Settings) y build de verificación. La versión asignada a cada tarea se anota en su entrada al completarse — no se reserva de antemano, ya que el orden de ejecución lo decide el usuario. Última versión: **v2.3.10** (Tarea 37). Próxima disponible: **v2.3.11**.

---

## I. Historial Cronológico de Mejoras Implementadas

### Mejoras y Características de Usabilidad Previas (Pre-Junio 2026)
*   **Caché de Prefetching para VOD (Series y Películas)**: Añadido un sistema de caché persistente que precarga los primeros 100 títulos de Series y Películas en el arranque. Los datos se guardan en `jtv_data.json` para evitar demoras de red.
*   **Soporte de Enlaces Externos y Leyenda de Versión**: Traslado de la leyenda de versión al pie del sidebar. Implementación de IPC para abrir enlaces externos (ej. `ARCHBITS.xyz`) en el navegador predeterminado del sistema operativo mediante `shell.openExternal`.
*   **Botón de Limpieza (X) en Buscadores y Auto-Scroll**: Adición de botones de limpieza rápida (X) en los campos de búsqueda de En Vivo y VOD. Cuando se realiza una búsqueda numérica, el contenedor se desplaza automáticamente al inicio para mostrar los resultados en orden ascendente desde el primer canal.
*   **Optimización del Panel CRUD de Canales**: Eliminada la altura fija de 450px en Ajustes; aplicado contenedor flexible (`flex: 1`, `min-height: 0`). Agregada fila seleccionada persistentemente con scroll automático para el canal en edición, columnas fijas a 50/50 y barras de scroll minimalistas. Homogeneización de estilos de botones a la paleta nativa (`.settings-action-btn` y `.danger-btn`).
*   **Atajo de Pantalla Completa (Tecla F)**: Migrado el atajo de pantalla completa de la tecla `Esc` a la tecla `F`. Se ignora la repetición de pulsaciones y se deshabilita cuando el usuario está escribiendo en campos de texto.

---

### [2026-06-15] - Parches de TV, Audio, Filtros y Estabilización General
*   **Corrección de Canales PPV (DaddyLive)**: Agregados los nuevos dominios de streaming e iframe al arreglo `ALLOWED_DOMAINS` en [policyConfig.js](file:///d:/Projects/JTV.app/main/network/policyConfig.js) para evadir el bloqueo ZeroTrust. Resolución dinámica de cabeceras `Referer` y `Origin` en [requestPolicy.js](file:///d:/Projects/JTV.app/main/network/requestPolicy.js) basándose en `globalDomain` guardado dinámicamente en el estado global.
*   **Persistencia de Volumen y Silencio (Mute) en Cambio de Canal**: Sincronización inmediata del estado de mute del host al `webContents` guest en el evento `did-attach-webview` en [createMainWindow.js](file:///d:/Projects/JTV.app/main/windows/createMainWindow.js). Optimización en [guest-preload.cjs](file:///d:/Projects/JTV.app/guest-preload.cjs) para silenciar el vídeo si `currentVolumeLevel === 0` o `hostIsMuted` es verdadero, evitando filtraciones de audio al cambiar de canal.
*   **Bucle del Modal de Onboarding**: Corrección en [renderer.js](file:///d:/Projects/JTV.app/renderer.js) para guardar `onboarded` y `selectedLanguages` en el archivo físico `jtv_data.json` y restaurarlos en local-storage durante el arranque.
*   **Elementos Custom Select**: Modificación de botones de opción `.dash-custom-select-option` de `<button type="button">` a `<div>` para evitar envíos de formulario involuntarios en el DOM.
*   **Restauración de Navegación por Teclado en Inputs**: Implementación de verificación de estado de escritura en [createMainWindow.js](file:///d:/Projects/JTV.app/main/windows/createMainWindow.js) mediante `getTypingState()`, evitando que Electron bloquee el uso de flechas de dirección, `Escape` y operadores matemáticos mientras el usuario escribe en un campo de entrada.
*   **Autoplay y Resumido de AudioContext**: Comando de arranque `autoplay-policy` deshabilitando la restricción de gestos en [bootstrap.js](file:///d:/Projects/JTV.app/main/bootstrap.js), y llamada automatizada continua a `audioCtx.resume()` en [guest-preload.cjs](file:///d:/Projects/JTV.app/guest-preload.cjs) si el contexto está suspendido.
*   **Asignación de Filtros en Lote (Bulk)**: Rediseño de la interfaz a "Asignación de Filtros" y reemplazo del índice único por `assignerSelectedChannelIndices` para soporte de selección múltiple (Ctrl+Click, Shift+Click, Checkbox individual). Integrado el filtrado dinámico bidireccional (seleccionar filtros marca todos los canales que los posean).
*   **Ordenación de Categorías**: Helper `sortCategories(cats)` que fuerza que `"all"` aparezca siempre primero, seguido de Idiomas, Géneros, Eventos, y finalmente otras categorías secundarias alfabéticamente.
*   **Redireccionamiento del Botón Ajustes**: Configurado el clic del botón de Ajustes en el HUD inferior para abrir Ajustes en la pestaña **Filtros** pre-seleccionando el canal activo para facilitar su edición.
*   **Corrección de Lista de Favoritos (Sidebar)**: Agregada etiqueta `</div>` de cierre faltante en [index.html](file:///d:/Projects/JTV.app/index.html) para el contenedor de la pestaña canales, solucionando problemas de anidamiento visual.
*   **Rediseño de Autotuner a Componente "Señal"**: Modificado `scrapeClient.js` para retornar estados independientes de Video y Audio. Rediseñada la UI de desarrollador en [developerModule.js](file:///d:/Projects/JTV.app/developerModule.js) con badges independientes para Video y Audio con códigos HTTP y colores.
*   **Sincronización de Filtros en Panel Principal**: `populateDropdowns` modificado para poblar selectores de la landing y barra lateral directamente desde los arreglos globales de base de datos (`filterLanguages`, `filterGenres` y `filterEvents`).
*   **Saneamiento de Metadatos**: Rutina `cleanChannelMetadata()` para eliminar categorías inválidas o no presentes en la base de datos y forzar la normalización estricta de mayúsculas (ej. converting `"english"` a `"English"`).
*   **Scrollbars Independientes en CRUD**: Corrección en [style.css](file:///d:/Projects/JTV.app/style.css) agregando flexibilidad flexbox a `#channels-subsect-crud` para evitar desborde total de página y habilitar el scroll interno local.
*   **Botón de Filtro Integrado en Buscadores**: Botones `#toggle-filters-btn` y `#fav-toggle-filters-btn` integrados dentro de `.search-container` en la barra lateral.
*   **Colapso de Filtros por Defecto**: Contenedores de filtro en barra lateral colapsados por defecto en el primer inicio.
*   **Rediseño Premium de Canales Lateral**: Espaciado, bordes translúcidos y micro-animación de hover horizontal (`translateX(4px)`). Activos reciben glow neon (`box-shadow: inset 3px 0 0 var(--accent)`).
*   **Icono de Corazón**: Teñido de rojo brillante (`#ff4b4b`) en el sidebar de favoritos al seleccionarse.
*   **Zapping HUD inline**: Fila de fuentes alineada en un único renglón a la derecha del botón en el HUD.
*   **Intercepción de Errores HTTP en Webview**: Captura de códigos de error `>= 400` y `did-fail-load` en frames críticos dentro de [createMainWindow.js](file:///d:/Projects/JTV.app/main/windows/createMainWindow.js), emitiendo alertas IPC que disparan instantáneamente el failover en el frontend sin mostrar pantallas rotas.
*   **Tolerancia de Carga y Cancelación de Failover**: Tolerancia de carga inicial de 8 segundos en [guest-preload.cjs](file:///d:/Projects/JTV.app/guest-preload.cjs) para streams lentos, enviando mensaje `guest-playing` que cancela el failover programado al detectar reproducción estable.
*   **Supresión de Tooltips**: Desactivados tooltips para el menú superior de la sección de televisión en vivo y para las tarjetas principales de la landing.
*   **Estabilidad de Inactividad en Ajustes**: El temporizador de inactividad de Ajustes no los cerrará si el mouse está sobre la tarjeta (`:hover`). Ampliados los eventos globales que resetean la inactividad de la app (clicks, toques, scrolls, teclado).

---

### [2026-06-20] - Refactor de Proceso Principal, Hardening de Seguridad e Integración Cloudflare
*   **Refactorización del Proceso Principal (Backend)**: El código monolítico de `main.js` se desglosó en submódulos especializados dentro de la carpeta [main/](file:///d:/Projects/JTV.app/main/) (bootstrap, windows, ipc, network, diagnostics, services), mejorando la mantenibilidad.
*   **Endurecimiento de Seguridad (Hardening)**:
    *   Habilitados `nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true`, `sandbox: true` en la ventana principal.
    *   Exposición de API segura hacia el renderer mediante `window.jtvAPI` en [app-preload.cjs](file:///d:/Projects/JTV.app/app-preload.cjs) (sin importar Electron directamente en el frontend).
    *   Aislamiento completo del reproductor remoto guest usando [guest-preload.cjs](file:///d:/Projects/JTV.app/guest-preload.cjs) independiente en contenedores `<webview>` dedicados con bloqueo de popups y denegación de permisos de hardware.
    *   **Barrera de Mouse**: Aplicación de `pointer-events: none` al `<webview>` tras 10 segundos de reproducción estable para evitar clics y overlays publicitarios maliciosos.
*   **Conexión y Protección Cloudflare (DoH)**: Integrado un sistema de redirección DNS-over-HTTPS (DoH) en el backend ([cloudflareNetworkService.js](file:///d:/Projects/JTV.app/main/network/cloudflareNetworkService.js)) que intercepta peticiones a través de la API segura de Cloudflare (`https://1.1.1.2/dns-query`) para bloquear malware a nivel de aplicación, con interruptor general en Ajustes.
*   **Corrección de Variables en Ajustes**: Corregidas las fugas de variables globales de los toggles de Ajustes Generales en [eventListeners.js](file:///d:/Projects/JTV.app/renderer/ui/eventListeners.js), forzando su asignación al objeto `state` para su correcta persistencia.

---

### [2026-06-23] - Filtros de Eventos, Mejoras UX de Transiciones y Control Parental Avanzado (Item 9)
*   **Filtros de Eventos Arrastrables (Drag & Drop)**: Implementación de interacción HTML5 para arrastrar y reordenar visualmente los eventos en Ajustes, marcando bordes indicadores de inserción, guardando el orden en `state.filterEvents`, persistiendo en disco y sincronizando los dropdowns en tiempo real.
*   **Hotkey de Barra Espaciadora**: Permite alternar la visibilidad del HUD del selector de fuentes de forma rápida presionando `Espacio` con canal reproduciéndose.
*   **Glassmorphism y Responsividad de Clics**: Transiciones CSS reducidas a un límite rápido de `150ms` para menús deslizantes, evitando fallos de clic en coordenadas fuera de pantalla.
*   **Volumen, Límites y Mute**: Consistencia total del volumen en zapping. Configurado el Mute automático al bajar volumen a 0. Desmutar o subir volumen desde 0 restaura a 10 (100%), mientras que desmutar desde mute manual restaura al volumen original.
*   **Timeout de Landing con Canal Activo**: Si un canal se reproduce en segundo plano y el usuario abre el Dashboard o los Ajustes, se cerrarán automáticamente tras 5 segundos de inactividad si no hay hover en el área interactiva.
*   **Control Parental - PIN Maestro**: Integración de la clave maestra "314159" para recuperar o forzar el desbloqueo del panel parental en caso de olvido del PIN.
*   **Protección de Filtros de Sistema**: Se bloquea la edición y eliminación de categorías fijas (idiomas y géneros del sistema) a menos que la aplicación se encuentre en Modo Desarrollador.
*   **Canales Permitidos en Kids Mode (Ítem 9)**: 
    *   Se agregó la estructura del buscador y lista con checkboxes en la pestaña de Control Parental de Ajustes ([index.html](file:///d:/Projects/JTV.app/index.html)).
    *   Los checkboxes de canales nativamente infantiles se muestran marcados y bloqueados bajo "Kids (Auto)". Los checkboxes de canales no infantiles modifican la propiedad `kidsAllowed` y se guardan a disco.
    *   Se adaptó el filtro de canales en [filterManager.js](file:///d:/Projects/JTV.app/renderer/filters/filterManager.js) (sidebar) y en [favoritesGrid.js](file:///d:/Projects/JTV.app/renderer/render/favoritesGrid.js) (Landing Page grid) para que los canales con `kidsAllowed === true` sean listados y reproducibles en el perfil infantil.

---

### [2026-06-24] - Unificación de Filtros, Sincronización de UI y Limpieza General

*   **Unificación de Filtros Sidebar/Landing**: Eliminada la pipeline duplicada `getFilteredLiveChannels()`. Ahora delega a `getFilteredChannelsList()` que es el motor central de filtrado. Se añadió soporte de parámetros opcionales (`searchTerm`, dropdown IDs) para reutilización.
*   **Consolidación a 3 Dropdowns Únicos**: Eliminados los dropdowns duplicados (`dash-filter-*`, `fav-filter-select-*`). Los `filter-select-*` viven en el landing nav con estilo `dash-custom-select` y son la única fuente de verdad para sidebar y landing.
*   **Eliminación de Search Bars y Toggle de Sidebar**: Removidos los campos de búsqueda, botones toggle de filtros, badges de conteo y botones "Limpiar" de ambas pestañas del sidebar. La búsqueda del landing (`#live-landing-search`) ahora sincroniza `state.searchTerm`/`state.favSearchTerm`.
*   **Labels Dinámicos en Dropdowns**: Al seleccionar un filtro (ej. "FIFA 2026"), el título del botón dropdown se actualiza para reflejar el valor activo. Al volver a "Todos", restaura el nombre de categoría original.
*   **Dropdown de Idioma Filtra por Habilitados**: `populateDropdowns()` ahora solo incluye idiomas con `enabled !== false`, reflejando en tiempo real los cambios de la sección de ajustes.
*   **Orden Alfabético en Listas de Canales**: Las listas de "Todos" en sidebar, landing grid, assigner de filtros, control parental y CRUD ordenan canales alfabéticamente por nombre. Favoritos mantiene orden por `watchTime`.
*   **Eliminación del Modal de Onboarding**: Removidos el HTML, handlers JS, referencias de save/restore (`jtv_onboarded`, `selectedLanguages`) y reglas CSS del onboarding. La app arranca con English y Español habilitados por defecto.
*   **Fix de Default de Idiomas para Datos Legacy**: La restauración de `filterLanguages` guardados sin propiedad `enabled` ahora defaultea a `false` (excepto English/Español), corrigiendo el bug donde todos los idiomas aparecían activos.
*   **Tooltip Global con Delay de 1.2s**: Los tooltips esperan 1200ms antes de aparecer. Salir del elemento o hacer clic cancela el timer. Posicionamiento adaptativo con flip y shift para evitar desborde de ventana.
*   **Auto-ocultamiento de Tooltips**: Tooltips se ocultan automáticamente tras 2 segundos de estar visibles.
*   **Fix de Tecla Enter en Inputs**: El listener de captura global que hacía `stopPropagation` en inputs ahora permite Enter y Escape, corrigiendo el PIN parental y otros formularios.
*   **Sincronización de Favoritos entre UI**: El toggle de favorito en sidebar, HUD y editor actualiza instantáneamente todos los indicadores visibles del mismo canal. Se usa `renderAll(true)` para forzar re-render completo.
*   **Force Re-render en Cambios de Filtro**: Los dropdowns de filtro y los botones Todos/Favoritos ahora pasan `force=true` a `renderAll()`, corrigiendo el dirty-checking que impedía la actualización de sidebar.
*   **Actualización Inmediata de Chips HUD**: Modificar categorías en el assigner de filtros (bulk o individual) o en el CRUD actualiza los badges de metadatos del HUD en tiempo real si el canal activo fue afectado.
*   **Fix del Botón Edit en Sidebar**: Corregidas las dependencias faltantes (`showModule`, `selectAssignerChannelMultiple`) exponiéndolas en `window`. El botón ahora abre correctamente Ajustes > Filtros > Asignación con el canal preseleccionado.
*   **Hover Consistente en Botón Edit**: Reemplazada la animación de `rotate(15deg)` con `scale(1.1)` y color blanco, consistente con el estilo del HUD.
*   **Truncamiento de Texto en Sidebar**: Agregados `min-width: 0`, `overflow: hidden` y `text-overflow: ellipsis` a `.channel-info` y `h4` para evitar que nombres largos o texto EPG expandan el sidebar.
*   **Overlay Sin Señal Debajo de UI**: Z-index del `#no-signal-overlay` reducido de 500 a 5, quedando por debajo del landing (10), HUD (1000), top nav (1000) y sidebar (2000). El autotuner no cierra el landing al cambiar fuentes.
*   **Botón Confirmar del PIN Parental**: Reemplazado `primary-btn` (ancho completo) por `settings-action-btn` con borde acento, consistente con el botón Cancelar.
*   **Eliminación de PIN Parental y Bloqueo XXX**: Implementada funcionalidad para eliminar PIN existente y bloqueo automático de canales XXX por defecto.
*   **Glass Tuner**: Herramienta de desarrollo para ajustar valores de glassmorphism en tiempo real. Aplicados valores finales de tinte oscuro al 5% en HUD, sidebar y top nav.
*   **Correcciones de Datos**: Nuevos géneros y evento Cricket agregados. Fix de nombre de ESPN NL. Corrección de 10 nombres de canales con entidades HTML. Agregados 36 canales PPV y 15 idiomas nuevos.
*   **Preservar AppData en Desinstalación**: Configurado el instalador para no eliminar datos del usuario al desinstalar.

---

## II. Tareas Completadas (Post-Junio 2026)

*   ✅ **Tarea 2:** Mejora del Trigger del Menú Lateral — hitbox ampliado.
*   ✅ **Tarea 6:** Control del Indicador Visual de Clics — switch `showDiagnosticClicks` independiente.
*   ✅ **Tarea 7:** Estabilización de Wallpapers — `Planet.jpg` como default, nombres corregidos.
*   ✅ **Tarea 10:** Eliminación de Cargador Artificial — cortina negra lisa sin animaciones.
*   ✅ **Tarea 12:** Barras de Búsqueda Anti-Hotkeys — `stopPropagation` en inputs (Enter y Escape permitidos).
*   ✅ **Tarea 13:** Minimizar a Tray Icon — toggle en Ajustes Generales.
*   ✅ **Tarea 14:** Prevención del Modo Suspensión — `powerSaveBlocker` con toggle.
*   ✅ **Tarea 16:** Centralización del Gestor de Canales — CRUD split 50/50, mini-app de logos, restricción de pestañas dev-only.
*   ✅ **Tarea 17 / Item 13:** Autotuner de Canales — barrido asíncrono con indicadores visuales.
*   ✅ **Tarea 18:** Selección Inicial de Idioma — onboarding eliminado; defaults English/Español con filtro por `enabled`.
*   ✅ **Tarea 20:** Buscador Multicriterio — indexa nombre, ID y EPG en paralelo.
*   ✅ **Tarea 21:** Factory Reset y Relaunch — Danger Zone implementada.
*   ✅ **Tarea 22:** Rediseño Visual de Iconos de Categoría — SVG neón monocromático con animaciones.
*   ✅ **Tarea 27:** Reglas de Zapping por Modos — todos vs favoritos con listas filtradas independientes.
*   ✅ **Tarea 28 / Item 14:** Estabilización de Landing Page — parpadeo eliminado, submenús organizados.
*   ✅ **Tarea 29 / Item 15:** Reestructuración de Filtros — 3 dropdowns unificados compartidos por sidebar y landing.
*   ✅ **Tarea 31:** Emojis en Dropdown de Géneros — `populateDropdowns()` generalizada para mostrar emojis en cualquier filtro con iconos emoji, no solo eventos.
*   ✅ **Tarea 32:** Emojis en Iconos del Filtro de Géneros — iconos Lucide reemplazados por emojis en `appState.js` (🏆📰🎬📺😂🎨🧸👥🎵🎥💫🍴🌍🔍🌐🔞). Galería unificada con eventos.
*   ✅ **Tarea 33:** Eliminación del Optimizador de Logo y Mini-App — removidos el botón, handler IPC, ventana BrowserWindow, y APIs del preload (~200 líneas eliminadas).
*   ✅ **Tarea 34:** Reparación de Open DevTools — tres bugs corregidos: (1) `developerModeEnabled` no se sincronizaba al main process al guardar estado, (2) `nativeApi.setDeveloperMode()` no existía en preload y silenciosamente reseteaba el flag, (3) la política ZeroTrust bloqueaba scripts `devtools://` impidiendo que la UI de DevTools se renderizara.
*   ✅ **Tarea 35:** Segregación de Developer en Subpestañas — creadas subpestañas "General" y "Timeouts" usando clases CSS existentes (`.settings-subnav`), con clase `.dev-subnav-btn` para evitar conflicto con el handler global de filtros.
*   ✅ **Tarea 36:** Botón Pin en HUD — nuevo `#hud-pin-btn` con icono `pin`/`pin-off` y estilos blancos (análogos al favorito en rojo). Fija el HUD cancelando el timer `zappingHUD` en `inactivity.js`. Visibilidad condicional: Pin en modo usuario, Ajustes solo en dev mode. Estado `hudPinned` no persistido, resetea al cerrar.
*   ✅ **Tarea 36b:** Botón Power en modo usuario — nuevo `#power-hover-zone` con `#power-user-btn` en esquina inferior derecha, espejo del botón fullscreen (superior derecha). Glassmorphism, oculto por defecto, visible on hover con icono `power` (stroke-width 2.5) y scale 1.22 on hover. En dev mode el hover zone se oculta y se usa el `#power-off-btn` existente del floating container.
*   ✅ **Tarea 36c:** Hotkey Manager + Reestructuración Settings — sección General dividida en sub-pestañas "General" y "Hotkeys" con `.general-subnav-btn`. Tab sidebar renombrado a "Settings", título `<h2>` eliminado. 10 hotkeys configurables con UI de edición en tiempo real (botón +, modo listening con glow acento). `hotkeyMap` en `appState.js` persistido a disco. `handleHotkeyAction` refactorizado a `matchesHotkey()`. Developer Mode movido a primera posición en pestaña System.
*   ✅ **Tarea 36d:** Hotkey overhaul — UI rediseñada con cards dinámicos y chips. Botón `+` abre listener field con `×` para cancelar; `+` se desactiva durante listening. Chips con `×` on hover para eliminar. Alerta de conflictos (borde rojo pulsante + tooltip). typingState bypass para captura de teclas. Defaults: ↑↓ vol, ←→ channel, M mute, PgUp/PgDn source, Space HUD/pin. Max 2 hotkeys por función. Main process forwarding de M, PageUp, PageDown, Space.
*   ✅ **Tarea 36e:** Rediseño HUD — controles en cruz (vol ↑ arriba, ◀prev | mute | next▶ centro, vol ↓ abajo). Botones unificados a 32px con gaps de 4px. Volumen con cuerpo circular glass y hover blanco. Fav y Pin como botones mini (24px, redondos) posicionados absolutamente: fav a `right:94px`, pin a `right:14px`, ambos `top:14px`. Hover triggers ampliados (650×180px bottom, 650×100px top). Loading screen reducido a 1.2s.
*   ✅ **Tarea 23:** Build de Producción sin Modo Dev (Tree Shaking + Strip HTML/CSS) — el `.exe` distribuido ya no contiene herramientas dev (seguridad) y es más liviano. (1) **Tree shaking JS:** eliminados los imports estáticos que anclaban `developerModule.js`/`sensors.js` al bundle (`eventListeners.js` ahora usa `window.updateDeveloperUI?.()`/`window.updateSensorsUI?.()`); `developerModule.js`, `glassTuner.js` y `sensors.js` se cargan solo vía `import()` dentro de `if (!import.meta.env.PROD)` en `renderer.js`, así Vite/esbuild los excluye del bundle de prod. (2) **Plugin Vite `stripDevOnly`** (`apply:'build'`): elimina del `index.html` los elementos `data-dev="true"` (balanceado con anidamiento) + comentarios HTML, y borra los bloques `/* === DEV-ONLY START/END === */` del CSS antes de minificar. (3) **Gate main process:** `devModeAvailable = !app.isPackaged` en `createAppContext.js` (IPC dev inertes en el `.exe`). (4) **Fix arquitectónico:** el botón de apagado de usuario (`#power-user-btn`) estaba cableado solo en `developerModule.js` (roto en prod); ahora se cablea y su hover-zone se muestra en core (`renderer.js`). (5) **Corrección de clasificación:** la pestaña **Filters era de usuario**, no dev-only (el inventario estaba erróneo) — se le quitó `data-dev`; ahora en prod los usuarios editan **Idiomas** (default EN/ES) y **Eventos** (persisten en `jtv_data.json`), **Géneros** queda read-only (`readonly-filter-group` estático + add-form `data-dev`), y las subpestañas VOD (Series/Movies) son `data-dev` (ocultas). (6) Marcado dev-only faltante agregado a `#floating-controls-container` y reglas `.neon-white`. **Resultado verificado en `vite build`:** `dist/index.html` 105→68 KB, JS 353→324 KB, CSS 97→91 KB; 0 `data-dev`, 0 comentarios, 0 strings dev (`initDeveloperFeatures`/`JTV_SENSORS`/`crud`/`Glass Tuner`) en el bundle.
*   ✅ **Tarea 23 (b) — Exclusión del main dev + fix de arranque en producción:** (1) Los módulos dev del main process (`registerDeveloperIpc.js`, `registerDiagnosticsIpc.js`, `main/diagnostics/`) ahora se cargan solo si `devModeAvailable` (gates `if (context.flags.devModeAvailable)` en `registerIpc.js` y `bootstrap.js`, antes `if (true)`) y se **excluyen del paquete** electron-builder vía patrones `!` en `package.json` "files" — el `.exe` ya no los contiene, pero **dev sigue funcionando** (no se borró el código fuente). (2) **Bugfix crítico:** el build de producción se quedaba trabado en el loading porque `setupEventListeners` asignaba `.onclick`/`.onchange` sin guarda a elementos dev que ya no existen en prod (`sync-channels-btn`, `apply-domain-btn`, `auto-domain-toggle`, `tmdb/omdb-key-input`) → `TypeError: Cannot set properties of null` cortaba el `init()` antes de ocultar el loader. Se agregaron guardas `if (el)`. **Verificado lanzando la app real** (Electron) en modo dev y producción (`dist`): ambos cargan sin errores de consola (`ready-to-show`, wallpaper aplicado, 1523 entradas scrapeadas).
*   ✅ **Tarea 23 (Preparación):** Homogenización Dev-Only — convención unificada para identificar/ocultar código de desarrollo, base mecánica para el futuro Tree Shaking. (1) `data-dev="true"` en todas las pestañas y paneles dev-only (Channels, Filters, Connectivity, Sensors, Developer) + toggle Developer Mode. (2) **Pestaña Developer migrada a HTML estático** en `index.html` desde la inyección dinámica de `developerModule.js` (el módulo ahora solo busca los nodos estáticos y cablea el subnav). (3) Regla global `body:not(.dev-mode) [data-dev="true"]{display:none!important}` + ocultación de `.dev-indicator`. (4) `body.dev-mode` activado en `renderer.js` con `import.meta.env.DEV` y en `developerModule.js` con `devModeAvailable`. (5) CSS dev-only agrupado entre marcadores `/* === DEV-ONLY START/END === */` (3 bloques: dev-indicator+gate, Sensors/Diagnostics, DevTools/Glass Tuner). (6) Inventario en `contexto_de_perfil.md` §8 actualizado con hallazgos de auditoría: `eventListeners.js:32` importa estáticamente `developerModule.js` (ancla el árbol dev al bundle — Vite lo advierte), `sensors.js` import estático, `devModeAvailable=true` hardcodeado. Sin eliminar código JS (la eliminación real es Tarea 23).
*   ✅ **Tarea 37:** Soporte Multi-Resolución PC — `clamp()` meseta en todos los componentes (Sidebar, Top Nav, Filter Bar, Landing/Grid, Player Bar, Corner, Search, Player), resolución mínima 600×500, Component Sizer (`docs/examples/sizer/component-sizer.html`) con tabs y reference CSS por componente. Completada v2.3.10.
*   ✅ **Tarea 38:** Homogenización de Nombres CSS por Contexto Funcional — 11 secciones renombradas en lockstep (CSS+HTML+JS) bajo un prefijo único cada una, según `contexto_de_perfil.md` §8. (1) **Player Bar `.pbar-*`** (consolida 8 prefijos: source-switcher/hud-/vol-/zapper-/autotune-/source-btn/pin-btn/#tuner-). (2) **Top Nav `.tnav-*`**. (3) **Sidebar `.side-*`** (incl. el tag de id que reusaba `.pbar-filter-badge` → `.side-channel-id` con regla propia). (4) **Landing/Grid `.land-*`** (home-dashboard/dashboard-*/grid-*; NO toca home-card ni .vod-* anidados). (5) **Filter Bar `.fbar-*`** (dash-custom-select widget; conserva `.vod-filter-btn`). (6) **VOD Details Modal `.vod-details-*`** (details-*→vod-details-*, meta-badge→vod-meta-badge). (7) **Modals `.modal-*`** (onboarding-*/resolution-blocker/blocker-content/parental-modal-*/trial-blocker-*; elimina 2 reglas CSS muertas que colisionaban). (8) **Volume OSD `.volosd-*`**. (9) **Fullscreen/Power `.corner-*`**. (10) **Tooltips `.tooltip-*`**. (11) **Search `.search-*`** (vod-search-container→search-container; elimina reglas muertas `.search-container`). Método: reemplazo de una pasada con límites de identificador `(?<![\w-])…(?![\w-])` para no tocar clases compartidas/ajenas (glass-panel, glass-menu, close-btn, .vod-*, .settings-*, .home-card, crud-channel-item, *-subnav-btn, is-fullscreen, .floating-* dev). **~700 reemplazos**, cada sección verificada visualmente en Vite dev (render + interactividad real) y commiteada por separado; cache-buster `style.css?v` bumpeado v2→v13 por sección. `vite build` final limpio. Bug pre-existente detectado y flaggeado: `playerUI.js:~33` hace `getElementById('modal-blocker')` (id inexistente) → null-throw en cada carga (ajeno al renombrado).

---

### [2026-06-27] - Parental Overhaul, Settings Restructure, Filtros de Usuario y Polish

*   **Rediseño completo de Control Parental**: Implementadas subpestañas internas (PIN, Kids Mode, Schedule, Allowed Channels). PIN visible con máscara, master-gate que requiere PIN para acceder a la sección. Lista de canales permitidos ocupa toda la altura disponible. Modal de PIN con UX mejorada (botones en fila, estilo consistente).
*   **Time Picker Premium**: Reemplazado el input nativo de hora por un stepper personalizado con flechas up/down y toggle AM/PM, estilo glassmorphism.
*   **Reestructuración de Settings**: Pestaña "My Account" renombrada a "System". Autenticación Google removida. Formato de trial corregido. Pestaña "App Payment" agregada. Tab "System" reubicada debajo de Parental Controls.
*   **Filtros editables en modo usuario**: Usuarios pueden agregar/editar/eliminar eventos en la pestaña Live de Filtros. Idiomas y géneros protegidos (solo editable el toggle de enabled para idiomas). Botones de eliminar idiomas ocultos en modo usuario. Asignación de filtros visible para usuarios.
*   **Fix de layout en Asignación de Filtros**: Columnas con altura acotada (`calc(80vh - 160px)`), contador de selección, lógica de bulk select corregida, checkmarks sincronizados.
*   **Eliminación de tooltips innecesarios**: Removidos tooltips redundantes, reposicionados los restantes.
*   **Botones fullscreen y power visibles en homescreen**: Visibles con opacidad reducida sobre la pantalla de inicio.
*   **Loading screen con imagen**: Logo de texto reemplazado por `JTV_loading.png` con tamaño nativo.
*   **Fix de Developer sub-tabs**: Botones de dev no se renderizaban como botones al entrar/re-entrar a la pestaña. Botones dev ocultos durante el loader. Botones de usuario visibles en Live TV.
*   **Fix de ordenamiento de idiomas**: Corrección del sort para reconocer tanto "Español" como "Español / Latino".
*   **Emoji de Tennis**: Reemplazado por SVG custom (`tennis.svg`) para compatibilidad.
*   **Eliminación del auto-desinstalador**: Removido el script NSH que desinstalaba versiones anteriores silenciosamente.
*   **Datos de canales**: Sincronizaciones múltiples con ediciones del usuario, 8+ canales PPV agregados, renombramientos de eventos, nuevos géneros (Comedy, Reality Tv).

---

### [2026-07-05] - Fix: volumen e IPC de audio no funcionaban en app instalable

*   ✅ **Root cause:** `IS_AUDIO_MUTED` y `SET_AUDIO_MUTED` estaban en `registerDiagnosticsIpc.js`, que solo se carga con `devModeAvailable=true`. En producción nunca se registraban → `nativeApi.isAudioMuted()` rechazaba en la primera línea de `adjustVolume`/`toggleMute` → fallo silencioso (sin OSD, sin mute, sin respuesta de controles).
*   ✅ **Fix:** Ambos handlers movidos a `registerAudioIpc.js` (siempre registrado). Se añade propagación de mute a todos los webviews guest. Import `webContents` limpiado de diagnostics. Commit `11db422`.
*   ✅ **Fix adicional (prevención):** `guest-preload.cjs` ahora intercepta teclas de volumen/mute (`+`, `-`, `=`, `m`, `*`, `Add`, `Subtract`, `Multiply`) en fase de captura y las reenvía vía `guest-hotkey` IPC al main, que las relay como `APP_HOTKEY` al renderer. Soluciona el caso donde el webview tiene el foco y `before-input-event` del host no dispara. Commit `43a149c`.

---

### [2026-07-05] - VOD Layout: copia fiel del explorer + fitGrid desde wrapper.clientHeight

*   ✅ **VOD layout — flex chain completo:** Reemplazada la estructura de VOD en `style.css` para ser copia fiel de `movies-explorer.html`. Cadena flex: `land-dashboard:has(.vod-active)` → `justify-content: flex-start; padding: 42px 30px 30px` → `land-content`: `flex:1; min-height:0` → `land-carousel-wrapper`: `flex:1; min-height:0; overflow:hidden; gap:20px`. El wrapper ahora tiene altura renderizada por el layout, no calculada a mano.
*   ✅ **fitGrid mejorado:** `updateVodGridDimensions()` en `renderer/ui/layout.js` ahora lee `wrapper.clientHeight` directamente (flex layout lo calcula). Fallback matemático solo si el wrapper aún no tiene altura (primera llamada sincrónica). Eliminada la resta manual de paddings/topRow/filterRow.
*   ✅ **VOD card y poster:** `land-item.vod-card` tiene `aspect-ratio: 184/314` (el ancho deriva del alto); `vod-poster-container` usa `flex:1; min-height:0` sin aspect-ratio propio. `land-grid.vod-active` añade `padding:10px; flex-shrink:0; overflow:hidden`.
*   ✅ **Detalles del layout:** filter-row `gap:8px; margin-bottom:0`; filter-btn y fbar-select-btn `padding:6px 18px; font-size:14px; border-radius:50px`; dots-container `margin-top:14px; flex-shrink:0`; nav btn SVG `34×34px`.
*   ✅ **CSS cache-buster v54.** Commit `6d21ede`.

---

### [2026-07-05] - Migración Movies DB: librería persistente en disco

*   ✅ **Migración Movies Library:** Sistema de base de datos persistente para películas migrado del prototipo `movies-explorer.html` a la app Electron. Arquitectura completa: (1) **IPC main process** — `registerMoviesDbIpc.js` maneja `userData/movies/movies-db.json` y `userData/movies/posters/` con merge-by-ID, 5 canales nuevos en `ipcChannels.json`. (2) **Preload** — `window.jtvAPI.moviesDb.*` expone get/save/delete/savePoster/getPoster. (3) **Renderer** — `renderer/vod/moviesDb.js` con API IPC + TMDB enrichment + poster download/resize a 185×314px vía Canvas. (4) **vodCache.js** — `loadMoviesFromDb()` reemplaza el scraping SFlix para movies (fallback a SFlix si DB vacía); warmupVodCache carga desde disco en lugar de hacer crawl. (5) **CSS** — badge quality top-left, badge rating top-right, fav-btn bottom-right; aspect-ratio 184/314. Sin límite de 100 items: soporta 1440+ títulos. Build v52, commit `1448c29`.

---

## III. Plan de Tareas Pendientes (Hoja de Ruta)

*Ordenadas por dificultad ascendente. Tareas marcadas con 🧠 requieren Opus 4.8 por complejidad.*

---

### ⏳ Dificultad Baja

#### ~~1. Tarea 36: Botón de Pin en HUD~~ ✅
*   **Objetivo:** Mantener fijo en pantalla el HUD (menú inferior) mediante un botón de pin.
*   **Componentes:** HUD inferior (`index.html`), `style.css`, `appState.js`, `eventListeners.js`, `inactivity.js`.
*   **Acción Requerida:**
    1.  Usar el botón existente de Ajustes (`#hud-settings-btn`) como base: reemplazarlo en modo usuario por un botón de Pin (`#hud-pin-btn`). El botón de Ajustes pasa a ser dev mode only.
    2.  Icono Lucide `pin` (off) / `pin-off` (on), mismo tamaño relativo que el icono de sliders del botón de Ajustes.
    3.  Tooltip descriptivo en el botón.
    4.  Mismos button states CSS que el botón de favoritos (`.favorite-btn`), pero en tono blanco en lugar de rojo: icono vacío (fill transparent) en modo off, icono lleno (fill blanco con glow) en modo on.
    5.  Al activar el pin, cancelar el timer de inactividad del HUD (`zappingHUD`). Al desactivar, restaurar el auto-ocultamiento.
    6.  Estado `hudPinned` en `appState.js`, no persistido a disco — se resetea a `false` cuando el usuario cierra la app.

---

### ⏳ Dificultad Media-Baja

#### ~~2. Tarea 38: Hotkey Manager~~ ✅
*   **Componente:** `eventListeners.js`, `settingsTabs.js`, `stateManager.js`, `appState.js`, `renderer.js`, `index.html`, `style.css`.
*   **Implementación:**
    1.  Sección General dividida en sub-pestañas "General" y "Hotkeys" con clase `.general-subnav-btn` y función `setGeneralTab()`.
    2.  Tab del sidebar renombrado de "General" a "Settings"; título `<h2>Settings</h2>` eliminado para liberar espacio vertical.
    3.  10 hotkeys configurables: Fullscreen, Toggle HUD, Volume Up/Down, Toggle Mute, Prev/Next Channel, Prev/Next Source, Escape.
    4.  UI de edición: campo `.hotkey-key` muestra la tecla actual; botón `+` (`.hotkey-edit-btn`) activa modo listening (glow acento, texto "..."). Al presionar una tecla se asigna y persiste.
    5.  `state.hotkeyMap` en `appState.js` con defaults, persistido vía `stateManager.js`, restaurado en `renderer.js`.
    6.  `handleHotkeyAction()` refactorizado de comparaciones hardcoded a `matchesHotkey(action, key)` usando el mapa dinámico.
    7.  Developer Mode movido de pestaña General a primera posición en pestaña System.

---

### ⏳ Dificultad Media

#### ~~3. Tarea 3 / Item 10: Optimización del Caché VOD y Paginación~~ ✅ (resuelta por rediseño completo)
*   **Resolución:** El problema original (fetching HTTP masivo en cada resize/paginación) quedó obsoleto por el rediseño completo del módulo Movies durante la sesión 2026-07-05. Movies ya no consulta SFlix en cada render: carga desde una base de datos local en disco (`userData/movies/movies-db.json`), el layout es manejado por `fitGrid()` que recalcula localmente, y la paginación opera sobre el cache en memoria sin tocar la red. No hay HTTP en ningún ciclo de render. Objetivo original cumplido por arquitectura, no por parche.

#### 5. Tarea 43: Movies Layout — Paridad Visual con el Explorer
*   **Componente:** `style.css`, `index.html`, `renderer/ui/layout.js`.
*   **Referencia:** `docs/examples/movies/movies-explorer.html` es la fuente de verdad del diseño.
*   **Problema:** Aunque se aplicó el flex chain correcto (2026-07-05), puede haber diferencias visuales residuales entre la app y el explorer en proporciones de tarjetas, espaciados, comportamiento de fitGrid en distintos tamaños de ventana, o elementos del pbar/filtros que no coinciden exactamente.
*   **Acción Requerida:**
    1.  Comparar visualmente la app contra el explorer en distintas resoluciones.
    2.  Identificar diferencias específicas (tarjetas, gaps, filtros, nav buttons, dots).
    3.  Ajustar `style.css` hasta lograr paridad pixel con el explorer sin afectar el módulo live.

#### ~~4. Tarea 37: Soporte Multi-Resolución (PC)~~ ✅ (completada v2.3.10)
*   **Objetivo:** Escalado proporcional completo — la app debe funcionar desde 600×500 hasta 4K, con todos los elementos escalando proporcionalmente. Resolución mínima de ventana: 600×500.
*   **Componentes:** `style.css`, `layout.js`, `createMainWindow.js`, `favoritesGrid.js`, `index.html`.
*   **Caso de uso clave:** Usuario con monitor 24" divide el escritorio en dos — JTV ocupa la mitad izquierda (~960×540 o menos) mientras trabaja en Word en la derecha. Live TV debe ser funcional y legible a ese tamaño.
*   **Acción Requerida:**
    1.  Establecer `minWidth: 600, minHeight: 500` en `createMainWindow.js`.
    2.  Escalado proporcional con `clamp()` y unidades `vw`/`vh` en todos los componentes: tarjetas del dashboard, grid de Live TV, controles del HUD, sidebar, fuentes, spacing.
    3.  HUD compacto: cuando la ventana es muy pequeña, los controles se reducen proporcionalmente sin perder funcionalidad.
    4.  Grid de Live TV adaptativo — columnas, thumbnails y espaciado se ajustan fluidamente al viewport.
    5.  Escalado hacia arriba para 1440p y 4K — contenido crece proporcionalmente, no se queda diminuto.
    6.  Media queries solo para cambios estructurales (ej: sidebar se colapsa, grid cambia de layout).
*   **Nota:** La versión Android requerirá adaptaciones adicionales (rotación landscape/portrait, controles táctiles). Se planificará como tarea independiente post-producción.
*   **Progreso (2026-06-28):**
    *   ✅ Tarjetas del home: `aspect-ratio: 330/720`, max-width 330px, escalado proporcional con `clamp()`.
    *   ✅ Ventana mínima: 600×500 en `createMainWindow.js`.
    *   ✅ Elementos VOD restaurados: tarjetas Series/Movies, botones nav, controles VOD, sub-nav filtros, dashboard-nav.
    *   ✅ Sidebar responsivo ≤800px: ancho `clamp(180px, 38vw, 280px)`, logos ocultos, textos/iconos/chips proporcionales (capa de modo compacto, complementaria al clamp base de la sección 2026-06-30).
*   **Progreso (2026-06-30) — aplicación metódica de `clamp()` por sección, post Tarea 38:**
    *   ✅ Sidebar (`.glass-menu`, `.side-*`) — clamp() completo en contenedor, tabs, items de canal, logo, iconos, chip de ID. Limpieza de selectores duplicados/huérfanos. Fix de íconos de tabs que no escalaban (regla `.side-tab-btn i` duplicada y suelta) y de `.side-tabs` colisionando con el botón de cerrar al crecer (convertido a CSS Grid).
    *   ✅ Top Nav (`.tnav-*`) — clamp() completo.
    *   ✅ Filter Bar (`.fbar-*`) — clamp() completo.
    *   ✅ Landing/Grid (`.land-*`) — clamp() completo. Corregidos 2 clamp() preexistentes mal calibrados (`.land-title`, `.land-exit-btn` — el `vw` no correspondía a sus min/max). Migrado `.land-nav` de inline style en HTML a CSS. Limpieza de duplicados/huérfanos (`.land-dot`, `.dashboard-title`).
    *   ✅ Player Bar (`.pbar-*`) — clamp() completo. Migrados 3 elementos de inline style a CSS (autotune row, indicadores de señal, toggle de fuentes). Eliminado `.pbar-tuner-btn` huérfano.
    *   ✅ Player (`#no-signal-overlay` y overlays) — clamp() completo, inline styles migrados a CSS. Eliminado bloque huérfano "Player Controls Overlay" (~75 líneas, reemplazado hace tiempo por `.pbar`).
    *   ✅ Transversales — Scrollbars, FS/Power y Modals/Tooltips ya estaban clampeados (trabajo previo de Settings); agregado Vol OSD (`.volosd-*`) y Search (`.search-*`). `.floating-*` (Dev-only) fuera de alcance a propósito.
    *   ✅ Home (`.home-*`) — completado lo pendiente (padding, border-radius, header). Limpieza de 3 selectores huérfanos (`.home-close`, `.home-brand-title`, `.home-card p`).
    *   ⏳ **Pendiente:** VOD (`.vod-*`, `.vod-details-*`) — no abordado a propósito. Settings no fue re-auditado en esta pasada (se asume ya clampeado de trabajo previo, pero falta confirmar metódicamente).
    *   ℹ️ Se reemplazó el límite dinámico de `FAVS_PER_PAGE` por ancho (1 col / 5 items en <800px) — el grid de Live TV ahora es fijo en 2×5, con un único breakpoint por alto (≤500px → 2×4), alineado con `minHeight:500` de la ventana. Las dos reglas CSS asociadas a la reducción por ancho quedaron huérfanas y se eliminaron.
    *   🔧 **Corrección de calibración del `max` de clamp() (2026-06-30):** el multiplicador original (`original × 2.56`) hacía que el valor `max` se alcanzara a los 2764.8px de ancho (1080×2.56), no a 3840px (4K) como se pretendía. Corregido el multiplicador a `original × 3840/1080` (≈×3.5556) — recalculado en **Sidebar (`.glass-menu`, `.side-*`), Top Nav (`.tnav-*`) y Player Bar (`.pbar-*`)** únicamente (47 reglas, 110 valores `max`); el resto de componentes (Filter Bar, Landing/Grid, Player, transversales, Home) **queda pendiente con el multiplicador viejo** hasta que se recalculen explícitamente. El `min` y el valor `vw` (preferred) no cambiaron — solo el techo superior se movió de 2764.8px a 3840px de ancho de viewport.
    *   🔧 **Fórmula de "meseta" (flat-until-threshold) para Player Bar (2026-07-02):** el `vw` (preferred) de todos los clamp() está anclado a 1080px de ancho — a cualquier ancho mayor el valor sigue creciendo linealmente sin techo intermedio, causando que en pantallas comunes (~1920–2000px) los componentes se vieran notablemente más grandes que su tamaño de diseño original (~1.8× a 1985px de ancho). Se detectó primero en `.pbar` (Player Bar) mostrándose "gigante". Solución aplicada **únicamente a `.pbar*` (57 clamp())**: se reemplazó `clamp(MIN, VW, MAX)` por `clamp(MIN, max(clamp(MIN, VW, BASE), calc(BASE + PENDIENTE * (100vw - 2046px))), MAX)`, donde `BASE` es el valor original (recuperado matemáticamente del término `vw` existente — para propiedades en `rem` hay que revertir la conversión rem→px×16 antes de despejar) y `PENDIENTE = (MAX - BASE) / (3840 - 2046)`. Resultado: el tamaño se achica normalmente hasta el `min` en pantallas angostas (sin cambios), se mantiene **plano en `BASE`** desde ~709px-equivalente hasta 2046px de ancho, y solo a partir de 2046px empieza a crecer hasta alcanzar `MAX` en 3840px. Verificado matemáticamente que a 2046px y a 3840px el valor es continuo (sin salto) con el segmento contiguo. **Pendiente:** aplicar la misma fórmula al resto de componentes (Sidebar, Top Nav, Filter Bar, Landing/Grid, Player, transversales, Home) si se confirma que tienen el mismo problema de "gigantismo" en resoluciones intermedias.
*   **Progreso (2026-07-03) — fórmula meseta aplicada a todos los componentes restantes + Component Sizer:**
    *   ✅ **Meseta aplicada a todos los componentes:** se completó la migración de `clamp(MIN, VW, MAX)` → fórmula meseta en **Sidebar** (`.glass-menu`, `.side-*`), **Top Nav** (`.tnav-*`), **Filter Bar** (`.fbar-*`), **Landing/Grid** (`.land-*`, ~20 propiedades), **Corner/Dev controls** (`.floating-controls-container`, `.floating-reload-btn`, `.floating-reload-btn i`), y **Search** (`.search-container`, `.search-clear-btn`). Todos los valores `BASE`, `MIN`, `MAX` se derivaron de archivos reference CSS generados desde el Component Sizer (ver punto siguiente). Las propiedades en `rem` fueron convertidas a `px` para uniformidad y trazabilidad.
    *   ✅ **Component Sizer** (`docs/examples/sizer/component-sizer.html`) — herramienta standalone de calibración visual. Permite ajustar sliders (min/base/max) por componente, genera automáticamente la fórmula meseta y los archivos reference CSS (`pbar-reference.css`, `tnav-reference.css`, `side-reference.css`, `corner-reference.css`, `land-reference.css`, `search-reference.css`). Tabs poblados: pbar, tnav, side, corner, volosd, home, land, fbar, settings, tooltip, search, modal (todos con grupos de items). Flujo: ajustar sliders → copiar CSS generado → aplicar a `style.css` → sincronizar `COMPONENT_DATA` con nuevos min/base/max.
    *   ✅ **Sidebar — nuevas reglas y correcciones:** se agregó `.side-channel-logo .placeholder-circle` (border-radius + font-size meseta) para el fallback de logo sin imagen, siguiendo el patrón de pbar. Se eliminaron los overrides `#tab-favorites .carousel` y `#tab-favorites .side-channel-item` que producían un gap visual mayor en la pestaña Favorites vs All — ahora ambas tabs comparten las mismas reglas base.
    *   ✅ **Landing/Grid — nuevas reglas:** se agregó `.land-item .land-logo .placeholder-circle` (border-radius + font-size meseta). Propiedades en `rem` convertidas a `px` (`h4`, `.land-epg`, `.land-title`, `.land-exit-btn`). Eliminado el override de media-query para `.land-nav-btn i` y `.land-title` (cubiertos por meseta).
    *   ✅ **Search — media queries obsoletos eliminados:** se eliminaron los overrides de media-query para `.search-container` (padding/border-radius), `.search-container input` y `.search-container i` al quedar cubiertos por la meseta.
    *   ✅ **Sidebar filter badge (.pbar-filter-badge):** max extendido de 18px → 24px para 4K; sincronizado en PBAR_GROUPS del sizer.
    *   ⏳ **Pendiente:** VOD (`.vod-*`, `.vod-details-*`) — sin meseta aún. Vol OSD (`volosd-*`) — reference no generado aún (tab del sizer existe pero pendiente de calibración). Settings — no re-auditado metódicamente con meseta.
*   **Progreso (2026-07-04) — grid altura dinámica, search bar, search-reference v2, land-reference v3/v4, indicador de corazón favorito:**
    *   ✅ **Grid de Live TV — soporte de ventanas altas (>1200px):** se agregó `@media (min-height: 1201px) { .land-grid { grid-template-rows: repeat(10, 1fr); } }` para mostrar 10 filas en lugar de 5 cuando la ventana supera 1200px de alto. Breakpoint de 3 niveles en `layout.js`: `rows = h ≤ 500 ? 4 : h > 1200 ? 10 : 5`. `FAVS_PER_PAGE` en `appState.js` migrado a IIFE dinámico (`h ≤ 500 → 8 / h > 1200 → 20 / else → 10`) — necesario porque `grid-auto-flow: column` rellena columnas completas antes de abrir la siguiente, y con un valor estático de 10 al arrancar en ventana normal todos los ítems caían en columna 1.
    *   ✅ **land-reference v3 aplicado a `style.css` y LAND_GROUPS del sizer:** ajustes de calibración en `.land-grid` gap (min 7→4, max 26→16), `.land-carousel-wrapper` gap (min 20→15), `.land-nav-btn` i/svg size (max 80→60), `.land-nav` margin-bottom (max 50→60), `.land-title` font-size (base 40→20, min 20→10, max 80→60), `.land-title-block` padding-top (base 2→4, max 4→8), `.land-item` border-radius (base 15→16, min 7→8, max 20→24) y padding (padV max 16→12). Se agregaron controles de padding a `LAND_GROUPS` del sizer (faltaban).
    *   ✅ **`.land-item .land-logo` revertido a max=100px / pen=0.02787** — valor anterior (max=110px/pen=0.03344) había sido aplicado accidentalmente en la sesión anterior; revertido tanto en `style.css` como en el sizer.
    *   ✅ **land-reference v4 aplicado — `.land-controls-block` con ancho directo:** se reemplazó `width: var(--center-nav-width)` por un clamp directo `clamp(200px, max(clamp(200px, 41.67vw, 450px), calc(450px + 0.25084 * (100vw - 2046px))), 900px)`. Esto permitió agregar un control de ancho en el sizer dentro del tab Landing (físicamente la barra de búsqueda vive en Landing, no en un tab propio). La variable CSS `--center-nav-width` ya no controla el ancho de este elemento.
    *   ✅ **Search bar — sizer y correcciones CSS:** se agregaron controles de ícono de lupa y ancho al sizer. Selector corregido de `.search-container i` a `.search-container i,\n.search-container svg` (Lucide reemplaza `<i>` por `<svg>` en runtime). Override de media query `@media (max-width: 800px)` simplificado a solo `min-width: 0` (se eliminó `width: 100%` del override, análogo a la solución aplicada en Tarea 38 para el sidebar). `.search-container` restaurado a `width: 100%` sin `max-width`.
    *   ✅ **search-reference v2 aplicado:** ícono min 13→10px; selector corregido a i+svg.
    *   ✅ **Indicador de corazón favorito en ítems del grid:** se agregó `.land-corner` como wrapper `position: absolute; display: flex; flex-direction: column; align-items: flex-end` para apilar el badge de Channel ID y el corazón verticalmente sin `calc()` anidados. `favoritesGrid.js` renderiza `<span class="land-fav-indicator"><i data-lucide="heart"></i></span>` condicionalmente por `channel.favorite`. CSS: `.land-fav-indicator` con `color: #ff4d6d` y `filter: drop-shadow`; `.land-fav-indicator i, svg` con clamp de tamaño (8/10/18px). `.land-channel-id` perdió `position/top/right` (heredados del wrapper `.land-corner`).
    *   ✅ **`.land-corner` con meseta completa en sizer y `style.css`:** se agregó grupo al sizer con top (base=8, min=5, max=20), right (base=12, min=8, max=20) y gap (base=10, min=4, max=20). Se limpiaron top/right del grupo `.land-channel-id` (ya no son propiedades de ese selector sino de `.land-corner`).
    *   ✅ **Sizer — `.land-fav-indicator i,\n.land-fav-indicator svg` group agregado:** size (base=10, min=8, max=18px).
    *   ✅ **Cache-buster bumpeado a v=42** (múltiples bumps durante la sesión); varios commits realizados.
    *   ⏳ **Pendiente:** VOD (`.vod-*`, `.vod-details-*`), Vol OSD (`volosd-*`), Settings — sin meseta aún.
*   **Progreso (2026-07-04 — sesión de cierre) — sizer corrections, fixes de cursor e IPC, botón de reset de ventana:**
    *   ✅ **Botón de auto-redimensión en controles dev:** nuevo botón "auto-resize" en `.floating-controls-container` (ícono `scan`) en `developerModule.js`; llama `window.jtvAPI.resetWindowSize()`. IPC `reset-window-size` registrado en `registerWindowIpc.js` y en `shared/ipcChannels.json`. Fija la ventana a 1080×720 (tamaño de diseño base) sin fullscreen — útil para recalibrar el sizer.
    *   ✅ **Fix: `app-preload.cjs` IPC local sin `RESET_WINDOW_SIZE`** — el objeto `IPC` hardcodeado en el preload no incluía la clave → `ipcRenderer.invoke(undefined)` silencioso. Agregada `RESET_WINDOW_SIZE: 'reset-window-size'`. Requería reinicio completo de Electron (no recarga del renderer).
    *   ✅ **Fix inyector CSS del sizer — `__jtv-dev-css` re-append:** el `<style id="__jtv-dev-css">` se re-inserta al final de `<head>` en cada inject (`.remove()` + `appendChild`) para garantizar precedencia de cascada sobre la `<link>` de `style.css`. Log de diagnóstico agregado en `renderer.js` y en el middleware `jtvCssInjector` de `vite.config.js`.
    *   ✅ **pbar width — min 389→344px:** actualizado en `style.css`, `pbar-reference.css` y `PBAR_GROUPS` del sizer.
    *   ✅ **floating-controls right — min 70→50px:** actualizado en `style.css`, `corner-reference.css` y `CORNER_GROUPS` del sizer.
    *   ✅ **Reference files nuevos en sizer:** `fbar-reference.css`, `home-reference.css`, `modal-reference.css`, `settings-reference.css`, `tooltip-reference.css`, `volosd-reference.css` — generados desde el sizer para los tabs pendientes.
    *   ✅ **Fix: cursor no se ocultaba tras timeout con movimiento de mouse** — la separación anterior de `mousemove`/`pointermove` para no activar paneles eliminó sin querer el reinicio del timer de cursor. Solución: nueva función `startCursorTimer()` exportada en `inactivity.js` que solo cancela y reinicia el timeout del cursor (sin tocar timers de paneles). Los listeners de `mousemove`/`pointermove` en `eventListeners.js` ahora llaman `startCursorTimer()` además de remover `hide-cursor`.
    *   ✅ **Política de versionado actualizada:** v2.3.10 asignada a Tarea 37.

---

### ⏳ Dificultad Media-Alta

#### 5. Tarea 30: Soporte Multi-idioma (i18n) — Bundle-first
*   **Componentes:** `renderer/`, `app-preload.cjs`, `locales/`, `shared/ipcChannels.json`.
*   **Objetivo:** UI completamente traducible. Todos los idiomas incluidos en el bundle — sin servidor, sin descargas, sin infraestructura extra.
*   **Subtarea completada:** Traducción de toda la UI de español a inglés como base.
*   **Decisión de arquitectura:** cada archivo de idioma pesa ~24 KB en disco. 10 idiomas = ~240 KB = 0.15% del tamaño instalado (~160 MB). El impacto es imperceptible, por lo que no hay justificación técnica para un sistema de descarga dinámica. Si en el futuro se necesitan contribuciones externas de traductores sin publicar nueva versión, se puede añadir carga desde `AppData` como capa opcional encima de esta base.

##### A. Archivos de traducción
*   Carpeta `locales/` en la raíz del proyecto, empaquetada en el bundle por electron-builder.
*   Un archivo JSON por idioma: `en.json`, `es.json`, `pt.json`, `fr.json`, `de.json`, etc.
*   Estructura: JSON plano de clave semántica → string. Las claves usan dot-notation por sección (`"settings.system.language": "App Language"`, `"pbar.pin": "Pin Player"`).
*   **Excluir siempre:** nombres de canales, categorías/filtros, logs de consola, IDs, URLs, valores numéricos.
*   Idiomas incluidos en v1: English, Español, Português, Français, Deutsch (los más relevantes para la base de usuarios IPTV).

##### B. Módulo i18n en el renderer (`renderer/i18n/i18n.js`)
*   `loadLocale(langCode)` — lee `locales/{langCode}.json` vía IPC (el renderer no puede leer archivos directamente con `sandbox: true`), cachea el objeto en memoria.
*   `t(key, fallback?)` — devuelve la traducción activa. Fallback chain: idioma activo → `en.json` → clave literal. Nunca devuelve string vacío.
*   `applyLocale(langCode)` — llama `loadLocale`, luego hace un único `querySelectorAll('[data-i18n]')` y actualiza el `textContent` de cada elemento en lote. También actualiza `placeholder` y `title` donde aplique.
*   Se llama en el arranque de `renderer.js` antes de mostrar cualquier UI, usando `state.appLanguage` guardado en `jtv_data.json`.

##### C. UX dentro de la app (Settings → System → App Language)
*   El dropdown `#app-language-select` ya existe como placeholder. Se puebla con los idiomas del bundle al abrir Settings.
*   Al cambiar la selección, aparece un botón **Apply & Restart** junto al dropdown (oculto por defecto con `display: none`).
*   Al hacer clic: guarda `appLanguage: "{code}"` en `jtv_data.json` → llama `app.relaunch()` + `app.exit()`. Sin descarga, sin espera — el reinicio es inmediato.
*   Al arrancar tras el reinicio, `applyLocale` corre antes del primer render. El usuario ve la app directamente en el nuevo idioma.

##### D. IPC requerido
*   `ipc: 'read-locale-file'` → main lee `locales/{langCode}.json` del bundle y lo devuelve como string JSON. El renderer lo parsea y cachea. Un solo canal IPC, sin escritura a disco.

##### E. Acción requerida (orden de implementación)
1.  Auditar toda la UI y extraer strings a `locales/en.json` (~295 keys estimadas).
2.  Crear `locales/es.json` y los demás idiomas del lote inicial.
3.  Implementar `renderer/i18n/i18n.js` con `loadLocale`, `t` y `applyLocale`.
4.  Agregar atributos `data-i18n` en `index.html` y reemplazar strings dinámicos en JS con `t()`.
5.  Agregar IPC `read-locale-file` en main.
6.  Dar vida al dropdown `#app-language-select`: poblar opciones, mostrar/ocultar botón Apply & Restart, guardar y relanzar.

#### ~~6. Tarea 23 / Item 12: Build de Producción sin Modo Dev (Tree Shaking + Strip de HTML/CSS)~~ ✅ (ver Tareas Completadas)
*   **Componente:** `vite.config.js`, `renderer.js`, `renderer/ui/eventListeners.js`, `developerModule.js`, `main/context/createAppContext.js`.
*   **Objetivo (espíritu de la tarea):** Generar un build de producción **libre del modo desarrollo** por dos motivos: (a) **seguridad** — que las herramientas dev (CRUD de canales, Open DevTools, watchers de diagnóstico, autotuner, Glass Tuner, API headless `window.JTV_SENSORS`, y el futuro bypass de trial) no existan ni sean accesibles en el `.exe` distribuido; (b) **tamaño** — que el ejecutable sea más liviano al eliminar todo el código/HTML/CSS dev del bundle de producción.
*   **Prerequisito (✅ hecho):** Convención Dev-Only — todo lo dev marcado con `data-dev="true"` (HTML), agrupado entre `/* === DEV-ONLY START/END === */` (CSS), y gateado por `body.dev-mode`. Ver `contexto_de_perfil.md` §8.
*   **Acción Requerida:**
    1.  **Eliminar imports estáticos que anclan módulos dev al bundle:** `eventListeners.js` importaba estáticamente `developerModule.js` y `sensors.js` (forzándolos al bundle de prod). Cambiar esas llamadas a `window.*?.()` y cargar `developerModule.js`, `glassTuner.js` y `sensors.js` solo vía `import()` dinámico dentro de `if (!import.meta.env.PROD)` en `renderer.js`. Así Vite/esbuild elimina el bloque y, al no quedar imports, excluye los módulos del bundle.
    2.  **Strip de HTML dev:** Plugin de Vite (`apply: 'build'`) que elimina del `index.html` de producción todos los elementos con `data-dev="true"` (incluyendo sus hijos, con conteo de anidamiento balanceado).
    3.  **Strip de CSS dev:** El mismo plugin elimina del CSS los bloques entre `/* === DEV-ONLY START === */` y `/* === DEV-ONLY END === */` **antes** de la minificación.
    4.  **Gate del main process:** `devModeAvailable = !app.isPackaged` en `createAppContext.js` — en el `.exe` empaquetado los handlers IPC dev (`registerDeveloperIpc`, `registerDiagnosticsIpc`, watchers de `main/diagnostics/`) quedan inertes.
    5.  **Verificación:** tras `vite build`, confirmar que `dist/index.html` no contiene `data-dev`, el CSS no contiene reglas dev (`.dev-indicator`, sensores, glass tuner) y el JS no contiene `developerModule`/CRUD.
*   **Pendiente futuro (no crítico):** excluir físicamente los archivos dev del main process (`main/ipc/registerDeveloperIpc.js`, `main/ipc/registerDiagnosticsIpc.js`, `main/diagnostics/`) del empaquetado de electron-builder para reducir aún más el asar (hoy quedan inertes por el gate, no eliminados).

#### ~~7. Tarea 38: Homogenización de Nombres CSS por Contexto Funcional~~ ✅ (completada 2026-06-29 — ver sección II)
*   **Componente:** `style.css`, `index.html`, todos los archivos JS que referencian selectores CSS.
*   **Objetivo:** Unificar los nombres de clases CSS bajo un prefijo único por sección funcional de la app. Actualmente, una misma sección (ej. el panel inferior de reproducción) usa 8+ prefijos distintos (`.source-switcher`, `.hud-*`, `.vol-*`, `.autotune-*`, `.zapper-*`, etc.), lo que causa que búsquedas y refactorizaciones por sección fallen al no compartir convención de naming.
*   **Secciones principales de la app:** Home, Live TV, VOD (Series/Películas), Settings.
*   **Mapeo de componentes por sección y prefijos propuestos:**

**Home**
| Componente | Prefijo | Reemplaza |
|---|---|---|
| Tarjetas de navegación | `.home-` | Mantener (ya coherente) |

**Live TV**
| Componente | Prefijo | Reemplaza |
|---|---|---|
| Player Bar (panel inferior) | `.pbar-` | `.source-switcher`, `.hud-*`, `.vol-icon`, `.vol-*`, `.zapper-*`, `.autotune-indicator`, `.source-btn`, `.pin-btn`, `.favorite-btn`, `#tuner-*` |
| Top Nav (barra superior) | `.tnav-` | `.top-nav-*`, `.nav-btn` |
| Sidebar (menú lateral) | `.side-` | `.glass-menu`, `.tab-btn`, `.channel-item`, `.channel-logo`, `.channel-info`, `.channel-id-tag`, `.channel-actions`, `.action-btn`, `.close-btn`, `.menu-tabs*` |
| Landing (dashboard/grid) | `.land-` | `.home-dashboard`, `.dashboard-*`, `.favorites-grid`, `.grid-item`, `.grid-badge`, `.grid-logo`, `.grid-epg`, `.grid-nav-*`, `.grid-dot*`, `.grid-carousel-*`, `.section-title`, `.home-exit-btn` |
| Filter Bar (dropdowns landing) | `.fbar-` | `.dash-custom-select*`, `.dash-chevron`, `.vod-filter-btn` (en landing), `.vod-filters-*` |
| Player (webview/overlays) | `.player-` | `#player-container`, `.player-barrier`, `.edge-mask`, `#no-signal-overlay` |

**VOD**
| Componente | Prefijo | Reemplaza |
|---|---|---|
| Series/Películas | `.vod-` | Mantener (ya coherente) |

**Settings (incluye transversales)**
| Componente | Prefijo | Reemplaza |
|---|---|---|
| Panel de ajustes | `.settings-` | Mantener (ya coherente) |
| Fullscreen/Power buttons | `.settings-` | `.fullscreen-hover-zone`, `.fullscreen-toggle-btn`, `.power-hover-zone`, `.power-toggle-btn` |
| Modals (PIN, trial, blocker) | `.settings-` | `.onboarding-*`, `.resolution-blocker`, `.blocker-content`, `.parental-pin-modal` |
| Volume OSD | `.settings-` | `.volume-indicator*`, `.volume-bar-*` |
| Floating Dev Controls | `.settings-` | `.floating-controls-*`, `.floating-reload-btn` |
| Scrollbars globales | `.settings-` | `::-webkit-scrollbar*` |
| Tooltips | `.settings-` | `.custom-tooltip` |
| Search (barras de búsqueda) | `.search-` | `.vod-search-container`, `.clear-search-btn` |

*   **Acción Requerida:**
    1.  Documentar el mapeo final en `contexto_de_perfil.md` (nueva sección).
    2.  Renombrar por sección, una a la vez (CSS + HTML + JS), con build + verificación visual entre cada una.
    3.  Orden: Player Bar → Sidebar → Landing → Filter Bar → Top Nav → Player → transversales.
    4.  Las secciones ya coherentes (`.home-*`, `.vod-*`, `.settings-*`) no se tocan.
*   **Impacto estimado:** ~200+ selectores CSS, ~50+ IDs HTML, ~30+ referencias JS.
*   **Nota:** No mezclar con aplicación de clamp() — esta tarea es exclusivamente de renombrado.

#### ~~8. Tarea 41: Reordenamiento Estructural de HTML y CSS según los 4 Pilares~~ ✅ (completada v2.3.9)
*   **Componente:** `index.html`, `style.css`.
*   **Objetivo:** Hacer que el orden físico de los bloques en `index.html` y `style.css` siga consistentemente el esquema de 4 pilares (Home, Live TV, VOD, Settings + transversales) y la jerarquía visual definida en `contexto_de_perfil.md` (sección 8), de modo que ambos archivos comparen el mismo orden entre sí y cada componente quede agrupado junto a los demás de su pilar.
*   **Prerequisito:** Depende del renombrado por prefijo de la Tarea 38 (ya completada) para identificar qué bloque pertenece a qué pilar.
*   **Hallazgos de desorden (auditoría inicial 2026-06-29):**
    *   **HTML:**
        1.  `#app-home-screen` (pilar Home) aparece *después* de todo Live TV (`#pbar`, `#land-dashboard`, `#tnav-menu`, `#side-menu`) en el DOM, pese a ser el pilar de entrada de la app.
        2.  Controles de VOD (`#vod-controls`, `.vod-filter-btn`, `.fbar-select-*`) están anidados dentro de `#land-dashboard` (contenedor de Live TV), mientras que `#vod-details-modal` (mismo pilar VOD) está casi 1200 líneas más abajo, sin agrupación física con el resto de VOD.
        3.  Los modales/transversales de la familia `.modal-*` (`#no-signal-overlay`, `#parental-pin-modal`, `#trial-expired-blocker`) están dispersos: uno al inicio del archivo (dentro de `#tv-screen`) y dos al final.
    *   **CSS:**
        1.  `.pbar-*` (Player Bar) aparece en al menos 3 bloques no contiguos (~L1826-2127, ~L4028-4139, ~L4838 autotune).
        2.  `.side-*` (Sidebar) aparece en al menos 4 bloques no contiguos (~L225-512, ~L1306, ~L2549-2639, ~L4363).
        3.  `.fbar-*` (Filter Bar) aparece interrumpido en al menos 2 lugares (~L1217, ~L4778).
        4.  Comentarios de sección obsoletos: `/* Home Dashboard */` (L822) y `/* Home Dashboard Refinement */` (L1631) en realidad documentan `.land-dashboard` (Live TV Landing/Grid), no el pilar Home real (`#app-home-screen`, sección correcta "App Home Screen Landing Page" en ~L2639) — comentarios heredados de antes del renombrado de Task 38, desincronizados de los nombres reales.
        5.  Bloques `DEV-ONLY` (Settings) interrumpen la continuidad de Player Bar/Settings en varios puntos del archivo.
*   **Acción Requerida:**
    1.  Usar el mapa de la sección 8 de `contexto_de_perfil.md` (4 pilares + transversales) como única fuente de orden canónico.
    2.  Reordenar `index.html`: agrupar cada pilar en un bloque contiguo, en el orden Home → Live TV (Player Bar → Top Nav → Sidebar → Landing/Grid → Filter Bar → Player) → VOD (Cards/Controles + Details Modal) → Settings (tabs user-facing → dev-only) → Transversales (Modals, Vol OSD, FS/Power, Tooltips, Search, Floating Dev, Scrollbars).
    3.  Reordenar `style.css` con el mismo orden, consolidando cada prefijo (`.pbar-*`, `.tnav-*`, `.side-*`, `.land-*`, `.fbar-*`, `.player-*`, `.vod-*`, `.vod-details-*`, `.settings-*`, `.modal-*`, `.volosd-*`, `.corner-*`, `.tooltip-*`, `.search-*`) en un único bloque contiguo.
    4.  Corregir o eliminar comentarios de sección obsoletos que no coincidan con los nombres reales post-Task 38.
    5.  Validar con build + verificación visual completa después de mover cada pilar (uno a la vez, no todo de una vez), siguiendo la misma metodología de Task 38.
    6.  No modificar lógica, valores ni nombres de selectores — es exclusivamente reordenamiento físico de bloques, igual que Task 38 fue exclusivamente renombrado.
    7.  **Renombrar `.land-nav` → `.land-filter-row` y `.land-nav button` → `.land-filter-btn`** (naming confuso detectado en 2026-07-03): actualmente `.land-nav` es el contenedor de los tabs All/Favorites (filtros), pero el nombre "nav" lleva a confusión con `.land-nav-btn` que son las flechas prev/next del carousel. Afecta: `style.css`, `index.html` (`#dashboard-filters`), `renderer/ui/eventListeners.js` (L576-577), `renderer/render/favoritesGrid.js` (L145-146), `renderer/utils/tooltips.js` (L172), `component-sizer.html` (LAND_GROUPS).
*   **Riesgo:** Alto — mover bloques grandes de HTML puede romper anidamiento de `<div>` o alterar el contexto de selectores CSS dependientes de jerarquía (`:has()`, descendientes tipo `.pbar-center-row .pbar-action-btn`). Requiere verificación exhaustiva de cada selector afectado tras mover su HTML correspondiente.
*   **Nota:** No mezclar con clamp() — esta tarea es exclusivamente de reordenamiento estructural, posterior a Task 38 y previo (o en paralelo, por sección ya reordenada) a la reaplicación de clamp() pendiente.
*   **Progreso 2026-07-04:**
    1.  ✅ `#app-home-screen` movido al inicio de `index.html` (primer hijo de `#app`, antes de `#tv-screen`). Sin selectores CSS de hermanos dependientes de orden.
    2.  ✅ `#vod-details-modal` reubicado junto al pilar VOD (después de `#side-menu`, antes de `#settings-screen`). **Decisión de diseño:** `#vod-controls`/`.vod-filter-btn` NO se extrajeron de `#land-dashboard` — están genuinamente acoplados al grid compartido Live TV/VOD (mismo HTML, toggled por JS entre `live-search-container` y `vod-controls`), no es anidamiento incorrecto.
    3.  ✅ Modales transversales revisados: `#no-signal-overlay` permanece dentro de `#video-container` (posicionamiento `absolute` relativo a ese contenedor — pertenece al pilar Player, no es un modal disperso); `#parental-pin-modal`/`#trial-expired-blocker` ya estaban agrupados al final, zona transversal correcta. Sin cambios necesarios.
    4.  ✅ `.pbar-*` consolidado en un solo bloque contiguo (antes en 2 bloques separados ~2100 líneas).
    5.  ✅ `.side-*` consolidado en un solo bloque contiguo (antes en 3 fragmentos). Selector duplicado `.side-channel-actions` (propiedades no solapadas) dejado adyacente sin fusionar — el orden entre ambas reglas no altera el resultado.
    6.  ✅ `.fbar-*` ya estaba contiguo, sin cambios.
    7.  ✅ `.land-*` consolidado en un solo bloque contiguo. Selector duplicado `.land-dashboard` (layout base + posicionamiento absoluto/fondo) fusionado en una sola regla preservando el mismo orden de declaraciones (comentario explicativo agregado). Comentarios obsoletos `/* Home Dashboard */` y `/* Home Dashboard Refinement */` corregidos. **Decisión de diseño:** la sección "VOD Grid Item Card" (`.land-item.vod-card` + `.land-grid.vod-active` + overrides `:has(.vod-active)`) se dejó deliberadamente separada, entrelazada con `.vod-poster-container`/`.vod-fav-btn`/`.vod-badge` — es un componente híbrido Landing+VOD (las cards VOD se renderizan como `.land-item` con clase `.vod-card` adicional); forzar agrupación solo por prefijo habría roto la cohesión visual del componente.
    8.  ✅ Rename `.land-nav` → `.land-filter-row` / `.land-nav button` → `.land-filter-btn` completado (style.css, index.html, tooltips.js, component-sizer.html, land-reference.css). `.land-nav-btn` (flechas carousel) y los IDs `land-nav-all`/`land-nav-favorites` NO se tocaron (fuera de alcance).
    9.  ✅ `.tnav-*` y `.corner-*`/`.volosd-*` ya estaban contiguos, sin cambios.
    10. ✅ `#video-container`/`#player-container` tenían cada uno 2 reglas duplicadas separadas ~1200 líneas — fusionadas conservando el orden de declaraciones (incluye el override real `position: relative` → `absolute` de `#player-container`). Eliminada una regla vacía duplicada `#player-container iframe {}`.
    11. ✅ `.search-container`/`.search-clear-btn` consolidados (estaban a ~400 líneas de distancia). `.search-box`/`.search-row`/`.search-row-container` identificados como **CSS muerto** (sin referencias en HTML/JS) — no tocados, fuera de alcance de esta tarea (candidato a limpieza aparte).
    12. ✅ `.settings-*` principal ya era contiguo (L2921-3670+). Duplicado `.settings-list` (segunda regla solo redefinía `margin-bottom` sin selector más específico) fusionado preservando orden.
    13. ✅ Bloque `DEV-ONLY` de Sensors/Diagnostics (aislado entre `.dashboard-nav` y el 2º bloque `.pbar-*`) reubicado junto a Developer Timeouts, dentro de la zona de Settings.
    14. ⏳ **Dejado intencionalmente sin tocar** (acoplamiento funcional legítimo, no es fragmentación real): sección "VOD Grid Item Card" (entrelazada con `.vod-*`), `.modal-parental-*` (junto a `#settings-sect-parental`), bloque `DEV-ONLY` grande de `.floating-controls-container` (L5239+, componente transversal propio).
    15. ✅ **Subtarea de versión:** bump a **v2.3.9** completado y sincronizado en `package.json`, `package-lock.json`, `<title>` de `index.html` y el footer "JTV Version" del sidebar de Settings (habían quedado en 2.3.7 tras el bump inicial). También corregido en `contexto_de_perfil.md`.
    *   Cada paso validado con build + prueba visual en la app (Home, Live TV, grid VOD, Player Bar, Sidebar, Settings/Wallpaper) antes de commitear. 14 commits incrementales en `master`. Con esto, el reordenamiento estructural de `index.html`/`style.css` según los 4 pilares queda **sustancialmente completo**; lo pendiente son casos de acoplamiento deliberado ya documentados, no desorden real.
    *   **Bugfix adicional en esta sesión (no parte del alcance original de Tarea 41, pero corregido tras verificar el build empaquetado real):** controles dev-only del Player Bar (autotune-toggle, sources-toggle, indicadores audio/video) quedaban visibles/rotos en producción porque su lógica de ocultamiento vivía únicamente en `developerModule.js` (eliminado por tree-shaking). Ver commit `f275066`.
    *   **Versión de build en la que se completó esta tarea: v2.3.9.**

---

### [2026-07-04] — Sesión de continuación: Land Reference v5, fixes de UX y limpieza global de comentarios

*   **Land Reference v5 — sincronización sizer ↔ style.css:** actualización completa de los valores `min`/`base`/`max` en `docs/examples/sizer/component-sizer.html` (tab `land`) para que los arrays `items` reflejen exactamente los clamp() vigentes en `style.css`. Propiedades actualizadas: `.land-grid` gap (min 2, base 4, max 8), `.land-nav-btn i/svg` size (min 15, base 25, max 60), `.land-dots-container` height-min (27→20), `.land-fav-indicator i/svg` size (min 8, base 16, max 30), `.land-title` font-size (min 15, base 30, max 60), `.land-title-block` padding-top (min 1, base 2, max 3), `.land-dot` size (min 5, base 10, max 20), `.land-filter-row` margin-bottom (min 15, base 30, max 60), `.land-filter-btn` padV (base 6, min 3, max 12) y fontSize (min 7, base 15, max 30). Cache-buster bumpeado a `v=51`.

*   **Pin Player tooltip rename:** todas las ocurrencias de "Pin HUD" / "Unpin HUD" reemplazadas por "Pin Player" / "Unpin Player" en `renderer/utils/tooltips.js` (línea dinámica de tooltip), `renderer/ui/eventListeners.js` (2 ocurrencias via `replace_all`) e `index.html` (`title=""` del `#pbar-pin-btn`).

*   **Fix: punto verde en área de video (floating-controls-container):** el contenedor `#floating-controls-container` (posición `fixed`, border teal redondeado) rendereaba un punto verde de 0×0 cuando todos sus botones estaban `display: none` pero el contenedor seguía en `display: flex`. Solución aplicada en dos capas: (1) CSS default cambiado de `display: flex` a `display: none` en `style.css` para que sea invisible si el módulo dev nunca corre (producción); (2) `developerModule.js` ahora controla el `display` del contenedor directamente en función de `developerModeEnabled && !isLoaderVisible && !isOnboardingVisible`, antes del bloque de lógica de botones individuales.

*   **Factory timeout defaults:** los valores de `window.timeoutsConfig` en `renderer.js` se sincronizaron con los datos reales de AppData (`jtv_data.json`). Cambios: `settingsActive` 5000→6000, `menuActive` 5000→2500, `topNav` 2000→2500, `zappingHUD` 4900→2500, `cursorActive` 5000→3000, `failoverMain` 4000→3000, `watchdogFreeze` 2000→3000, `landAutoHide` 8000→6000. Claves obsoletas (`menuInactive`, `cursorInactive`, `settingsInactive`) no añadidas a los defaults.

*   **Limpieza de comentarios en HTML (`index.html`):** eliminados todos los comentarios en español, referencias a "Tarea #" y nombres de componentes obsoletos como "HUD". Reescritos en inglés con nombres actuales (Player Bar, Volume OSD Overlay, Top Navigation Bar, etc.). 18 comentarios modificados.

*   **Limpieza de comentarios en CSS (`style.css`):** mismas reglas aplicadas. 18 cambios: 3 bloques multi-línea en español traducidos al inglés (`#video-container`, `.land-dashboard`, `.settings-list`), 3 referencias a Tarea eliminadas (`App Loading Screen`, `Onboarding / Welcome Modal`, bloque dev-only "Tree Shaking"), 8 ocurrencias de "HUD" renombradas a "Player Bar" / "Volume OSD" / "Top Navigation Bar", 2 comentarios inline en español corregidos (`Tono violeta moderno`→`violet`, `antes reutilizaba .pbar-filter-badge` eliminado). Cache-buster `v=51`.

*   **Limpieza de comentarios en JS (8 archivos):** mismas reglas aplicadas a `developerModule.js`, `renderer/filters/filterAssigner.js`, `renderer/filters/filterManager.js`, `renderer/ui/eventListeners.js`, `renderer/ui/inactivity.js`, `renderer/player/playerController.js`, `main/bootstrap.js`, `main/ipc/registerUserDataIpc.js`. Total 24 comentarios corregidos: referencias a Tarea eliminadas, "HUD" → "Player Bar" / "Source Switcher" / "Top Navigation Bar", `multicriterio` → `multi-criteria`.

*   **Fix: texto de UI "HUD" en settings (`index.html`):** la descripción del setting "Glass Tuner" decía "Visual tool to adjust HUD, Sidebar, and Top Nav..." — actualizado a "Player Bar, Sidebar, and Top Nav...".

*   **Security: bloqueo de DevTools por teclado en build de producción** — Electron no bloquea F12 / Ctrl+Shift+I / J / C por defecto; en el `.exe` empaquetado esos atajos abrían el inspector de Chromium exponiendo `window.jtvAPI` a la consola aunque todo el código dev ya estaba eliminado del bundle. Agregado bloqueo explícito en `createMainWindow.js` vía `before-input-event`: cuando `isPackaged = true` los 4 atajos de DevTools son interceptados y cancelados antes de llegar al renderer. En dev mode no hay efecto.

*   **Fix: scroll del grid de Live TV se trababa en página 5** — `handleWheel` en `eventListeners.js` calculaba `totalPages` filtrando `state.channels.filter(c => c.favorite)` (solo favoritos) sin importar el tab activo. Con ~50 favoritos / 10 por página = tope duro en página 5, incluso en modo "All Channels" con 150+ canales. Fix: reemplazada la línea con `getFilteredLiveChannels()` (ya importada), la misma fuente de verdad que usa `renderFavoritesGrid`. Ahora el scroll navega todas las páginas sin límite en ambos modos ("All" y "Favorites").

---

#### 6. Tarea 42: Soporte de Streams Directos (HLS / m3u8)
*   **Componentes:** `renderer/player/playerController.js`, `index.html`, `style.css`, `renderer/player/` (nuevo módulo `hlsPlayer.js`), `renderer/services/channelSync.js` (parser m3u).
*   **Objetivo:** Permitir sintonizar canales cuya URL es un stream directo (`.m3u8`, `.m3u`, `.ts`, `rtmp://`, `rtsp://`) usando un `<video>` + hls.js en lugar del `<webview>` actual. El usuario no nota diferencia — mismos controles, mismo Player Bar, mismo comportamiento.

##### A. Detección de tipo de canal
*   Función utilitaria `isDirectStream(url)` en `renderer/utils/streamUtils.js`:
    ```js
    /\.(m3u8|m3u|ts|mp4|mkv)(\?|$)/i.test(url) ||
    /^(rtmp|rtsp|udp|rtp):\/\//i.test(url)
    ```
*   `selectChannel` en `playerController.js` llama `isDirectStream(channel.path)` y enruta a `mountHlsPlayer` o al `mountRemotePlayer` existente (webview).

##### B. Estructura del DOM
*   `#video-container` ya existe. Se le agrega `<video id="hls-player" style="display:none">` como hermano del `<webview>`.
*   Al tunear: si stream directo → `webview.style.display = 'none'`, `hlsPlayer.style.display = 'block'`. Al tunear canal webview → inverso.
*   El `<video>` recibe los mismos estilos de posicionamiento que el webview (100% width/height, `object-fit: contain`).

##### C. Módulo hlsPlayer.js
*   Inicializa una instancia de `Hls` (hls.js) en el arranque y la reutiliza entre canales (no crear/destruir en cada tune).
*   `mountHlsPlayer(url)` — llama `hls.loadSource(url)` + `hls.attachMedia(videoEl)` + `videoEl.play()`.
*   `destroyHlsPlayer()` — llama `hls.destroy()` al cerrar la app.
*   Expone `setVolume(v)` y `setMuted(bool)` para que `volumeController.js` no necesite saber el tipo de player activo.

##### D. Adaptaciones del sistema existente
*   **Volumen/Mute:** `volumeController.js` detecta el modo activo y llama `videoEl.volume` / `videoEl.muted` en lugar de `webContents.setAudioMuted()`.
*   **Watchdog de freeze/silencio:** escucha eventos `waiting`, `stalled` y `error` del `<video>` en lugar de los eventos del webview. Mismos timeouts, misma lógica de failover.
*   **`guest-preload.cjs`:** no aplica a streams directos — se omite completamente para ese tipo.
*   **Autoplay policy:** `videoEl.play()` puede ser bloqueado por Chromium si no hay gesto previo. Mitigado con `--autoplay-policy=no-user-gesture-required` ya presente en el bootstrap.

##### E. Importación de listas m3u (parser)
*   Función `parseM3U(text)` en `renderer/services/m3uParser.js` — lee el formato `#EXTINF` y retorna array de objetos `{ name, logo, categories, path, type: 'stream' }`.
*   En la UI de Ajustes → Channels: nuevo botón "Import M3U" que acepta una URL o un archivo local. La app descarga/lee el contenido, lo parsea y agrega los canales al array existente sin duplicados (comparación por URL).
*   Los canales importados se distinguen con `source: 'imported'` para poder filtrarlos o eliminarlos en lote si el usuario quiere.

##### F. Campo `type` en el modelo de canal
*   Se agrega `type: "web" | "stream"` al esquema de canal en `appState.js`.
*   Canales existentes sin `type` se tratan como `"web"` (retrocompatibilidad total con `jtv_data.json` existente).
*   El CRUD de canales muestra el tipo y permite cambiarlo manualmente si una URL fue mal detectada.

##### G. Acción requerida (orden de implementación)
1.  Instalar hls.js: `npm install hls.js`.
2.  Crear `renderer/utils/streamUtils.js` con `isDirectStream()`.
3.  Agregar `<video id="hls-player">` en `index.html` y sus estilos en `style.css`.
4.  Crear `renderer/player/hlsPlayer.js` con el módulo de reproducción.
5.  Adaptar `playerController.js` para enrutar según tipo.
6.  Adaptar `volumeController.js` y watchdog para operar sobre el player activo.
7.  Crear `renderer/services/m3uParser.js` y agregar botón "Import M3U" en Settings → Channels.

---

### ⏳ Dificultad Alta — 🧠 Recomendado Opus 4.8

#### 8. Tarea 24: Licenciamiento, Trial Lock y Pasarela de Pago 🧠
*   **Componentes:** `main.js`, interceptores del webview, Registro de Windows, Supabase (proyecto nuevo), PayPal Webhook, `jtv_data.json`.

##### A. Trial local (doble verificación)
1.  **Inicio del trial:** se activa en la primera sintonía de un canal. La fecha UTC real se obtiene de la cabecera HTTP `Date` de red (inmune a cambios de reloj local).
2.  **Capa 1 — Registro de Windows:** fecha encriptada con AES-256 en `HKEY_CURRENT_USER\Software\prnt` → `driver_config`.
3.  **Capa 2 — `jtv_data.json`:** campo cifrado adicional en el archivo de datos local.
4.  **Capa 3 (opcional):** `birthtime` del propio `jtv_data.json` como verificación pasiva de antigüedad.
5.  **Validación en cada inicio/sintonía:** comparar diferencia de fecha contra cabecera HTTP. Si expiró o alguna capa fue alterada/eliminada → bloquear acceso.

##### B. Identificador de máquina
*   UUID de placa base obtenido vía `wmic csproduct get UUID`. Se envía a Supabase y se embebe en el link de PayPal (`custom`).

##### C. Servicio de licencias — Supabase
*   Proyecto nuevo por crear.
*   Tabla: `licenses(uuid, email, paypal_txn, created_at)`.
*   Edge Function: recibe webhook de PayPal → valida la transacción → inserta el registro.
*   La app consulta Supabase con su UUID al arrancar → si existe registro → se desbloquea automáticamente.
*   Flujo manual (emergencia): el usuario ingresa su email; la app envía `{email, uuid}` a Supabase para cruce contra el pago recibido.

##### D. UX de pago — opciones evaluadas
*   **Opción A** — Botón abre el browser externo del sistema en la pasarela de PayPal.
*   **Opción B (preferida)** — `BrowserWindow` de Electron embebida apuntando al URL de PayPal con UUID en el parámetro `custom`. El usuario paga sin salir de la app; se detecta la redirección a la URL `return` para cerrar la ventana y verificar la licencia de inmediato.
*   **Opción C (más simple)** — Solo se muestra el botón de pago. Tras pagar, el usuario ingresa su email manualmente; la app cruza `{email, uuid}` contra el webhook de Supabase.

##### E. Link de PayPal de referencia
```
https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=juanhidgo@gmail.com&item_name=JTV%20App%20Licencia&amount=9.99&currency_code=USD&custom=<UUID>&return=https://tu-dominio.com/gracias&notify_url=https://tu-proyecto.supabase.co/functions/v1/paypal-webhook
```

#### 9. Tarea 40: AutoUpdater 🧠
*   **Componente:** Main process (`bootstrap.js`), `electron-updater`.
*   **Acción Requerida:**
    1.  Integrar `electron-updater` para verificar y descargar actualizaciones automáticamente.
    2.  Mostrar notificación al usuario cuando hay una actualización disponible.
    3.  Implementar descarga en segundo plano e instalación al reiniciar.
    4.  Configurar publicación de releases (GitHub Releases o servidor propio).

