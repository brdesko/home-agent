# Parcel — Full Week Summary
**Dates:** April 20–22, 2026  
**Prepared for:** Claude.ai feedback session  
**Author:** Brady Desko, with Claude Code (claude-sonnet-4-6)

---

## Who I am and what this project is

I am a VP of Innovation at a large company. Technically literate but haven't shipped production React/Node in several years. On Windows 11 / PowerShell. New to modern JS tooling (npm, Next.js App Router, Supabase RLS). My goal was to build a real personal tool, learn how to direct AI-assisted development, and evaluate this workflow for potential use in my professional context.

**Parcel** is a home management platform for homeowners to plan and manage everything on their property — farm projects, renovations, maintenance, budgets, timelines. It has two layers per property:
- **Property Notebook** — structured view of projects, tasks, budgets, timelines, assets
- **Property Agent** — conversational AI that reads and modifies the Notebook

Initial deployment is for my household (me + my partner Erin at a 5.3-acre property in Pipersville, PA), but the architecture is multi-tenant from day one. This week, we also successfully onboarded my father as a third user with his own independent property.

---

## Stack

- **Next.js 15** (App Router) — frontend + API routes
- **Supabase** — Postgres + Auth + Row-Level Security
- **TypeScript** + **Tailwind CSS** + **shadcn/ui**
- **Anthropic API** — Agent runs on Claude Sonnet 4.6, sub-calls on Haiku 4.5
- **Vercel** — hosting (free tier)
- **Resend** — email (explored but replaced by link-copy approach)

---

## What we built this week — full arc

### Phase 1: The Skeleton (April 20, Session 1)

Starting from zero:
- Initialized Next.js 15 + TypeScript + Tailwind + shadcn/ui
- Connected Supabase (browser + server clients)
- Wrote DB migrations: `properties`, `property_members` with full RLS
- Seeded 5090 Durham Rd property; Brady and Erin as Owners
- Built email/password auth (login page, session refresh)
- Core data model: `projects`, `tasks`, `assets`, `budget_lines`, `timeline_events` with RLS
- Seed data: 10 projects across 5 domains, 48 tasks, 19 budget lines, 8 assets, 6 timeline events, stored as JSON with a TypeScript loader script
- Basic Notebook UI: projects grouped by domain, two-column layout, timeline sidebar, budget panel
- Committed, pushed to GitHub, deployed to Vercel

**Key decisions:**
- Seed content as JSON (not SQL) — anticipates the Agent as the write path
- Two roles only: Owner (full access) and Viewer (read-only, no budget)
- RLS at the database level, not in application code

**Notable bugs fixed:**
- Self-referential RLS policy on `property_members` caused infinite recursion (`42P17`) — fixed by splitting `FOR ALL` into explicit INSERT/UPDATE/DELETE policies
- `proxy.ts` intercepting `/auth/callback` before code exchange could run — fixed by adding `/auth/` to public route list

---

### Phase 2: The First Agent Workflow (April 20, Sessions 2–3)

- Installed `@anthropic-ai/sdk`
- Built `/agent` page and `/api/agent` route with Claude tool-use loop
- `create_project` tool: creates a full project package (tasks, budget lines, timeline events) in one call
- Agent uses judgment to propose a sensible set of tasks rather than asking the user to enumerate everything
- Prompt caching on the system prompt; iteration cap (10) to prevent infinite loops
- Added `/review` slash command in `.claude/commands/` — audits changes against CLAUDE.md principles
- Deployed to Vercel with `ANTHROPIC_API_KEY`

**Tested:** "Add a home gym project in Barn 2" — Agent asked clarifying questions, proposed full project package, committed on approval.

---

### Phase 3: The Consultant (April 20, Sessions 3–5)

**Interactive task completion:**
- Tasks cycle status optimistically in the UI
- On completion, Claude Haiku decides if a follow-up question is warranted
- "Note it" encodes context (task title, follow-up Q&A) into Agent URL → auto-sent when Agent opens

**Agent capabilities expanded:**
- `get_all_tasks` tool: reads every task across all projects in one call; Agent assesses full Notebook and proposes cascade changes when a task is completed
- `get_project_tasks`, `update_task_status`, `update_project_status`, `create_goal`, `update_goal`
- Agent system prompt: plain prose only (no markdown asterisks or headers in responses)

**Saved References:**
- `saved_references` table (migration 008): vendors, brands, resources with type, name, URL, notes
- `save_reference` Agent tool — Agent proactively offers to save vendors/brands mentioned positively in conversation
- `/references` page grouped by type with consistent Notebook aesthetic

**To-Do tab restructure:**
- Unified timeline list: This Week + Rest of Q{n} sections
- Three category badges: Suggested (amber), Ongoing (blue), Project (zinc)
- Task expansion: Go to project, Add cost line, Ask Agent (pre-loaded context)
- Category filter pills + per-section progress bars

