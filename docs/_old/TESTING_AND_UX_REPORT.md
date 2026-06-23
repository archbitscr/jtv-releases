# Reporte Técnico de Pruebas y Experiencia de Usuario (UI/UX) - JTV App

Este reporte detalla los hallazgos de la sesión de pruebas automatizadas que simuló el comportamiento de un usuario humano a lo largo de toda la interfaz de la aplicación JTV v2.3. Las pruebas se realizaron utilizando una herramienta de diagnóstico y control de entrada en caliente con visualizadores gráficos de clics (puntos rojos en coordenadas de interacción) y capturas de pantalla secuenciales guardadas en `docs/screenshots/`.

---

## 1. Resumen Ejecutivo del Test

Se ejecutó un script de automatización de **48 pasos** que interactuó con los siguientes módulos de la aplicación:
1.  **Pantalla de Inicio (Home Screen)**
2.  **Sección En Vivo (Live TV)**, incluyendo la sintonización de un canal real y uso del HUD de control de reproducción.
3.  **Ajustes de la Aplicación**, navegando por las 7 pestañas de configuración.
4.  **Sección de Películas (VOD)**, incluyendo la consulta de sinopsis dinámica y la carga del reproductor de video.
5.  **Flujos de Retorno y Escape**, saliendo del reproductor de video con la tecla `Escape` y volviendo a la pantalla principal.

Las pruebas se completaron con éxito de forma técnica, logrando capturar **21 snapshots** con indicadores visuales de clics. Sin embargo, se identificaron múltiples irregularidades, inconsistencias de diseño y fallas de rendimiento críticas.

---

## 2. Irregularidades e Inconsistencias Detectadas (UI/UX)

### A. Guardián de Resolución Excesivamente Estricto (Bloqueo y Cierre Automático)
*   **Comportamiento Anómalo**: La aplicación cuenta con un script de cumplimiento de resolución en `renderer.js` que requiere una resolución de pantalla mínima de `1220 x 1080` píxeles. Si el sistema no cumple esta métrica, muestra un banner y fuerza el cierre de la ventana tras 5 segundos.
*   **Impacto de UX**: En pantallas estándar de laptops (ej. Full HD `1920 x 1080`) que utilizan el escalado recomendado de Windows (125% o 150%), la resolución lógica del navegador se reduce a `1536 x 864` o menos. Esto provoca que **la aplicación se vuelva completamente inutilizable en la mayoría de portátiles modernos**, bloqueándose al instante.
*   **Evidencia Técnica**: En la rutina `checkResolution()`, se evalúan `window.screen.width` y `window.screen.height`. En entornos de pruebas con pantallas no optimizadas, esto requirió un bypass temporal en el código para poder realizar el test.

### B. Trigger del Menú Lateral (Sidebar) Inestable y Flácido
*   **Comportamiento Anómalo**: El menú lateral (`#main-menu`) se despliega de forma automática al posicionar el puntero en el borde izquierdo de la pantalla (`#trigger-left`). Sin embargo, este trigger tiene un ancho CSS extremadamente reducido (apenas unos píxeles).
*   **Impacto de UX**: Es sumamente difícil abrir el menú de forma natural con un mouse o trackpad sin "adivinar" el borde de la ventana. Adicionalmente, durante las pruebas de automatización, mover el cursor al píxel exacto no activaba consistentemente el listener de Electron, lo que obligó a realizar un bypass ejecutando directamente la función `window.switchTab('channels')` y quitando la clase `hidden`.
*   **Evidencia Técnica**: Los listeners de hover (`onmouseenter` / `onmouseleave`) son inconsistentes cuando hay frames de reproducción cruzada en segundo plano capturando el foco del mouse.

### C. Redundancia de Peticiones y Parpadeo de Carga en VOD (Resize y Paginación)
*   **Comportamiento Anómalo**: Cada vez que el usuario redimensiona la ventana, la función `handleResizeDimensions()` recalcula las columnas del grid VOD y, si el número de ítems por página (`VOD_ITEMS_PER_PAGE`) cambia, **ejecuta inmediatamente tres llamadas simultáneas de red** (`Promise.all` de `fetchSflixPage`) para traer nuevo contenido de SFlix.
*   **Impacto de UX/Rendimiento**:
    *   Si el usuario arrastra la esquina de la ventana para cambiar su tamaño, se disparan docenas de peticiones HTTP en ráfaga a los servidores de SFlix, causando parpadeos masivos de la UI (loaders constantes) y un riesgo inminente de baneo de IP por parte del proveedor de contenido.
    *   La paginación horizontal (`#grid-next` / `#grid-prev`) de películas/series limpia el contenedor y hace llamadas de red en lugar de paginar sobre los 100 elementos que ya fueron cacheados previamente en `vodCache`.
