# Plan de Refactorización — JTV.app renderer.js

## Situación actual

`renderer.js` tiene **6,858 líneas** de código que creció sin arquitectura. El archivo concentra estado global, lógica de negocio, lógica de UI, reproductores, filtros, VOD scraping, control parental, asignador de canales y más. El proceso principal (`main`) está bien estructurado; el problema está contenido al renderer.

---

## User Review Required

> [!IMPORTANT]
> El refactor es **incremental y sin cambio de lógica de negocio**. La app debe quedar funcional después de cada paso. No se mueven features, solo se reorganiza el código existente en módulos ES.

> [!WARNING]
> **Seguridad detectada:** Se encontró un hash SHA-1 de PIN codificado directamente en `renderer.js` (línea 69): `5b780415a7791f1bcf4d17ecb23e7d609dbcd64c51475704a29a008c2a5fa59b`. Este corresponde al PIN `"314159"` y constituye un **secreto en código fuente**. Se debe eliminar del código en el paso correspondiente al módulo de control parental.

> [!CAUTION]
> Hay varios `window.XXX` expuestos como interfaz pública desde inline `onclick=""` en el HTML. Estos **no pueden eliminarse** sin actualizar el HTML correspondiente. Se documentan en la sección de dependencias.

---

## Open Questions

> [!IMPORTANT]
> **¿Existe un archivo `index.html` o equivalente?** El análisis detecta referencias a funciones en `window` desde atributos HTML (`onclick="removeFilterFromChannel(...)"`, `onclick="window.selectCrudChannel(...)"`). Se necesita acceso a ese HTML para mapear todas las dependencias antes del paso 3.

> [!NOTE]
> **¿Los módulos separados usarán `import`/`export` ES nativos (vía Vite)?** Asumiendo que sí, dado que el proyecto ya usa Vite como bundler.

---

## Mapa completo del código (Discovery terminado)

### Variables de estado global (~85 variables `let`/`const` en scope raíz)

| Categoría | Variables clave |
|---|---|
| **App state** | `channels`, `scheduleData`, `activeChannelId`, `currentModule`, `previousModule` |
| **Player** | `playerSource`, `failoverTimeoutId`, `failoverInProgress`, `isVodPlaying`, `isHomeActive` |
| **Watch timer** | `currentlyWatchingId`, `watchStartTime`, `lastTunedChannel`, `shouldRestoreTunedChannel` |
| **Filtros Live** | `filterLanguages`, `filterGenres`, `filterEvents`, `searchTerm`, `favSearchTerm` |
| **Filtros VOD** | `vodSearchTerm`, `selectedVodGenre`, `selectedVodRating`, `selectedVodYear`, `vodFilterMode`, `vodPage`, `vodFavPage`, `vodTotalPages`, `vodRequestToken` |
| **Dashboard** | `favPage`, `dashboardNavMode`, `dashboardCategory`, `activeDashTab`, `FAVS_PER_PAGE` |
| **VOD Cache** | `vodCache`, `fetchedMovies`, `fetchedSeries`, `vodFavorites` |
| **Configuración** | `globalDomain`, `apiKey`, `apiEndpoint`, `tmdbKey`, `omdbKey`, `autoUpdateDomain`, `selectedWallpaper` |
| **UI flags** | `guideSearchTerm`, `guideFilter`, `editingFilter`, `currentEditingChannelId`, `currentPinCallback` |
| **Feature flags** | `audioLevelerEnabled`, `hwAccelEnabled`, `minimizeToTray`, `preventSleep`, `dropdownsPopulated` |
| **Asignador** | `assignerSelectedChannelIndices`, `lastSelectedIdx` |
| **DOM refs** | `playerContainer`, `mainMenu`, `sourceSwitcher`, `favoritesGrid`, `topNavMenu`, y ~30 más |

### Funciones por dominio (mapa completo)

