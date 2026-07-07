# JTV.app — Technical Manual

Reference document for runtime behavior. Covers **how the app works**, not what changed (see `BITACORAS_DE_MEJORAS.md`) or how it's structured (see `contexto_de_perfil.md`).

**Maintenance policy:** update the relevant section when a task changes module behavior, not just code structure.

---

## Table of Contents

1. [Boot Sequence](#1-boot-sequence)
2. [Global State](#2-global-state)
3. [Persistence — jtv_data.json](#3-persistence--jtv_datajson)
4. [Navigation System](#4-navigation-system)
5. [VOD Module](#5-vod-module)
6. [Live TV Module](#6-live-tv-module)
7. [Player Watchdog & Failover](#7-player-watchdog--failover)
8. [Network Layer](#8-network-layer)
9. [Inactivity & Timers](#9-inactivity--timers)

---

## 1. Boot Sequence

### Main Process (`main/bootstrap.js`)

1. `app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')` — allows video autoplay without user gesture.
2. Reads `jtv_data.json` **before** `app.whenReady()` to check `hwAccelEnabled`. If `false`, calls `app.disableHardwareAcceleration()` — must happen before the GPU process starts.
3. `app.whenReady()`:
   - Hardens permissions on `defaultSession` and `persist:jtv-playback` — all permission requests denied globally.
   - `createAppContext()` — loads persisted state from `jtv_data.json` into `context.state`.
   - `initCloudflareNetworkService(context)` — patches `dns.lookup` if Cloudflare DoH is enabled.
   - Initializes `trayManager` and `powerManager` services.
   - Dev-only: dynamically imports `diagnosticsController` (excluded from production bundle by Vite tree-shaking).
   - `registerIpc()` — registers all IPC handlers.
   - `attachRequestPolicy()` — attaches ad-block and request filtering to both sessions.
   - `createMainWindow()` — creates the Electron BrowserWindow and loads the renderer.

### Renderer Process (`renderer.js`)

Boot order after `DOMContentLoaded`:

1. Restore `localStorage` values from `jtv_data.json` (onboarding state, language).
2. Hydrate `state` from saved data — channels, filters, VOD cache, volume, wallpaper, hotkeys, timeouts.
3. Initialize all modules (`initNavigation`, `initPlayerController`, `initFailover`, `initVodContent`, etc.) by injecting their `ext` dependency objects.
4. Register all DOM event listeners (`initEventListeners`).
5. Apply wallpaper, populate dropdowns, render initial grid.
6. Show app-loader progress bar, then fade it out.
7. Check onboarding: if not completed → show onboarding modal; else → `showModule('home')`.
8. Call `warmupVodCache()` via `requestIdleCallback` (non-blocking, fires after first paint).

---

## 2. Global State

Single object exported from `renderer/state/appState.js`. No reactive system — mutations are direct assignments. All modules import `{ state }` and read/write directly.

### Key fields by category

**Lifecycle / Navigation**
| Field | Type | Description |
|---|---|---|
| `currentModule` | string | Active module: `'home'`, `'live'`, `'series'`, `'movies'`, `'settings'` |
| `previousModule` | string | Module before settings (used to return on settings close) |
| `isHomeActive` | boolean | `true` when a landing grid is visible (live, series, or movies) |
| `activeDashTab` | string | Active tab in the shared grid: `'live'`, `'series'`, `'movies'` |

**Player**
| Field | Type | Description |
|---|---|---|
| `activeChannelId` | any | ID of currently tuned channel; `null` when no channel playing |
| `isVodPlaying` | boolean | `true` when a VOD item (not live channel) is playing |
| `playerSource` | string | Current source folder: `'stream'`, `'player'`, `'casting'`, `'plus'`, `'watch'`, `'cast'` |
| `failoverInProgress` | boolean | `true` while the failover cycle is running |
| `failoverTimeoutId` | number\|null | `setTimeout` handle for the per-source failover timeout |
| `shouldRestoreTunedChannel` | boolean | Flag to auto-retune `lastTunedChannel` on return to Live |
| `lastTunedChannel` | object\|null | Channel object saved before navigating to VOD |

**VOD**
| Field | Type | Description |
|---|---|---|
| `fetchedMovies` / `fetchedSeries` | array | Items from the last SFlix fetch (in-memory, not persisted) |
| `vodCache` | object | `{ movies: { items[], updatedAt }, series: { items[], updatedAt } }` — persisted to disk |
| `vodPage` | number | Current SFlix page index (0-based, each JTV page = 3 SFlix pages) |
| `vodFavPage` | number | Current page in favorites filter mode |
| `vodFilterMode` | string | `'all'` or `'favorites'` |
| `vodTotalPages` | number | Total JTV pages derived from SFlix pagination |
| `VOD_ITEMS_PER_PAGE` | number | Items per grid page; recalculated by `updateVodGridDimensions()` on each module entry |
| `vodRequestToken` | number | Incremented on each fetch; stale responses are discarded if token doesn't match |

**Live Filters**
| Field | Type | Description |
|---|---|---|
| `filterLanguages` | array | `{ name, icon, enabled }` — enabled languages shown in the grid |
| `filterGenres` | array | `{ name, icon }` — genre categories |
| `filterEvents` | array | `{ name, icon }` — event categories |
| `zapSourceTab` | string | `'favorites'` or `'channels'` — which list the grid and zapper use |

### What is NOT in state

- DOM references (fetched by ID on demand)
- Timer handles (managed by `timeoutsManager` or local module vars)
- Watchdog internals (`hasStartedPlaying`, `silenceCheckInterval` — local to `playerController.js`)
- Circuit breaker state (local to `cloudflareNetworkService.js`)

---

## 3. Persistence — jtv_data.json

**Location:** `app.getPath('userData')/jtv_data.json` (Windows: `%APPDATA%\JTV\`)

**Write path:** `saveAppState()` in `stateManager.js` → IPC `save-user-data` → main writes JSON to disk. Debounced 500ms; `saveAppState(true)` forces immediate write.

**Read path:** `createAppContext()` in main reads the file at boot and passes it to the renderer via IPC `get-user-data`. The renderer hydrates `state` fields from the returned object.

### Fields persisted

```
channels, globalDomain, apiKey, apiEndpoint, zapSourceTab,
tmdbKey, omdbKey, autoUpdateDomain,
filterList, filterLanguages, filterGenres, filterEvents,
seriesGenres, moviesGenres,
vodFavorites, vodCache,
selectedWallpaper,
audioLevelerEnabled, hwAccelEnabled, minimizeToTray,
preventSleep, cloudflareProtectionEnabled,
currentVolumeLevel,
developerModeEnabled, diagnosticsEnabled,
showDiagnosticClicks, hudDevControlsEnabled,
hotkeyMap, timeoutsConfig
```

### Fields NOT persisted (ephemeral)

```
activeChannelId, currentModule, previousModule, isHomeActive,
fetchedMovies, fetchedSeries, vodPage, vodFavPage,
vodSearchTerm, vodFilterMode, selectedVodRating, selectedVodYear,
vodTotalPages, vodRequestToken, VOD_ITEMS_PER_PAGE,
activeChannelId, isVodPlaying, playerSource,
failoverInProgress, failoverTimeoutId,
shouldRestoreTunedChannel (reset on app close),
hudPinned, assignerSelectedChannelIndices
```

---

## 4. Navigation System

**Core functions:** `showModule(moduleName)` and `showLiveLanding()` in `renderer/ui/navigation.js`.

### showModule(moduleName)

Called on every module transition. Execution order:

1. Update `state.activeDashTab` if entering live/series/movies.
2. Hide `vod-controls`, `live-search-container`, `dashboard-filters` (will re-show selectively).
3. If leaving VOD → Live/Home: clear the grid HTML.
4. Toggle `vod-active` class on `#land-grid` (affects CSS layout for VOD card mode).
5. Save `state.previousModule` (skipped if coming from settings — settings is not a real previous).
6. **VOD teardown:** if entering series/movies AND a channel is playing or failover is active → save `lastTunedChannel`, cancel failover, clear player, apply wallpaper.
7. Update `state.currentModule`, set `data-module` attribute on `<body>`.
8. Update `#land-title` text and visibility.
9. Hide all root modules: `#main-home`, `#vod-library`, `#settings-screen`.
10. Call `updateTopNavVisibility(moduleName)` — sets active button state.
11. Show/hide `#tnav-menu`:
    - **Show:** series, movies, live with no channel
    - **Hide:** home, settings, live with active channel
12. Execute module-specific logic (show the right container, reset filters, call render/fetch).
13. Call `updateTriggersVisibility()` and `updateWebviewPointerEvents()`.

### showLiveLanding()

Called when pressing the home button on the sidebar **while a channel is playing**. Does NOT go through `showModule()`. Sets `state.currentModule = 'live'`, shows `#vod-library`, renders the grid. Use case: quick access to channel grid without stopping playback.

### Top Nav visibility rules

| Context | tnav-menu |
|---|---|
| `home` | always hidden |
| `settings` | always hidden |
| `live` + no channel | visible |
| `live` + channel playing | hidden |
| `series` | visible |
| `movies` | visible |
| `trigger-top` hover | visible **only if** `currentModule !== 'home'` |

### Module entry side effects

| Module | Side effects |
|---|---|
| `home` | Apply wallpaper, show `#main-home` |
| `live` (no channel) | Apply wallpaper, show `#vod-library`, render grid |
| `live` (restore) | Calls `selectChannel(lastTunedChannel)` and returns early |
| `live` (channel active) | Show `#pbar`, update document title |
| `series` / `movies` | Reset all VOD filters to defaults, recalculate `VOD_ITEMS_PER_PAGE`, call `renderFavoritesGrid()` + `refreshVodContent()` |
| `settings` | Show `#settings-screen`, activate General tab |

---

## 5. VOD Module

### Architecture overview

VOD (Series and Movies) shares the same HTML container (`#vod-library`) and grid (`#land-grid`) with Live TV. The active module is determined by `state.activeDashTab`. Series and movies share identical layout logic — only the data source and title differ.

**Movies** use a persistent local DB (`userData/movies/movies-db.json`) loaded at boot. **Series** always fetch from SFlix on demand.

### Data flow on module entry

```
showModule('series' | 'movies')
  → resets state.vodPage, vodFavPage, vodSearchTerm, vodFilterMode, selectedVodGenre, etc.
  → calls renderFavoritesGrid()   (renders loader or existing items immediately)
  → calls refreshVodContent()     (async fetch, replaces grid when done)
```

### refreshVodContent() — fetch lifecycle

1. Increment `state.vodRequestToken` — any in-flight request with a stale token is silently discarded on response.
2. Inject loader HTML into `#land-grid` immediately (user sees spinner).
3. Calculate 3 SFlix page numbers from `state.vodPage` (JTV page N = SFlix pages 3N+1, 3N+2, 3N+3).
4. Build SFlix URLs based on active filters:
   - Search term → `sflix.win/search?keyword=...`
   - Genre filter → `sflix.win/genre/{genre}/page/N/`
   - Default → `sflix.win/movies/page/N/` or `sflix.win/tv-series/page/N/`
5. `Promise.all()` — fetch all 3 pages in parallel via IPC `fetch-sflix-page`.
6. Parse each HTML response with `parseSFlixHtml()` (DOMParser, reads `.flw-item` elements).
7. Merge into `state.fetchedMovies` or `state.fetchedSeries`.
8. If no search/genre filter active: call `scheduleVodCacheUpdate()` to persist first 100 items.
9. Parse total SFlix pages from `res1` pagination DOM → set `state.vodTotalPages`.
10. Call `renderFavoritesGrid()` — replaces loader with actual cards.

### renderFavoritesGrid() — render logic

Dual-mode function: renders Live grid or VOD grid based on `state.activeDashTab`.

**VOD mode:**
- Source array: `state.fetchedMovies/Series` (mode `all`) or `state.vodFavorites` filtered by type (mode `favorites`).
- Apply rating and year filters from state.
- Slice to `VOD_ITEMS_PER_PAGE` items for current page.
- If `items.length === 0`: inject "No titles found" / "No favorites" message with `grid-column: 1 / -1`.
- Render `.land-item.vod-card` elements with poster, badges, fav button.
- Call `renderGridDots(totalPages)` for pagination.

### VOD cache warm-up

`warmupVodCache()` fires via `requestIdleCallback` after first paint:
- **Series:** `prefetchVodType('series', 100)` — fetches up to 8 SFlix pages in batches of 2 until 100 items are collected. Saves to `state.vodCache.series` and `state.fetchedSeries`.
- **Movies:** `loadMoviesFromDb()` — reads `movies-db.json` from disk via IPC. If empty, falls back to `prefetchVodType('movies', 100)`. Does NOT fetch from SFlix when the local DB has data.

Cache is used as the initial render source when navigating to VOD before the first `refreshVodContent()` completes. This means the grid shows cached items instantly, then gets replaced by fresh content.

### VOD Details modal

`showVodDetails(item)` in `vodContent.js`:
1. Show modal immediately with title, quality, rating from the SFlix card data.
2. Show poster placeholder with spinner.
3. If `state.tmdbKey` set: fetch TMDB metadata (poster, overview, year) via IPC `fetch-tmdb-metadata`.
4. If `state.omdbKey` set: fetch OMDb ratings via IPC `fetch-omdb-ratings`.
5. Load poster image via `new Image()` — shows on `onload`, shows emoji placeholder on `onerror`.
6. Wire play button: hides modal, calls `playVod(item)` which mounts the SFlix URL in the webview player.

---

## 6. Live TV Module

### Channel selection — selectChannel(channel, resetSource, sourceTab)

`resetSource = true` on manual tune; `false` during failover cycle (preserves failover state).

Execution order:
1. Check trial expiry via `nativeApi.getNetworkDate()`. If expired: clear player, return early.
2. If `resetSource`: stop failover, hide no-signal overlay, reset failover state.
3. Apply wallpaper `'none'` (hides wallpaper, reveals black background for player).
4. Show player curtain (transition overlay).
5. Set `state.activeChannelId`, `isHomeActive = false`, `currentModule = 'live'`.
6. Build stream URL: `{globalDomain}{playerSource}/stream-{channelId}.php` (or `channel.customUrl`).
7. Update Player Bar UI: channel name, EPG text, logo, favorite state, mute icon, filter badges.
8. Force-show `#pbar`.
9. Hide `#vod-library`, `#main-home`, `#settings-screen`.
10. `renderAll()`, `syncMenuScroll()`, `startInactivityTimers()`.
11. If `wasHomeActive`: call `switchTab(zapSourceTab)` to sync sidebar tab.
12. `mountRemotePlayer(url)` — create webview, start 15s initial load watchdog.
13. `saveAppState()`.

### Stream URL construction

```
{state.globalDomain}{state.playerSource}/stream-{channel.id}.php
```

Example: `https://dlhd.pk/stream/stream-42.php`

`playerSource` cycles through 6 folders during failover: `stream → player → casting → plus → watch → cast`.

### Zapping (channel up/down)

`zapChannel(direction)` in `playerController.js`:
- Uses `state.zapSourceTab` to determine the active list (`favorites` or `channels`).
- Finds current channel index in the filtered list.
- Wraps around at boundaries (circular).
- Calls `selectChannel(nextChannel, true)`.

---

## 7. Player Watchdog & Failover

### Watchdog triggers

The watchdog monitors the active webview for failure conditions. Any trigger calls `triggerFailover()`.

| Trigger | Source | Condition |
|---|---|---|
| Initial load timeout | `playerController.js` | No `guest-playing` received within 15s of `mountRemotePlayer()` |
| `did-fail-load` | webview event | Network-level load failure (ignores errorCode -3 = abort) |
| HTTP error | IPC `onWebviewHttpError` | Main process detects HTTP status ≥ 400 in webview frame |
| Load failed | IPC `onWebviewLoadFailed` | Main process reports frame load failure |
| `guest-frozen` signal | webview IPC | Guest preload detects frozen video. Grace period: waits `watchdogFreeze` ms, then checks `isCurrentlyAudible()`. If audio playing → false positive, ignored. |
| Sustained silence | `silenceCheckInterval` | After `guest-playing` received, polls every 2s. If no audio AND not muted for `watchdogSilence` ms → trigger. |

`guest-playing` signal resets the freeze grace period and activates the silence monitor. Receiving it also calls `signalRestored()` which closes the circuit (clears failover state).

### Failover cycle — runFailoverCycle(channelId)

Sources tried in order: `stream → player → casting → plus → watch → cast`

For each source:
1. Set `state.playerSource` and update Player Bar UI.
2. Call `selectChannel(channel, false)` — `resetSource=false` to preserve failover context.
3. Wait `waitTime + 15s` for the source to load. If no `guest-playing` received → try next source.

After all 6 sources exhausted:
- Reset to `stream`, clear player.
- Call `scheduleNextCycle(channelId)` — schedules retry with exponential backoff:
  - Retries 0–2: 60s
  - Retries 3–6: 180s
  - Retries 7+: 300s

`triggerFailover()` is a no-op if a cycle or retry timer is already in progress (guards against double-trigger).

### Internet offline handling

On `window offline` event: cancel active cycle, show "No internet" overlay.
On `window online` event (one-shot listener): hide overlay, resume `triggerFailover()`.

---

## 8. Network Layer

### Cloudflare DNS-over-HTTPS (main process)

**File:** `main/network/cloudflareNetworkService.js`

Patches `dns.lookup` to route all DNS resolutions through `https://1.1.1.2/dns-query` (Cloudflare malware-blocking DNS).

Bypasses DoH for: direct IPs, `localhost`, `.local` domains, and `1.1.1.2` itself.

**Circuit breaker:** after 3 consecutive DoH failures → OPEN state. All subsequent lookups go directly to system DNS with zero latency penalty. After 10 minutes → HALF-OPEN: tries DoH again. On success → CLOSED (resets failure count). Manual toggle in Settings resets the circuit breaker immediately.

**Timeout:** 2000ms per DoH query.

### Request policy (main process)

**Files:** `main/network/requestPolicy.js`, `main/network/policyConfig.js`

Attached to both `defaultSession` and `persist:jtv-playback`. Intercepts all web requests:

- **Ad domain blocking:** 94 known ad/tracker domains → return empty response.
- **Script blocking:** `p2p-engine.js` and similar P2P scripts → blocked.
- **Domain allowlist:** 54 whitelisted domains (streaming sources, CDNs, fonts) pass through unmodified.
- **Header injection:** adds `Referer` and `Origin` headers for stream requests based on `state.globalDomain`.
- **Network activity monitor:** `.ts`, `.m3u8`, `.key` requests on streaming domains → emit `STREAM_NETWORK_ACTIVE` IPC signal to renderer.

### IPC communication pattern

All renderer→main calls go through `window.jtvAPI` (exposed via `app-preload.cjs`). No direct Node.js access from renderer (sandbox: true). Key channels:

| Channel | Direction | Purpose |
|---|---|---|
| `save-user-data` | R→M | Persist state to jtv_data.json |
| `get-user-data` | R→M | Load persisted state on boot |
| `fetch-sflix-page` | R→M | Fetch SFlix HTML (bypasses CORS) |
| `fetch-tmdb-metadata` | R→M | TMDB API call |
| `fetch-omdb-ratings` | R→M | OMDb API call |
| `is-currently-audible` | R→M | Check if webview is producing audio |
| `is-audio-muted` | R→M | Check webview mute state |
| `get-network-date` | R→M | Get HTTP Date header (trial check) |
| `reset-window-size` | R→M | Resize window to 1080×720 (dev) |
| `STREAM_NETWORK_ACTIVE` | M→R | Main signals active stream traffic |
| `WEBVIEW_HTTP_ERROR` | M→R | Main detected HTTP error in webview |
| `WEBVIEW_LOAD_FAILED` | M→R | Main detected frame load failure |

---

## 9. Inactivity & Timers

**Manager:** `timeoutsManager` (passed to `initInactivity()`). Wraps `setTimeout` with named keys so timers can be cancelled by name.

All timers are reset on any user interaction (mouse move, key press, click) via `startInactivityTimers()`. Mouse move also calls `startCursorTimer()` independently to avoid disturbing panel timers.

### Timer catalog

| Timer key | Default | Condition to start | Action on fire |
|---|---|---|---|
| `settings` | 6000ms | Settings visible + channel playing | Close settings, return to previous module |
| `menu` | 2500ms | Channel playing | Hide sidebar if not hovered; hide VOD details modal if open |
| `topNav` | 2500ms | tnav-menu visible | Hide tnav-menu if not hovered |
| `zappingHUD` | 2500ms | pbar visible + not pinned | Hide pbar if not hovered |
| `cursor` | 3000ms | Channel playing | Add `hide-cursor` class to body if no panels visible |
| `home` | 5000ms | vod-library visible + channel playing | Call `showModule(previousModule)` |
| `land` | 6000ms | vod-library visible + channel playing | Hide vod-library if not hovered |

### Cursor hide conditions

The cursor timer fires only if ALL of the following are true at fire time:
- `!state.isHomeActive`
- sidebar (`#side-menu`) is hidden
- Player Bar (`#pbar`) is hidden

This prevents hiding the cursor while the user might still interact with visible panels.

### hudPinned

When `state.hudPinned = true`, the `zappingHUD` timer is never started — the Player Bar stays visible indefinitely. Pinned state is NOT persisted to disk (resets to `false` on app restart).
