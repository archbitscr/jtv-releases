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

## II. Plan de Tareas y Mejoras Pendientes (Hoja de Ruta)

### ⏳ Prioridad 1: Usabilidad, UI y Optimización Básica

#### 1. Tarea 3 / Item 10: Optimización del Caché VOD y Paginación
*   **Componente:** `refreshVodContent()` e interacciones de redimensionado de ventana.
*   **Problema:** Al redimensionar la ventana o paginar, se destruye el contenedor y se lanzan peticiones HTTP masivas al servidor de películas, causando parpadeos de carga y consumo excesivo de red.
*   **Acción Requerida:**
    1.  Refactorizar para consultar el objeto en memoria `vodCache` como fuente principal de verdad.
    2.  Si los datos ya existen (caché caliente), la paginación y el ajuste de grilla al redimensionar deben hacerse de forma local (offline DOM manipulation).
    3.  Disparar peticiones HTTP *únicamente* en búsquedas nuevas o en la carga inicial.

#### 2. Tarea 2: Mejora del Trigger del Menú Lateral (Sidebar)
*   **Componente:** Zona interactiva `#trigger-left`.
*   **Problema:** El área de activación del menú al pasar el ratón es demasiado estrecha (apenas unos píxeles), provocando fallos al intentar abrir la lista de canales.
*   **Acción Requerida:**
    1.  Aumentar el área interactiva (hitbox) del trigger izquierdo a un mínimo de `15px` - `20px`.
    2.  *Alternativa:* Evaluar la inclusión de un botón flotante permanente (ícono de menú hamburguesa) transparente que el usuario pueda presionar intencionalmente.

#### 3. Tarea 6: Control del Indicador Visual de Clics (Punto Rojo)
*   **Componente:** Lógica de visualización de clics (Feedback visual de diagnóstico).
*   **Problema:** El indicador visual "botón rojo" que aparece al hacer clic está permanentemente activado cuando se habilitan los diagnósticos, siendo molesto para el uso normal.
*   **Acción Requerida:**
    1.  Vincular la aparición del indicador visual a un ajuste específico (ej. `showDiagnosticClicks`) dentro de las opciones de desarrollador/diagnósticos.
    2.  Crear un botón o "switch" en la interfaz de ajustes para habilitar o apagar explícitamente esta función.

#### 4. Tarea 7: Estabilización del Fondo de Pantalla (Wallpapers)
*   **Componente:** Lógica de asignación de wallpapers en `renderer.js` e `index.html`.
*   **Problema:** Las opciones en el selector de fondo no coinciden con los archivos físicos y seleccionar "Por Defecto" dejaba la pantalla en negro en lugar de mostrar `Planet.jpg`.
*   **Acción Requerida:**
    1.  Forzar `Planet.jpg` como el fondo predeterminado absoluto en el ciclo de vida del renderer si no hay configuración o si está seteada en `"none"`.
    2.  Actualizar la lista en `index.html` para usar los nombres de archivo correctos y asociar "Por Defecto" directamente con la ruta a `Planet.jpg`.

#### 5. Tarea 10: Eliminación de Cargador Artificial
*   **Componente:** `ensurePlayerCurtain()` en `renderer.js` y clases en `style.css`.
*   **Problema:** Se implementó una pantalla de carga artificial con textos e iconos giratorios redundante sobre la carga del reproductor.
*   **Acción Requerida:**
    1.  Remover el contenido del cargador en `ensurePlayerCurtain()` dejando el elemento `.player-loading-curtain` como una simple cortina negra lisa para tapar los destellos iniciales de Chromium.
    2.  Limpiar el CSS de animación y contenido del cargador en `style.css`.

---

### ⏳ Prioridad 2: Configuración de Lanzador, Compilación y Seguridad de Producción

#### 6. Tarea 11 / Item 11: Pantalla de Carga y Flujo de Expiración/Login
*   **Componente:** Pantalla de carga inicial (`index.html`/`renderer.js`), proceso de inicio de Electron (`main.js`) y sección de Ajustes.
*   **Acción Requerida:**
    1.  **Redimensión Dinámica:** Al iniciar, establecer alto mínimo de `720px` (resolución base `1280x720`) y redimensionar la ventana para ocupar como máximo el `80%` del monitor del usuario.
    2.  **Pantalla de Carga:** Mostrar logotipo de JTV animado con barra de progreso blanca (grosor de `10px`). Duración mínima de 2 segundos. Transición final suave mediante desvanecimiento lento.
    3.  **Pestaña "Mi cuenta" en Ajustes:** Crear una pestaña llamada "Mi cuenta" debajo de "General" con botón de login con Google (diseño premium y borde animado estilo arcoíris) e indicar: *"Período de Prueba por 3 días. Inicia sesión para desbloquear la aplicación una vez concluido este período"*.
    4.  **Bloqueo y Expiración:** Al iniciar la app empaquetada (Production `.exe`), si expira el trial de 3 días, detener la carga, mostrar un mensaje de expiración y botones para Iniciar Sesión (Google Login realiza bypass para desbloquear en esta fase) o Desinstalar. El modo de desarrollo evade este bloqueo por defecto.