#### 🔴 Núcleo / Ciclo de vida
| Función | Línea(s) | Dependencias |
|---|---|---|
| `init()` | ~300 | Llama a todo: `loadAppState`, `setupEventListeners`, `populateDropdowns`, `renderAll`, `syncChannels`, `warmupVodCache` |
| `loadAppState()` | ~350 | `nativeApi.loadUserData`, asigna todas las vars globales |
| `saveAppState()` | ~420 | `nativeApi.saveUserData` — **escribe a disco en cada llamada** |
| `syncChannels()` | ~460 | `nativeApi.fetchChannels`, `fetchSchedule` |
| `renderAll()` | ~500 | Llama a `renderChannelList`, `renderFavList`, `renderGuide`, `populateDropdowns` |

#### 🟡 Player / Canal
| Función | Línea(s) | Dependencias |
|---|---|---|
| `selectChannel(channel, resetSource)` | 2901 | `mountRemotePlayer`, `updateHudChannelFilters`, `startInactivityTimers`, `renderAll` |
| `mountRemotePlayer(url)` | 2713 | Crea `<webview>`, maneja `ipc-message`, inserta CSS |
| `zapChannel(direction)` | 3054 | `selectChannel`, `getFilteredChannelsList` |
| `triggerFailover(delay)` | ~600 | `mountRemotePlayer`, `showNoSignalOverlay` |
| `playVod(item)` | 5637 | `mountRemotePlayer`, `applyWallpaper` |
| `stopWatchTimer()` | 3105 | `saveAppState` |
| `updatePlayerActiveState()` | 2703 | `updateWebviewPointerEvents` |

#### 🟡 Navegación / Módulos
| Función | Línea(s) | Dependencias |
|---|---|---|
| `showModule(moduleName)` | 3136 | Controla toda la visibilidad de pantallas |
| `showLiveLanding()` | 3315 | `renderFavoritesGrid`, `updateTopNavVisibility` |
| `switchTab(tabId)` | 3361 | `showModule`, `showLiveLanding`, `syncMenuScroll` |
| `hideMenu()` | 3577 | `hideEditPane`, `syncMenuScroll` |
| `updateTopNavVisibility(module)` | 3337 | DOM puro |
| `updateTriggersVisibility()` | 5718 | DOM puro |

#### 🟢 Render / UI
| Función | Línea(s) | Dependencias |
|---|---|---|
| `renderAll()` | ~500 | Fan-out de renders |
| `renderChannelList(container, list)` | ~700 | `getFilteredChannelsList`, `highlightText`, `getSafeLogoHtml` |
| `renderFavoritesGrid()` | ~1000 | Renderiza grid de Live/VOD/Favs según `activeDashTab` |
| `renderGuide()` | 2631 | `scheduleData`, `channels`, `highlightText` |
| `renderVodGenreChips()` | 5653 | `getActiveVodGenres` |
| `renderSettingsFilters()` | ~1500 | `filterLanguages`, `filterGenres`, `filterEvents` |
| `renderChannelFiltersManager(ch)` | 3452 | `sortCategories`, `syncCustomSelect` |
| `renderVodControls()` | ~1200 | Botones de filtro VOD |
| `renderAssignerChannelsList()` | 6392 | `highlightText`, `handleAssignerChannelClick` |
| `renderAssignerEvents()` | 6535 | `filterLanguages`, `filterGenres`, `filterEvents` |

#### 🔵 Filtros / Datos
| Función | Línea(s) | Dependencias |
|---|---|---|
| `getFilteredChannelsList(tab)` | ~550 | `filterLanguages`, `filterGenres`, `filterEvents` |
| `syncFilterList()` | ~750 | `populateDropdowns`, actualiza `<select>` de filtros |
| `populateDropdowns()` | ~800 | DOM `<select>` elements |
| `sortCategories(cats)` | 3420 | `filterLanguages`, `filterGenres`, `filterEvents` |
| `removeSettingsFilter(type, name)` | 2603 | `syncFilterList`, `renderAll`, `saveAppState` |
| `removeFilter(filterName)` | 2693 | `renderAll`, `saveAppState` |