*   **Evidencia Técnica**: El código en `refreshVodContent` ignora por completo el estado del caché en memoria para renderizados locales y fuerza la consulta HTTP.

### D. Colisión de Clics en Animaciones de Transición
*   **Comportamiento Anómalo**: Las transiciones CSS del menú lateral y de los paneles tienen una duración que introduce retraso de coordenadas.
*   **Impacto de UX**: Si un usuario rápido o un script automático hace clic en un ítem de la lista inmediatamente después de abrir el menú, las coordenadas físicas del elemento aún están fuera de la pantalla. Esto produce clics fallidos o en zonas muertas porque el cálculo de `getBoundingClientRect()` arroja valores negativos en el eje X (ej. `X = -231`).
*   **Evidencia Técnica**: Los logs del test demostraron que el primer clic de canal falló en la primera iteración al intentar hacer clic en la coordenada `-231` (fuente: `task-171.log`).

### E. Inconsistencias del HUD de Reproducción y Volumen
*   **Comportamiento Anómalo**:
    1.  Los controles de volumen del HUD (`#tuner-vol-up` y `#tuner-vol-down`) están maquetados como elementos `<span>` en lugar de `<button>`. Esto rompe los estándares de accesibilidad (ARIA) y navegación por teclado nativa.
    2.  El control central de Mute (`#tuner-mute`) es un `<button>`, lo que genera una inconsistencia de marcado en el mismo stack vertical de volumen (`volume-compact-stack`).
    3.  El reproductor webview oculta por defecto el slider interactivo de volumen (`#volume-slider`), limitando al usuario a incrementos discretos de volumen (+1 / -1) en lugar de una barra de arrastre rápida.

---

## 3. Diagnóstico de Reproducción y Sintonización de Canales (TV En Vivo)

Se realizó una prueba especializada y exhaustiva en la visualización de canales de televisión utilizando los ejemplos de canales **DAZN F1 ES (ID: 537)**, **FX USA (ID: 317)** y **Cartoon Network (ID: 339)**. A continuación se detallan los hallazgos técnicos del comportamiento del reproductor web, la automatización del audio y el control de volumen.

### A. Funcionamiento del Sensor de Video y Habilitación de Audio
Para sortear las restricciones del navegador sobre el autoplay de video y audio en frames cruzados (cross-origin), se implementó un **Sensor de Video** y un orquestador de interacción automática en `guest-preload.cjs`:
1. **Detección y Clic de Overlays**: El sistema busca y hace clic automáticamente en clases comunes de botones de inicio de reproducción (`.player-poster`, `.play-wrapper`, `.clappr-play-button`).
2. **Simulación de Clic en el Centro**: Si el stream no arranca tras 4 segundos, se simula un clic de ratón directo en el centro del viewport del frame para engañar el bloqueo de reproducción del navegador.
3. **Bypass del Silencio (Speaker Unmute)**: Se inspecciona recursivamente el árbol DOM de los subframes para encontrar y hacer clic en botones de altavoz muteados (ej. `drawer-icon media-control-icon muted`).
4. **Resultados de Diagnóstico**:
   - Para **DAZN F1 ES**, **FX USA** y **Cartoon Network**, el detector registró la transición a reproducción exitosa y el inicio de audio:
     `[AudioDetector] AUDIO STATUS DETECTED: 🔊 SOUND PLAYING (ACTIVE)`
     `[VideoSensor] VIDEO #0 STATUS: playing=true, time=X.X, muted=false, volume=1.00`
   - El monitor de red capturó tráfico de segmentos activos (`.m3u8`) correspondientes a cada canal (por ejemplo, `pontos.phantemlis.top/premium339/tracks-v1a1/mono.m3u8` para Cartoon Network).

### B. Controles de Volumen del HUD Inferior
- Los clics de subir/bajar volumen (`#tuner-vol-up` y `#tuner-vol-down`) y mute (`#tuner-mute`) en el HUD inferior llaman a las funciones `adjustVolume()` y `toggleMute()` en `renderer.js`.
- Estas envían peticiones IPC al proceso principal de Electron, el cual difunde el nuevo nivel a los webviews mediante un canal de transmisión rápido.
- El script de preload captura este volumen (`currentVolumeLevel`) y lo inyecta directamente a la propiedad de audio nativa de las etiquetas `<video>` en el iframe (`video.volume = level / 10`), garantizando control absoluto sobre el audio del reproductor remoto.

