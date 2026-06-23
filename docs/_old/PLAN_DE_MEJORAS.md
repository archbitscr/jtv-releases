# Plan de Implementación de Mejoras (JTV v2.3)

Este documento detalla los pasos de acción y las correcciones de UI/UX derivadas de los reportes de pruebas automatizadas. Su propósito es servir como una lista de tareas (To-Do) técnica para futuras implementaciones.

---

## Tarea 1: Flexibilización del Guardián de Resolución
* **Componente:** `checkResolution()` en `renderer.js`.
* **Problema:** Laptops estándar sufren el cierre forzado de la app al no cumplir el requisito físico estricto, especialmente debido al escalado nativo de Windows (125% o 150%).
* **Acción Requerida:** 
  1. Modificar la lógica para evaluar el espacio de trabajo utilizable real (`window.innerHeight` o el viewport interno).
  2. Reducir la restricción mínima a una resolución más amigable (ej. `1024x720`).
  3. Eliminar el `window.close()` automático y reemplazarlo por una adaptación de layout (CSS Grid/Flexbox) o una advertencia no bloqueante.

## Tarea 2: Mejora del Trigger del Menú Lateral (Sidebar)
* **Componente:** Zona interactiva `#trigger-left`.
* **Problema:** El área de activación del menú al pasar el ratón es demasiado estrecha (apenas unos píxeles), provocando fallos al intentar abrir la lista de canales.
* **Acción Requerida:**
  1. Aumentar el área interactiva (hitbox) del trigger izquierdo a un mínimo de `15px` - `20px`.
  2. *Alternativa:* Evaluar la inclusión de un botón flotante permanente (ícono de menú hamburguesa) transparente que el usuario pueda presionar intencionalmente.

## Tarea 3: Optimización del Caché VOD y Paginación
* **Componente:** `refreshVodContent()` e interacciones de redimensionado de ventana.
* **Problema:** Al redimensionar la ventana o paginar, se destruye el contenedor y se lanzan peticiones HTTP masivas al servidor de películas, causando parpadeos de carga y consumo excesivo de red.
* **Acción Requerida:**
  1. Refactorizar para consultar el objeto en memoria `vodCache` como fuente principal de verdad.
  2. Si los datos ya existen (caché caliente), la paginación y el ajuste de grilla al redimensionar deben hacerse de forma local (offline DOM manipulation).
  3. Disparar peticiones HTTP *únicamente* en búsquedas nuevas o en la carga inicial.

## Tarea 4: Sincronización de Transiciones y Colisiones
* **Componente:** CSS y lógica de clic.
* **Problema:** Las animaciones lentas del menú provocan que clics rápidos sucedan en coordenadas negativas o inválidas (ej. `X = -231`).
* **Acción Requerida:**
  1. Ajustar el tiempo de las transiciones CSS críticas para que sean más veloces (ej. `< 150ms`).
  2. Asegurar en JavaScript que los cálculos de `getBoundingClientRect()` se hagan luego de resolver la animación (o bloquear interacciones hasta que el menú esté completamente en pantalla).

## Tarea 5: Semántica HTML y Minimalismo en Controles de Volumen
* **Componente:** Elementos del HUD inferior (`#tuner-vol-up`, `#tuner-vol-down`).
* **Problema:** Actualmente son elementos `<span>`. Para el estándar web y la navegación por teclado (o lectores de pantalla), no son reconocidos como elementos interactivos, afectando la accesibilidad (ARIA).
* **Acción Requerida:**
  1. **Estructura (HTML):** Cambiar los tags de `<span>` a `<button tabindex="0" aria-label="Subir Volumen">`.
  2. **Diseño (CSS):** Es **crítico** mantener la filosofía de diseño minimalista actual. Se debe inyectar CSS para "desnudar" el botón nativo (`background: transparent; border: none; outline: none; padding: 0;`), asegurando que visualmente sigan siendo únicamente signos ligeros de `+` y `-` con efecto *hover*, sin cajas pesadas, sombras o fondos predeterminados del sistema operativo.

## Tarea 6: Control del Indicador Visual de Clics (Punto Rojo)
* **Componente:** Lógica de visualización de clics (Feedback visual de diagnóstico).
* **Problema:** El indicador visual "botón rojo" que aparece al hacer clic está permanentemente activado cuando se habilitan los diagnósticos. Esto resulta molesto como espectador al interactuar manualmente con la app fuera del proceso de pruebas automatizado.
* **Acción Requerida:**
  1. Vincular la aparición del indicador visual a un ajuste específico (ej. `showDiagnosticClicks`) dentro de las opciones de desarrollador/diagnósticos.
  2. Crear un botón o "switch" en la interfaz de ajustes para habilitar o apagar explícitamente esta función. De esta manera, se podrán ejecutar diagnósticos en modo "developer" teniendo la libertad de encender o apagar el feedback visual según la necesidad de la prueba.