#### 🔵 VOD
| Función | Línea(s) | Dependencias |
|---|---|---|
| `refreshVodContent()` | 5459 | `nativeApi.fetchSflixPage`, `parseSFlixHtml`, `renderFavoritesGrid` |
| `parseSFlixHtml(html)` | 5372 | `escapeHtml`, `sanitizeRemoteUrl`, `sanitizeMediaUrl` |
| `showVodDetails(item)` | 5535 | `nativeApi.fetchTmdbMetadata`, `nativeApi.fetchOmdbRatings` |
| `prefetchVodType(type, count)` | 5429 | `nativeApi.fetchSflixPage`, `parseSFlixHtml` |
| `warmupVodCache()` | 5454 | `prefetchVodType` |
| `scheduleVodCacheUpdate(type, items)` | 5415 | `saveAppState` (con debounce) |
| `getSFlixUrlForPage(type, page)` | 5362 | Estado VOD |

#### 🟣 UI Components
| Función | Línea(s) | Dependencias |
|---|---|---|
| `initIconPickers()` | 2511 | `eventIconsList`, `lucide.createIcons` |
| `initDashCustomSelects()` | 5861 | DOM |
| `syncCustomSelect(select)` | 5943 | DOM |
| `initCustomTooltips()` | 6195 | `getOrGenerateTooltip` |
| `getOrGenerateTooltip(el)` | 6044 | DOM, estado de módulo |
| `initEventAssigner()` | 6275 | `renderAssignerChannelsList`, `renderAssignerEvents` |

#### 🟣 Control Parental / PIN
| Función | Línea(s) | Dependencias |
|---|---|---|
| `hashPIN(pin)` | ~70 | `crypto.subtle` (Web Crypto API) |
| `verifyPIN(pin, hash)` | ~80 | `hashPIN` |
| `promptParentalPIN(cb, msg)` | ~90 | DOM modal de PIN |

#### 🟣 Inactividad / Timers
| Función | Línea(s) | Dependencias |
|---|---|---|
| `startInactivityTimers()` | 3595 | `timeouts` (objeto custom), `window.timeoutsConfig` |
| `clearInactivityTimers()` | 3586 | `timeouts` |

#### 🟣 Utilidades puras (sin estado)
| Función | Línea(s) | Notas |
|---|---|---|
| `escapeHtml(str)` | ~100 | Pura |
| `highlightText(text, term)` | ~110 | Pura |
| `sanitizeMediaUrl(url, opts)` | ~120 | Pura |
| `sanitizeRemoteUrl(url)` | ~130 | Pura |
| `sanitizeIconName(name)` | ~140 | Pura |
| `getSafeLogoHtml(name, logo)` | ~150 | Pura |
| `getPlaceholderHtml(name)` | ~160 | Pura |

### Funciones expuestas en `window` (contratos públicos — NO TOCAR INTERFAZ)

| Símbolo en `window` | Razón | Quién lo llama |
|---|---|---|
| `window.removeFilterFromChannel(catName)` | L.3527 | `onclick=""` en HTML dinámico generado por `renderChannelFiltersManager` |
| `window.JTV_SENSORS` | L.5692 | `main.js` / IPC para headless diagnostics |
| `window.sendWatchdogConfig` | L.6041 | DOM event `dom-ready` del webview |
| `window.setAssignerActiveTab(tab)` | L.6256 | `onclick=""` en HTML de tabs del asignador |
| `window.selectAssignerChannel(index)` | L.6807 | Llamado desde CRUD channels (developer mode) |
| `window.assignerActiveTab` | L.6253 | Compartido entre `initEventAssigner` y `renderAssignerEvents` |
| `window.assignerSelectedFilters` | L.6254 | Ídem |
| `window.getChannels` | Usado en asignador | Expuesto en `init()` |
| `window.setChannels` | Usado en asignador | Expuesto en `init()` |
| `window.renderAll` | Usado en asignador | Expuesto en `init()` |
| `window.saveAppState` | Usado en asignador | Expuesto en `init()` |
| `window.getDeveloperState()` | Llamado desde editPane y settings tabs | Definido en módulo developer (externo) |
| `window.selectCrudChannel(idx)` | L.3398 | Llamado desde `showEditPane` |
| `window.renderCrudChannelsList()` | L.4364 | Llamado desde settings tab handler |
| `window.filterIconPickerGlobalInit` | L.2593 | Flag de inicialización única |
| `window.globalDomain` | L.4919 | Usado en cálculo de URLs |
| `window.timeoutsConfig` | Usado en `startInactivityTimers` | Provisto por main process vía IPC |
| `window.updateDeveloperUI()` | L.4359 | Llamado desde settings tab |
| `window.lucide` | Global | CDN script tag |
| `window.jtvAPI` | `app-preload.cjs` | Bridge IPC → renderer |
| `window.nativeApi` | `app-preload.cjs` | Alias de `jtvAPI` |

