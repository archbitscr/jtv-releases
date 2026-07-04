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
└── package.json               # v2.3.9
```

## 4. Modelo y Estructura de Datos
- **Modelo de datos:** Estructura de catálogos basada en JSON (`jtv_data.json`) para canales, películas y series clasificadas por categorías, con persistencia de preferencias de usuario (favoritos, filtros, estados de toggle).
- **Servicios de Terceros:** Scraping directo desde fuentes de streaming e IPTV y decodificación de listas M3U locales/remotas.

## 5. Estándares de Desarrollo y Guías de Estilo
- **Reglas de Codificación:** ES Modules (`type: "module"`), promesas nativas para async, manipulación directa del DOM.
- **UI:** Interfaz construida con Vanilla CSS (`style.css`), estilo OTT con glassmorphism y acentos neon (`--accent: #00ffcc`).
- **Escalado Responsivo (Tarea 37):** Se usa fórmula **meseta**: `clamp(MIN, max(clamp(MIN, VW, BASE), calc(BASE + PENDIENTE×(100vw - 2046px))), MAX)` — valor fijo hasta 2046px, crece linealmente hasta MAX en 4K (3840px). Herramienta de calibración: `docs/examples/sizer/component-sizer.html` (abre vía `http://localhost:5173/docs/examples/sizer/component-sizer.html`). Referencias CSS generadas en `docs/examples/sizer/`. Pestañas ya calibradas: `.pbar-*`, `.tnav-*`, `.corner-*`.
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

## 8. Arquitectura CSS — 4 Pilares y Componentes

> **Propósito:** Mapa completo de la estructura visual de la app. Cada componente pertenece a una de 4 secciones principales con un prefijo CSS único. Sirve como referencia para refactorizaciones y aplicación de clamp().
> 
> **Leyenda:** ▣ = dev-only (Opus — no modificar, eliminado en producción por Tarea 23)

