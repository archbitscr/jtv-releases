## Navigation / Scroll Issues (Live ⇄ Series ⇄ Movies)

**Symptoms**
- Top navigation buttons feel unreliable when moving between Live TV, Series, and Movies.
- Top navigation disappears unexpectedly while browsing Series/Movies.
- Mouse wheel paging in Series/Movies goes the opposite direction (scroll down loads previous page).

**Root Cause**
- The top navigation click handler forces the top menu hidden after every click, even in modules where it should remain visible.
- Inactivity timers also force the top navigation hidden regardless of module, causing it to disappear during Series/Movies browsing.
- Wheel paging logic maps `deltaY > 0` (scroll down) to “previous page” instead of “next page”.

**Fix**
- Keep top navigation visibility controlled by the router (`showModule`) and remove forced hiding from click/inactivity code paths.
- When entering Series/Movies, deactivate LiveTV-only menus (left sidebar/edit pane) so only the top menu remains.
- Swap wheel paging direction so scroll down advances pages and scroll up goes back.

## Live TV Landing Title Says “Televisión”

**Symptoms**
- In the Live TV landing overlay, the section title shows “Televisión” instead of “Live TV”.

**Root Cause**
- `showModule('live')` and `showLiveLanding()` hardcode the title string to “Televisión”.

**Fix**
- Change the Live module title text to “Live TV” in both code paths.

## Dynamic Hover Wallpaper + VOD Close Artifact

**Symptoms**
- Background changes when hovering VOD cards or HUD areas, even when a static wallpaper is selected in Config.
- When closing Series/Movies, there’s a brief visual flash where cards reflow into an older/incorrect layout before the overlay fully fades out.

**Root Cause**
- A separate “dynamic hover background” layer (`#dynamic-bg`) is toggled on VOD card hover.
- When leaving VOD, the grid layout class changes while the overlay is still visible during the fade-out transition, causing a reflow flash.

**Fix**
- Remove the dynamic hover background layer + its JS hooks so only the static wallpaper system remains.
- Clear the grid contents before removing VOD layout classes when exiting VOD to avoid reflow artifacts during fade-out.

## White Flash / White Square On App Launch

**Symptoms**
- On startup, a large “white square” (unstyled white background) appears briefly before the UI finishes loading.

**Root Cause**
- The first paint can happen before `style.css` is applied; the browser default background is white, causing a flash of unstyled content.

**Fix**
- Add a tiny inline dark background style in `index.html` (and set `color-scheme: dark`) so the first paint is dark even before external CSS loads.

## Accidental Text Selection On Live TV Bottom Menu

**Symptoms**
- Source labels/buttons in the Live TV bottom HUD sometimes appear highlighted/selected after mouse interactions.

**Root Cause**
- Text selection is enabled globally, so click/drag interactions can accidentally create a selection highlight over UI labels.

**Fix**
- Disable text selection globally and re-enable it only for editable inputs (search bars and other input fields).

## Live TV Tune “Double Background” Flash

**Symptoms**
- Right after opening the app, when tuning a channel there’s a very fast “double background” / background artifact before the embedded player shows its loading state.

**Root Cause**
- The wallpaper layer fades out (opacity transition) at the exact same time the player iframe starts loading, briefly showing both the wallpaper + the nebula background at once.
- A leftover debug style forced a solid background color on the wallpaper layer (`background-color: red !important;`), which made the flash much more noticeable while the wallpaper image was still loading.

**Fix**
- Remove the forced wallpaper background color.
- Make hiding the wallpaper instantaneous (disable opacity transition only for the hide operation) and preload the wallpaper image before showing it, to avoid transient “double background” frames.

## Live TV Tune White Flash + Wallpaper Flash

**Symptoms**
- When tuning a Live TV channel, a brief white frame appears, then the wallpaper appears briefly, and only then the player is visible.

**Root Cause**
- Cross-origin player iframes/webviews often render a default white background before their first real paint.
- The app wallpaper was visible during tune/load, so the user could see a quick “background step” between the white frame and the player.

**Fix**
- Add a black “loading curtain” overlay on top of the player container while the iframe/webview is loading, then fade it out after `load` / `dom-ready`.
- Hide the wallpaper while a channel/VOD is tuned; show wallpaper only when nothing is tuned (landing/home screens).
- Keep the player container background transparent (the curtain provides the black frame), so the selected wallpaper remains visible anywhere the player is idle.

