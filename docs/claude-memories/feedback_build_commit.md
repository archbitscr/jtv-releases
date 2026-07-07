---
name: feedback-build-commit
description: Always run build and commit after each successfully completed task
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 775284b0-cbab-4600-bf94-34afb1005392
---

Run `npm run build` and create a git commit after every task completed successfully.

**Why:** User explicitly requested this workflow — build validates the changes compile, commit tracks progress incrementally.

**How to apply:** After finishing any code change task, run the build, then stage only the changed files and commit with a descriptive message.