```
▣ = dev-only (Opus — no modificar, eliminado en producción)

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   HOME                             LIVE TV                                      │
│                                                                                 │
│   ┌──────────────────┐             ┌──────────────────┐ ┌──────────────────┐    │
│   │ Cards            │             │ Player Bar       │ │ Top Nav          │    │
│   │   .home-*        │             │   .pbar-*        │ │   .tnav-*        │    │
│   │                  │             │                  │ │                  │    │
│   │ · cards-container│             │ · Logo canal     │ │ · Nav buttons    │    │
│   │ · home-card x4   │             │ · Info (name,EPG)│ │   (Live,Series,  │    │
│   │ · card-header    │             │ · Filter badges  │ │    Movies,Sett)  │    │
│   │ · card-icon      │             │ · Zapping ▲▼     │ │ · Active state   │    │
│   │ · card h2        │             │ · Vol + Mute     │ │ · Icons          │    │
│   │ · app-home-screen│             │ · Source selector│ └──────────────────┘    │
│   └──────────────────┘             │ · Fav + Pin      │                          │
│                                    │ · Autotune dots  │ ┌──────────────────┐    │
│                                    │ · Settings btn   │ │ Sidebar          │    │
│                                    └──────────────────┘ │   .side-*        │    │
│   VOD                                                   │                  │    │
│                                    ┌──────────────────┐ │ · Menu container │    │
│   ┌──────────────────┐             │ Landing / Grid   │ │ · Tabs (Ch/Fav)  │    │
│   │ Cards/Controls   │             │   .land-*        │ │ · Channel items  │    │
│   │   .vod-*         │             │                  │ │   (logo,name,    │    │
│   │                  │             │ · Dashboard title│ │    EPG,id-tag)   │    │
│   │ · vod-card       │             │ · Grid carousel  │ │ · Action buttons │    │
│   │ · vod-poster     │             │ · Grid nav < >   │ │ · Close button   │    │
│   │ · vod-fav-btn    │             │ · Grid items     │ │ · Scroll area    │    │
│   │ · vod-badge      │             │   (logo,name,    │ └──────────────────┘    │
│   │ · vod-info (h4)  │             │    EPG,badge)    │                          │
│   │ · vod-meta       │             │ · Dots pagination│ ┌──────────────────┐    │
│   │ · vod-controls   │             │ · Exit button    │ │ Filter Bar       │    │
│   │ · vod-filters    │             │ · Landing nav    │ │   .fbar-*        │    │
│   │   (genre,rating, │             └──────────────────┘ │                  │    │
│   │    year)         │                                  │ · Custom selects │    │
│   │ · vod-filter-btn │             ┌──────────────────┐ │   (Lang,Genre,   │    │
│   │ · vod-filter-sel │             │ Player           │ │    Event)        │    │
│   └──────────────────┘             │   .player-*      │ │ · Chevron icons  │    │
│                                    │                  │ │ · Dropdown menus │    │
│   ┌──────────────────┐             │ · Webview        │ │ · Filter buttons │    │
│   │ Details Modal    │             │ · Edge masks     │ └──────────────────┘    │
│   │   .vod-details-* │             │ · Player barrier │                          │
│   │                  │             │ · No-signal ovl  │                          │
│   │ · Backdrop       │             └──────────────────┘                          │
│   │ · Poster area    │                                                           │
│   │ · Info (title,   │                                                           │
│   │   meta,overview) │                                                           │
│   │ · Play button    │                                                           │
│   │ · Close button   │                                                           │
│   └──────────────────┘                                                           │
│                                                                                  │
│   SETTINGS                                                                       │
│                                                                                  │
│   ┌─────────────────────────┐       ┌─────────────────────────────────────────┐  │
│   │ User-Facing Tabs        │       │ ▣ Dev-Only Tabs (Opus — no modificar)   │  │
│   │   .settings-*           │       │   .settings-* (eliminados en prod)      │  │
│   │                         │       │                                         │  │
│   │ · General (opts+hotkeys)│       │ · Channels (CRUD + Sync)               │  │
│   │ · Filters (Live+Assign) │       │ · Connectivity (Servers + APIs)        │  │
│   │ · Wallpaper (picker)    │       │ · Sensors (status + API docs)          │  │
│   │ · Parental (PIN, kids,  │       │ · Developer (General + Timeouts)       │  │
│   │   schedule, allowed)    │       │ · Filters sub-controles dev            │  │
│   │ · System (lang, pay,    │       │   (add-form genres, Series, Movies)    │  │
│   │   reset)                │       │                                         │  │
│   │ · Items, switches, btns │       │ Marcados data-dev="true"               │  │
│   │ · Sidebar tabs, subnavs │       │ Tree-shaking Tarea 23                  │  │
│   └─────────────────────────┘       └─────────────────────────────────────────┘  │
│                                                                                  │
│   Transversales:                                                                 │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                   │
│   │ Modals     │ │ Vol OSD    │ │ FS/Power   │ │ Tooltips   │                   │
│   │ .modal-*   │ │ .volosd-*  │ │ .corner-*  │ │ .tooltip-* │                   │
│   │· PIN parent│ │· Indicator │ │· Fullscreen│ │· Popup tip │                   │
│   │· Trial exp.│ │· Bar + text│ │· Power btn │ │· Positioning│                  │
│   │· Res.block │ │· Icon      │ │            │ │· Animation │                   │
│   └────────────┘ └────────────┘ └────────────┘ └────────────┘                   │
│   ┌────────────┐ ┌────────────┐ ┌──────────────────────────┐                    │
│   │ Search     │ │▣ Dev Float │ │ Scrollbars               │                    │
│   │ .search-*  │ │ .floating-*│ │  ::-webkit-scrollbar*    │                    │
│   │· Search box│ │ pill horiz.│ │  global pseudo-elements  │                    │
│   │· Clear btn │ │· Glass Tun.│ │  Ubicados en zona        │                    │
│   │· Search ico│ │· Reload btn│ │  Settings del CSS        │                    │
│   └────────────┘ │· Power Off │ └──────────────────────────┘                    │
│                   └────────────┘                                                  │
│   Nota: .hover-trigger → cada trigger junto a su componente en CSS:             │
│   .top (Top Nav) / .bottom (Player Bar) / .left (Sidebar)                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Detalle de componentes por sección

**Home** — Pantalla inicial con tarjetas de navegación
| Componente | Prefijo | Sub-elementos |
|---|---|---|
| Tarjetas de navegación | `.home-*` | `.home-cards-container`, `.home-card`, `.home-card-header`, `.card-icon-wrapper`, `.home-card h2`, `.app-home-screen` |

**Live TV** — Reproducción en vivo con sidebar, grid y controles
| Componente | Prefijo | Sub-elementos |
|---|---|---|
| Player Bar (panel inferior) | `.pbar-*` | `.pbar-logo-*`, `.pbar-info-*`, `.pbar-channel-text`, `.pbar-epg-text`, `.pbar-filter-badge`, `.pbar-zap-btn`, `.pbar-vol-icon`, `.pbar-mute-btn`, `.pbar-source-btn`, `.pbar-sources-row`, `.pbar-mini-*`, `.pbar-fav-btn`, `.pbar-pin-btn` (top-row, siempre visible), `.pbar-autotune`, `.pbar-action-btn`, `.pbar-action-stack`, `.pbar-center-*`, `.pbar-bottom-row` (ch-down + autotune-toggle + settings btn), `.pbar-autotune-toggle-btn` (dev-only); `.hover-trigger.bottom` (trigger de activación) |
| Top Nav (barra superior) | `.tnav-*` | `.tnav-menu`, `.tnav-buttons`, `.tnav-btn`, `.tnav-btn i/svg`; `.hover-trigger.top` (trigger de activación) |
| Sidebar (menú lateral) | `.side-*` | `.side-menu`, `.side-tabs`, `.side-tabs-center`, `.side-tab-btn`, `.side-close-btn`, `.side-channel-item`, `.side-channel-logo`, `.side-channel-info`, `.side-channel-id`, `.side-channel-name-row`, `.side-channel-meta-row`, `.side-epg-text`, `.side-channel-actions`, `.side-action-btn`, `.side-scroll-area`; `.hover-trigger.left` (trigger de activación) |
| Landing (dashboard/grid) | `.land-*` | `.land-dashboard`, `.land-content`, `.land-top-row`, `.land-title-block`, `.land-title`, `.land-controls-block`, `.land-exit-block`, `.land-exit-btn`, `.land-nav`, `.land-grid`, `.land-carousel-wrapper`, `.land-nav-btn`, `.land-item`, `.land-badge`, `.land-logo`, `.land-text-content`, `.land-item h4`, `.land-epg`, `.land-dots-container`, `.land-dots`, `.land-dot` |
| Filter Bar (dropdowns landing) | `.fbar-*` | `.fbar-select`, `.fbar-select-btn`, `.fbar-select-menu`, `.fbar-select-option`, `.fbar-select-label`, `.fbar-chevron`, `.fbar-filter-btn` |
| Player (webview/overlays) | `.player-*` | `#player-container`, `.player-barrier`, `.edge-mask`, `#no-signal-overlay` |

