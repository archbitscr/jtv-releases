# PERFIL DE CONTEXTO DEL PROYECTO: JTV.app

## 1. ADN y Propósito del Proyecto
- **Visión General:** JTV.app es una aplicación de escritorio multiplataforma diseñada para la visualización y streaming de canales de televisión (IPTV), películas y series.
- **Objetivos de Negocio:** Ofrecer un reproductor de medios e IPTV ligero, rápido y autohospedado que permita a los usuarios cargar catálogos y organizar su contenido multimedia sin depender de reproductores externos complejos.
- **Alcance Actual vs. Futuro:** Cuenta con una interfaz de catálogo de series y películas (v2), scraping de eventos e indexadores, sistema de filtros y favoritos, control parental, y reproducción con failover multi-fuente. En el futuro se planea licenciamiento con Supabase + PayPal, soporte multi-idioma (i18n), y versión Android.

## 2. Stack Tecnológico y Arquitectura
- **Core Stack:**
  - Electron v30.0.0
  - HTML5 / CSS3 / Vanilla JavaScript (ES Modules)
  - Vite v5.0.0 (bundle y dev server)
- **Arquitectura de Software:** Estructura modular de Electron con separación estricta de responsabilidades:
  - `main.js`: Orquestador del proceso principal — delega a submódulos en `main/`.
  - `main/bootstrap.js`: Inicialización de la app (autoplay policy, powerSaveBlocker, etc.).
  - `main/windows/`: Creación y configuración de BrowserWindow.
  - `main/ipc/`: Handlers IPC segmentados por dominio (audio, developer, diagnostics, scrape, shell, userData, vod, window).
  - `main/network/`: Políticas de red (ZeroTrust, Cloudflare DoH, CORS headers dinámicos).
  - `main/context/`: Estado global del proceso principal (`createAppContext.js`).
  - `main/diagnostics/`: Watchers y controladores de diagnóstico.
  - `main/services/`: Servicios backend (scrapeClient, etc.).
  - `app-preload.cjs`: Preload de la ventana principal — expone `window.jtvAPI` (bridge seguro).
  - `guest-preload.cjs`: Preload aislado para webviews de reproducción (sandbox, mute sync, AudioContext).
  - `renderer.js`: Orquestador del lado cliente — importa módulos de `renderer/`.
  - `renderer/state/appState.js`: Estado centralizado de la app (canales, filtros, preferencias).
  - `renderer/ui/`: Controladores de UI (layout, navegación, inactividad, volumen, sensores, triggers).
  - `renderer/render/`: Renderizado de listas (canales, favoritos, guía EPG).
  - `renderer/player/`: Reproductor con failover multi-fuente y watch timer.
  - `renderer/filters/`: Motor de filtrado unificado (assigner, manager, state).
  - `renderer/settings/`: Módulos de ajustes (parental, tabs, wallpaper).
  - `renderer/services/`: Servicios del renderer (channelSync, EPG, stateManager).
  - `renderer/vod/`: Cache y contenido de VOD (series/películas).
  - `renderer/utils/`: Utilidades (DOM helpers, tooltips, sanitize, glassTuner, iconPicker, customSelect).
  - `developerModule.js`: Módulo de herramientas de desarrollo (CRUD de canales, señal).
  - `shared/ipcChannels.json`: Catálogo centralizado de canales IPC.
- **Seguridad:**
  - `nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true`, `sandbox: true`.
  - API expuesta al renderer exclusivamente mediante `window.jtvAPI` en `app-preload.cjs`.
  - Webviews de reproducción aislados con preload independiente, bloqueo de popups, denegación de permisos de hardware, y barrera de mouse post-reproducción.
  - Políticas de red ZeroTrust con whitelist de dominios en `policyConfig.js`.