## Live TV Top Button Doesn’t Open Landing When Already On Live TV

**Symptoms**
- While already in the Live TV section, clicking “Live TV” in the top navigation does not open the Live TV landing overlay (favorites grid), unlike the sidebar “Inicio” button.

**Root Cause**
- The top navigation always called `showModule('live')`. When a channel is already tuned, `showModule('live')` keeps watching and does not force the landing overlay.

**Fix**
- If the current module is already Live TV, clicking the top “Live TV” button now triggers the same landing behavior as “Inicio” (opens the landing overlay on top of playback).

## Live TV Sidebar Contrast / Tone Mismatch

**Symptoms**
- On bright video frames, the left sidebar text and controls become hard to read.
- Sidebar background, list rows, and selected channel styles do not match the glass tone used by the top and bottom HUD menus.
- The selected channel number badge appears inverted (white background with dark text), which feels visually inconsistent.

**Root Cause**
- The sidebar and channel list were using a separate set of lighter/translucent card colors rather than the shared HUD glass tone.
- Sidebar top buttons also lacked the same hover treatment used by the top navigation.

**Fix**
- Align the sidebar glass background and channel row backgrounds to the same HUD tone used by the top/bottom menus.
- Keep the selected row darker, but use a muted dark badge for the channel number instead of the inverted white badge.
- Add the same hover behavior to the sidebar top buttons and apply a subtle global text shadow for readability over bright backgrounds.

## Favorites Filter Navigation Scope + Fullscreen Hotkey

**Symptoms**
- While browsing Favorites, zapping mostly stays inside favorites, but once a sidebar filter is selected the tuner can fall back to all favorites or even the all-channels scope.
- `Esc` exits fullscreen; desired fullscreen hotkey is `F`.

**Root Cause**
- `selectChannel()` reset sidebar filter state back to `All`, which broke the currently active navigation scope.
- `zapChannel()` only distinguished between “favorites” and “all channels”; it did not follow the exact filtered list currently active in the sidebar.
- Fullscreen exit/toggle was still wired to `Esc` in the main process flow.

**Fix**
- Stop resetting sidebar filters during channel selection.
- Derive tuner navigation from the currently active sidebar tab plus its active search/filter state, so zapping stays inside the exact visible list scope.
- Move fullscreen toggle behavior to `F` and remove the fullscreen-on-`Esc` interception.
- Ignore repeated `F` keydown events to avoid accidental double toggles, and place the fullscreen button at the root app layer so it stays available above the homescreen overlay too.

## Live TV Filter Header Color + Spanish UI Labels

**Symptoms**
- The Live TV sidebar `Filtros` label can still appear gray because a later CSS block overrides the earlier white style.
- Some top/bottom HUD labels, tooltips, and screen titles remain in English (`Live TV`, `Movies`, `Config`, `Sources`, `Live Stream`, etc.).

**Root Cause**
- Filter header styles are declared in multiple places, and the later rule was winning.
- Several UI strings are hardcoded separately across `index.html` and `renderer.js`.

**Fix**
- Override the later filter-header rule so `Filtros` and its icon stay white.
- Move visible menu labels, key tooltips, screen titles, and common runtime messages to Spanish, and rename `Configuracion` to `Ajustes`.

## Fullscreen `F` Hotkey Doesn’t Toggle Reliably

**Symptoms**
- Pressing `F` sometimes causes a “wiggle” but does not actually enter/exit fullscreen.

**Root Cause**
- `F` was being handled through multiple paths (webview preload + renderer) and could result in rapid double toggles.
- `F` was not forwarded from the main process when focus was inside a cross-origin iframe, so it was inconsistent depending on focus.

**Fix**
- Centralize `F` handling through the main-process `before-input-event` forwarder and renderer `app-hotkey` handler.
- Ignore repeat keydown events (`repeat`) to prevent accidental double toggles.

## Live TV Escape Shows Stuck Main Home Screen

**Symptoms**
- While watching En Vivo, pressing `Esc` opens the main app homescreen overlay and it can’t be dismissed unless a channel is tuned again.

**Root Cause**
- `Esc` was mapped to `showModule('home')`, which reveals the main homescreen overlay. That overlay is intended to be navigated only via clicking its cards, not via hotkeys.