---

## Cuellos de botella de Performance Identificados

### 🔴 Críticos

1. **`saveAppState()` llamado en exceso** — Se llama desde `renderAll()`, desde cada `oninput` de formularios, desde cada toggle. Puede escribir a disco decenas de veces por segundo durante edición activa. **Solución: debounce de 500ms mínimo.**

2. **`renderAll()` es un flush completo** — Llama a `renderChannelList` + `renderFavList` + `renderGuide` + `populateDropdowns` en cascada. Se invoca desde cada `oninput` de búsqueda. **Solución: separar renders por dominio; solo disparar el necesario.**

3. **`lucide.createIcons()` llamado con exceso** — Invocado en cada render parcial, incluido desde `renderChannelList` que puede tener cientos de items. Llama `createIcons()` sobre el `document` entero por defecto. **Solución: pasar `{ nodes: [containerEl] }` para scope limitado.**

4. **`executeJavaScript` en `dom-ready`** — `mountRemotePlayer` inyecta dos bloques de diagnóstico con `querySelectorAll('*')` sobre el DOM del webview después de 15 segundos. Bloquea el proceso guest. **Solución: envolver en flag de `diagnosticsEnabled`.**

### 🟡 Medios

5. **`initIconPickers()` recrea dropdowns en cada llamada** — Tiene guard `if (btn.dataset.iconPickerInit) return` pero el array `eventIconsList` de ~100 emojis se re-itera cada vez que se abre settings.

6. **`renderAssignerEvents()` con `assignerSelectedChannelIndices` anidado** — Doble iteración O(N×M) donde N = canales seleccionados, M = filtros.

7. **`syncCustomSelect(select)` crea wrappers DOM dinámicos** — Se llama en cada `renderChannelFiltersManager`, potencialmente duplicando event listeners. Tiene guard parcial pero incompleto.

8. **`warmupVodCache()`** — Lanza 2 × 8 = 16 requests HTTP en paralelo durante `init()` aunque el usuario pueda nunca ir a VOD.

### 🟠 Seguridad

9. **Hash de PIN en código fuente** (L.69): `5b780415a7791f1bcf4d17ecb23e7d609dbcd64c51475704a29a008c2a5fa59b` — SHA-1 del PIN `"314159"`. Visible en cualquier `devtools` o inspección del bundle. Debe eliminarse del código.

10. **Clave AES en `registerUserDataIpc.js`** (L.9): `'jtv-app-security-key-2.3.6'` hardcoded — Visible en el proceso main. Bajo riesgo de explotación en Electron con `contextIsolation: true`, pero debe moverse a variable de entorno o secret en tiempo de build.

---

## Arquitectura de módulos propuesta

