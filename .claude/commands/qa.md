Run a QA review of the Lattice / Parcel codebase. Mode argument: $ARGUMENTS (defaults to "fast" if empty).

---

## Setup (always)

Read the following before running any checks:
1. `CLAUDE.md` — product constitution, guardrails, restricted zones
2. `PLAN.md` — current phase and exit criteria
3. The most recent file in `SESSION_NOTES/` — current state and known deferrals

---

## Fast review (always run)

Run these checks in order. Report each as **PASS**, **WARN**, or **FAIL** with a brief specific note. Do not write paragraphs — one line per finding unless the issue needs a file:line citation.

### 1. Static analysis

Run `npx tsc --noEmit`. Report PASS or list every error.
Run `npm run lint`. Report PASS, or list every **error** (warnings are not blockers).

### 2. Auth guard audit

Read every file matching `app/api/**/route.ts`.

For each exported handler (GET, POST, PATCH, DELETE), check whether it:
- calls `supabase.auth.getUser()` and returns 401 if no user, OR
- is legitimately public (document which routes and why)

Flag any handler that reads or writes sensitive data without an auth guard as **FAIL**.

### 3. Property scoping audit

For every write operation (POST, PATCH, DELETE) in routes under `app/api/`:
- confirm the query includes `.eq('property_id', PROPERTY_ID)` or equivalent
- pay special attention to dynamic `[id]` routes — these are highest blast-radius

Flag any write operation that mutates data without a property_id scope as **FAIL**.

For read operations (GET), flag any that return data without property scoping as **WARN**.

### 4. Restricted zone compliance

Check that no code in the latest commits touches these areas without explicit rationale in the commit message or session notes:
- `supabase/migrations/` — schema changes
- auth or RLS logic
- `app/api/admin/invite/` or `app/api/auth/` — membership rules
- agent orchestration model or tool dispatch

Run `git log --oneline -10` to see recent commits. Cross-reference commit messages against these zones.

### 5. Known-issue scan

Search the codebase for: `TODO`, `FIXME`, `HACK`, `HARDCODED`, hardcoded coordinates, hardcoded user names (outside seed files and suggestions/route.ts which is deferred to Phase E).

Use Grep. Report each match with file and line. Flag items in production route handlers as **WARN** or **FAIL** depending on severity. Items in seed scripts or dev tooling are informational.

---

## Deep review (only if mode is "deep")

> Note: Deep review reads many files. Estimated cost is $0.50–$1.50 in tokens. Confirm before proceeding.

After completing the fast review, also run:

### 6. Onboarding flow trace

Trace the full new-user (owner) onboarding path end to end:
- `app/welcome/page.tsx` → login/signup
- `app/auth/confirm/page.tsx` → token exchange
- `app/(auth)/setup-password/page.tsx` → password setup
- `app/(auth)/new-property/page.tsx` → property creation

Read each file. For each step, check:
- Is there a clear error state if the step fails?
- Is there a redirect guard preventing access out of sequence?
- Could a confused new user get stuck?

Report gaps as **WARN** or **FAIL**.

### 7. Invite flow trace

Trace the invite-and-join path for a secondary (viewer) user:
- Owner calls `POST /api/admin/invite` — read the route
- Invitee follows email link → `app/auth/confirm/page.tsx`
- Membership should already be pre-created — confirm `app/api/auth/join/route.ts` is still a no-op

Verify the invite flow correctly pre-creates membership before the invitee logs in.

### 8. Agent conversation flow trace

Trace a typical agent session:
- `POST /api/agent/route.ts` → agentic loop
- Tool dispatch in `lib/agent/handlers.ts`
- Model calls in `lib/agent/handlers.ts` (note any that should use Haiku vs Sonnet)

Check for:
- Any tool handler with no input validation on required fields
- Any tool that writes to the database without first verifying property ownership
- Loop exit conditions (max iterations, unexpected stop reasons)
- Error paths — does the loop surface failures clearly to the user?

### 9. Empty and error state coverage

For each major UI tab (Projects, Tasks, Goals, Purchases, Assets, Calendar, Budget, References, Timeline):
- Read the relevant component
- Confirm an empty state is rendered when data is absent
- Confirm a non-crash path exists if the data fetch fails

Flag any tab that renders nothing or crashes silently on empty data as **WARN**.

### 10. UX trust issues

Read the main notebook tabs and the agent interface. Flag:
- Missing loading states during async operations
- Destructive actions (delete, archive, cancel project) with no confirmation step
- Copy that is confusing, stale, or mismatched with what the UI actually does
- Flows where success or failure is not communicated to the user

---

## Report

After all checks complete, create a report file at `QA_REPORTS/YYYY-MM-DD-[fast|deep].md` using today's date.

Use this exact structure:

```
# QA Report — [date] — [mode]

## Summary
[2–3 sentences. Overall health. Most important finding. Whether anything blocks the next push.]

## Findings

| # | Check | Status | Note |
|---|-------|--------|------|
| 1 | Static analysis | PASS | tsc clean, lint 0 errors 16 warnings |
| 2 | Auth guard audit | ... | ... |
...

## Issues requiring action

[Only WARN and FAIL items. For each: file:line, what the problem is, recommended fix.]

## Deferred

[Items that are known problems but intentionally not blocking — with rationale from session notes or CLAUDE.md.]
```

FAIL = fix before next push.
WARN = track; fix before Phase exit.
PASS = clean; one line only.

Be direct and specific. Generic observations are not useful. If a check is clean, say PASS and move on.