## Tarea 7: Estabilización del Fondo de Pantalla (Fallas e Inconsistencias)
* **Componente:** Lógica de asignación de wallpapers en `renderer.js` e `index.html`.
* **Problema:** El fondo "Afternoon" se cargaba e inmediatamente se oscurecía en negro. Las opciones en el selector de fondo no coincidían con los archivos modificados físicamente por el usuario. Además, seleccionar "Por Defecto" guardaba `"none"` y dejaba la pantalla en negro en lugar de mostrar `Planet.jpg`.
* **Acción Requerida:**
  1. Forzar `Planet.jpg` como el fondo predeterminado absoluto en el ciclo de vida del renderer si no hay configuración, si la actual es inválida o si está seteada en `"none"`.
  2. Actualizar la lista en `index.html` para usar los nombres de archivo correctos y asociar "Por Defecto" directamente con la ruta a `Planet.jpg`.
  3. Reservar la lógica de `"none"` en `applyWallpaper` únicamente para ocultar el fondo durante la reproducción de streaming de TV o VOD.

## Tarea 8: Corrección del Fallo de Pantalla Negra en TV en Vivo
* **Componente:** Atributos del webview en `createMainWindow.js` y estilos en `guest-preload.cjs`.
* **Problema:** Al sintonizar un canal de TV en vivo, solo se escuchaba el audio pero la pantalla se quedaba en negro. Esto era debido a que el sandbox impedía ejecutar el preload script en los subframes del webview, lo que no permitía aplicar las reglas de escalado e inyección de estilos (`nuclearStyle`) en el player.
* **Acción Requerida:**
  1. Desactivar el sandbox del webview (`webPreferences.sandbox = false`) en `createMainWindow.js` para permitir la inyección correcta del preload en subframes.
  2. Permitir que `injectStyle()` se ejecute en todos los frames en `guest-preload.cjs` removiendo la restricción de `window.self !== window.top`.

## Tarea 9: Restablecimiento del Control de Volumen y Silenciador (Mute)
* **Componente:** Sincronización de volumen en `guest-preload.cjs` y silenciador del proceso de fondo.
* **Problema:** Al interactuar con los botones de volumen y mute en el HUD, el volumen físico del reproductor no se regulaba. Además, silenciar la ventana no afectaba los subframes independientes del webview.
* **Acción Requerida:**
  1. Asegurar que `guest-preload.cjs` pueda leer el volumen del canal periódicamente al reactivarse el preload en subframes.
  2. Extender el IPC handler de mute (`SET_AUDIO_MUTED` en `registerDiagnosticsIpc.js`) para mutar secuencialmente tanto la ventana principal como los webcontents del webview secundario.

## Tarea 10: Eliminación de Cargador Artificial
* **Componente:** `ensurePlayerCurtain()` en `renderer.js` y clases en `style.css`.
* **Problema:** Se implementó una pantalla de carga artificial con textos e iconos giratorios que tapaban la carga nativa del reproductor, resultando redundante y molesto.
* **Acción Requerida:**
  1. Remover el contenido del cargador en `ensurePlayerCurtain()` dejando el elemento `.player-loading-curtain` como una simple cortina negra lisa para tapar los destellos iniciales de Chromium.
  2. Limpiar el CSS de animación y contenido del cargador en `style.css`.


# Plan de Implementación de Mejoras (JTV v2.3.6)

Este apartado detalla el conjunto de mejoras e integraciones funcionales planificadas para la iteración v2.3.6, abarcando optimizaciones del sistema, navegación, gestión de canales en modo de desarrollo y seguridad.

---