```
renderer/
├── state/
│   ├── appState.js          # Variables globales centralizadas + accessors
│   └── playerState.js       # Estado del player (failover, source, VOD)
├── services/
│   ├── api.js               # Wrapper de nativeApi (jtvAPI)
│   ├── stateManager.js      # loadAppState / saveAppState (con debounce)
│   └── channelSync.js       # syncChannels, getActiveEpg
├── player/
│   ├── playerController.js  # mountRemotePlayer, selectChannel, zapChannel
│   ├── failover.js          # triggerFailover, showNoSignalOverlay
│   └── watchTimer.js        # startWatchTimer, stopWatchTimer
├── ui/
│   ├── navigation.js        # showModule, switchTab, showLiveLanding
│   ├── inactivity.js        # startInactivityTimers, clearInactivityTimers
│   ├── hudController.js     # updateHudChannelFilters, updateHudAutotuneIndicators
│   └── triggersVisibility.js
├── render/
│   ├── renderAll.js         # renderAll (orquestador)
│   ├── channelList.js       # renderChannelList, renderFavList
│   ├── favoritesGrid.js     # renderFavoritesGrid, renderVodControls
│   └── guide.js             # renderGuide
├── filters/
│   ├── filterState.js       # filterLanguages, filterGenres, filterEvents
│   ├── filterManager.js     # addFilter, removeFilter, syncFilterList
│   └── filterAssigner.js    # initEventAssigner, renderAssigner*
├── vod/
│   ├── vodState.js          # vodPage, vodCache, fetchedMovies, etc.
│   ├── vodContent.js        # refreshVodContent, parseSFlixHtml, showVodDetails
│   └── vodCache.js          # warmupVodCache, scheduleVodCacheUpdate
├── settings/
│   ├── parental.js          # hashPIN, verifyPIN, promptParentalPIN
│   └── wallpaper.js         # applyWallpaper, selectedWallpaper
├── utils/
│   ├── sanitize.js          # escapeHtml, sanitizeMediaUrl, sanitizeRemoteUrl, sanitizeIconName
│   ├── domHelpers.js        # getSafeLogoHtml, getPlaceholderHtml, highlightText
│   ├── customSelect.js      # syncCustomSelect, initDashCustomSelects
│   ├── tooltips.js          # initCustomTooltips, getOrGenerateTooltip
│   └── iconPicker.js        # initIconPickers, eventIconsList
└── renderer.js              # Entry point: import + init() (< 200 líneas)
```

---

## Propuesta de cambios — por fase

### FASE 1 — Extracción de utilidades puras (RIESGO: Bajo)

Estas funciones **no tienen dependencias de estado ni de DOM**. Se pueden extraer primero sin riesgos.

#### [NEW] `renderer/utils/sanitize.js`
- `escapeHtml`, `sanitizeMediaUrl`, `sanitizeRemoteUrl`, `sanitizeIconName`

#### [NEW] `renderer/utils/domHelpers.js`
- `getSafeLogoHtml`, `getPlaceholderHtml`, `highlightText`, `processLogo`

#### [MODIFY] `renderer.js`
- Reemplazar definiciones locales con `import`

---

### FASE 2 — Extracción de estado global (RIESGO: Bajo-Medio)

Centralizar todas las variables `let`/`const` de scope global en objetos de estado con getters/setters. Esto no mueve lógica, solo encapsula lectura/escritura.

#### [NEW] `renderer/state/appState.js`
```js
// Expone getters/setters para channels, filterLanguages, activeChannelId, etc.
export let channels = [];
export function setChannels(val) { channels = val; }
// ... etc
```

> [!NOTE]
> Los `window.getChannels` / `window.setChannels` se reasignan para que apunten a los exports de este módulo.

---

### FASE 3 — Extracción del Player (RIESGO: Medio)

`mountRemotePlayer`, `selectChannel`, `zapChannel`, `triggerFailover`, `stopWatchTimer` son la cadena crítica. Se extraen juntas para preservar sus dependencias cruzadas.

#### [NEW] `renderer/player/playerController.js`
- Importa desde `state/appState.js`
- Importa desde `services/api.js`
- Exporta `selectChannel`, `zapChannel`, `mountRemotePlayer`, `playVod`

**Performance fix en esta fase:**
- Remover los dos bloques `executeJavaScript` de diagnóstico de `mountRemotePlayer` (o envolverlos en `if (diagnosticsEnabled)`)

---

### FASE 4 — Extracción de Navegación y UI (RIESGO: Medio)

`showModule`, `switchTab`, `showLiveLanding`, `hideMenu`, `startInactivityTimers`.

#### [NEW] `renderer/ui/navigation.js`
#### [NEW] `renderer/ui/inactivity.js`

---

### FASE 5 — Extracción de Render (RIESGO: Medio-Alto)

`renderAll`, `renderChannelList`, `renderFavoritesGrid`, `renderGuide`.