**VOD** — Series y películas con tarjetas, búsqueda y modal de detalles
| Componente | Prefijo | Sub-elementos |
|---|---|---|
| Tarjetas y controles | `.vod-*` | `.vod-card`, `.vod-poster-container`, `.vod-fav-btn`, `.vod-badge`, `.vod-badge.rating`, `.vod-info`, `.vod-info h4`, `.vod-meta`, `.vod-controls`, `.vod-filters-row`, `.vod-filters-label`, `.vod-filter-btn`, `.vod-filter-select` |
| Modal de detalles | `.vod-details-*` | `.vod-details-modal`, `.vod-details-backdrop`, `.vod-details-container`, `.vod-details-body`, `.vod-details-poster`, `.vod-details-info`, `.vod-details-meta`, `.vod-meta-badge`, `.vod-details-actions`, `.vod-details-close` |

**Settings** — Panel de ajustes, pestañas dev-only y componentes transversales

*Pestañas user-facing:*
| Componente | Prefijo | Sub-elementos / Notas |
|---|---|---|
| Panel de ajustes | `.settings-*` | General (options + hotkeys), Filters (Live + Assignment), Wallpaper (picker grid), Parental (PIN, kids, schedule, allowed channels), System (language, payment, reset). Setting items, switches, action buttons, selects, subnavs. |

*Pestañas dev-only (▣ Opus — no modificar, eliminadas en producción por Tarea 23):*
| Componente | Prefijo | Notas |
|---|---|---|
| Channels (CRUD + Sync) | `.settings-*` | `data-dev="true"`, strip en build. CSS en bloque DEV-ONLY. |
| Connectivity (Servers + APIs) | `.settings-*` | `data-dev="true"`, strip en build. |
| Sensors (status + API docs) | `.settings-*` | `data-dev="true"`, strip en build. CSS en bloque DEV-ONLY. |
| Developer (General + Timeouts) | `.settings-*` | `data-dev="true"`, strip en build. CSS en bloque DEV-ONLY. |
| Filters sub-controles dev | `.settings-*` | add-form Genres (`data-dev`), pestañas Series/Movies (`data-dev`). Tab Filters en sí es user-facing. |