## 3. Estructura del Directorio y Mapeo de Código
```
JTV.app/
├── main.js                    # Entry point proceso principal
├── main/
│   ├── bootstrap.js           # Inicialización y flags de arranque
│   ├── context/               # Estado global del main process
│   ├── diagnostics/           # Watchers y controladores de diagnóstico
│   ├── ipc/                   # Handlers IPC segmentados por dominio
│   ├── network/               # ZeroTrust, Cloudflare DoH, CORS
│   ├── services/              # scrapeClient y servicios backend
│   └── windows/               # Creación de ventanas Electron
├── app-preload.cjs            # Bridge seguro → window.jtvAPI
├── guest-preload.cjs          # Preload aislado para webviews
├── index.html                 # Entry point del renderer
├── renderer.js                # Orquestador del renderer
├── renderer/
│   ├── filters/               # Motor de filtrado unificado
│   ├── player/                # Reproductor + failover
│   ├── render/                # Renderizado de listas y grids
│   ├── services/              # channelSync, EPG, stateManager
│   ├── settings/              # Módulos de ajustes
│   ├── state/                 # appState centralizado
│   ├── ui/                    # Controladores de UI
│   ├── utils/                 # Utilidades y helpers
│   └── vod/                   # Cache y contenido VOD
├── developerModule.js         # Herramientas dev (CRUD, señal)
├── shared/
│   └── ipcChannels.json       # Catálogo de canales IPC
├── style.css                  # Estilos principales
├── data/                      # Datos de canales y configuración
├── public/                    # Assets estáticos
├── docs/                      # Bitácora de mejoras, bug solutions
├── temp/                      # CSS de referencia pre-Task 37
├── scratch/                   # Scripts experimentales
├── vite.config.js             # Configuración de Vite
└── package.json               # v2.3.7
```

## 4. Modelo y Estructura de Datos
- **Modelo de datos:** Estructura de catálogos basada en JSON (`jtv_data.json`) para canales, películas y series clasificadas por categorías, con persistencia de preferencias de usuario (favoritos, filtros, estados de toggle).
- **Servicios de Terceros:** Scraping directo desde fuentes de streaming e IPTV y decodificación de listas M3U locales/remotas.

## 5. Estándares de Desarrollo y Guías de Estilo
- **Reglas de Codificación:** ES Modules (`type: "module"`), promesas nativas para async, manipulación directa del DOM.
- **UI:** Interfaz construida con Vanilla CSS (`style.css`), estilo OTT con glassmorphism y acentos neon (`--accent: #00ffcc`).
- **Escalado Responsivo (Tarea 37):** Todos los valores dimensionales deben usar `clamp(min, vw, max)` donde: min = original × 0.67, vw = original/1080×100, max = original × 2.56. Verificar tipo de elemento (HTML text vs SVG) y ausencia de reglas CSS que sobreescriban.
- **Preloads:** CommonJS obligatorio (`.cjs`) por requisito de Electron.

## 6. Workflow y Comandos Útiles
- `npm run dev`: Servidor de desarrollo Vite (renderer hot-reload).
- `npm run start`: Electron apuntando al dev server de Vite.
- `npm run build`: `vite build && electron-builder` para distribución.

## 7. Historial de Decisiones Arquitectónicas (ADR)
- **Vanilla JS en lugar de React/Vue:** Arquitectura ligera para optimizar tiempo de carga y consumo de recursos en equipos de baja especificación.
- **Refactorización del Main Process (2026-06-20):** `main.js` monolítico desglosado en submódulos especializados dentro de `main/` (bootstrap, windows, ipc, network, diagnostics, services, context).
- **Seguridad Hardened (2026-06-20):** Context isolation, sandbox, preloads separados, ZeroTrust con whitelist de dominios, Cloudflare DoH integrado.
- **Motor de Filtrado Unificado (2026-06-24):** Pipeline única `getFilteredChannelsList()` como fuente de verdad para sidebar y landing. 3 dropdowns compartidos.

## 8. Convención Dev-Only (Preparación para Tarea 23 — Tree Shaking)

> **Propósito:** Estandarizar la identificación de todo código, HTML y CSS que es exclusivo del modo desarrollo, para que la Tarea 23 (Tree Shaking de Módulos Dev) pueda eliminarlos mecánicamente del build de producción.

### Inventario de Elementos Dev-Only
*Este inventario debe actualizarse conforme se agreguen o marquen nuevos elementos dev-only.*
*Estado: marcado `data-dev="true"` + gate `body.dev-mode` implementados (tarea de homogenización dev-only).*