## Tarea 11: Pantalla de Carga y Flujo de Expiración/Login (App Loading Screen, Ajustes "Mi cuenta" & Bypass)
* **Componente:** Pantalla de carga inicial (`index.html` / `renderer.js`), proceso de inicio de Electron (`main.js` / `createMainWindow.js`) y sección de Ajustes (`ajustes.general.toggle` o nuevas pestañas).
* **Problema:** Se requiere un flujo estructurado de inicio de la app, una sección de cuenta de usuario con el botón de Google Login, y una lógica visual de bloqueo en caso de expiración del periodo de prueba en producción.
* **Acción Requerida:**
  1. **Inicialización y Ventana:** Al iniciar el programa, la ventana debe ajustar su tamaño de manera dinámica: establecer un alto mínimo de `720px` (resolución base de `1280x720`) y, si el monitor del usuario cuenta con mayor resolución, redimensionar la ventana para ocupar como máximo el `80%` del ancho y alto útil de la pantalla (área de trabajo).
  2. **Diseño de Pantalla de Carga (Loading Screen):**
     - Mostrar el logotipo de JTV con animaciones HTML5.
     - Ubicar una barra de progreso de color blanco justo debajo del logotipo (el ancho no debe superar el del logo, con un grosor estricto de `10px`).
     - Duración mínima de visualización: `2 segundos` antes de dar paso a la app.
     - Imagen de fondo: Cargar el fondo por defecto (`Planet.jpg`) o el wallpaper seleccionado previamente por el usuario en sus configuraciones.
     - Salida: Al concluir los 2 segundos mínimos (y la carga de recursos), ingresar automáticamente al Home Screen mediante una transición de desvanecimiento suave y lenta.
  3. **Pestaña "Mi cuenta" en Ajustes:**
     - Crear una pestaña llamada "Mi cuenta" dentro del módulo de "Ajustes", posicionada justo debajo de la pestaña "General".
     - **Opción 1:** Botón de inicio de sesión con Google (Google Login) que cuente con un diseño premium y un borde animado estilo arcoíris (rainbow border). En esta versión, el botón será puramente visual y clickeable (sin backend de autenticación real).
     - **Opción 2:** Mensaje que indique: *"Período de Prueba por 3 días. Inicia sesión para desbloquear la aplicación una vez concluido este período"*.
  4. **Lógica de Bloqueo y Detección de Expiración:**
     - Al iniciar la aplicación, si el periodo de prueba de 3 días ha expirado:
       - El loading screen detecta la expiración y detiene el ingreso automático al Home Screen.
       - Muestra un mensaje debajo de la animación del logotipo indicando la expiración de la prueba.
       - Presenta dos opciones interactivas inferiores:
         1. **Iniciar Sesión (Login):** Botón de login de Google. Para la versión v2.3.6, al hacer clic en este botón se realizará un bypass que desbloqueará y permitirá ingresar a la aplicación normalmente.
         2. **Desinstalar:** Botón para ejecutar la desinstalación o instrucciones de salida.
     - **Exclusión de Bloqueo:** El bloqueo y validación del trial sólo operarán cuando la aplicación esté empaquetada en su ejecutable de producción (`production exe`).
     - **Modo Desarrollo (Developer Mode):** Para efectos de desarrollo, el modo desarrollador estará siempre habilitado por defecto, no se aplicará ningún bloqueo de expiración y se otorgará acceso ilimitado a todos los módulos de la aplicación.

## Tarea 12: Barras de Búsqueda Anti-Hotkeys (Bloqueo de Atajos Teclado)
* **Componente:** Campos de búsqueda e inputs de texto (`#vod-search-input`, `#channel-search`, etc.) en `renderer.js`.
* **Problema:** Al interactuar y escribir en los inputs de búsqueda, se disparan los atajos globales (hotkeys) de la aplicación, como la reproducción/pausa (barra espaciadora) o navegación de canales, interrumpiendo la escritura.
* **Acción Requerida:**
  1. Capturar los eventos de teclado (`keydown`, `keypress`, `keyup`) en todas las barras de búsqueda y campos de texto de la aplicación.
  2. Implementar `event.stopPropagation()` para evitar que las pulsaciones se propaguen hacia los escuchas de atajos globales del sistema.
  3. Verificar que los manejadores globales validen que el elemento activo (`document.activeElement`) no corresponda a un control de entrada.

## Tarea 13: Cerrar/Minimizar a Tray Icon (Bandeja del Sistema)
* **Componente:** Proceso principal en `main.js` y panel de Ajustes Generales (`ajustes.general.toggle` en `renderer.js` / `index.html`).
* **Problema:** Se requiere soporte para ocultar la aplicación en segundo plano sin cerrarla por completo, permitiendo que siga ejecutándose discretamente en el tray icon de Windows.
* **Acción Requerida:**
  1. Inicializar un elemento `Tray` en el hilo principal (`main.js`) con un icono representativo de la app y un menú contextual básico (Mostrar/Restaurar, Salir).
  2. Agregar un switch/toggle de control en la interfaz de Ajustes Generales (`ajustes.general.toggle`) para habilitar/deshabilitar la acción.
  3. Capturar los eventos `close` y `minimize` de la ventana. Si la opción del tray está activa, realizar `event.preventDefault()` y ocultar la ventana con `mainWindow.hide()`.

## Tarea 14: Prevención del Modo Suspensión del Equipo (Prevent Sleep Block)
* **Componente:** Proceso principal (`main.js` con IPC handlers) y Ajustes Generales (`ajustes.general.toggle` en `renderer.js` / `index.html`).
* **Problema:** Al reproducir canales en vivo o películas durante periodos prolongados sin interacción física, el sistema operativo activa la suspensión de pantalla u ordenador.
* **Acción Requerida:**
  1. Utilizar el módulo `powerSaveBlocker` de Electron para bloquear la suspensión de la pantalla y del sistema operativo.
  2. Diseñar un toggle en la sección de Ajustes Generales (`ajustes.general.toggle`) para activar o desactivar dinámicamente este comportamiento.
  3. Comunicar mediante IPC los cambios del interruptor para iniciar (`powerSaveBlocker.start`) o detener (`powerSaveBlocker.stop`) la suspensión según la preferencia del usuario.

