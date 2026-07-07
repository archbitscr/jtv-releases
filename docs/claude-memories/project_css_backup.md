---
name: project-css-backup
description: temp/style.css is the CSS backup with default values before Task 37 (multi-resolution scaling). Use as reference when asked to restore or check original state.
metadata: 
  node_type: memory
  type: project
  originSessionId: c44f9512-968f-4e46-8f7d-70bb1394f34c
---

`temp/style.css` contains the original CSS values before Task 37 (multi-resolution support) was implemented.

**Why:** The user made a backup before applying clamp()/vw scaling changes, so original fixed values can be recovered if needed.

**How to apply:** When asked to "restore" an element or check its initial state, read the corresponding selector from `temp/style.css` instead of guessing original values.
