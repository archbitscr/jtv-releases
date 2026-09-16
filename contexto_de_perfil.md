# PERFIL DE CONTEXTO DEL PROYECTO: JTV.app

## 1. ADN y Propósito del Proyecto
- **Visión General:** JTV.app es una aplicación de escritorio para Windows diseñada para la visualización de canales de televisión en vivo (IPTV).
- **Objetivos de Negocio:** Ofrecer un reproductor IPTV ligero, rápido y autohospedado que permita a los usuarios organizar canales en vivo con filtros, favoritos y zapping multi-fuente, sin depender de reproductores externos complejos.
- **Alcance Actual:** App 100% Live TV. Incluye sistema de filtros y favoritos, zapping con failover multi-fuente, i18n en 5 idiomas (en/es/pt/fr/de), auto-updater via GitHub Releases, y distribución como Installer + Portable.
- **Módulos eliminados:** VOD (películas/series) eliminado en v2.3.11 (Tarea 47). Control Parental eliminado en v2.3.12 (Tarea 48). Licenciamiento/Trial Lock cancelado (Tarea 24).

## 2. Stack Tecnológico y Arquitectura
- **Core Stack:**
  - Electron v30.0.0
  - HTML5 / CSS3 / Vanilla JavaScript (ES Modules)
  - Vite v5.0.0 (bundle y dev server)
  - electron-updater ^6.8.9 (auto-update via GitHub Releases)
- **Arquitectura de Software:** Estructura modular de Electron con separación estricta de responsabilidades:
  - `main.js`: Orquestador del proceso principal — delega a submódulos en `main/`.
  - `main/bootstrap.js`: Inicialización de la app (autoplay policy, powerSaveBlocker, etc.).
  - `main/windows/`: Creación y configuración de BrowserWindow.
  - `main/ipc/`: Handlers IPC segmentados por dominio (audio, developer, diagnostics, scrape, shell, userData, updater, window).
  - `main/network/`: Políticas de red (ZeroTrust, Cloudflare DoH, CORS headers dinámicos).
  - `main/context/`: Estado global del proceso principal (`createAppContext.js`).
  - `main/diagnostics/`: Watchers y controladores de diagnóstico.
  - `main/services/`: Servicios backend (scrapeClient, etc.).
  - `app-preload.cjs`: Preload de la ventana principal — expone `window.jtvAPI` (bridge seguro).
  - `guest-preload.cjs`: Preload aislado para webviews de reproducción (sandbox, mute sync, AudioContext).
  - `renderer.js`: Orquestador del lado cliente — importa módulos de `renderer/`.
  - `renderer/state/appState.js`: Estado centralizado de la app (canales, filtros, preferencias).
  - `renderer/ui/`: Controladores de UI (layout, navegación, inactividad, volumen, sensores, triggers).
  - `renderer/render/`: Renderizado de listas (canales, favoritos).
  - `renderer/player/`: Reproductor con failover multi-fuente y watch timer.
  - `renderer/filters/`: Motor de filtrado unificado (assigner, manager, state).
  - `renderer/settings/`: Módulos de ajustes (tabs, wallpaper).
  - `renderer/services/`: Servicios del renderer (channelSync, stateManager).
  - `renderer/i18n/`: Sistema i18n bundle-first (5 idiomas, ~225 claves).
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
│   ├── i18n/                  # Sistema i18n (5 idiomas)
│   ├── player/                # Reproductor + failover
│   ├── render/                # Renderizado de listas y grids
│   ├── services/              # channelSync, stateManager
│   ├── settings/              # Módulos de ajustes
│   ├── state/                 # appState centralizado
│   ├── ui/                    # Controladores de UI
│   └── utils/                 # Utilidades y helpers
├── developerModule.js         # Herramientas dev (CRUD, señal)
├── shared/
│   └── ipcChannels.json       # Catálogo de canales IPC
├── locales/                   # Archivos JSON de traducción (en/es/pt/fr/de)
├── style.css                  # Estilos principales
├── data/                      # Datos de canales y configuración
├── public/                    # Assets estáticos
├── docs/                      # Bitácora de mejoras, manual técnico
├── temp/                      # CSS de referencia pre-Task 37
├── scratch/                   # Scripts experimentales
├── vite.config.js             # Configuración de Vite
└── package.json               # v2.3.22
```

## 4. Modelo y Estructura de Datos
- **Modelo de datos:** Estructura basada en JSON (`jtv_data.json`) para canales clasificados por categorías (idioma, género, evento), con persistencia de preferencias de usuario (favoritos, filtros, estados de toggle).
- **Servicios de Terceros:** Scraping directo desde fuentes de streaming e IPTV y decodificación de listas M3U locales/remotas.
- **i18n:** Archivos `locales/{en,es,pt,fr,de}.json` leídos via IPC (`read-locale-file`) con strip de BOM antes de `JSON.parse`. Claves dot-notation (~225 claves). Idioma persistido en `jtv_data.json`.

## 5. Estándares de Desarrollo y Guías de Estilo
- **Reglas de Codificación:** ES Modules (`type: "module"`), promesas nativas para async, manipulación directa del DOM.
- **UI:** Interfaz construida con Vanilla CSS (`style.css`), estilo OTT con glassmorphism y acentos neon (`--accent: #00ffcc`).
- **Escalado Responsivo (Tarea 37):** Se usa fórmula **meseta**: `clamp(MIN, max(clamp(MIN, VW, BASE), calc(BASE + PENDIENTE×(100vw - 2046px))), MAX)` — valor fijo hasta 2046px, crece linealmente hasta MAX en 4K (3840px). Herramienta de calibración: `docs/examples/sizer/component-sizer.html`. Referencias CSS generadas en `docs/examples/sizer/`. Pestañas calibradas: `.pbar-*`, `.tnav-*`, `.corner-*`.
- **Preloads:** CommonJS obligatorio (`.cjs`) por requisito de Electron.
- **Distribución:** `electron-builder` genera `JTV-Installer-{version}.exe` (NSIS) y `JTV-Portable-{version}.exe`. Publicación en `archbitscr/jtv-releases` (GitHub Releases). Auto-update solo soportado en el Installer.