**Performance fix en esta fase:**
- `renderAll()` fragmentado: `renderChannelList` solo cuando cambia `channels` o `searchTerm`
- `lucide.createIcons({ nodes: [container] })` en vez de `lucide.createIcons()` global
- `saveAppState()` con debounce de 500ms

#### [NEW] `renderer/render/renderAll.js`
#### [NEW] `renderer/render/channelList.js`
#### [NEW] `renderer/render/favoritesGrid.js`
#### [NEW] `renderer/render/guide.js`

---

### FASE 6 — Extracción de Filtros (RIESGO: Medio)

`filterLanguages`, `filterGenres`, `filterEvents`, `addFilter`, `removeFilter`, `syncFilterList`, `populateDropdowns`.

#### [NEW] `renderer/filters/filterState.js`
#### [NEW] `renderer/filters/filterManager.js`

---

### FASE 7 — Extracción de VOD (RIESGO: Bajo)

`refreshVodContent`, `parseSFlixHtml`, `warmupVodCache`, `showVodDetails`, VOD state.

**Performance fix en esta fase:**
- `warmupVodCache()` con `requestIdleCallback` en vez de llamada directa en `init()`

#### [NEW] `renderer/vod/vodContent.js`
#### [NEW] `renderer/vod/vodState.js`
#### [NEW] `renderer/vod/vodCache.js`

---

### FASE 8 — Extracción de Settings / Parental / Asignador (RIESGO: Bajo)

`hashPIN`, `verifyPIN`, `promptParentalPIN`, asignador de eventos.

**Security fix en esta fase:**
- Remover hash hardcodeado de `renderer.js` línea 69

#### [NEW] `renderer/settings/parental.js`
#### [NEW] `renderer/filters/filterAssigner.js`

---

### FASE 9 — Extracción de UI Components (RIESGO: Bajo)

`initIconPickers`, `initDashCustomSelects`, `syncCustomSelect`, `initCustomTooltips`.

#### [NEW] `renderer/utils/customSelect.js`
#### [NEW] `renderer/utils/iconPicker.js`
#### [NEW] `renderer/utils/tooltips.js`

---

### FASE 10 — Limpieza del Entry Point (RIESGO: Bajo)

`renderer.js` queda como orquestador `< 200 líneas`: solo imports y llamada a `init()`.

#### [MODIFY] `renderer.js`

---

## Convenciones de código

- Todos los módulos usan **ES Modules** (`import`/`export`) — compatible con Vite
- **Sin efectos en import time** — los módulos solo definen funciones y exportan; los efectos ocurren en `init()`
- `window.XXX` mantenidos: solo los que están en la tabla de "contratos públicos". Se marcan con `// @public-api`
- **Nombres de archivo**: camelCase para módulos, PascalCase para clases (no hay clases)
- **Commits atómicos**: cada fase es un commit con mensaje `refactor(fase-N): ...`

---

## Plan de verificación

### Tests funcionales mínimos por fase
Después de cada fase, verificar manualmente:
1. ✅ La app arranca sin errores en consola
2. ✅ Se pueden sintonizar canales (Live TV)
3. ✅ El zapping (flechas / botones) funciona
4. ✅ Los filtros (Idioma / Género / Evento) filtran correctamente
5. ✅ Settings se abre y guarda correctamente
6. ✅ VOD (Series/Películas) carga contenido (fases 7+)

### Automated
- No hay tests unitarios en el proyecto. Se mantiene el estado actual.
- Se puede añadir un `vite build` de verificación sin servir.

---

## Resumen de riesgos

| Riesgo | Nivel | Mitigación |
|---|---|---|
| Romper `window.XXX` contratos | Alto | Mantener todos los expuestos en tabla; mapear HTML antes de iniciar |
| Circular imports entre módulos | Medio | Definir `state/` como capa sin imports de lógica |
| `renderAll()` fragmentado rompe sincronía | Medio | Mantener renderAll como orquestador, no eliminar |
| `saveAppState` debounce pierde datos | Bajo | Llamada inmediata en cierre de app y en operaciones críticas |
| Hash PIN visible en bundle | Alto (seguridad) | Eliminar en Fase 8; no es funcional (solo era para inicialización antigua) |