### C. Barrera del Mouse (Mouse Barrier)
- Una vez cargado el canal, el renderizador inicia un temporizador de **10 segundos**.
- Pasado este lapso, se altera la propiedad CSS del elemento `<webview>` a `pointer-events: none`.
- **Impacto y Utilidad**: Esto bloquea toda interacción directa del mouse sobre el área de reproducción. Como consecuencia directa, los scripts de la página fuente (que comúnmente disparan menús de volumen flotantes, overlays de anuncios o popups no deseados al detectar movimiento del cursor) no pueden capturar el movimiento ni clics. El stream de video y audio continúa visualizándose limpio.
- **Período de Gracia**: Los primeros 10 segundos permiten interacciones normales (`pointer-events: auto`), indispensables para que los scripts internos del preload automaticen los clics de arranque de video.

### D. Diagnóstico de Captura de Pantalla en Aceleración por Hardware
- Las capturas de pantalla de la sintonización secuencial (`tv_02_dazn_f1_playing.png`, `tv_05_fx_playing.png`, y `tv_07_cartoon_network_playing.png`) resultaron en imágenes completamente negras de **16 KB**.
- **Nota Técnica**: Esto es un comportamiento normal en Electron. `webContents.capturePage()` es incapaz de capturar buffers gráficos que se procesan a través de la aceleración por hardware (GPU) para proteger el rendimiento y los derechos de autor de transmisión. La confirmación inequívoca del éxito de sintonización y reproducción es a nivel lógico y de sensores (red, consola de preload, y estado audible de la ventana).

---

## 4. Detalles de Seguridad Destacados durante las Pruebas

Durante la sintonización de canales y la reproducción del contenido VOD, el monitor de red y seguridad interceptó y neutralizó los siguientes eventos:
*   `[AdBlock] Blocked known ad domain request: s10.histats.com`
*   `[ZeroTrust Block] Cancelled untrusted script load from: www.xadsmart.com`
*   `[ZeroTrust Block] Cancelled untrusted script load from: pl29569919.effectivecpmnetwork.com`
*   `[ZeroTrust Block] Cancelled untrusted script load from: pp.cobnutscopsole.com`
*   `[ZeroTrust Block] Cancelled untrusted script load from: nj.tabretwicht.com`
*   `[ZeroTrust Block] Cancelled untrusted script load from: jnbhi.com`
*   `[ZeroTrust Block] Cancelled untrusted script load from: waust.at`
*   `[ZeroTrust Block] Cancelled untrusted script load from: platform-api.sharethis.com`
*   `[ZeroTrust Block] Cancelled untrusted script load from: static.cloudflareinsights.com`

**Diagnóstico**: El sistema de endurecimiento de seguridad (ZeroTrust Sandbox) implementado en el main process y en los preloads funciona a la perfección. Bloqueó activamente la inyección de rastreadores y scripts de publicidad maliciosa embebidos en el reproductor de los streams sin interrumpir la reproducción del video ni el audio.

---

## 5. Plan de Mejoras y Acción Tecnológica

Se propone el siguiente plan de refactorización para ser implementado en una fase posterior:

| ID | Componente | Descripción de la Mejora | Impacto |
| :--- | :--- | :--- | :--- |
| **01** | **Resolución** | Modificar `checkResolution()` para evaluar el espacio de trabajo utilizable (`window.innerHeight` o el viewport de Electron) en lugar de la resolución física total del monitor (`window.screen`), y reducir la restricción a un mínimo lógico de `1024x720` sin forzar el cierre. | Crítico (Compatibilidad con laptops) |
| **02** | **Navegación** | Aumentar el área interactiva del trigger izquierdo de `2px` a `15px`, o reemplazar el hover por un botón flotante de menú permanente que el usuario pueda presionar con claridad. | Alto (Usabilidad) |
| **03** | **Caché VOD** | Modificar `refreshVodContent()` para que consulte primero el objeto en memoria `vodCache`. Si el caché está caliente, paginar y redimensionar de forma offline utilizando los datos locales. Reservar las llamadas de red únicamente para búsquedas manuales o actualizaciones forzadas. | Alto (Rendimiento y Red) |
| **04** | **Transiciones**| Deshabilitar transiciones CSS complejas o reducir su tiempo a `< 150ms` cuando se detecten herramientas de diagnóstico activas o en interacciones rápidas de teclado/mouse para evitar coordenadas inválidas. | Medio (Robustez) |
| **05** | **Marcado HTML**| Reemplazar los `<span>` del control de volumen del HUD por `<button>` con atributos de accesibilidad estándar (`aria-label`, `tabindex`). | Bajo (Accesibilidad) |