## 6. Workflow y Comandos Útiles
- `npm run dev:app`: Electron + Vite dev server concurrentemente (entorno de verificación principal).
- `npm run dev`: Solo servidor Vite (renderer sin Electron).
- `npm run build`: `vite build && electron-builder` para distribución.
- **Publicar release:** `$env:GH_TOKEN = <token>; npx electron-builder --publish always` — requiere autorización explícita del usuario.

## 7. Historial de Decisiones Arquitectónicas (ADR)
- **Vanilla JS en lugar de React/Vue:** Arquitectura ligera para optimizar tiempo de carga y consumo de recursos en equipos de baja especificación.
- **Refactorización del Main Process (2026-06-20):** `main.js` monolítico desglosado en submódulos especializados dentro de `main/`.
- **Seguridad Hardened (2026-06-20):** Context isolation, sandbox, preloads separados, ZeroTrust con whitelist de dominios, Cloudflare DoH integrado.
- **Motor de Filtrado Unificado (2026-06-24):** Pipeline única `getFilteredChannelsList()` como fuente de verdad para sidebar y landing.
- **App 100% Live TV (v2.3.11):** Módulo VOD (películas/series) eliminado completamente. Simplifica el árbol de navegación, el CSS y el estado global.
- **i18n bundle-first (v2.3.13):** Locale cargado via IPC al arranque; `data-i18n` en HTML; `t()` en JS. 5 idiomas. Apply & Restart para cambio de idioma.
- **AutoUpdater (v2.3.14):** `electron-updater` con botón manual "Check for Updates". Releases en `archbitscr/jtv-releases`. En dev mode el chequeo devuelve `null` — se emite `update-not-available` manualmente para no bloquear el botón.

## 8. Arquitectura CSS — Componentes Activos

