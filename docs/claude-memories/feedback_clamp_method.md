---
name: feedback-clamp-method
description: "Refined method for applying CSS clamp() — check HTML element type, SVG needs w/h not font-size, verify no overriding rules"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c44f9512-968f-4e46-8f7d-70bb1394f34c
---

When applying clamp() for responsive scaling:

**Before applying:**
1. Check the HTML — is it text, SVG/icon (Lucide `data-lucide`), or input? font-size does NOT affect SVGs; they need explicit `width`/`height` on `i`/`svg` selectors.
2. Calculate vw correctly: `px_value / 1080 * 100` for px values; `rem_value * 16 / 1080 * 100` for rem values.
3. Range: min at 640px, base at 1080px, max at 2560px.

**After applying:**
1. Search ALL occurrences of the selector across the entire CSS (media queries, duplicates, later rules).
2. Verify no higher-specificity rules or `!important` overwrite the clamp.
3. Confirm the computed value at 1080px matches the original.

**Why:** Multiple rounds of clamp() application failed because: (a) font-size was applied to SVG icons instead of width/height, (b) vw was miscalculated using rem/1080 instead of (rem×16)/1080, (c) media queries at large breakpoints overwrote the clamp with fixed values.

**How to apply:** Follow this checklist for every element before and after applying clamp(). [[project-css-backup]]