**Fix**
- In En Vivo with a tuned channel, `Esc` now opens the En Vivo landing overlay (`showLiveLanding`) instead of the main homescreen.
- In Series, Películas, and Ajustes, `Esc` now navigates back to the main homescreen.

## Settings Sidebar Footer Version + External Link

**Change**
- Move the version legend out of the General settings pane and into the sidebar footer.
- Make `ARCHBITS.xyz` open the default browser on Windows (external link).

**Fix**
- Add a `shell.openExternal` IPC handler in `main.js`, and intercept `.external-link` clicks in `renderer.js` to call it.

## Packaged EXE Missing Wallpaper/Card Images

**Symptoms**
- After installing/running the packaged EXE, the home screen cards show no background images.
- In Ajustes → Fondos, wallpaper thumbnails don’t load and selecting a wallpaper shows only black.

**Root Cause**
- Electron-builder uses `directories.buildResources: build`, and build resources are not packed into the app by default.
- The app was referencing images from `build/...` (cards + wallpapers), so those files were available in dev but missing inside the packaged app.

**Fix**
- Copy wallpapers and home-card images into `assets/` (packed with the app by default).
- Update all references from `build/...` → `assets/...`.
- Add a small migration in `renderer.js` to map any saved `build/...` wallpaper path to the new `assets/wallpapers/...` path.

**Follow-up / Why the installer became huge**
- The build configuration did not restrict packaged files, so `electron-builder` packed the whole project folder into `app.asar` (including `dist/` installers, screenshots, and scratch files), inflating the EXE massively.
- Fix: add a strict `build.files` allowlist in `package.json` so only the runtime files are packaged (`index.html`, `style.css`, `main.js`, `app-preload.cjs`, `guest-preload.cjs`, `renderer.js`, `package.json`, `assets/**`, `main/**`, `shared/**`). This excludes development folders (`dist/`, `docs/`, `scratch/`, etc.) while ensuring all runtime dependencies are bundled.

## Fullscreen Hotkey `F` Interferes With Typing

**Symptoms**
- When typing in any search bar or input, pressing the letter `f` toggles fullscreen instead of inserting the character.

**Root Cause**
- `F` is handled in the main process via `before-input-event` and `preventDefault()`, so it fires even when an `<input>` has focus.

**Fix**
- Track “typing mode” in the renderer (focus on input/textarea/contenteditable) and send it to main via IPC.
- Main process ignores the `F` fullscreen toggle while typing is active.

## Search Bars: Clear (X) + Numeric Search Scroll

**Symptoms**
- In some sections, search inputs don’t provide a clear (X) button, so users must manually delete text.
- When searching by channel number, results can appear scrolled mid-list, so the user doesn’t immediately see the first numeric result.

**Fix**
- Add clear (X) buttons to Live landing search and VOD search inputs; show only when the input has text.
- When the search term is numeric-only, auto-scroll the active list container to the top so results start at the first (ascending) match.

## Settings Channels CRUD Height Doesn’t Use Remaining Space

**Symptoms**
- In `Ajustes` -> `Canales`, the developer CRUD panel stops at a fixed height and leaves empty space below it.
- Large channel lists or long edit forms show less content than the available settings panel height.

**Root Cause**
- The CRUD split layout used a hardcoded `height: 450px`.
- The `Canales` settings pane and the injected developer CRUD container were not configured as flex children that could consume the remaining height of the main settings content area.

**Fix**
- Remove the fixed CRUD height and make the split layout grow with `flex: 1`.
- Make the `Canales` pane and the injected CRUD container use a column flex layout with `min-height: 0` so the two internal panels can scroll inside the available remaining space.

## Settings Channels CRUD Missing Active Selection + Weak Form Scroll UX

**Symptoms**
- In `Ajustes` -> `Canales`, selecting a channel does not leave the chosen row clearly marked in the list.
- The edit panel on the right can feel cramped, and the scrollbar remains visually noisy instead of fading when inactive.
- Save/Delete buttons look oversized and don’t match the visual style of the Settings buttons.
- The CRUD scrollbars can still look too large, show default arrow buttons, and the two columns can drift from a strict 50/50 split.
- Long channel names can visually pressure the row layout if they are not clipped inside the item itself.

