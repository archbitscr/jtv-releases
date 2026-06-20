# Bitácora de Mejoras y Modificaciones - JTV.app

Esta bitácora registra de forma cronológica todas las mejoras, características añadidas y correcciones de errores implementadas en el proyecto JTV.app.

---

## Mejoras y Características de Usabilidad Previas

Estas modificaciones no corresponden a errores técnicos, sino a implementaciones de diseño, usabilidad y optimización del rendimiento incorporadas para mejorar la experiencia de usuario (UX/UI):

*   **Caché de Prefetching para VOD (Series y Películas)**:
    *   **Descripción:** Se añadió un sistema de caché persistente que precarga los primeros 100 títulos de Series y Películas en el arranque de la app. Los datos se guardan directamente en `jtv_data.json` para evitar que el usuario experimente demoras de red al cambiar de sección, logrando transiciones instantáneas.
*   **Soporte de Enlaces Externos y Leyenda de Versión**:
    *   **Descripción:** Se trasladó la leyenda de la versión del panel general hacia el pie del sidebar lateral para limpiar la interfaz. Se implementó un manejador de IPC para abrir enlaces externos (ej. `ARCHBITS.xyz`) en el navegador predeterminado del sistema operativo mediante `shell.openExternal`.
*   **Botón de Limpieza (X) en Buscadores y Auto-Scroll Numérico**:
    *   **Descripción:** Se añadieron botones de limpieza rápida (X) en los campos de búsqueda de En Vivo y VOD (visibles solo cuando hay texto). Asimismo, cuando se realiza una búsqueda numérica, el contenedor se desplaza automáticamente al inicio para mostrar los resultados en orden ascendente desde el primer canal.
*   **Optimización de Interfaz y Scrolling en CRUD de Canales**:
    *   **Descripción:** Se eliminó la altura fija de 450px del CRUD de canales en Ajustes y se aplicó un contenedor flexible (`flex: 1` y `min-height: 0`) para que use todo el espacio restante disponible en la ventana.
    *   **Descripción:** Se agregó un estado de fila seleccionada de forma persistente con desplazamiento automático para el canal activo en edición. Las columnas se fijaron a un ancho estricto de 50/50 con texto recortado para evitar desalineación. Se añadieron barras de scroll ultra-minimalistas que se ocultan al dejar de mover el cursor y se homogeneizaron los botones a la paleta nativa de Ajustes (`.settings-action-btn` y `.danger-btn`).
*   **Atajo de Pantalla Completa (Tecla F)**:
    *   **Descripción:** Se migró el atajo de pantalla completa de la tecla `Esc` a la tecla `F`. Se implementó la lógica en el proceso principal para ignorar las pulsaciones repetidas de la tecla y deshabilitar el atajo cuando el usuario está escribiendo activamente en cualquier buscador o cuadro de texto para evitar conflictos al escribir la letra "f".

---

## [2026-06-15] - Corrección de Canales PPV, Persistencia de Audio y Modal de Onboarding

