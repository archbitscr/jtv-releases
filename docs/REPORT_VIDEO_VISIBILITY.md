# Reporte de Diagnóstico y Resolución: Visibilidad de Vídeo (Línea de 1px)

Este reporte técnico detalla el diagnóstico, la causa raíz y las soluciones aplicadas para resolver el error de visualización del vídeo en la sección "En vivo" de la aplicación JTV.

---

## 1. Descripción del Problema

### Síntomas Detectados:
* Al sintonizar cualquier canal de televisión en vivo (por ejemplo, DAZN F1, FX USA, Cartoon Network), el audio se reproduce correctamente y sin interrupciones.
* Los menús laterales, el panel de edición, los controles del HUD (zapper, volumen, mute) y los menús de ajustes funcionan e interactúan de manera normal con el ratón.
* El vídeo **no es visible en el área de reproducción principal**. En su lugar, solo se observa una **delgada línea horizontal de aproximadamente 1 píxel** de grosor en la parte superior de la ventana que muestra colores del canal activo. Fuera de esa delgada línea, la pantalla de reproducción permanece completamente negra.

---

## 2. Relación con la Arquitectura de la App

Para comprender el problema, es crucial analizar cómo funciona el reproductor de vídeo dentro de la arquitectura actual de JTV:

1. **Host Principal (Electron Renderer):**
   * El archivo `index.html` contiene el contenedor principal `#player-container` donde se monta dinámicamente el reproductor de vídeo.
   * `renderer.js` crea dinámicamente una etiqueta de Electron `<webview>` (`#player-webview`) para encapsular de forma segura los sitios web de reproducción remota (originalmente originados en `dlhd.pk`).
   * La app utiliza una barrera transparente `#player-barrier` encima del webview para bloquear clicks no deseados y ventanas emergentes de publicidad inyectadas por el proveedor del stream.

2. **Proceso del Webview y Aislamiento de Sub-Frames:**
   * En el proceso principal de Electron (`main/windows/createMainWindow.js`), el webview está configurado con `nodeIntegrationInSubFrames: true` y `contextIsolation: true`.
   * Esto significa que el script de precarga **`guest-preload.cjs` se ejecuta de forma recursiva tanto en el documento principal del webview como en cada uno de sus sub-iframes**.
   * El webview carga en su nivel superior la página de stream (ej: `stream-537.php`). Dicha página incorpora un iframe llamado `#thatframe`, el cual a su vez carga el reproductor real (ej: `daddy4.php`).

3. **Inyección de CSS Nuclear:**
   * Para asegurar que el reproductor de vídeo del sitio externo se adapte al diseño de JTV, el sistema inyecta estilos CSS restrictivos de pantalla completa tanto desde `renderer.js` (a través de `webview.insertCSS()`) como desde `guest-preload.cjs` (creando un elemento `<style>` en el DOM de cada frame).

---

## 3. Análisis de la Causa Raíz

El diagnóstico detallado a través del sensor de estilos del automatizador de pruebas reveló el siguiente conflicto CSS:

1. **La Regla CSS Invasiva:**
   Tanto en `renderer.js` como en `guest-preload.cjs`, la regla de pantalla completa y de fondo negro se aplicaba usando el siguiente selector:
   ```css
   #player, .player-container, .watch__playerFrame, #playerFrame, #thatframe,
   iframe:not([src*="ads"]):not([src*="/ad"]):not([src*=".ad"]):not([src*="-ad"]):not([src*="track"]):not([src*="pop"]),
   #main-player-wrapper {
       position: fixed !important;
       top: 0 !important;
       left: 0 !important;
       width: 100vw !important;
       height: 100vh !important;
       z-index: 99999999 !important;
       background: black !important;
       display: block !important;
       visibility: visible !important;
   }
   ```