**Root Cause**
- The CRUD list relied only on transient hover styling and did not persist an active selected state.
- The right-side edit panel used a basic always-visible scrollbar with no activity-based reveal behavior.
- The CRUD action buttons used the global `.primary-btn` (full-width, larger padding/hover) and extra inline styles that override the Settings button system.
- Scrollbar styling was only applied to the right panel and still used a relatively large thumb width.
- The two CRUD columns depended on flexible growth instead of an explicit fixed 50/50 width contract.

**Fix**
- Track the selected CRUD channel index and render a persistent active style for the chosen row, including auto-scrolling it into view.
- Make the right edit panel fully use the available height, reset scroll to top when switching channels, and use a minimal scrollbar that appears on activity and fades when idle.
- Replace Save/Delete button styles with the Settings-native button classes (`.settings-action-btn` + `.danger-btn`) and align them like other Settings actions.
- Apply the same ultra-minimal scrollbar treatment to both CRUD scroll areas, hide the arrow buttons, and fade the thumb out when mouse activity stops.
- Lock both CRUD columns to an explicit 50/50 width and truncate long row text inside each item so widths stay stable.

## Section Switch Overlay Flash (Live → Series/Películas)

**Symptoms**
- When switching from En Vivo to Series or Películas, the search/filters block from the previous section can briefly appear on top of the next section before correcting itself.

**Root Cause**
- `activeDashTab` (which drives whether Live search vs VOD search/filters are visible) was being updated later in `showModule()`.
- A concurrent `renderAll()` could run during the transition, rendering the wrong search/filters UI for one frame.

**Fix**
- Set `activeDashTab` immediately at the start of `showModule()` for live/series/movies.
- Proactively hide both Live-search and VOD-controls blocks at the start of `showModule()`, then let the normal render flow show the correct one.

## VOD Prefetch Cache (Series/Películas) + Controls Visible While Loading

**Symptoms**
- When switching to Series/Películas, the UI can feel “stuck” while content loads.
- Search/filters may appear late because content fetching finishes before the section fully renders.

**Root Cause**
- The section relied on remote fetch completion to trigger the render that unhides the correct controls.
- No persistent cache existed for initial content, so first-load always waited on network + parsing.

**Fix**
- Render the Series/Películas dashboard controls immediately (and keep a loader in the grid).
- Prefetch and persist a cache of the first 100 titles for both Series and Películas on app startup.
- Store that cache in the existing `jtv_data.json` so it survives app close.

## Video Not Visible (1px Line At The Top)

**Symptoms**
- Audio plays correctly, and menus and HUD elements are fully functional.
- The video itself is not visible, showing only a 1px thin line at the very top of the window displaying colors from the stream.

**Root Cause**
- A generic iframe selector (`iframe:not([src*="ads"])...`) in the dynamic fullscreen CSS rules injected into the webview matched blank helper iframes (such as tracking iframes in the main document and empty hidden frames inside the player sub-frame).
- These blank helper iframes were styled with a high z-index and painted solid black, acting as a mask directly on top of the video layer.
- Minor sub-pixel rendering differences left a 1px gap at the top, showing only a thin strip of the video.

**Fix**
- Refactor the CSS rules in `renderer.js` and `guest-preload.cjs` to remove the generic `iframe` selector.
- Restrict the fullscreen styles to specific IDs and classes (`#thatframe`, `#player`, `.player-container`, etc.) so that helper/empty iframes remain hidden and do not cover the video.

## Distraction Symbols in Windowed / Maximized Mode

**Symptoms**
- When the window is maximized in Windows (but not in fullscreen mode), a small grey square is visible on the left edge of the window and a diagonal arrow icon is visible on the right edge of the window, causing visual distraction.
- When entering fullscreen mode, these symbols disappear because the video fits the screen resolution.

**Root Cause**
- The stream provider website (DaddyLive) embeds floating next and previous channel navigation links/buttons (`.prev`, `.next`, etc.) on the left and right sides of the page.
- Due to security sandboxing and Content-Security-Policy (CSP) restrictions in JTV, external font icon packages are blocked from loading, causing these navigation arrows to fall back to plain unicode/glyph characters (such as `■` on the left and `⤢` on the right).
- Since these elements have high z-indexes and are absolute/fixed positioned on the viewport edges, they float on top of the stream player inside the webview and are visible in windowed/maximized aspect ratios.

