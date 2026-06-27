# Bitácora de Mejoras y Modificaciones - JTV.app

Este documento unifica de forma cronológica todas las mejoras, características de usabilidad, correcciones de errores, refactorizaciones y planes de seguridad implementados en el proyecto JTV.app, así como la hoja de ruta de tareas pendientes de desarrollo solicitadas por el usuario.

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

#### 2. Tarea 38: Hotkey Manager
*   **Componente:** `eventListeners.js`, `createMainWindow.js`, Ajustes.
*   **Acción Requerida:**
    1.  Centralizar todos los atajos de teclado en un gestor configurable.
    2.  Permitir al usuario ver y personalizar los hotkeys desde Ajustes.
    3.  Documentar los atajos disponibles en la UI.

---

### ⏳ Dificultad Media

#### 3. Tarea 3 / Item 10: Optimización del Caché VOD y Paginación
*   **Componente:** `refreshVodContent()` e interacciones de redimensionado de ventana.
*   **Problema:** Al redimensionar la ventana o paginar, se destruye el contenedor y se lanzan peticiones HTTP masivas al servidor de películas, causando parpadeos de carga y consumo excesivo de red.
*   **Acción Requerida:**
    1.  Refactorizar para consultar el objeto en memoria `vodCache` como fuente principal de verdad.
    2.  Si los datos ya existen (caché caliente), la paginación y el ajuste de grilla al redimensionar deben hacerse de forma local (offline DOM manipulation).
    3.  Disparar peticiones HTTP *únicamente* en búsquedas nuevas o en la carga inicial.

#### 4. Tarea 37: Soporte Multi-Resolución
*   **Componente:** `style.css`, `layout.js`, `createMainWindow.js`.
*   **Acción Requerida:**
    1.  Adaptar la UI para funcionar correctamente en múltiples resoluciones de pantalla (720p, 1080p, 1440p, 4K).
    2.  Implementar escalado dinámico de fuentes, grids y componentes según el viewport.
    3.  Revisar y ajustar breakpoints y tamaños mínimos/máximos.

---

### ⏳ Dificultad Media-Alta

#### 5. Tarea 30: Soporte Multi-idioma (i18n)
*   **Componente:** Todos los archivos del renderer y main process con textos visibles al usuario.
*   **Objetivo:** Implementar un sistema de internacionalización (i18n) que permita a la app funcionar en múltiples idiomas, con inglés como idioma base.
*   **Acción Requerida:**
    1.  Extraer todos los strings hardcodeados de la UI a archivos de traducción (ej. `locales/en.json`, `locales/es.json`).
    2.  Implementar un sistema de carga de idioma basado en la preferencia del usuario.
    3.  Agregar selector de idioma de interfaz en Ajustes Generales.
    4.  **Excluir:** Nombres de canales, nombres de categorías/filtros, y textos de logs/consola.
*   **Subtarea completada:** Traducción de toda la UI de español a inglés como base.

#### 6. Tarea 23 / Item 12: Configuración de Compilación (Tree Shaking de Módulos Dev)
*   **Componente:** `vite.config.js`, scripts en `package.json` y directivas en código JS.
*   **Acción Requerida:**
    1.  Modularizar y proteger herramientas dev (CRUD, autotuner, diagnóstico de clicks, bypass de trial) bajo condicionales de entorno (`if (!import.meta.env.PROD)`).
    2.  Configurar Vite/Rollup para eliminar todo código muerto dev-only en las compilaciones de producción.

---

### ⏳ Dificultad Alta — 🧠 Recomendado Opus 4.8

#### 7. Tarea 11 / Item 11: Pantalla de Carga y Flujo de Expiración/Login 🧠
*   **Componente:** Pantalla de carga inicial (`index.html`/`renderer.js`), proceso de inicio de Electron (`main.js`) y sección de Ajustes.
*   **Acción Requerida:**
    1.  **Redimensión Dinámica:** Al iniciar, establecer alto mínimo de `720px` (resolución base `1280x720`) y redimensionar la ventana para ocupar como máximo el `80%` del monitor del usuario.
    2.  **Pantalla de Carga:** Mostrar logotipo de JTV animado con barra de progreso blanca (grosor de `10px`). Duración mínima de 2 segundos. Transición final suave mediante desvanecimiento lento.
    3.  **Pestaña "Mi cuenta" en Ajustes:** Crear una pestaña llamada "Mi cuenta" debajo de "General" con botón de login con Google (diseño premium y borde animado estilo arcoíris) e indicar: *"Período de Prueba por 3 días. Inicia sesión para desbloquear la aplicación una vez concluido este período"*.
    4.  **Bloqueo y Expiración:** Al iniciar la app empaquetada (Production `.exe`), si expira el trial de 3 días, detener la carga, mostrar un mensaje de expiración y botones para Iniciar Sesión (Google Login realiza bypass para desbloquear en esta fase) o Desinstalar. El modo de desarrollo evade este bloqueo por defecto.

#### 8. Tarea 24: Protección en Compilado de Producción (Trial Lock y HTTP Server Time) 🧠
*   **Componente:** `main.js`, interceptores del webview y Registro de Windows.
*   **Acción Requerida:**
    1.  **Inicio del Período de Prueba:** El trial de 31 días se activa únicamente en la primera sintonía de un canal. El proceso principal obtiene la fecha UTC real de la cabecera HTTP `Date` de red (inmune a cambios de reloj local).
    2.  **Cifrado y Persistencia:** Guardar la fecha encriptada con AES-256 en el Registro de Windows (`HKEY_CURRENT_USER\Software\prnt` bajo el valor `driver_config`).
    3.  **Validación:** Comprobar la diferencia de fecha contra la cabecera HTTP de red en cada inicio/sintonía. Si expira o se altera/elimina la clave del registro, bloquear el acceso.

#### 9. Tarea 40: AutoUpdater 🧠
*   **Componente:** Main process (`bootstrap.js`), `electron-updater`.
*   **Acción Requerida:**
    1.  Integrar `electron-updater` para verificar y descargar actualizaciones automáticamente.
    2.  Mostrar notificación al usuario cuando hay una actualización disponible.
    3.  Implementar descarga en segundo plano e instalación al reiniciar.
    4.  Configurar publicación de releases (GitHub Releases o servidor propio).

---

### ⏳ Dificultad Muy Alta — 🧠 Recomendado Opus 4.8

#### 10. Tarea 39: Multi-Fuentes de Canales 🧠
*   **Componente:** `channelSync.js`, `playerController.js`, Ajustes de Conectividad.
*   **Acción Requerida:**
    1.  Explorar implementación de soporte para múltiples proveedores de canales (no solo DaddyLive).
    2.  Permitir al usuario agregar URLs y listas personalizadas (M3U, XTREAM, URLs directas).
    3.  Unificar las fuentes en una sola lista de canales con indicador de origen.