## Tarea 15: Navegación del Menú Superior e Interfaz de Timeouts Dinámicos
* **Componente:** Menú superior de navegación e interactividad de módulos en `renderer.js` e `index.html`.
* **Problema:** La navegación y el menú superior requieren un control de temporizadores (timeouts) muy específico dependiendo de si hay un canal activo reproduciéndose o no, evitando interrupciones molestas al usuario y garantizando el retorno a pantalla completa.
* **Acción Requerida:**
  1. **Lógica de Timeouts según Estado de Canal y Vistas:**
     - **Caso A (Sin canal reproduciéndose - `envivo.channel=none`):**
       - Si la landing está abierta (`envivo.landing=open` o `envivo.landing=open` + `ajustes.landing=open`):
         - El timeout de inactividad de la landing **NO** debe activarse (se mantiene abierta indefinidamente).
         - **Excepción:** Si la landing está abierta y también la pantalla de Ajustes (`envivo.landing=open` + `ajustes.landing=open`), y no hay actividad del mouse (`mouse-activity`), se debe activar un timeout de **15 segundos** para cerrar Ajustes y regresar exclusivamente a la vista limpia de `envivo.landing`.
     - **Caso B (Con canal reproduciéndose - `envivo.channel=yes`):**
       - Si la landing está abierta (`envivo.landing=open` o `envivo.landing=open` + `ajustes.landing=open`):
         - Si no hay actividad del mouse (`mouse-activity`), el timeout será de **5 segundos**. Al expirar, se cerrarán todos los overlays (landing y ajustes) regresando a la reproducción a pantalla completa de `envivo.module`.
  2. **Acciones del Menú Superior con Canal Activo (`envivo.channel=yes`):**
     - Cuando la landing y los ajustes están cerrados (pantalla completa de reproducción), las opciones del menú superior deben mapearse así:
       - **Botón 1 ("En Vivo" / Live):** Abre la landing (`envivo.landing=open`).
       - **Botón 2 ("Series"):** Redirecciona e ingresa a la sección de Series (`series.module`).
       - **Botón 3 ("Películas"):** Redirecciona e ingresa a la sección de Películas (`peliculas.module`).
       - **Botón 4 ("Ajustes"):** Abre directamente el panel de Ajustes superpuesto (`ajustes.landing=open`).
  3. **Ocultamiento del Menú Superior (Top Menu Global Timeout):**
     - El menú superior de navegación cuenta con un timeout de ocultación global de **2 segundos**.
     - Este temporizador de 2 segundos se activa únicamente cuando no hay actividad del mouse (`mouse-activity`) **Y** el cursor no está posicionado encima del menú superior (no hay `mouse-hover`). Si el mouse está sobre el menú, la barra permanece visible.

## Tarea 16: Centralización del Gestor de Canales en Ajustes y Mini-App de Logos (Dev Mode Only)
* **Componente:** Módulo de Ajustes (`ajustes.landing` en `index.html`), barra lateral (`renderer.js` / `.edit-btn`), ventana del proceso de Electron (`main.js` / `preload.cjs`) y nueva sub-aplicación de logotipos.
* **Problema:** La edición directa de canales en el menú lateral resulta intrusiva para el usuario. Es necesario agregar la administración avanzada (CRUD) a una pestaña dedicada en Ajustes, restringida a modo desarrollador, y facilitar la obtención e inyección masiva de logotipos optimizados.
* **Acción Requerida:**
  1. **Pestaña "Canales" en Ajustes:**
     - Crear una pestaña llamada "Canales" en el panel de Ajustes (`ajustes.landing`).
     - El CRUD de canales (agregar, editar y borrar) estará restringido exclusivamente al modo desarrollador (Developer Mode) y se podrá realizar adicionalmente dentro de esta pestaña (`ajustes.landing.canales`) con las siguientes opciones:
     - **Diseño de Interfaz Split (50% / 50%):**
       - **50% Lado Derecho:** Grilla/Lista vertical scrollable que muestre los canales con el formato `[Número] - [Nombre de Canal]`.
       - **50% Lado Izquierdo (o viceversa):** Formulario de edición que contiene los campos actuales (Nombre, Ruta, Categorías, Favorito, Vista previa del logo).
  2. **Comportamiento en Menú Lateral (Sidebar):**
     - Ocultar el botón de edición (`.edit-btn` / icono de controles/sliders) en la barra lateral para usuarios normales. Mostrarlo únicamente si el Modo Dev está activo.
  3. **Mini-App Externa de Gestión de Logos:**
     - Desarrollar una mini-app/herramienta secundaria e independiente diseñada para:
       - Buscar en Internet los logotipos de los canales de forma automatizada.
       - Redimensionar las imágenes a una resolución estándar de miniatura (Thumbnail recomendado de `300x300px`).
       - Agrupar lógicamente canales que compartan el mismo logotipo.
       - Inyectar de manera permanente los thumbnails locales en la base de datos de JTV.
     - **Integración y Lanzamiento:**
       - Agregar un botón específico dentro de `ajustes.landing.canales` (visible solo en modo desarrollador) que permita lanzar esta mini-app como una ventana de sistema independiente (`BrowserWindow` de Electron).
       - Conceder a la mini-app acceso de desarrollador (API / IPC) a JTV para emparejar e inyectar de forma directa los logos según la identidad (nombre o ID) de los canales.
  4. **Restricción de Pestañas Avanzadas en Ajustes (Servidores, APIs y Sensores):**
     - Modificar el menú lateral del panel de Ajustes para que las pestañas "Servidores" (`sources`), "APIs" (`metadata`) y "Sensores" (`sensors`) pertenezcan exclusivamente al Modo Desarrollador (Dev Mode).
     - Estas tres pestañas estarán ocultas por defecto (clase `hidden` asignada en el inicio) para usuarios comunes, mostrándose y habilitándose en el menú lateral únicamente cuando el modo de desarrollo esté activo.

