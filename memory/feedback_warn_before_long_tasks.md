---
name: Warn before long tasks
description: Must explicitly warn and get approval before starting any work estimated to take over one minute
type: feedback
---

Before starting any task estimated to take over one minute, stop and tell the user: what you're about to do, how long it will take, and wait for their go-ahead before proceeding.

**Why:** User has corrected this three times in a single session. Assurances without structural enforcement don't work. This must happen before the first tool call of any multi-step or multi-file task.

**How to apply:** Any time you are about to write multiple files, run a migration, install packages, or do any work that will clearly take more than ~60 seconds — pause before the first tool call, state the plan and estimate, and wait for approval.
