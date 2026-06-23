# JTV Refactor And Security Report

## Purpose

This report summarizes the two major change sets recently implemented in JTV:

1. Main-process refactor
2. Security hardening and future-proofing changes

The goal is to keep a simple technical record inside the app repository so future updates can build on the new structure safely.

## 1. Main Refactor Summary

### What changed

The old `main.js` was reduced to a thin bootstrap entrypoint:

- [main.js](file:///d:/Projects/JTV.app/main.js)

Main-process responsibilities were split into focused modules under:

- [main](file:///d:/Projects/JTV.app/main/)

New structure:

- App bootstrap: [bootstrap.js](file:///d:/Projects/JTV.app/main/bootstrap.js)
- App context/state: [createAppContext.js](file:///d:/Projects/JTV.app/main/context/createAppContext.js)
- Window lifecycle and messaging: [createMainWindow.js](file:///d:/Projects/JTV.app/main/windows/createMainWindow.js), [windowManager.js](file:///d:/Projects/JTV.app/main/windows/windowManager.js)
- IPC registration by concern: [registerIpc.js](file:///d:/Projects/JTV.app/main/ipc/registerIpc.js) plus the `register*Ipc.js` modules
- Request filtering: [requestPolicy.js](file:///d:/Projects/JTV.app/main/network/requestPolicy.js), [policyConfig.js](file:///d:/Projects/JTV.app/main/network/policyConfig.js)
- Services:
  - [userDataStore.js](file:///d:/Projects/JTV.app/main/services/userDataStore.js)
  - [audioState.js](file:///d:/Projects/JTV.app/main/services/audioState.js)
  - [scrapeClient.js](file:///d:/Projects/JTV.app/main/services/scrapeClient.js)
  - [vodClient.js](file:///d:/Projects/JTV.app/main/services/vodClient.js)
- Diagnostics controller/watchers:
  - [controller.js](file:///d:/Projects/JTV.app/main/diagnostics/controller.js)
  - [watchers.js](file:///d:/Projects/JTV.app/main/diagnostics/watchers.js)

### Shared IPC

A shared IPC channel list was introduced so the app stops spreading string channel names everywhere:

- [ipcChannels.json](file:///d:/Projects/JTV.app/shared/ipcChannels.json)

This made main-process and renderer communication more consistent and easier to review.

### Developer Mode

A Developer tab was added to Ajustes and made available only in development or when explicitly enabled:

- UI: [index.html](file:///d:/Projects/JTV.app/index.html)
- Renderer wiring: [renderer.js](file:///d:/Projects/JTV.app/renderer.js)
- Main-process logic: [registerDeveloperIpc.js](file:///d:/Projects/JTV.app/main/ipc/registerDeveloperIpc.js)

Developer controls now include:

- Developer Mode toggle
- Diagnostics toggle
- Open DevTools action
- Reload window action

### Why this refactor matters

- `main.js` is no longer a shared hotspot
- Main-process boundaries are easier to understand
- IPC is more organized and easier to audit
- Diagnostics and dev controls now have clearer ownership
- Future features can be added without expanding a single giant file again

## 2. Security Hardening Summary

### Main goal

The app now treats the local JTV UI as the trusted control plane and treats third-party playback pages as untrusted guests.

### Window hardening

The main Electron window was changed to safer settings in:

- [createMainWindow.js](file:///d:/Projects/JTV.app/main/windows/createMainWindow.js)

Key changes:

- `nodeIntegration: false`
- `contextIsolation: true`
- `webSecurity: true`
- `sandbox: true`
- blocked main-window navigation away from local app content
- blocked popup windows more aggressively
- hardened `webview` attachment rules

### Separate preloads

The app now uses two different preload roles:

- Trusted app bridge: [app-preload.cjs](file:///d:/Projects/JTV.app/app-preload.cjs)
- Remote playback guest helper: [guest-preload.cjs](file:///d:/Projects/JTV.app/guest-preload.cjs)

This prevents the same powerful bridge from being shared between the local UI and remote playback content.

### Narrow renderer bridge

The renderer no longer imports Electron directly. Instead it uses a small preload API exposed as `window.jtvAPI`:

- Bridge: [app-preload.cjs](file:///d:/Projects/JTV.app/app-preload.cjs)
- Consumer: [renderer.js](file:///d:/Projects/JTV.app/renderer.js)

This reduces the risk that a renderer XSS becomes full Electron/native access.

### Playback isolation

Remote playback was moved into isolated guest `webview` containers instead of using privileged in-window remote content:

- Implementation: [renderer.js](file:///d:/Projects/JTV.app/renderer.js)

The guest playback flow now uses:

- a dedicated partition: `persist:jtv-playback`
- stricter webview attach rules
- guest preload only
- popup blocking
- restricted navigation

### Session hardening

Both the default app session and the playback session are hardened in:

- [bootstrap.js](file:///d:/Projects/JTV.app/main/bootstrap.js)

Changes include:

- deny permission requests
- deny permission checks
- deny device permissions
- apply request filtering to both sessions

### Diagnostics hardening

Diagnostics are now more tightly controlled:

- IPC gating: [registerDiagnosticsIpc.js](file:///d:/Projects/JTV.app/main/ipc/registerDiagnosticsIpc.js)
- Watchers: [watchers.js](file:///d:/Projects/JTV.app/main/diagnostics/watchers.js)

Important changes:

- dangerous diagnostics require developer mode + diagnostics enabled
- packaged builds block dangerous diagnostics unless explicitly allowed
- screenshot filenames are normalized for safety
- input simulation payloads are validated
- `eval.tmp` execution was removed completely

### External URL hardening

External URL opening is now validated with URL parsing and hostname allowlisting:

- [registerShellIpc.js](file:///d:/Projects/JTV.app/main/ipc/registerShellIpc.js)

### Frontend hardening

The UI also received additional security cleanup:

- CSP added to [index.html](file:///d:/Projects/JTV.app/index.html)
- renderer moved to safe bridge usage in [renderer.js](file:///d:/Projects/JTV.app/renderer.js)
- several HTML injection points were sanitized in [renderer.js](file:///d:/Projects/JTV.app/renderer.js)
- remote media/logo URLs are normalized before rendering

## 3. Net Result

### Architecture result

JTV now has a much cleaner main-process structure:

- bootstrap is small
- services are separated
- IPC is grouped by concern
- developer tooling is easier to manage

### Security result

JTV now has a safer production direction:

- trusted UI is separated from remote playback
- renderer no longer has direct Electron access
- remote playback runs in a more isolated container
- dangerous debug paths are gated or removed
- permissions and navigation are more tightly controlled

## 4. Remaining Notes

These changes significantly improve maintainability and security, but they do not mean the app is “finished forever.” Future work should continue following the same direction:

- keep the main UI trusted and minimal
- avoid expanding the preload bridge without strong reason
- keep diagnostics/dev-only features off in production by default
- treat request filtering as defense-in-depth, not as the only protection
- keep sanitizing any HTML generated from scraped or remote content

## 5. Verification Snapshot

After these changes:

- the app launched successfully with `npm run start`
- the hardened preload bridge loaded correctly
- the schedule fetch completed successfully during startup
- no diagnostics errors were reported by the editor after the refactor/hardening pass