**Home Details page (`/home-details`):**
- Details tab: editable property fields, save-on-blur
- Documents tab: Supabase Storage upload/list/download/delete + "Parse with Agent"
- Assets tab: full CRUD (make/model/serial/install date/last serviced/location/notes), slide-over panel
- Photos tab: stub

**Agent document parsing:**
- `/api/agent/parse`: handles PDF, images, plain text, pasted text
- Confirmation modal: property details / assets / suggested projects (each checkboxable)
- Robust JSON extraction; date sanitization + numeric coercion
- Zillow/Redfin paste-text mode working; Firecrawl parked

---

### Phase 4: Aesthetics, Maneuverability & Access (April 20–21)

**UI redesign:**
- Login page: split-screen brand panel with topographic SVG, "Parcel" wordmark in Playfair Display
- Notebook header: property name, active project count, open tasks, current quarter + budgeted amount
- Sidebar color, tab hierarchy refinements
- Font updates: DM Sans body, Playfair Display headers

**Property management:**
- Archive/cancel for projects (optimistic, no page reload)
- Property dropdown with multi-property switching via cookie (`parcel_property_id`)
- Property archive: Owner-only, blocked if last active property; archived properties filtered from switcher
- `getPropertyId()` utility: respects cookie, falls back to first membership

**New features:**
- AutoRefresh on window focus (keeps Notebook current without manual reload)
- Calendar tab with CalendarEvent CRUD
- Purchases tab with Purchase CRUD
- Goals tab with drag-ordered priority, named goals linked to projects
- Quarterly Budget tab with income/expense planning and allocation percentage

**Agent tools added:**
- `parse_listing`: URL fetch + pasted text; Zillow/Redfin detection, structured extraction via Haiku sub-call
- `update_property_details`: writes back extracted property data (year built, sq footage, heat type, etc.)
- `create_asset`: adds assets from conversation or parsed documents
- `log_purchase`: records purchases from conversation
- `inline budget assistance`: Agent answers budget questions with live property context

**Property scoping fixed:**
- All server pages now use `getPropertyId()` — home-details, references, purchases all respect the cookie-selected property
- RLS verified across new tables

**Weather integration:**
- OpenWeatherMap 5-day forecast in Suggestions tab

**TypeScript build:**
- Multiple pre-existing TypeScript errors resolved; clean build on Vercel

---

### Phase 6: Interactivity & Visual Layer (April 21)

**3D Property Visual tab:**
- Three.js scene: terrain, farmhouse, barn, fencing, trees as 3D objects
- Photo upload tab with Supabase Storage
- Agent photo review: Agent can describe and comment on uploaded property photos

**Drag-and-drop scheduling:**
- Projects draggable between quarters in the Budget/Timeline tab
- Dragging updates the project's target quarter
- Effort indicators (color-coded load visualization per quarter)

**Calendar sub-tabs:**
- Schedule view (list) and Calendar view (monthly grid) in the same tab
- Full-width layout for both views

**Inline Agent budget assistance:**
- Agent can answer budget questions (quarterly and project) without leaving the Notebook

**Parsing improvements:**
- Firecrawl integration for JS-rendered URL crawling
- Upgrade to Claude Sonnet 4.6 for parsing
- Confident/uncertain field flagging before writing property details

---

### Phase 5: New User Access & Onboarding (April 21–22)

**Invite flow (multiple iterations):**
- `/admin/invite` page: enter email, generate one-time invite link via Supabase Admin API, copy to clipboard
- Multiple fixes to the redirect chain (hash-based tokens, `redirectTo` derivation from request URL)
- Final architecture: invite creates account only (no auto-property-assignment)

**Password setup:**
- `/setup-password` page: invited users set a password before proceeding
- `supabase.auth.updateUser({ password })` — gives new users a credential for return visits

**Property creation for new users:**
- `/new-property` page: name + optional address → `POST /api/properties` → creates Property + PropertyMember (owner) via admin client (bypasses RLS bootstrap problem)
- `page.tsx` now redirects to `/new-property` (not `/login`) when user has no properties

**End-to-end flow for a new user:**
1. Owner goes to `/admin/invite`, enters email, copies link
2. New user clicks link → `/auth/confirm` (session established)
3. → `/setup-password` (sets password)
4. → `/new-property` (creates their property)
5. → `/` (empty notebook with "Fresh notebook" state and Agent onboarding prompt)

**Real-world tests:**
- Erin tested the existing shared-account flow (with minor defects to fix)
- My father received an invite, created his own account, created his own property, and successfully accessed his empty notebook — end-to-end success

---

## Current state of the product

### What's working in production

- Full Notebook UI (Projects, Tasks, Goals, Budget, Timeline, Calendar, Purchases, To-Do, Home Details, Saved References)
- Conversational Agent with 18+ tools
- Multi-tenant architecture (RLS, cookie-based property switching)
- Document/photo parsing with confirmation modal
- 3D visual property tab
- Drag-and-drop scheduling
- Invite flow for new independent users
- Weather-aware suggestions