## Tarea 17: Channel Manager (Dev Mode Only) - Autotuner de Canales
* **Componente:** Herramientas de diagnóstico de canales en `renderer.js` / `main.js`.
* **Problema:** Validar manualmente qué streams o enlaces IP están caídos o activos consume un tiempo considerable de desarrollo.
* **Acción Requerida:**
  1. **Visualización Restringida:** El indicador de estado visual (ej. verde para activo, rojo para caído) será visible **exclusivamente** dentro de la lista del gestor de canales en modo desarrollador (`ajustes.landing.canales`). No afectará la vista de canales de cara al usuario final.
  2. **Funcionamiento del Autotuner:** Implementar el barrido asíncrono para verificar conectividad mediante peticiones HTTP rápidas (HEAD/GET ligeras) en segundo plano, sin interferir con la navegación activa.

## Tarea 18: Channel Manager - Filtros Permanentes, Selección Inicial de Idioma y Permisos
* **Componente:** Filtros, parser de auto-categorización en `renderer.js` e interfaz de bienvenida/instalación inicial (`index.html`).
* **Problema:** Se requiere estructurar los filtros para asegurar que todos los canales pertenezcan a la categoría general, permitir al usuario filtrar los canales por su idioma de preferencia desde la instalación inicial, y restringir la redefinición de estos grupos al panel de desarrollo.
* **Acción Requerida:**
  1. **Requisito Básico de Filtro General ("All"):**
     - Modificar el parser y validador de canales para asegurar que **absolutamente todos los canales** en la lista tengan el filtro `"All"` (o `"all"`) de manera obligatoria en su arreglo de metadatos `categories`.
  2. **Configuración de Filtros Permanentes y Selección Inicial (Asistente de Bienvenida):**
     - Definir las agrupaciones de sistema fijas: `"all"`, `"group channels by language"` (segregación grupal por lenguaje) y `"group by genre"`.
     - **Pantalla de Configuración Inicial (First Run / Instalación):** Al abrir la app por primera vez, mostrar una pantalla de bienvenida donde el usuario deba seleccionar qué grupos de canales desea visualizar según su idioma (ej. Español, Inglés, etc.).
     - Filtrar la interfaz principal de la aplicación basándose en la selección del idioma del usuario en este asistente.
  3. **Reglas de Permisos y Edición:**
     - **Restricción de Grupos de Lenguaje:** La creación de nuevos grupos de idioma, la modificación de los existentes y la asignación/reasignación de canales dentro de un grupo de lenguaje específico **solo se pueden editar dentro del Channel Manager (Dev Mode)** en Ajustes.
     - **Filtros del Sistema:** Visibles para todos, pero editables únicamente por desarrolladores en la pestaña de gestión.
     - **Filtros Personalizados de Usuario:** Cualquier otro filtro creado ad-hoc es editable y eliminable por cualquier usuario (normal o dev).
  4. **Guardado Persistente:** Almacenar la selección de idioma inicial del usuario, los filtros personalizados y las categorías en `localStorage` o el archivo config de usuario.

## Tarea 19: Channel Manager - Módulo de Control Parental
* **Componente:** Bloqueo de canales, persistencia y validaciones en `renderer.js` e interfaz lateral de Ajustes (`ajustes.landing` / `index.html`).
* **Problema:** Protección del contenido infantil frente a canales no aptos para menores, además de requerir claves seguras y un mecanismo lógico de recuperación.
* **Acción Requerida:**
  1. **Horarios de Acceso:** Permitir programar un rango horario automático (schedule on/off) para la activación del bloqueo parental.
  2. **Kids Mode:** Al activarse, reconfigurar la app para mostrar exclusivamente los canales del género infantil (Kids) y aquellos canales seleccionados individualmente por el administrador.
  3. **PIN de 6 dígitos:** Restringir el encendido, apagado y la edición de canales protegidos mediante un código de seguridad de 6 dígitos numéricos.
  4. **Recuperación del PIN:** En caso de olvido del PIN, la clave de desbloqueo/reseteo maestro corresponderá de forma nativa a los primeros 6 números decimales del valor matemático Pi ($\pi$), es decir, `314159`.
  5. **Integración en el Menú de Ajustes:**
     - Agregar un botón para la pestaña "Control Parental" en el menú lateral del panel de Ajustes (`ajustes.landing`).
     - Ubicación: Debe posicionarse justo debajo de la pestaña "Fondos".
     - Visibilidad: Estará visible para todos los usuarios (disponible tanto en modo normal como en modo desarrollador).
     - Diseño: Estéticamente, el botón debe respetar de forma estricta el ancho de la columna del menú y utilizar las mismas clases de estilo (icono a la izquierda, padding y comportamientos interactivos) para integrarse perfectamente.

