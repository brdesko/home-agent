# Architecture QA Review
Generated end-of-session, 2026-04-21. For Brady to review and decide on execution.

---

## Summary verdict

The architecture is sound for a personal tool at this stage. The two founding principles (domain-agnostic data model, multi-tenant from day one) have held up. The main risks are: (1) a real but contained security gap in dynamic-ID API routes, (2) pre-existing TypeScript errors in UI components that could mask real bugs, and (3) the agent route accumulating complexity without structure. None of these are on fire. They should be addressed before Phase 2 scales the codebase further.

---

## Security

### Finding S1 — Dynamic-ID routes skip property scoping (MEDIUM)
**Files:** `app/api/projects/[id]/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/assets/[id]/route.ts`, `app/api/budget-lines/[id]/route.ts`, `app/api/references/[id]/route.ts`, etc.

These routes authenticate the user (`if (!user) → 401`) but then do `.update().eq('id', id)` without checking that the target row belongs to a property the user is a member of. RLS policies in Supabase should catch cross-user writes, but only if the policies are correctly written and cover UPDATE/DELETE.

**Risk:** If an RLS policy has a gap (common during rapid migration iteration), a logged-in user could mutate another user's data by guessing a UUID.

**Recommendation:** Add `.eq('property_id', propertyId)` to all mutations in dynamic-ID routes, even as a belt-and-suspenders measure. Also audit the RLS policies in Supabase Dashboard → Authentication → Policies to confirm UPDATE and DELETE policies exist for all tables, not just SELECT/INSERT.

**Effort:** Low (add one `.eq()` to each handler). Worth doing before inviting Erin.

---

### Finding S2 — Admin client is appropriately scoped (PASS)
`createAdminClient()` (service role) is only used in `app/api/properties/route.ts` for the RLS bootstrap problem. All other routes use the standard user-scoped client. This is correct.

---

### Finding S3 — Agent route has no rate limiting (LOW)
The `/api/agent` route calls the Anthropic API on every request with no rate limiting or per-user throttle. For a two-person household this is not a practical risk. Worth noting for when access is expanded.

---

## Property scoping consistency

### Finding P1 — Dynamic-ID routes don't call getPropertyId (see S1)
Same issue as S1 from a data correctness angle: a PATCH to `/api/projects/[id]` doesn't verify the project belongs to the active property. In a one-property world this is invisible; in multi-property it means edits could silently land on the wrong property's data if IDs were ever passed incorrectly.

### Finding P2 — All server pages now correctly use getPropertyId (PASS)
After tonight's fixes, `page.tsx`, `home-details/page.tsx`, `references/page.tsx`, and `purchases/page.tsx` all use `getPropertyId()`. The cookie is respected everywhere server-side data is fetched.

### Finding P3 — AutoRefresh component may cause stale-property flicker (LOW)
`AutoRefresh` triggers a router refresh on a timer. If it fires immediately after a property switch (before the new cookie is fully propagated), it could briefly flash old data. Not currently reproducible but worth keeping in mind when adding more real-time features.

---

## TypeScript

### Finding T1 — Pre-existing errors in UI components (MEDIUM)
Running `tsc --noEmit` shows errors in:
- `components/notebook/budget-panel.tsx` — references `line_type` and `amount` fields that don't match the current `BudgetLine` type
- `components/notebook/budget-tab.tsx` — same
- `components/notebook/project-card.tsx` — same
- `components/notebook/goals-panel.tsx` — duplicate JSX attribute
- `components/notebook/budget-tab.tsx` — duplicate JSX attribute
- `components/notebook/tabs/dashboard-tab.tsx` — `GoalWithProgress` type mismatch between two definitions

These are pre-existing and the app runs because Next.js transpiles without strict type checking at runtime. But they indicate the `BudgetLine` schema changed at some point and UI components weren't updated. The duplicate-attribute errors are inert but messy.

**Recommendation:** Fix in one focused cleanup session before Phase 2. The `BudgetLine` component issues are the most likely to hide a real runtime bug (wrong field name returning undefined instead of a number).

**Effort:** 1–2 hours. Not urgent but should not accumulate further.

### Finding T2 — Agent route BudgetLineInput type fixed tonight (PASS)
`BudgetLineInput` was declared with `amount` but the tool schema and handler used `estimated_amount`/`actual_amount`. Fixed in this session.

---

## Agent route architecture

### Finding A1 — Single 1200-line file doing too many things (LOW now, MEDIUM in Phase 2)
`app/api/agent/route.ts` contains: helper functions, LISTING_PARSE_PROMPT, type definitions, tool schema array, the entire POST handler with 18+ tool dispatch branches, and `buildSystemPrompt`. It's readable now but will become hard to navigate as tools are added in Phase 2.

**Recommendation:** When adding the next major feature area (e.g. calendar tools, maintenance scheduling), extract tool definitions + handlers into a `lib/agent/` directory. Not urgent yet.