> **Propósito:** Mapa completo de la estructura visual de la app. Cada componente pertenece a una sección con un prefijo CSS único.
> **Leyenda:** ▣ = dev-only (eliminado en producción por Tarea 23)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   HOME                             LIVE TV                                      │
│                                                                                 │
│   ┌──────────────────┐             ┌──────────────────┐ ┌──────────────────┐    │
│   │ Cards            │             │ Player Bar       │ │ Top Nav          │    │
│   │   .home-*        │             │   .pbar-*        │ │   .tnav-*        │    │
│   │                  │             │                  │ │                  │    │
│   │ · cards-container│             │ · Logo canal     │ │ · Nav buttons    │    │
│   │ · home-card x4   │             │ · Info (name,EPG)│ │   (Live,Sett)    │    │
│   │ · card-header    │             │ · Filter badges  │ │ · Active state   │    │
│   │ · card-icon      │             │ · Zapping ▲▼     │ │ · Icons          │    │
│   │ · card h2        │             │ · Vol + Mute     │ └──────────────────┘    │
│   │ · app-home-screen│             │ · Source selector│                          │
│   └──────────────────┘             │ · Fav + Pin      │ ┌──────────────────┐    │
│                                    │ · Autotune dots  │ │ Sidebar          │    │
│                                    │ · Settings btn   │ │   .side-*        │    │
│                                    └──────────────────┘ │                  │    │
│                                                         │ · Menu container │    │
│                                    ┌──────────────────┐ │ · Tabs (Ch/Fav)  │    │
│                                    │ Landing / Grid   │ │ · Channel items  │    │
│                                    │   .land-*        │ │   (logo,name,    │    │
│                                    │                  │ │    EPG,id-tag)   │    │
│                                    │ · Dashboard title│ │ · Action buttons │    │
│                                    │ · Grid carousel  │ │ · Close button   │    │
│                                    │ · Grid nav < >   │ │ · Scroll area    │    │
│                                    │ · Grid items     │ └──────────────────┘    │
│                                    │ · Dots pagination│                          │
│                                    │ · Exit button    │ ┌──────────────────┐    │
│                                    │ · Landing nav    │ │ Filter Bar       │    │
│                                    └──────────────────┘ │   .fbar-*        │    │
│                                                         │                  │    │
│                                    ┌──────────────────┐ │ · Custom selects │    │
│                                    │ Player           │ │   (Lang,Genre,   │    │
│                                    │   .player-*      │ │    Event)        │    │
│                                    │                  │ │ · Dropdown menus │    │
│                                    │ · Webview        │ └──────────────────┘    │
│                                    │ · Edge masks     │                          │
│                                    │ · Player barrier │                          │
│                                    │ · No-signal ovl  │                          │
│                                    └──────────────────┘                          │
│                                                                                  │
│   SETTINGS                                                                       │
│                                                                                  │
│   ┌─────────────────────────┐       ┌─────────────────────────────────────────┐  │
│   │ User-Facing Tabs        │       │ ▣ Dev-Only Tabs (eliminados en prod)    │  │
│   │   .settings-*           │       │   .settings-* (Tarea 23)               │  │
│   │                         │       │                                         │  │
│   │ · General (opts+hotkeys)│       │ · Channels (CRUD + Sync)               │  │
│   │ · Filters (Live+Assign) │       │ · Connectivity (Servers + APIs)        │  │
│   │ · Wallpaper (picker)    │       │ · Sensors (status + API docs)          │  │
│   │ · System (lang, donate, │       │ · Developer (General + Timeouts)       │  │
│   │   update, reset,        │       │                                         │  │
│   │   disclaimer)           │       │ Marcados data-dev="true"               │  │
│   │ · Items, switches, btns │       └─────────────────────────────────────────┘  │
│   └─────────────────────────┘                                                    │
│                                                                                  │
│   Transversales:                                                                 │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                   │
│   │ Modals     │ │ Vol OSD    │ │ FS/Power   │ │ Tooltips   │                   │
│   │ .modal-*   │ │ .volosd-*  │ │ .corner-*  │ │ .tooltip-* │                   │
│   │· PIN parent│ │· Indicator │ │· Fullscreen│ │· Popup tip │                   │
│   │· Trial exp.│ │· Bar + text│ │· Power btn │ │· Positioning│                  │
│   └────────────┘ └────────────┘ └────────────┘ └────────────┘                   │
│   ┌────────────┐ ┌────────────┐ ┌──────────────────────────┐                    │
│   │ Search     │ │▣ Dev Float │ │ Scrollbars               │                    │
│   │ .search-*  │ │ .floating-*│ │  ::-webkit-scrollbar*    │                    │
│   │· Search box│ │ pill horiz.│ │  global pseudo-elements  │                    │
│   │· Clear btn │ │· Glass Tun.│ └──────────────────────────┘                    │
│   │· Search ico│ │· Reload btn│                                                  │
│   └────────────┘ │· Power Off │                                                  │
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
| Player Bar (panel inferior) | `.pbar-*` | `.pbar-logo-*`, `.pbar-info-*`, `.pbar-channel-text`, `.pbar-epg-text`, `.pbar-filter-badge`, `.pbar-zap-btn`, `.pbar-vol-icon`, `.pbar-mute-btn`, `.pbar-source-btn`, `.pbar-sources-row`, `.pbar-mini-*`, `.pbar-fav-btn`, `.pbar-pin-btn`, `.pbar-autotune`, `.pbar-action-btn`, `.pbar-action-stack`, `.pbar-center-*`, `.pbar-bottom-row`; `.hover-trigger.bottom` |
| Top Nav (barra superior) | `.tnav-*` | `.tnav-menu`, `.tnav-buttons`, `.tnav-btn`, `.tnav-btn i/svg`; `.hover-trigger.top` |
| Sidebar (menú lateral) | `.side-*` | `.side-menu`, `.side-tabs`, `.side-tabs-center`, `.side-tab-btn`, `.side-close-btn`, `.side-channel-item`, `.side-channel-logo`, `.side-channel-info`, `.side-channel-id`, `.side-channel-name-row`, `.side-channel-meta-row`, `.side-epg-text`, `.side-channel-actions`, `.side-action-btn`, `.side-scroll-area`; `.hover-trigger.left` |
| Landing (dashboard/grid) | `.land-*` | `.land-dashboard`, `.land-content`, `.land-top-row`, `.land-title-block`, `.land-title`, `.land-controls-block`, `.land-exit-block`, `.land-exit-btn`, `.land-nav`, `.land-grid`, `.land-carousel-wrapper`, `.land-nav-btn`, `.land-item`, `.land-badge`, `.land-logo`, `.land-text-content`, `.land-item h4`, `.land-epg`, `.land-dots-container`, `.land-dots`, `.land-dot` |
| Filter Bar (dropdowns landing) | `.fbar-*` | `.fbar-select`, `.fbar-select-btn`, `.fbar-select-menu`, `.fbar-select-option`, `.fbar-select-label`, `.fbar-chevron`, `.fbar-filter-btn` |
| Player (webview/overlays) | `.player-*` | `#player-container`, `.player-barrier`, `.edge-mask`, `#no-signal-overlay` |