#### 7. Tarea 12: Barras de Búsqueda Anti-Hotkeys
*   **Componente:** Inputs de texto (`#vod-search-input`, `#channel-search`, etc.).
*   **Acción Requerida:**
    1.  Capturar eventos de teclado (`keydown`, `keypress`, `keyup`) en todas las barras de búsqueda.
    2.  Implementar `event.stopPropagation()` para evitar que las pulsaciones disparen atajos globales (como pausar o zappear).

#### 8. Tarea 13: Cerrar/Minimizar a Tray Icon (Bandeja del Sistema)
*   **Componente:** Proceso principal en `main.js` y panel de Ajustes Generales.
*   **Acción Requerida:**
    1.  Inicializar un elemento `Tray` en `main.js` con un menú contextual básico (Mostrar, Salir).
    2.  Agregar un switch/toggle de control en la interfaz de Ajustes Generales para habilitar/deshabilitar la acción.
    3.  Si está activo, capturar eventos de cierre/minimizar de la ventana principal y ejecutar `mainWindow.hide()`.

#### 9. Tarea 14: Prevención del Modo Suspensión (Prevent Sleep Block)
*   **Componente:** Proceso principal y Ajustes Generales.
*   **Acción Requerida:**
    1.  Utilizar `powerSaveBlocker` de Electron para bloquear la suspensión de la pantalla y del sistema operativo durante la sintonización/reproducción prolongada.
    2.  Diseñar un toggle en la sección de Ajustes Generales para activar o desactivar este comportamiento de manera dinámica.

#### 10. Tarea 23 / Item 12: Configuración de Compilación (Tree Shaking de Módulos Dev)
*   **Componente:** `vite.config.js`, scripts en `package.json` y directivas en código JS.
*   **Acción Requerida:**
    1.  Modularizar y proteger herramientas dev (CRUD, autotuner, diagnóstico de clicks, bypass de trial) bajo condicionales de entorno (`if (!import.meta.env.PROD)`).
    2.  Configurar Vite/Rollup para eliminar todo código muerto dev-only en las compilaciones de producción.

#### 11. Tarea 24: Protección en Compilado de Producción (Trial Lock y HTTP Server Time)
*   **Componente:** `main.js`, interceptores del webview y Registro de Windows.
*   **Acción Requerida:**
    1.  **Inicio del Períero de Prueba:** El trial de 31 días se activa únicamente en la primera sintonía de un canal. El proceso principal obtiene la fecha UTC real de la cabecera HTTP `Date` de red (inmune a cambios de reloj local).
    2.  **Cifrado y Persistencia:** Guardar la fecha encriptada con AES-256 en el Registro de Windows (`HKEY_CURRENT_USER\Software\prnt` bajo el valor `driver_config`).
    3.  **Validación:** Comprobar la diferencia de fecha contra la cabecera HTTP de red en cada inicio/sintonía. Si expira o se altera/elimina la clave del registro, bloquear el acceso.

---

### ⏳ Prioridad 3: Gestión Avanzada de Canales (Modo Desarrollador Only)

#### 12. Tarea 16: Centralización del Gestor de Canales en Ajustes y Mini-App de Logos
*   **Componente:** Panel de Ajustes, menú de la barra lateral, Electron main process.
*   **Acción Requerida:**
    1.  **Pestaña Canales (CRUD Split 50/50):** Crear pestaña "Canales" (solo dev) con interfaz dividida. Lado derecho: Lista vertical scrollable con `[Número] - [Nombre]`. Lado izquierdo: Formulario CRUD completo.
    2.  **Sidebar Cleanup:** Ocultar el botón `.edit-btn` del menú lateral para usuarios comunes (mostrar solo en modo dev).
    3.  **Mini-App de Logos:** Crear herramienta externa independiente para buscar, estandarizar a 300x300px e inyectar logos locales en la base de datos de JTV mediante IPC/API. Añadir un botón en la pestaña de gestión de canales para abrir esta ventana externa.
    4.  **Restricción de Pestañas Avanzadas:** Ocultar por defecto las pestañas "Servidores", "APIs" y "Sensores", mostrándolas en Ajustes únicamente en Modo Desarrollador.