*Transversales (pertenecen a Settings):*
| Componente | Prefijo | Sub-elementos / Notas |
|---|---|---|
| Modals (PIN, trial, blocker) | `.modal-*` | `.modal-overlay`, `.modal-backdrop`, `.modal-content`, `.modal-blocker`, `.modal-blocker-content`, `.modal-parental-*` |
| Volume OSD | `.volosd-*` | `.volosd-indicator`, `.volosd-bar-container`, `.volosd-bar`, `.volosd-text`, `.volosd-icon` |
| Fullscreen/Power buttons | `.corner-*` | `.corner-fs-zone`, `.corner-fs-btn`, `.corner-power-zone`, `.corner-power-btn` |
| Tooltips | `.tooltip-*` | `.tooltip-popup` |
| Search | `.search-*` | `.search-container`, `.search-clear-btn`, `.search-icon` |
| Floating Dev Controls | ▣ `.floating-*` | `.floating-controls-container` (bloque horizontal compacto pill, `right:120px bottom:20px`), `.floating-reload-btn` — Glass Tuner btn, Reload, Power Off. Glass Tuner modal es flotante y arrastrable. Dev-only, eliminados en prod. |
| Scrollbars | global | `::-webkit-scrollbar*`, `.scrollbar-active` — pseudo-elementos. Ubicados en zona Settings del CSS. |

---

## 9. Convención Dev-Only (Preparación para Tarea 23 — Tree Shaking)

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
| `flags.devModeAvailable` | Main flag | `main/context/createAppContext.js` | `!app.isPackaged` ✅ | `true` solo sin empaquetar; en el `.exe` es `false` → IPC dev inertes. |
| Pestaña Filters | HTML tab + panel | `index.html` (`#settings-sect-filters`) | **NO dev** (user-facing) ✅ | Tab de usuario. Sub-controles dev marcados granularmente (ver abajo). |
| Filters: add-form Géneros | HTML | `#group-card-genre .filter-group-add-form` | `data-dev` ✅ | Géneros read-only para usuario (`readonly-filter-group` estático). |
| Filters: subpestañas VOD | HTML | subnav + `#filters-content-series/movies` | `data-dev` ✅ | Series/Movies ocultas para usuario. |
| `#floating-controls-container` | HTML | `index.html` (Glass Tuner / Reload / dev Power) | `data-dev` ✅ | Botones flotantes dev. CSS `.neon-white` dentro de DEV-ONLY. |

### Estado Tarea 23 (Tree Shaking) — ✅ COMPLETADA
Hallazgos de la auditoría previa, ya resueltos:
- ✅ **`eventListeners.js` import estático** de `developerModule.js`/`sensors.js` → eliminado; ahora vía `window.updateDeveloperUI?.()` / `window.updateSensorsUI?.()`. Los módulos dev se cargan solo con `import()` bajo `if (!import.meta.env.PROD)` en `renderer.js` → excluidos del bundle de prod.
- ✅ **`devModeAvailable`** → `!app.isPackaged` en `createAppContext.js`.
- ✅ **Strip HTML/CSS** → plugin Vite `stripDevOnly` (`vite.config.js`, `apply:'build'`) elimina elementos `data-dev`, comentarios HTML y bloques `DEV-ONLY` del CSS.
- ✅ **Fix:** `#power-user-btn` (apagado de usuario) se cablea ahora en core (`renderer.js`), no en el módulo dev.
- ℹ️ Pendiente futuro: excluir físicamente `main/ipc/registerDeveloperIpc.js`, `registerDiagnosticsIpc.js` y `main/diagnostics/` del empaquetado electron-builder (hoy inertes por el gate, no eliminados del asar).

### Convención de Marcado (implementada y activa)
- **HTML:** Pestañas, paneles y settings dev-only llevan `data-dev="true"`; el plugin de build los elimina en producción. ✅
- **CSS:** Reglas exclusivas de dev agrupadas entre `/* === DEV-ONLY START === */` ... `/* === DEV-ONLY END === */`; el plugin las elimina en producción. ✅
- **Visibilidad (dev):** Regla global `body:not(.dev-mode) [data-dev="true"] { display: none !important; }` (+ `.dev-indicator`) en `style.css`.
- **Activación dev-mode:** `renderer.js` añade `body.dev-mode` si `import.meta.env.DEV`; `developerModule.js` lo añade cuando `devModeAvailable`.
- **JS:** Módulos dev-only se importan con `import()` dinámico bajo `if (!import.meta.env.PROD)`, sin imports estáticos que los anclen al bundle. ✅
