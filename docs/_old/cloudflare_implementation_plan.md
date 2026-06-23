# Implement Independent Cloudflare Security and Malware Filter in JTV App

This plan adds an embedded network security and malware-blocking layer to JTV by intercepting DNS queries via DNS-over-HTTPS (DoH) using Cloudflare's malware-blocking endpoint (`1.1.1.2` / `https://security.cloudflare-dns.com/dns-query`). 

This setup runs fully native inside the application sandbox, strictly isolating JTV traffic, without touching global Windows network interfaces or services. A seamless fallback to system DNS is provided if DoH queries fail.

## User Review Required

> [!IMPORTANT]
> **Native DNS-over-HTTPS Hooking**: The security layer is implemented by globally hooking Node's `dns.lookup` in the Electron main process. This routes all application-specific network requests (VOD metadata from TMDB/OMDb, SFlix content, DaddyLive scrapes) through the malware-filtering DoH API when enabled.
> 
> **Global Settings Toggles Bug Fix**: We identified a bug in the existing codebase where settings toggles (`autoUpdateDomain`, `audioLevelerEnabled`, `hwAccelEnabled`, `minimizeToTray`, `preventSleep`) assigned values to undeclared variables (causing them to leak onto the `window` global object) instead of updating the `state` object. Consequently, these settings were not correctly saved/loaded. We will fix this by scoping the assignments to the `state` object.

## Open Questions

None. The requirements are fully satisfied by this design.

## Proposed Changes

---

### Electron Main Process (Backend)

#### [NEW] [cloudflareNetworkService.js](file:///d:/Projects/JTV.app/main/network/cloudflareNetworkService.js)
- Implements `initCloudflareNetworkService(context)`, `enableCloudflareProtection()`, and `disableCloudflareProtection()`.
- Hooks `dns.lookup` so that when protection is enabled, it resolves hostnames using the Cloudflare DoH JSON API (`https://1.1.1.2/dns-query?name=<host>&type=A`) with a timeout of 4 seconds.
- Ignores direct IPs, loopback, the DoH server itself, and local domains (`.local`).
- Falls back to the original `dns.lookup` if DoH fails.

#### [MODIFY] [createAppContext.js](file:///d:/Projects/JTV.app/main/context/createAppContext.js)
- Add `cloudflareProtectionEnabled` (loaded from `jtv_data.json`) to `context.state`.

#### [MODIFY] [bootstrap.js](file:///d:/Projects/JTV.app/main/bootstrap.js)
- Import and run `initCloudflareNetworkService(context)` during app bootstrap.

#### [MODIFY] [registerUserDataIpc.js](file:///d:/Projects/JTV.app/main/ipc/registerUserDataIpc.js)
- Update `SAVE_USER_DATA` handler to update `context.state.cloudflareProtectionEnabled` and call `enableCloudflareProtection()` or `disableCloudflareProtection()` dynamically.

---

### Electron Renderer Process (Frontend)

#### [MODIFY] [index.html](file:///d:/Projects/JTV.app/index.html)
- Add a new setting item toggle checkbox in the "Ajustes Generales" section labeled **Conexión y Protección Cloudflare** (id `cloudflare-protection-toggle`).

#### [MODIFY] [appState.js](file:///d:/Projects/JTV.app/renderer/state/appState.js)
- Add `cloudflareProtectionEnabled: false` to the default `state` object.

#### [MODIFY] [stateManager.js](file:///d:/Projects/JTV.app/renderer/services/stateManager.js)
- Persist `cloudflareProtectionEnabled: state.cloudflareProtectionEnabled` to `jtv_data.json` within `actualSaveAppState()`.

#### [MODIFY] [renderer.js](file:///d:/Projects/JTV.app/renderer.js)
- At startup, check/uncheck `#cloudflare-protection-toggle` based on `state.cloudflareProtectionEnabled`.

#### [MODIFY] [eventListeners.js](file:///d:/Projects/JTV.app/renderer/ui/eventListeners.js)
- Bind the change event listener for `#cloudflare-protection-toggle` to update `state.cloudflareProtectionEnabled` and save state.
- Fix all assignments in settings toggles to use `state.<property>` rather than undeclared variables (i.e. fix `autoUpdateDomain`, `audioLevelerEnabled`, `hwAccelEnabled`, `minimizeToTray`, `preventSleep`).

---

## Verification Plan

### Automated Tests
- Build and run the Electron app (`npm run dev` or `npm start`) and inspect process startup logs.
- We will write a small test script in `scratch/test_doh_resolution.js` to simulate requests with the hook enabled/disabled.

### Manual Verification
1. Open the "Ajustes" panel.
2. Navigate to "General".
3. Toggle "Conexión y Protección Cloudflare" on and off.
4. Verify the setting persists across application restarts.
5. With the toggle enabled, verify that standard functions (fetching VOD metadata, scraping channels) work flawlessly.
6. Temporarily block network connection to `1.1.1.2` or cause DoH queries to fail to verify the seamless fallback to the local DNS resolver.