## Tarea 20: Buscador de Canales Avanzado (Search Engine 2 - Números, Nombres y EPG)
* **Componente:** Motor de consulta en la barra de búsqueda superior en `renderer.js`.
* **Problema:** Las búsquedas son simplistas y solo encuentran nombres exactos de los canales, ignorando su numeración o la información de la guía de programación (EPG).
* **Acción Requerida:**
  1. Refactorizar el motor de búsquedas de canales para que realice un filtrado multicampo indexando: el número del canal, el nombre de la estación, y la sinopsis/detalles del EPG activo.
  2. Mostrar resultados agrupados de manera instantánea mientras el usuario escribe en el input.

## Tarea 21: Zona de Peligro - Restablecimiento Total de Ajustes de Fábrica y Relaunch
* **Componente:** Ajustes en pestaña "Mi cuenta" (`index.html` / `renderer.js`), lógica de inicio y modal de bienvenida (`index.html`), y proceso principal de reinicio (`main.js`).
* **Problema:** Cuando el usuario corrompe configuraciones o desea limpiar su perfil, se requiere una forma limpia de eliminar los datos de cuenta y configuraciones físicas, forzando un ciclo controlado de primera instalación al iniciar de nuevo la app sin reinstalar el ejecutable.
* **Acción Requerida:**
  1. **Integración en la UI:** Posicionar la sección de "Zona de Peligro" (Danger Zone) al final del contenido de la pestaña **"Mi cuenta"** de Ajustes (eliminándola como sección o pestaña independiente).
  2. **Borrado de Datos de Cuenta y Parámetros:** Al confirmar la acción, borrar de manera absoluta las credenciales de cuenta, datos de sesión, `localStorage`, base de datos de canales y archivos de configuración en el directorio de usuario, regresándolos a los parámetros por defecto de instalación.
  3. **Relaunch de la Aplicación:** Una vez limpia la base de datos, ejecutar la instrucción para reiniciar automáticamente la aplicación (enviar señal IPC al main process para ejecutar `app.relaunch()` y `app.exit(0)`).
  4. **Modal de Bienvenida Condicional (Post-Reset):**
     - Tras el reinicio y después de superar la pantalla de carga (Loading Screen), la aplicación detectará que no existen preferencias guardadas e inyectará de forma condicional una **modal interactiva de configuración inicial** que se mostrará por única vez.
     - En esta modal de bienvenida, el usuario deberá seleccionar los grupos de canales por idioma que desea visualizar.
     - **Preselección por Defecto:** Los checkboxes correspondientes a los idiomas **Inglés** y **Español** estarán seleccionados por defecto al abrirse la modal.

## Tarea 22: Rediseño Visual de Iconos de Categoría (Filtros Premium)
* **Componente:** Grilla de filtros, lista de iconos en `renderer.js` (`filterList`) y archivo CSS (`style.css`).
* **Problema:** Los iconos actuales de los filtros resultan demasiado planos e inconexos respecto a la estética interactiva y premium de la aplicación.
* **Acción Requerida:**
  1. Reemplazar o actualizar los iconos de filtros como Deportes (Sports), Películas (Movies), Comida (Food), Música (Music), Comedia (Comedy), Niños (Kids), etc., con recursos SVG más modernos y estilizados.
  2. **Estilo Visual Blanco Eléctrico / Neón:**
     - Preservar estrictamente una paleta de color en tonos **blanco eléctrico y neón monocromático**.
     - Evitar el uso de iconos de colores variados para no sobrecargar visualmente la pantalla ni distraer la atención del espectador.
     - Implementar efectos visuales premium en CSS (sutiles efectos de resplandor neón/glow blanco, transiciones suaves de opacidad, y micro-animaciones de escala/rebote al hacer hover) para otorgar un aspecto luminoso pero sobrio y de alta gama.

## Tarea 23: Configuración de Compilación de Producción (Tree Shaking de Módulos Dev)
* **Componente:** Configuración del empaquetador (`vite.config.js`), scripts de compilación (`package.json`) y directivas de pre-procesador o variables de entorno en el código JavaScript (`import.meta.env`).
* **Problema:** La inclusión del módulo de desarrollo entero (CRUD de Ajustes, lanzador de mini-app de logos, autotuner de canales, visualización de clicks de diagnóstico, bypasses de seguridad, etc.) expone código confidencial y aumenta el peso y la superficie de vulnerabilidad del ejecutable de producción.
* **Acción Requerida:**
  1. **Modularización e Identificación:** Encapsular todas las herramientas de desarrollo y paneles avanzados bajo bloques lógicos y condicionales globales que evalúen variables de entorno (ej. `if (!import.meta.env.PROD)` o `if (process.env.NODE_ENV !== 'production')`).
  2. **Configuración de Tree Shaking:** Ajustar el bundler (Vite/Rollup) para realizar una remoción de código muerto agresiva en builds de producción. Al evaluar las variables de entorno como constantes, el compilador debe eliminar físicamente del bundle final todo el código contenido dentro de los bloques dev-only.
  3. **Verificación de Empaquetado:** Validar que en el archivo transpilado de distribución (`dist/`) no existan referencias legibles al panel de canales avanzado, bypasses del trial, ni mecanismos de control parental maestro, asegurando un ejecutable óptimo, liviano y blindado.