#### 1. Corrección de Canales PPV (DaddyLive)
*   **Problema:** Varios canales PPV (como PPV 18, PPV 33, PPV 50, etc.) no reproducían contenido debido a que sus dominios de origen/iframe (como `vertex.st`, `embedindia.st`, `mosquewelfare.click`, etc.) eran bloqueados por la directiva de seguridad ZeroTrust en el proceso principal. Además, las cabeceras HTTP `Referer` y `Origin` estaban prefijadas con un dominio estático (`dlhd.pk`), rompiendo la autorización al cambiar de dominio activo.
*   **Modificaciones:**
    *   [policyConfig.js](file:///d:/Projects/JTV.app/main/network/policyConfig.js): Agregados los nuevos dominios de streaming e iframe al arreglo `ALLOWED_DOMAINS` (ej. `vertex.st`, `embedindia.st`, `donis.jimpenopisonline.online`, `mosquewelfare.click`, etc.).
    *   [requestPolicy.js](file:///d:/Projects/JTV.app/main/network/requestPolicy.js):
        *   Mejoradas las heurísticas de `isPlayerSignature` para permitir scripts comunes de reproducción (ej. `bundle.js`, `p2p-engine.min.js`, etc.) y rutas clave (`/ch`, `/e/`).
        *   Actualizado `onBeforeSendHeaders` para resolver dinámicamente la cabecera `Referer` y `Origin` desde el estado de la aplicación (`context.state.globalDomain`) en lugar del valor estático.
    *   [createAppContext.js](file:///d:/Projects/JTV.app/main/context/createAppContext.js): Inicializado `globalDomain` en el estado del contexto global.
    *   [registerUserDataIpc.js](file:///d:/Projects/JTV.app/main/ipc/registerUserDataIpc.js): Sincronizado el estado del dominio activo en `context.state.globalDomain` al guardar preferencias mediante IPC.

#### 2. Persistencia de Volumen y Silencio (Mute) en Cambio de Canal
*   **Problema:** Al cambiar de canal se destruía el webview y se creaba uno nuevo. Esto causaba que el estado de mute de Electron se perdiera en el nuevo `webContents` y los elementos de video tuvieran una filtración de audio (volumen al 100%) durante casi 1 segundo.
*   **Modificaciones:**
    *   [createMainWindow.js](file:///d:/Projects/JTV.app/main/windows/createMainWindow.js): Modificado el evento `did-attach-webview` para propagar de forma inmediata el estado de mute del WebContents del host al nuevo webContents del guest webview.
    *   [guest-preload.cjs](file:///d:/Projects/JTV.app/guest-preload.cjs):
        *   Agregada la variable `hostIsMuted` y el canal IPC `is-audio-muted` en el frame interno.
        *   Modificada la función `syncVideoAudioState` para silenciar el video si `currentVolumeLevel === 0` o `hostIsMuted` es verdadero.
        *   Optimizado el intervalo de sincronización de 150ms para consultar `is-audio-muted` y detectar nuevos elementos `<video>` sin sincronizar (`_jtvSynced`), eliminando la filtración inicial de audio.

#### 3. Bucle del Modal de Onboarding (Grupos de Filtros)
*   **Problema:** El modal de selección de filtros/idiomas aparecía en cada inicio de la aplicación porque la selección solo se guardaba en el `localStorage` temporal del renderer, el cual no era persistente debido al protocolo local `file://`.
*   **Modificaciones:**
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js):
        *   Actualizado `saveAppState()` para guardar las propiedades `onboarded` (boolean) y `selectedLanguages` (array) en el archivo JSON físico (`jtv_data.json`).
        *   Actualizado `init()` para leer estos campos y restaurarlos en el `localStorage` durante el ciclo de arranque antes de verificar el estado de onboarding.
        *   Actualizado el evento del botón de guardar del onboarding para llamar inmediatamente a `saveAppState()`.
    *   [package.json](file:///d:/Projects/JTV.app/package.json): Agregado `"deleteAppDataOnUninstall": true` a la configuración de NSIS para limpiar el directorio AppData de JTV en un desinstalado limpio.

#### 4. Elementos Custom Select de Búsqueda
*   **Problema:** Los botones de opción del select personalizado del dashboard se comportaban como botones estándar de formulario, lo que podía causar envíos o comportamientos inesperados en el DOM.
*   **Modificaciones:**
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js): Modificados los elementos de menú select personalizado (`dash-custom-select-option`) cambiando la etiqueta HTML de `<button type="button">` a `<div>` (realizado por el usuario).

---

## [2026-06-15] - Corrección de Navegación por Teclado en Cuadros de Texto (Inputs)

#### 1. Restauración de Flechas de Dirección y Teclas del Sistema en Inputs
*   **Problema:** Al intentar editar texto en los buscadores o campos de configuración, el usuario no podía usar las flechas de dirección (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`), la tecla `Escape` ni los caracteres de operadores matemáticos (`+`, `-`, `*`) debido a que el proceso principal interceptaba estas teclas a nivel global mediante el evento `before-input-event` de Electron y ejecutaba `event.preventDefault()`, evitando que llegaran de forma nativa a los cuadros de entrada HTML.
*   **Modificaciones:**
    *   [createMainWindow.js](file:///d:/Projects/JTV.app/main/windows/createMainWindow.js):
        *   Se añadió un chequeo de estado de escritura `if (context.windowManager.getTypingState()) return;` en la cabecera del listener de eventos de entrada.
        *   Esto permite omitir el bloqueo global y delegar la pulsación de teclas nativamente al elemento HTML enfocado cuando el usuario se encuentra editando texto.

---

## [2026-06-15] - Corrección de Activación de Audio en Canales en Vivo

#### 1. Autoplay sin Restricciones de Gestos y Resumido de AudioContext
*   **Problema:** En la sección en vivo, el audio del reproductor no se activaba automáticamente al cambiar de canal, quedando silenciado hasta que el usuario hacía un clic real dentro del iframe del reproductor. Esto ocurría porque Chromium restringe el sonido automático y suspende la API de Web Audio (`AudioContext`) a menos que detecte una interacción de usuario real en el marco (cross-origin iframe del webview).
*   **Modificaciones:**
    *   [bootstrap.js](file:///d:/Projects/JTV.app/main/bootstrap.js):
        *   Se añadió `app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');` antes del arranque para desactivar la política de gestos de usuario requerida para autoplay de audio.
    *   [guest-preload.cjs](file:///d:/Projects/JTV.app/guest-preload.cjs):
        *   Se modificó `setupAudioLeveler` para comprobar y llamar a `audioCtx.resume()` de forma continua si el contexto se encuentra en estado suspendido, garantizando que el audio se reactive sin importar el momento de carga de los flujos de video.


---

## [2026-06-15] - Asignación de Filtros en Lote y Ordenación de Categorías

#### 1. Renombrado y Rediseño de Asignación de Filtros
*   **Modificaciones:**
    *   [index.html](file:///d:/Projects/JTV.app/index.html):
        *   Se actualizó el título del componente de "Asignación Rápida de Eventos" a **"Asignación de Filtros"** y se ajustó la descripción del mismo.
        *   Se actualizó el mensaje de estado vacío para sugerir la selección de uno o más canales.

#### 2. Selección Múltiple y Asignación Dinámica en Lote (Bulk)
*   **Modificaciones:**
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js):
        *   Se reemplazó la variable de índice seleccionado único `assignerSelectedChannelIndex` por el arreglo `assignerSelectedChannelIndices` para rastrear múltiples canales seleccionados simultáneamente.
        *   Se implementó la selección múltiple por rango (Shift+Click) y selección individual acumulativa (Ctrl+Click) en la función de control de clics `handleAssignerChannelClick`.
        *   Se añadió un icono de verificación (checkmark) en el extremo derecho de cada ítem de canal en la lista, permitiendo alternar la selección individual (toggled, estilo Ctrl+Click) sin alterar o resetear el resto de canales ya seleccionados.
        *   Se implementó la **selección bidireccional / filtrado dinámico**: si no hay canales seleccionados manualmente (o si ya se está en modo de filtrado), hacer clic en un checkbox de filtro (Idiomas, Géneros, Eventos) selecciona automáticamente todos los canales que contengan dicho filtro (o la intersección de todos los filtros marcados).
        *   Se actualizó `renderAssignerEvents` para calcular el estado de los checkboxes de filtros en base al lote completo de canales seleccionados: marcados como seleccionados (si todos los canales del lote lo tienen o si el filtro está activado en el modo de filtrado dinámico), desmarcados (si ninguno lo tiene) o en estado indeterminado (si solo algunos canales lo tienen).
        *   Se actualizó la columna de metadatos (`selectAssignerChannelMultiple`) para mostrar la información del lote seleccionado, mostrando un icono de capas ("layers") y chips dinámicos con borde discontinuo para indicar filtros compartidos parcialmente con su respectivo contador.

#### 3. Orden de Visualización de Categorías y Filtros (Regla de Ordenación)
*   **Modificaciones:**
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js):
        *   Se creó la función helper `sortCategories(cats)` para ordenar las categorías de forma estricta: el filtro `"all"` siempre se coloca primero, seguido de los grupos de Idiomas, Géneros, Eventos, y finalmente otras categorías secundarias alfabéticamente.
        *   Se aplicó esta regla en la renderización de chips del asignador de filtros y del administrador de filtros del editor de canales en la barra lateral de Canales (`renderChannelFiltersManager`), así como en la agrupación de opciones por `optgroup` en el selector de filtros de dicho panel de edición.

---

## [2026-06-15] - Redireccionamiento de Botón Ajustes, Corrección de Lista Favoritos y Componente Señal

#### 1. Redireccionamiento del Botón Ajustes del Reproductor (HUD)
*   **Modificaciones:**
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js):
        *   Se modificó `hudSettingsBtn.onclick` para que al sintonizar un canal y presionar el botón de Ajustes (engranaje del HUD), se abra la pantalla completa de **Ajustes** en la pestaña **Filtros** (`settings-tab-filters`) y se pre-seleccione automáticamente dicho canal en la lista de asignación para facilitar la edición inmediata.

#### 2. Corrección en Renderizado de Lista de Favoritos (Sidebar)
*   **Modificaciones:**
    *   [index.html](file:///d:/Projects/JTV.app/index.html):
        *   Se añadió la etiqueta de cierre `</div>` faltante para el contenedor de la pestaña de Canales (`tab-channels`) antes de la declaración del contenedor de Favoritos (`tab-favorites`). Esto resuelve el problema de anidamiento de layouts que causaba fallos de renderizado y visualización al cambiar de pestaña en la barra lateral.

#### 3. Rediseño de Autotuner a Componente "Señal" con Indicadores de Video y Audio
*   **Modificaciones:**
    *   [main/services/scrapeClient.js](file:///d:/Projects/JTV.app/main/services/scrapeClient.js):
        *   Se actualizó `checkChannelStatus` para analizar el código HTML de las fuentes y retornar de forma explícita el estado individual de los canales de `video` y `audio`.
    *   [developerModule.js](file:///d:/Projects/JTV.app/developerModule.js):
        *   Se renombró el componente "Autotuner" a **"Señal"** en el formulario de edición de canales del desarrollador.
        *   Se rediseñó la interfaz para mostrar dos indicadores independientes en paralelo para **Video** y **Audio** con estados de color y texto específicos ("Activo" / "Inactivo" / códigos de error HTTP).
        *   Se renombró la función `runAutotuneCheck` a `runSignalCheck` para reflejar el nuevo propósito y actualizar adecuadamente los nuevos elementos del DOM.

---

## [2026-06-15] - Sincronización de Filtros en Panel Principal con Base de Datos

#### 1. Poblado Directo de Filtros desde Ajustes
*   **Modificaciones:**
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js):
        *   Se modificó `populateDropdowns` para que los selectores de categorías (Idiomas, Géneros, Eventos) de la sección "En vivo" y de la barra lateral se carguen directamente desde los arreglos globales de la base de datos de preferencias (`filterLanguages`, `filterGenres` y `filterEvents`) en lugar de extraerlos de forma dinámica a partir de las categorías asignadas de los canales.
        *   Se añadió el reseteo `dropdownsPopulated = false` dentro de `syncFilterList` para forzar que los desplegables se reconstruyan automáticamente cada vez que el usuario agregue, edite o elimine un filtro en Ajustes.
        *   Se movió la declaración de `dropdownsPopulated` al inicio del archivo para evitar ReferenceError por la zona muerta temporal (TDZ).

---

## [2026-06-15] - Limpieza y Corrección Automática de Metadatos de Canales

#### 1. Saneamiento y Alineación Completa de Metadatos con los Filtros de la Base de Datos
*   **Modificaciones:**
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js):
        *   Se implementó la función `cleanChannelMetadata()` para escanear todas las categorías asignadas a cada canal y conservar únicamente `'all'` y las categorías que existan en los arreglos activos de la base de datos (`filterLanguages`, `filterGenres` y `filterEvents`).
        *   Se implementó la normalización estricta de mayúsculas/minúsculas (casing) para que las categorías de los canales coincidan exactamente con la nomenclatura de los filtros en la base de datos (por ejemplo, convirtiendo `"english"` a `"English"` o `"deportes"` a `"Deportes"`).
        *   Se integró esta rutina de limpieza al inicio de la aplicación en `init()`, al guardar preferencias en `saveAppState()` y tras sincronizar canales desde DaddyLive en `syncChannels()`.
        *   Se rediseñó la función `autoCategorizeChannels()` para realizar una categorización dinámica e inteligente: en lugar de usar palabras clave en inglés estáticas (`movies`, `sports`, etc.), busca y empareja dinámicamente conceptos de palabras clave con los filtros reales configurados en la base de datos (ej. mapea "movie" a `"Películas"` si existe un filtro de películas).

---

## [2026-06-15] - Corrección de Scrollbars en Editor de Canales de Ajustes

#### 1. Restauración de Altura de Contenedor y Scrollbars Independientes
*   **Modificaciones:**
    *   [style.css](file:///d:/Projects/JTV.app/style.css):
        *   Se añadió la regla `#channels-subsect-crud.active` con propiedades de contenedor flexible (`display: flex; flex-direction: column; flex: 1; min-height: 0; height: 100%; overflow: hidden;`).
        *   Esto soluciona la pérdida de los scrollbars internos independientes en la lista de canales y en el formulario de edición CRUD de Ajustes que ocurría porque el contenedor padre `.channels-subsect-pane.active` tenía asignado `display: block`, provocando que el contenedor CRUD creciera indefinidamente y desbordara el panel de ajustes completo sin activar el scroll local en la lista de canales.

---

## [2026-06-15] - Mejoras Visuales en Buscadores, Fuentes y Estilos de Canales

#### 1. Rediseño e Integración del Botón de Filtros en Buscadores
*   **Modificaciones:**
    *   [index.html](file:///d:/Projects/JTV.app/index.html):
        *   Se removió el contenedor `.search-row` de los buscadores lateral ("Todos" y "Favoritos") para permitir que el contenedor de entrada `.search-container` use el 100% del ancho del panel.
        *   Se integraron los botones `#toggle-filters-btn` y `#fav-toggle-filters-btn` directamente dentro de sus respectivos `.search-container` en el extremo derecho (compartiendo dinámicamente el espacio del input) sin alterar la anchura externa de la barra.
    *   [style.css](file:///d:/Projects/JTV.app/style.css):
        *   Se añadieron reglas específicas para `.search-container .sidebar-filter-toggle-btn` eliminando sus bordes/fondos, agregando alineación automática a la derecha y una transición sutil de color y escala.
        *   Se definió el color activo con el acento neon `--accent` y un sutil efecto de brillo (`drop-shadow`).

#### 2. Colapso de Filtros por Defecto y Persistencia de Usuario
*   **Modificaciones:**
    *   [index.html](file:///d:/Projects/JTV.app/index.html): Se añadió la clase `collapsed` por defecto a los contenedores `#category-filters` y `#fav-category-filters` para que permanezcan ocultos al cargar inicialmente.
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js): Se modificó la validación inicial de los estados colapsados de `localStorage` para que por defecto sea `'true'` (ocultos) si no existe preferencia guardada previamente, respetando la opción `'false'` solo si el usuario la activa explícitamente.

#### 3. Rediseño Premium de Items de Canal en la Barra Lateral
*   **Modificaciones:**
    *   [style.css](file:///d:/Projects/JTV.app/style.css):
        *   Se actualizó la clase `.channel-item` dándole mayor padding (`6px 10px`), mayor margen de separación (`4px`), esquinas más redondeadas (`8px`) y un fondo/borde semi-translúcido premium.
        *   Se implementó una micro-animación de hover mediante deslizamiento lateral (`transform: translateX(4px)`) que sustituye al anterior desplazamiento vertical, evitando saltos visuales y jitter en la lista.
        *   Se enriqueció la clase `.channel-item.active` aplicando un fondo acentuado translúcido, un borde de acento y una línea/borde interno neon a la izquierda (`box-shadow: inset 3px 0 0 var(--accent)`).

#### 4. Icono de Corazón en la Barra Lateral
*   **Modificaciones:**
    *   [style.css](file:///d:/Projects/JTV.app/style.css):
        *   Se añadió la regla `.tab-btn[data-tab="favorites"].active i` (y svg) para teñir de rojo brillante (`#ff4b4b`) el icono del corazón en la pestaña de Favoritos del menú lateral cuando está activo, complementado con un efecto de sombra difuminada roja (`drop-shadow`), igualando el aspecto del corazón del menú inferior.

#### 5. Alineación de Fuentes Inline en el Zapping HUD
*   **Modificaciones:**
        *   [index.html](file:///d:/Projects/JTV.app/index.html):
        *   Se trasladó el contenedor `#hud-sources-row` para anidarlo directamente dentro de la fila `.hud-autotune-row` a la derecha del botón `#hud-toggle-sources-btn`. Se quitó su margen superior para que se muestre en el mismo renglón al activarse.

---

## [2026-06-15] - Intercepción de Errores HTTP en Webview y Ajuste de Estabilidad de Watchdog (Señal)

#### 1. Intercepción Global de Errores 404/500/503 y Fallas de Carga
*   **Modificaciones:**
    *   [createMainWindow.js](file:///d:/Projects/JTV.app/main/windows/createMainWindow.js):
        *   Se implementaron escuchas para los eventos `did-frame-navigate` and `did-fail-load` sobre `guestContents` (el webContents de cada webview) en el evento `did-attach-webview`.
        *   Se añadió un filtro para frames críticos (el frame principal o URLs que contengan palabras de streaming como `daddyhd.php`, `premiumtv`, `embed`, etc.).
        *   Si un frame crítico responde con un código de estado HTTP `>= 400` (como un 404 o 503) o sufre una falla de red, se emite una notificación IPC (`webview-http-error` o `webview-load-failed`) hacia el renderizador.
    *   [app-preload.cjs](file:///d:/Projects/JTV.app/app-preload.cjs): Exposición de los métodos `onWebviewHttpError` y `onWebviewLoadFailed` al contexto global del renderer (`window.jtvAPI`).
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js):
        *   Suscripción a `onWebviewHttpError` y `onWebviewLoadFailed`. Al recibir una alerta de error en un frame crítico, se ejecuta de manera instantánea el failover (`triggerFailover(0)`), evitando que se muestre en pantalla la página de error del servidor o del navegador.

#### 2. Tolerancia a Carga Inicial de Canal y Cancelación de Failover Activo
*   **Modificaciones:**
    *   [guest-preload.cjs](file:///d:/Projects/JTV.app/guest-preload.cjs):
        *   Se modificó el watchdog de congelamiento de video en `reportAndControlVideo()`.
        *   Si el video está reproduciéndose pero su `currentTime` es 0 (fase de inicialización/búfer del stream), se aplica un tiempo de tolerancia de carga de 8 segundos (en vez del límite estándar de 2 segundos). Esto soluciona las falsas alarmas de congelamiento en canales lentos como Sky Arts UK (canal 683).
        *   Cuando el video progresa (es decir, el `currentTime` avanza), se emite un mensaje IPC `guest-playing` hacia el host.
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js):
        *   Se intercepta el mensaje `guest-playing` dentro del listener de mensajes IPC del webview.
        *   Al recibir `guest-playing`, si hay un failover pendiente de ejecutarse en segundo plano (dentro de los 4 segundos estándar), se cancela el temporizador de failover (`clearTimeout(failoverTimeoutId)`) y se marca `failoverInProgress = false`, manteniendo la reproducción estable en la fuente actual.


---

## [2026-06-15] - Supresión de Tooltips en Menú Superior y Estabilidad de Inactividad en Ajustes

#### 1. Supresión de Tooltips de Navegación en En Vivo
*   **Modificaciones:**
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js): Se añadió una condición de exclusión en `initCustomTooltips()` para retornar de forma temprana si el active module es "En vivo" (`currentModule === 'live'`) y el objetivo (target) está ubicado dentro del menú superior (`#top-nav-menu`). Esto remueve por completo la aparición de los tooltips de navegación únicamente en esta pantalla.

#### 2. Detección de Actividad de Mouse Completa y Hover en Ajustes
*   **Modificaciones:**
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js):
        *   Se actualizó el callback del temporizador `'settings'` en `startInactivityTimers()`, añadiendo una verificación para comprobar si el usuario está hovereando la pantalla de ajustes (`!settingsScreen.matches(':hover')`) antes de forzar su cierre.
        *   Se registraron escuchas de `onmouseenter` y `onmouseleave` en `#settings-screen` en `setupEventListeners()`, permitiendo que el estado de hover sobre la interfaz de Ajustes limpie adecuadamente los temporizadores de inactividad de la app (igual al comportamiento de los otros menús).
        *   Se amplió el rango de eventos que resetean la inactividad de la app a una lista exhaustiva: movimientos (`mousemove`, `pointermove`), clics (`mousedown`, `mouseup`, `click`, `pointerdown`, `pointerup`), desplazamientos (`wheel`, `scroll`), toques en pantalla táctil (`touchstart`, `touchmove`, `touchend`) y pulsaciones de teclas (`keydown`, `keypress`, `keyup`).
        *   Se garantizó que el HUD de zapping (`sourceSwitcher`) solo se muestre con los eventos de movimiento (`mousemove` y `pointermove`), manteniendo intacta la regla visual original.

#### 3. Supresión de Tooltips en Tarjetas del Home Screen
*   **Modificaciones:**
    *   [renderer.js](file:///d:/Projects/JTV.app/renderer.js): 
        *   Se eliminó el bloque de lógica dentro de `getOrGenerateTooltip()` que creaba la etiqueta de tooltip (`"Ir a [Título]"`) para elementos con clase `.home-card`.
        *   Se removió el selector de clase `.home-card` de la lista de selectores de objetivos (`closest`) tanto en el evento de mouseover como en el de mouseout dentro de `initCustomTooltips()`. Esto previene por completo la generación y despliegue de tooltips al interactuar con las tarjetas del home dashboard (En Vivo, Series, Películas, Ajustes).
