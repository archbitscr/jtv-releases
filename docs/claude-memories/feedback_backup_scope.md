---
name: feedback-backup-scope
description: "When backing up AppData to defaults, include toggle states alongside channels and filters"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 14b97215-fd9d-4361-aa17-fa778f2e6798
---

When syncing AppData → defaultChannels.json + appState.js, always check three things:
1. **Channels** — names, categories, favorites
2. **Filters** — filterLanguages, filterGenres, filterEvents (names, icons, enabled)
3. **Toggle states** — zapSourceTab, audioLevelerEnabled, preventSleep, cloudflareProtectionEnabled, hwAccelEnabled, minimizeToTray

**Why:** User lost toggle preferences on factory reset because only channels and filters were backed up, not settings toggles.

**How to apply:** Every time user says "backup" or "sync AppData", compare all three areas and update both `defaultChannels.json` and `appState.js`.