| Elemento | Tipo | Ubicación | Marcado | Descripción |
|----------|------|-----------|---------|-------------|
| Pestaña Channels | HTML tab + panel | `index.html` (`#settings-tab-channels`, `#settings-sect-channels`) | `data-dev` ✅ | CRUD de canales, sync. El form CRUD se inyecta en runtime dentro del contenedor estático `#developer-channels-crud-container`. |
| Pestaña Filters | HTML tab + panel | `index.html` (`#settings-tab-filters`, `#settings-sect-filters`) | `data-dev` ✅ | Gestión de filtros |
| Pestaña Connectivity | HTML tab + panel | `index.html` (`#settings-tab-connectivity`, `#settings-sect-connectivity`) | `data-dev` ✅ | Config de dominio |
| Pestaña Sensors | HTML tab + panel | `index.html` (`#settings-sect-sensors`) | `data-dev` ✅ | Diagnóstico de sensores |
| Pestaña Developer | HTML tab + panel | `index.html` (`#settings-tab-developer`, `#settings-sect-developer`) | `data-dev` ✅ | **Migrado a HTML estático** desde la inyección dinámica de `developerModule.js` (Glass Tuner, Signal & Source, Diagnostics, DevTools, Timeouts). El módulo ahora solo busca los elementos estáticos y cablea el subnav. |
| Toggle "Developer Mode" | HTML setting-item | `index.html` (`#developer-mode-toggle`, dentro de System pane) | `data-dev` ✅ | Antes inyectado por `developerModule.js`; ahora estático. Puerta de entrada al modo dev. |
| `developerModule.js` | JS module | Raíz del proyecto | import condicional `if (!isProd)` en `renderer.js` ⚠️ | CRUD de canales, verificación de señal, Glass Tuner, diagnostics, timeouts. **Añade `body.dev-mode` cuando `devModeAvailable`.** |
| `glassTuner.js` | JS module | `renderer/utils/` | import dinámico (bajo `!isProd`) | Tuner visual de glassmorphism (HUD/sidebar/topnav). |
| `sensors.js` | JS module | `renderer/ui/` | import estático ⚠️ | UI de sensores/diagnóstico |
| `registerDeveloperIpc.js` | IPC handler | `main/ipc/` | gated por `context.flags.devModeAvailable` | Handlers IPC para herramientas dev |
| `registerDiagnosticsIpc.js` | IPC handler | `main/ipc/` | gated por `devModeAvailable` | Handlers IPC de diagnóstico |
| `main/diagnostics/` | JS modules | `controller.js`, `watchers.js` | — | Watchers y controladores de diagnóstico |
| `.dev-indicator` | CSS class | `style.css` (DEV-ONLY block) | wrap ✅ + gate | Punto verde en tabs dev-only |
| CSS Sensors/Diagnostics | CSS block | `style.css` `/* Sensors and Diagnostics Styles */` | wrap ✅ | Envuelto en `DEV-ONLY START/END` |
| CSS DevTools + Glass Tuner | CSS block | `style.css` `/* Floating reload button… */` → `/* Glass Tuner Modal */` | wrap ✅ | Envuelto en `DEV-ONLY START/END` |
| `flags.devModeAvailable` | Main flag | `main/context/createAppContext.js` L19 | hardcoded `true` ⚠️ | Controla visibilidad/IPC dev. Task 23 debe condicionarlo a no-prod. |

### Hallazgos de auditoría (pendientes para Tarea 23 — Tree Shaking)
- ⚠️ **`eventListeners.js:32` importa estáticamente** `updateDeveloperUI` de `developerModule.js`. Esto fuerza a `developerModule.js` (y su árbol) dentro del bundle de producción, anulando el `import()` dinámico condicional de `renderer.js`. Vite ya lo advierte en build. **Task 23 debe eliminar este import estático** (o aislar `updateDeveloperUI`) para que el árbol dev sea eliminable.
- ⚠️ `sensors.js` también se importa estáticamente en `renderer.js`.
- ⚠️ `devModeAvailable = true` está hardcodeado en `createAppContext.js`; en producción debe derivarse de `!app.isPackaged` o equivalente.
- ℹ️ CSS dev-only candidato no envuelto aún por riesgo de mezcla con CSS de usuario: `/* Blinking dot for autotuning */` (~L4644) y controles HUD de señal/fuente. Revisar en Task 23.

### Convención de Marcado (implementada en esta tarea)
- **HTML:** Pestañas, paneles y settings dev-only llevan atributo `data-dev="true"`. ✅
- **CSS:** Reglas exclusivas de dev agrupadas entre `/* === DEV-ONLY START === */` ... `/* === DEV-ONLY END === */`. ✅ (bloques principales; sweep completo en Task 23)
- **Visibilidad:** Regla global `body:not(.dev-mode) [data-dev="true"] { display: none !important; }` (+ `.dev-indicator`) en `style.css`. ✅
- **Activación dev-mode:** `renderer.js` añade `body.dev-mode` si `import.meta.env.DEV`; `developerModule.js` lo añade cuando `devModeAvailable`. ✅
- **JS (pendiente Task 23):** Módulos dev-only deben importarse condicionalmente con `if (!import.meta.env.PROD)` y sin imports estáticos que los anclen al bundle.