### Finding A2 — parse_listing makes a nested Anthropic API call (acceptable)
The `parse_listing` tool handler calls `anthropic.messages.create` inside the agent's tool-use loop. This is a nested AI call — the outer agent pauses, the inner call runs, the result comes back as a tool result. This works correctly. The model used for parsing is `claude-haiku-4-5-20251001` (fast, cheap) while the outer agent uses `claude-sonnet-4-6`. Good choice.

**Note:** If the outer agent hits the 10-iteration limit while waiting on a slow parse, the response falls through to the generic error message. Consider increasing `max_iterations` from 10 to 15 for parse-heavy flows.

### Finding A3 — System prompt is injected fresh on every request (acceptable for now)
Projects, goals, and references are fetched and injected into the system prompt on every request. For a notebook with 5–50 projects this is fast and correct. At 200+ projects (unlikely for personal use) this would become slow. Cache-control: ephemeral is applied, which helps with Anthropic's prompt caching. No action needed.

---

## Data model

### Finding D1 — No soft-delete on assets or references (LOW)
Projects have `status: 'cancelled'` as a soft-delete mechanism. Assets and saved references are hard-deleted. For references this is probably fine. For assets (e.g. "removed a HVAC unit we replaced"), there's no history. Not urgent for Phase 1.

### Finding D2 — calendar_events table exists but is lightly used (OBSERVATION)
The calendar tab displays events, and there's a create flow, but the agent doesn't have a `create_calendar_event` or `update_calendar_event` tool yet. If users want to schedule things through the agent conversation, they can't. This is a natural Phase 2 addition.

### Finding D3 — ongoing_tasks table exists but agent can't touch it (OBSERVATION)
The Todo tab shows ongoing tasks (recurring chores, standing items) but the agent has no tools to create or update them. Phase 2 addition.

---

## UX / Product gaps

### Finding U1 — No confirmation before property delete (HIGH)
The property dropdown presumably has a delete option (based on the archive/delete work done earlier). If it executes without a strong confirmation step (e.g. typing the property name), accidental deletion is a real risk. Recommend a "type the property name to confirm" gate rather than just a yes/no dialog.

**Action:** Verify the current delete flow and add name-confirmation if not present.

### Finding U2 — Erin's access requires manual DB insert (KNOWN)
To add Erin as a co-owner, her `user_id` must be inserted into `property_members` via the Supabase dashboard. There's no invite flow. This is a known parking-lot item. Not a bug, but worth doing soon since Erin will want to log in.

**Steps:**
1. Erin visits the app URL and signs up / logs in
2. Her user ID appears in Supabase Auth dashboard
3. Run: `INSERT INTO property_members (property_id, user_id, role) VALUES ('<your-property-id>', '<erin-user-id>', 'owner')`

### Finding U3 — Empty agent welcome message is not shown on subsequent visits (LOW)
The agent's onboarding message ("Welcome — let's get your notebook set up...") is part of the system prompt, so Claude will say it on the first message. But if a user has already set up their notebook and visits the agent again, the system prompt doesn't know the conversation history — it just sees the current state (non-empty notebook) and responds to whatever the user says first. This is correct behavior, not a bug.

### Finding U4 — No loading state on initial agent page render (LOW)
The agent page loads and immediately fires a greeting request to `/api/agent`. There's a loading spinner shown, but if the API takes 3–5 seconds (which it does — it calls Anthropic), the page feels slow. Consider streaming the agent response using the Vercel AI SDK or a simple SSE stream. Phase 2 improvement.

---

## Performance

### Finding F1 — home-details page creates signed URLs serially for each document (LOW)
`Promise.all()` is used, so this is parallel — not serial. However, `supabase.storage.createSignedUrl()` is called per file. For large document libraries this could be slow. Supabase has a `createSignedUrls` (plural) batch method. Not worth optimizing now.

### Finding F2 — getPropertyId makes 2 DB round trips on every request (ACCEPTABLE)
`getPropertyId` first validates the cookie against `property_members`, then falls back to a second query. Two round trips per request is fine for a personal app. If this becomes a bottleneck, the result could be cached in a short-lived server-side cache or the cookie could include a signed payload. Not worth optimizing.

---

## What to do before inviting Erin (priority order)

1. **S1 / P1**: Add `.eq('property_id', propertyId)` to dynamic-ID route mutations. (1 hour)
2. **U2**: Insert Erin's membership after she signs up. (5 minutes)
3. **U1**: Verify property delete has strong confirmation. (30 minutes to check + fix if needed)
4. **T1**: Fix pre-existing TypeScript errors in budget/goals UI components. (1–2 hours)

---

## What to do early in Phase 2

- Add `create_calendar_event` and `create_ongoing_task` agent tools
- Add streaming to the agent response (Vercel AI SDK is well-suited to this)
- Restructure agent route into `lib/agent/` modules
- Add a proper invite flow (email-based property membership) to replace the manual DB insert