2. **El Error Colateral en Sub-Frames:**
   * El selector genérico `iframe:not(...)` intenta capturar cualquier iframe del reproductor que no parezca un anuncio publicitario.
   * Sin embargo, la página del reproductor (`daddy4.php` / `daddy.php`) y la del stream principal contienen **iframes invisibles o vacíos** (por ejemplo, iframes con `src=""` y estilo original `display: none;` usados para recolección de telemetría o scripts de anuncios de dominios genéricos).
   * Al ejecutarse `guest-preload.cjs` en estos sub-frames, estos iframes vacíos **fueron emparejados por el selector genérico**.
   * La regla CSS forzó a estos iframes ocultos a mostrarse (`display: block !important`), expandirse a pantalla completa (`width: 100vw !important; height: 100vh !important`), posicionarse fijos en `top: 0; left: 0` y pintarse de color **negro sólido** (`background: black !important`) con un z-index extremadamente alto (`99999999`).

3. **El Efecto de la Línea de 1px:**
   * El iframe vacío inyectado con fondo negro se posicionó exactamente encima del elemento `<video>` real.
   * Debido a diferencias de redondeo de sub-píxeles durante la rasterización por aceleración de hardware en Chromium (ej. dimensiones reales calculadas de 1089.6px en el contenedor frente a 1090.4px en el iframe), la capa negra dejó un minúsculo espacio de aproximadamente 1 píxel sin cubrir en el borde superior del viewport.
   * A través de este espacio de 1px se "filtraba" y visualizaba el vídeo reproduciéndose debajo, mientras que el resto de la pantalla quedaba tapado por el fondo negro del iframe auxiliar.

---

## 4. Solución Implementada

Para resolver este problema de manera definitiva sin romper la compatibilidad con los streams, refinamos las reglas CSS para eliminar selectores genéricos y usar identificadores explícitos:

### Paso 1: Refactorización en el Host (`renderer.js`)
Modificamos el método `mountRemotePlayer` para refinar el CSS inyectado en el Webview.
* **Antes:**
  ```javascript
  #watch-iframe, #iframe-embed, .watch-embed, .player-wrapper, #player,
  iframe:not([src*="ads"]):not([src*="/ad"]):not([src*=".ad"]):not([src*="-ad"]):not([src*="track"]):not([src*="pop"]) { ... }
  ```
* **Después (Refinado):**
  ```javascript
  #watch-iframe, #iframe-embed, .watch-embed, .player-wrapper, #player, #thatframe { ... }
  ```
* *Resultado:* El documento de nivel superior del webview ya no fuerza a pantalla completa ni pinta de negro otros iframes de terceros o de overlay.

### Paso 2: Refactorización en el Preload del Invitado (`guest-preload.cjs`)
Modificamos la variable `nuclearStyle` inyectada recursivamente en todos los frames del webview.
* **Antes:**
  ```css
  #player, .player-container, .watch__playerFrame, #playerFrame, #thatframe,
  iframe:not([src*="ads"]):not([src*="/ad"]):not([src*=".ad"]):not([src*="-ad"]):not([src*="track"]):not([src*="pop"]),
  #main-player-wrapper { ... }
  ```
* **Después (Refinado):**
  ```css
  #player, .player-container, .watch__playerFrame, #playerFrame, #thatframe,
  #main-player-wrapper { ... }
  ```
* *Resultado:* Los sub-iframes vacíos o auxiliares internos del reproductor mantienen su comportamiento original (ej. permanecen con `display: none` y `opacity: 0`), evitando que tapen al elemento `<video>`.

---

## 5. Verificación de la Solución

1. **Pruebas Automatizadas:**
   * Se ejecutó el script de control y diagnóstico automatizado (`scratch/run-tests.js`). El script completó todas las tareas satisfactoriamente.
   * **Tamaño de Capturas:** Las capturas de pantalla de la señal en vivo cambiaron drásticamente de tamaño:
     * Antes de la solución: **16.9 KB** (archivos de color negro plano).
     * Después de la solución: **Entre 1.8 MB y 2.9 MB** (archivos a color que contienen los fotogramas del vídeo).

2. **Verificación Visual:**
   * La inspección visual de las capturas del test comprobó que canales como **DAZN F1 ES**, **FX USA** y **Cartoon Network** se reproducen a tamaño completo, ocupando el 100% de la pantalla del reproductor sin la máscara negra superpuesta.
   * Los menús, indicadores de volumen y el botón de pantalla completa se integran perfectamente sobre la señal de vídeo.