**Fix**
- Add CSS rules to both `renderer.js` (inside `webview.insertCSS()`) and `guest-preload.cjs` (inside the `nuclearStyle` declaration) to explicitly target and hide all previous/next channel navigation elements (using selectors like `.prev`, `.next`, `.prev-btn`, `.next-btn`, `.prev-channel`, `.next-channel`, `.prev-chan`, `.next-chan`, `a[href*="stream-"]`, `a[href*="/stream-"]`, `a[class*="prev"]`, `a[class*="next"]`, `.page-left`, `.page-right`, `.carousel-control-prev`, `.carousel-control-next`).
- **Follow-up Fix**: Since the stream provider might load navigation elements with custom or dynamically generated class names that bypass standard selectors (such as stretched player wrapper buttons), two additional layers of defense were added:
  1. **Wildcard Attribute CSS Selectors**: Expanded the injected CSS rules in `nuclearStyle` and `renderer.js` to target any classes or IDs containing "prev", "next", "previous", "left-arrow", "right-arrow", "page-left", "page-right", "carousel-control", or "btn-navigation" (case-insensitive wildcards: e.g. `[class*="prev" i]`, `[class*="next" i]`).
  2. **Javascript DOM Text Scanner**: Equipped `guest-preload.cjs` with a runtime DOM scanner (`hideDistractingSymbols`) executing every second. It inspects the text content of all active elements in the webview context and recursively hides any node (via `display: none !important`) that contains the distracting unicode character glyphs (`■` / U+25A0 on the left, `⤢` / U+2922 on the right). This ensures that even if font icon libraries block, the plain text fallbacks are dynamically intercepted and hidden instantly.
- **Definitive Fix (Host-level CSS Margin Masking / Pintar de Negro)**:
  Since the navigation buttons inside the sub-iframe are cross-origin and shielded by CSP (which blocks inline style sheets), and their symbols are rendered via CSS pseudo-elements (which are invisible to `textContent` checking), any modifications within the Webview context are bypassed. 
  To solve this definitively, we implemented a host-level masking system in JTV. We added four absolute-positioned solid black overlay divs (`.edge-mask`) inside JTV's `#video-container` (outside the Webview sandbox) that dynamically cover the exact region outside the centered 16:9 video frame:
  * Left and Right masks cover the margins (pillarboxes) when the window is wider than 16:9: `width: calc((100vw - 100vh * 16 / 9) / 2)`.
  * Top and Bottom masks cover the margins (letterboxes) when the window is taller than 16:9: `height: calc((100vh - 100vw * 9 / 16) / 2)`.
  These masks use `pointer-events: none` to let mouse interactions pass through to the player barrier below, and are enabled only during active playback (using `body.player-active` class toggled in `renderer.js` upon mounting/dismounting a player). This completely and reliably hides any distracting symbols or visual artifacts in the black borders.

## Favorites Zapping Scope Mismatch at First Launch

**Symptoms**
- When the app is opened for the first time and a favorite channel is tuned from the Home Screen's Favorites grid, zapping (channel up/down) cycles through all channels instead of staying within favorites.
- If the user opens the sidebar and selects the "Favoritos" tab, the issue is resolved and subsequent zapping stays in favorites.

**Root Cause**
- At startup, the default active sidebar tab is set to `channels` (Todos).
- When a channel is tuned from the Home Screen's Favorites grid, the active sidebar tab remains `channels`.
- When zapping, `zapChannel` gets the list of active channels from `getCurrentNavigationChannels()`, which queries the active sidebar tab (which is `channels`).
- Because the `channels` tab list contains channels, `scopedList.length > 0` is true, causing `zapChannel` to cycle through all channels and bypass the favorite fallback logic.

**Fix**
- Updated `selectChannel` in [renderer.js](file:///d:/Projects/JTV.app/renderer.js) to check if the selection is made from the Home Screen/Landing overlay (using the state of `isHomeActive` prior to tuning).
- If the selection is made from the Home Screen, we automatically call `switchTab(channel.favorite ? 'favorites' : 'channels')` to sync the active sidebar tab to match the favorite status of the tuned channel. This ensures that zapping immediately respects the correct navigation scope, while remaining unobtrusive to the user.