### Known defects (from Erin + Dad testing, not yet fixed)

- Unspecified defects found by Erin during her test session (to be triaged)
- Unspecified defects found by Dad during his test session (to be triaged)
- These are the next priority before broader distribution

### Architecture risks (from QA review, April 21)

- Dynamic-ID API routes (`/api/projects/[id]`, etc.) do not add `.eq('property_id', propertyId)` — relies entirely on RLS for cross-property protection
- Agent route is ~1200 lines in a single file — manageable now, will need extraction as tools expand
- No rate limiting on the Agent route
- No automated test suite — all QA is manual/browser-based

### Deferred / parking lot

- Viewer role enforcement in UI (parents anticipated as viewers)
- Adding Erin as owner of Dad's property (or vice versa) — sharing UI not built
- Firecrawl is integrated but not fully production-tested
- Agent tools for `create_calendar_event` and `create_ongoing_task` not yet built
- Streaming agent responses (currently batch)
- Property delete confirmation gate (should require typing property name)

---

## My working style (for Claude.ai to evaluate)

1. **Open-ended direction.** I give high-level goals and trust Claude to figure out implementation. "Knock it out" was common. I rarely pre-specify how something should be built.
2. **Approve rather than specify.** I let Claude propose, then say go/no-go. I don't write requirements documents before asking for code.
3. **Short-burst feedback.** "done", "still failing", "nice but X doesn't work." I rarely provide detailed error logs unless asked.
4. **Task-hopping within sessions.** I'll address three bugs and a new feature in the same exchange, often without clear delineation.
5. **Occasional "why" questions** but didn't always retain the technical detail after the session.
6. **Tested in production.** Rarely ran anything locally. Test failures appeared as "the thing doesn't work."
7. **Context window misses.** One session hit the context limit mid-fix, leaving a file in a broken state that required re-reading and resumption.
8. **Strong documentation discipline.** CLAUDE.md, PLAN.md, SESSION_NOTES maintained consistently. The "propose before implement" norm held throughout.

---

## What went well this week

- Shipped a functional, deployed, multi-tenant AI agent app in ~5 days. That is genuinely fast.
- Stayed in my lane — didn't try to debug TypeScript myself; trusted architectural judgments.
- CLAUDE.md discipline: we respected the orientation docs and kept PLAN.md current.
- Real user tests on Day 3 with both a partner and an independent third party — much earlier in the build than typical.
- The phased roadmap held. We didn't build Phase 2 features during Phase 1.

## What was hard

- Debugging loops without detailed error output on my end. The RLS issue took 3 migration attempts before the right abstraction was found.
- The invite flow took 5 commits to get right — each fix revealed the next layer of the problem.
- Visibility into TypeScript errors: pre-existing errors are invisible to me unless flagged.
- Knowing when something is "done" vs "done enough to ship and test" — the line was blurry.
- Context window collapse in a long session left a partially broken file. We recovered, but it was disorienting.

---

## Questions for Claude.ai

### On my performance as a builder/director

1. How effectively am I directing an AI coding collaborator? What's the biggest gap in my approach?
2. Am I at the right level of specificity in my instructions — too vague, too specific, or well-calibrated?
3. What should I be doing differently in a debugging loop when the same thing fails repeatedly? What's the better collaboration pattern?
4. Am I building durable understanding, or just getting things built? How would I tell the difference?
5. What's the highest-leverage change I could make to how I work with Claude Code?

### On the project and process

6. Is the CLAUDE.md + PLAN.md + SESSION_NOTES pattern working well? What's missing or should be changed?
7. We're entering Phase 5–6 work. What should the handoff checklist look like at this point?
8. Where is this project most likely to accumulate technical debt that bites later?
9. We have no automated tests. Is that sustainable, or should we be building a test foundation now?

### On next steps

10. What capability or workflow change would most improve the collaboration going forward?
11. Should I be using subagents yet? When would they help vs. hurt?
12. What would you add to CLAUDE.md to better guide future sessions?
13. How should I prioritize: fix Erin/Dad defects → build Phase 5-C/5-D polish → Phase 6 remaining → Phase 7 QA automation? Is this the right order, or is something out of sequence?

---

## Roadmap at end of week (for context)

**Phase 5 — New User Access & Onboarding:** Invite flow built and tested (5-A done, 5-D partially done). 5-B (blank-state) mostly done. 5-C (Erin full test) in progress with known defects.

**Phase 6 — Interactivity & Visual Layer:** 6-A (drag-and-drop) done. 6-B (3D visual tab) done. 6-C (parsing improvements) done.

**Phase 7 — Agent Evolution & Automated QA:** Not started. Planned: PM Agent, GitHub Actions QA workflow, evolution charter.

**Phase 8 — Polish & Sustainability:** Not started.