#### 13. Tarea 17 / Item 13: Autotuner de Canales (Signal Status Checker)
*   **Componente:** Panel de canales CRUD en modo desarrollo.
*   **Acción Requerida:**
    1.  Implementar un barrido asíncrono en segundo plano que realice peticiones HTTP rápidas (HEAD/GET ligeras) para comprobar el estado de conexión de los streams de la base de datos.
    2.  Mostrar círculos de estado visuales (verde/rojo) en el listado del gestor de canales.

#### 14. Tarea 18 (Restante): Selección Inicial de Idioma en Bienvenida
*   **Componente:** Modal de bienvenida interactiva.
*   **Acción Requerida:**
    1.  En el primer inicio o post-reset, inyectar una modal que obligue al usuario a seleccionar los idiomas de los canales que desea ver (pre-seleccionados English y Español por defecto).
    2.  La creación/edición de nuevos filtros de idiomas y reasignación de canales queda reservada al panel de desarrollo.

#### 15. Tarea 20: Buscador de Canales Avanzado (Multicriterio)
*   **Componente:** Barra de búsqueda superior.
*   **Acción Requerida:**
    1.  Refactorizar el motor de búsqueda para indexar en paralelo: número de canal, nombre del canal y sinopsis/detalles del EPG activo.

#### 16. Tarea 21: Zona de Peligro - Restablecimiento Total de Fábrica y Relaunch
*   **Componente:** Pestaña "Mi cuenta" de Ajustes, main process.
*   **Acción Requerida:**
    1.  Mover el botón "Restablecer de Fábrica" al final de la pestaña "Mi cuenta" (Danger Zone).
    2.  Al activarse, limpiar de forma absoluta credenciales, `localStorage`, base de datos de canales y archivos de configuración en AppData.
    3.  Lanzar una instrucción IPC al proceso principal para ejecutar `app.relaunch()` y `app.exit(0)`.

#### 17. Tarea 27: Reglas de Zapping por Modos (Todos vs. Favoritos)
*   **Componente:** `zapChannel` en `renderer.js`.
*   **Acción Requerida:**
    1.  Si el usuario está sintonizando desde la pestaña general, el zapping con las flechas debe recorrer la lista general de canales.
    2.  Si la pestaña activa es Favoritos, las flechas de zapping deben ciclar *exclusivamente* entre los canales marcados como favoritos, omitiendo el resto.

#### 18. Tarea 29 / Item 15: Reestructuración de Filtros mediante Dropdowns
*   **Componente:** Sidebar lateral y Home Dashboard.
*   **Acción Requerida:**
    1.  Reemplazar el listado de chips del sidebar por **3 dropdowns alineados horizontalmente en un solo renglón**:
        *   **Lenguaje:** English, Hispanic, European, MiddleEast, Others.
        *   **Género:** Movies, Sports, Comedy, Reality, Food, News, Documentary, Kids, Others.
        *   **Evento:** Mundial, F1, MMA, Boxing, Soccer, Basketball, NFL, Baseball, Tennis, Others.
    2.  En la Landing, reducir la navegación a: **Todos**, **Favoritos** y **Filtros** (que expande los 3 dropdowns).

#### 19. Tarea 28 / Item 14: Estabilización de Landing Page y Categorías
*   **Componente:** Home Dashboard y transiciones CSS.
*   **Acción Requerida:**
    1.  **Eliminar Parpadeo:** Asegurar un color de fondo uniforme en las tarjetas del dashboard (`.grid-item`, `.home-card`) desde su inserción en el DOM, evitando transiciones bruscas de opacidad o color al cambiar de módulo.
    2.  **Organizar Menú:** Estructurar la landing en dos submenús claros: **Galería** (Todos, Favoritos, Género, Idioma) y **Guía TV** (EPG schedule, Upcoming Events, WhatsOnToday).

#### 20. Tarea 22: Rediseño Visual de Iconos de Categoría (Filtros Premium)
*   **Componente:** Grilla de filtros en la barra lateral.
*   **Acción Requerida:**
    1.  Reemplazar iconos de categorías de filtros con recursos SVG estilizados en color **blanco eléctrico y neón monocromático** (sin múltiples colores).
    2.  Inyectar animaciones de resplandor neón (`drop-shadow` glow) y escalado/rebote al pasar el mouse por encima.