## Tarea 24: Protección en Compilado de Producción (Trial Lock por Sintonía y Validación HTTP Server Time)
* **Componente:** Proceso principal de Electron (`main.js`), interceptor de red/peticiones del webview, e integración con el Registro de Windows.
* **Problema:** Impedir el uso ilimitado de la compilación final (Production `.exe`) estableciendo un límite estricto de prueba de 30 días que sea inmune a la alteración del reloj del sistema del usuario, y sin depender de servidores NTP o servicios de tiempo externos dedicados.
* **Acción Requerida:**
  1. **Inicio del Período de Prueba (Primera Sintonía):**
     - El conteo del período de prueba de 31 días **no** comienza al instalar o abrir la app por primera vez, sino en el **momento exacto en que el usuario sintoniza su primer canal**.
     - En esta primera sintonía, el proceso principal de Electron intercepta la cabecera HTTP `Date` devuelta por el servidor del canal de streaming (o la API del EPG) para obtener la fecha/hora real UTC.
     - Este timestamp inicial se encripta (AES-256) y se almacena de forma oculta en el Registro de Windows bajo la clave (carpeta) `HKEY_CURRENT_USER\Software\prnt`, guardando el payload cifrado dentro del valor de registro denominado `driver_config`.
  2. **Validación Antitrampas (HTTP Server Time):**
     - En cada inicio de la aplicación y en cada sintonización subsiguiente de canales, la app obtendrá el tiempo actual leyendo la cabecera HTTP `Date` del servidor de streaming.
     - Desencriptará el timestamp inicial del registro y calculará la diferencia.
     - Si el tiempo transcurrido es superior a 31 días ($t_{actual} - t_{inicial} > 31\text{ días}$), la aplicación detendrá la reproducción, bloqueará el acceso al Home Screen y mostrará la pantalla de expiración (Login / Desinstalar).
  3. **Seguridad Robusta (Fail-Secure):**
     - Si la clave del registro es alterada, eliminada o resulta ilegible, la app se bloqueará de inmediato.
     - Si la app no puede validar la hora de red (por ejemplo, si el usuario corta el acceso a internet para evitar la comprobación), se bloqueará la sintonización tras un periodo de gracia offline razonable para forzar la validación en línea.

## Tarea 25: Consistencia de Volumen y Comportamientos de Silenciador (Mute)
* **Componente:** Manejo de audio en `renderer.js` (`adjustVolume`, `toggleMute`, `selectChannel`, `zapChannel`).
* **Problema:** Al cambiar de canal (zapping), el volumen y estado de mute pueden desincronizarse o restablecerse. Además, se requiere un comportamiento específico al llegar a los límites (volumen 0 y 10).
* **Acción Requerida:**
  1. **Consistencia en Zapping:** Mantener inalterado el nivel de volumen (`currentVolumeLevel`) y el estado de mute al cambiar de canal. Al sintonizar un nuevo canal, aplicar de inmediato el volumen y mute activos.
  2. **Comportamiento en Volumen 0:**
     - Si el volumen se baja manualmente hasta 0, activar automáticamente el estado de Mute (Mute ON) y actualizar la UI correspondientemente.
  3. **Comportamiento al Desmutar / Subir Volumen (Dos Casos):**
     - **Caso General (Mute Normal):** Si el usuario silenció la app usando el botón Mute (desde un volumen mayor a 0, ej: volumen 6), al presionar desmutar (Mute OFF), el volumen debe retornar a su **nivel original** anterior (ej: volver a 6).
     - **Caso Especial (Mute por volumen 0):** Si el estado de Mute se activó automáticamente porque el volumen se bajó manualmente hasta 0, al presionar desmutar (Mute OFF) o presionar "subir volumen", el nivel de volumen debe establecerse directamente al máximo de **10** (100%).

## Tarea 26: Temporizadores del HUD Inferior (Zapping e Información de Canal)
* **Componente:** HUD de control inferior (`channel-tuner` / HUD overlays) y manejo de eventos de teclado en `renderer.js`.
* **Problema:** Los tiempos de visualización de la información del canal en pantalla deben ser precisos y cómodos para el usuario durante el zapping y consultas rápidas.
* **Acción Requerida:**
  1. **Timeout por Zapping:** Al cambiar de canal (zapping arriba/abajo), el HUD inferior con la información del canal sintonizado debe permanecer visible en pantalla durante **4.9 segundos** a partir del último cambio antes de ocultarse.
  2. **Timeout por Hotkey "0":** Al presionar la tecla rápida `"0"` en el teclado (hotkey para consultar info del canal activo), mostrar el HUD de información del canal y programar su ocultamiento automático a los **4.9 segundos**.