**Settings** — Panel de ajustes y componentes transversales

*Pestañas user-facing:*
| Componente | Prefijo | Sub-elementos / Notas |
|---|---|---|
| Panel de ajustes | `.settings-*` | General (options + hotkeys), Filters (Live + Assignment), Wallpaper (picker grid), System (language, donate, update, factory reset, disclaimer). Setting items, switches, action buttons, selects, subnavs. |

*Pestañas dev-only (▣ eliminadas en producción por Tarea 23):*
| Componente | Prefijo | Notas |
|---|---|---|
| Channels (CRUD + Sync) | `.settings-*` | `data-dev="true"`, strip en build. |
| Connectivity (Servers + APIs) | `.settings-*` | `data-dev="true"`, strip en build. |
| Sensors (status + API docs) | `.settings-*` | `data-dev="true"`, strip en build. |
| Developer (General + Timeouts) | `.settings-*` | `data-dev="true"`, strip en build. |

*Transversales:*
| Componente | Prefijo | Sub-elementos / Notas |
|---|---|---|
| Modals | `.modal-*` | `.modal-overlay`, `.modal-backdrop`, `.modal-content`, `.modal-blocker`, `.modal-blocker-content` |
| Volume OSD | `.volosd-*` | `.volosd-indicator`, `.volosd-bar-container`, `.volosd-bar`, `.volosd-text`, `.volosd-icon` |
| Fullscreen/Power buttons | `.corner-*` | `.corner-fs-zone`, `.corner-fs-btn`, `.corner-power-zone`, `.corner-power-btn` |
| Tooltips | `.tooltip-*` | `.tooltip-popup` |
| Search | `.search-*` | `.search-container`, `.search-clear-btn`, `.search-icon` |
| Floating Dev Controls | ▣ `.floating-*` | `.floating-controls-container` — Glass Tuner, Reload, Power Off. Dev-only. |
| Scrollbars | global | `::-webkit-scrollbar*` — pseudo-elementos globales. |

---

## 9. Convención Dev-Only (Tarea 23 — Tree Shaking ✅ COMPLETADA)

- **HTML:** Elementos dev-only llevan `data-dev="true"`; el plugin Vite `stripDevOnly` los elimina en build de producción.
- **CSS:** Reglas dev agrupadas entre `/* === DEV-ONLY START === */` ... `/* === DEV-ONLY END === */`; eliminadas en producción.
- **Visibilidad (dev):** `body:not(.dev-mode) [data-dev="true"] { display: none !important; }` en `style.css`.
- **JS:** Módulos dev-only se importan con `import()` dinámico bajo `if (!import.meta.env.PROD)`.
- **Activación:** `renderer.js` añade `body.dev-mode` si `import.meta.env.DEV`; gate en main via `!app.isPackaged`.

| Elemento | Tipo | Marcado |
|---|---|---|
| Pestaña Channels | HTML tab + panel | `data-dev` ✅ |
| Pestaña Connectivity | HTML tab + panel | `data-dev` ✅ |
| Pestaña Sensors | HTML tab + panel | `data-dev` ✅ |
| Pestaña Developer | HTML tab + panel | `data-dev` ✅ |
| Toggle "Developer Mode" | HTML setting-item | `data-dev` ✅ |
| `developerModule.js` | JS module | import dinámico bajo `!isProd` ✅ |
| `registerDeveloperIpc.js` | IPC handler | gated por `devModeAvailable` ✅ |
| `registerDiagnosticsIpc.js` | IPC handler | gated por `devModeAvailable` ✅ |
| CSS Sensors/Dev/Glass Tuner | CSS blocks | `DEV-ONLY START/END` ✅ |
| `#floating-controls-container` | HTML | `data-dev` ✅ |

> ℹ️ Pendiente futuro: excluir físicamente `registerDeveloperIpc.js`, `registerDiagnosticsIpc.js` y `main/diagnostics/` del asar (hoy inertes por el gate pero presentes en el bundle).