## Tarea 27: Reglas de Zapping por Modos (Todos vs. Favoritos)
* **Componente:** Lógica de zapping (`zapChannel` y `getCurrentNavigationChannels` en `renderer.js`).
* **Problema:** El zapping de canales con las flechas de subir/bajar debe respetar de forma estricta la pestaña y el modo en que el usuario está interactuando con la app.
* **Acción Requerida:**
  1. **Modo Todos los Canales (All Channels Mode):** Si la pestaña activa es la lista general de canales, el zapping arriba/abajo debe recorrer secuencialmente todos los canales disponibles en la grilla general.
  2. **Modo Favoritos (Favorites Mode):** Si la pestaña activa es la lista de favoritos, el zapping debe ciclar **exclusivamente** entre los canales marcados como favoritos, omitiendo el resto de canales del sistema.

## Tarea 28: Landing Page - Corrección de Artefactos de Carga y Estructura de Navegación
* **Componente:** Vistas de Home Dashboard (`index.html` / `renderer.js`), transiciones y selectores CSS (`style.css`) y enrutamiento interno.
* **Problema:** Al acceder a la landing page del módulo "En Vivo" (desde la pantalla principal `main.home`, o bien desde los módulos `series` o `movies`), el fondo de las tarjetas de canales favoritos/EPG cambia de forma repentina y brusca de un tono oscuro a uno más claro, generando un parpadeo visual molesto. Adicionalmente, la navegación de la landing principal debe estructurarse bajo dos categorías bien definidas: Galería y Guía TV.
* **Acción Requerida:**
  1. **Corrección de Artefactos de Carga (Cambio Brusco de Fondo en Tarjetas):**
     - Investigar y estabilizar los estilos CSS aplicados a las tarjetas del Home Dashboard (`.grid-item`, `.home-card`, etc.) durante la transición de módulos.
     - Asegurar que el tono de fondo de las tarjetas sea uniforme y constante desde su inserción en el DOM, eliminando cualquier cambio repentino de color o transiciones CSS desalineadas creadas por la adición tardía de clases en JavaScript.
  2. **Estructura de Navegación de Landing - "Galería":**
     - Debe organizar el contenido y filtros de canales en:
       - **All** (Todos los canales).
       - **Favorites** (Canales favoritos).
       - **Genre** (Filtros agrupados por género).
       - **Language** (Filtros agrupados por idioma).
  3. **Estructura de Navegación de Landing - "Guía TV":**
     - Debe organizar las vistas de programación y eventos en:
       - **EPG schedule** (Grilla con la programación actual de canales).
       - **Upcoming Events** (Eventos deportivos o especiales programados para transmitirse próximamente).
       - **WhatsOnToday** (Destacados y programación relevante para el día de hoy).

## Tarea 29: Reestructuración de Filtros mediante Menús Desplegables (Dropdowns)
* **Componente:** Barra de navegación lateral (`index.html` / `renderer.js`), Home Dashboard (`home-dashboard`), y estilos de componentes CSS (`style.css`).
* **Problema:** La distribución actual de filtros mediante botones individuales (chips) consume espacio excesivo en pantalla y limita la categorización eficiente de canales. Se requiere una organización compacta que agrupe los canales bajo dropdowns específicos.
* **Acción Requerida:**
  1. **Dropdowns en Barra Lateral (Sidebar):**
     - Reemplazar el listado plano de categorías/chips de la barra lateral por **3 menús desplegables (dropdowns)** con las siguientes categorías y contenidos específicos:
       - **Lenguaje:** English, Hispanic, European, MiddleEast, Others.
       - **Género:** Movies, Sports, Comedy, Reality, Food, News, Documentary, Kids, Others.
       - **Evento:** Mundial, F1, MMA, Boxing, Soccer, Basketball, NFL, Baseball, Tennis, Others.
     - **Estilos y Layout CSS:** Los 3 dropdowns deben alinearse en un **único renglón horizontal** dentro del menú lateral. Deben compartir el formato estético premium (con iconos para cada opción y estados hover) y ajustarse para no alterar el ancho global preestablecido de la barra de navegación lateral.
  2. **Distribución en `envivo.landing` (Home Dashboard):**
     - Modificar el sistema de filtrado en la landing de televisión en vivo para reducir la complejidad del menú de navegación a tres pilares de acceso rápido:
       - **Todos:** Lista completa de canales.
       - **Favoritos:** Canales marcados como preferidos por el usuario.
       - **Filtros:** Sección interactiva que despliega/contiene los 3 dropdowns de categorías (Lenguaje, Género y Evento) para búsquedas personalizadas.
