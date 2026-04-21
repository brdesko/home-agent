# Home Management Platform — Plan

Living document. Updated as we learn. Last touched: 2026-04-20.

---

## What we're building

The **Home Management Platform (HMP)** is a tool for homeowners to plan and
manage everything happening on a property — farm projects, renovations,
maintenance, budgets, timelines. Each property in the system has two layers:

- **Property Notebook** — structured view of projects, tasks, budgets,
  timelines, assets.
- **Property Agent** — conversational interface that reads and modifies the
  Notebook.

The product's defining bet: the *integration across domains* is more valuable
than any single domain view. A farm plan that can't see the kitchen budget is
worse than no farm plan at all.

Initial deployment is a single household (user + Erin at 5090 Durham Rd), but
the architecture is multi-tenant from day one. See `CLAUDE.md` for the two
governing architectural principles.

## Phased roadmap

### Phase 4 — Aesthetics, Maneuverability & Access (active)

Polish the product for real daily use: UI feel, navigation, creating new
content from the UI directly, and extending access to Erin.

**Themes:**

**1. UI aesthetics and polish**
- Consistent typographic hierarchy and spacing
- Color and tone aligned with "editorial and warm, not generic SaaS"
- Mobile-responsive layouts (currently desktop-first)
- Empty states, loading states, error states that feel considered

**2. Maneuverability**
- Create new projects directly from Project Management UI (not agent-only)
- Create new tasks directly from project slide-over
- Quick-add ongoing tasks from To-Do tab
- Keyboard shortcuts for common actions
- Deep links / URL state for tabs so browser back works correctly

**3. New project from scratch practice**
- Use the full product to add a real new project end-to-end
- Identify friction points and fix them
- Validate the Agent's create/modify flow against a live project

**4. Extending access**
- Confirm Erin's account is set up and has Owner access
- Verify RLS enforcement (a second browser session sees the same data)
- Plan Viewer access pattern for parents (read-only, no budget)

**5. Overnight QA & improvement agent**
An autonomous agent that runs while you sleep, acts as a QA engineer and
product reviewer, and leaves a morning report. Two outputs:
- **QA report** — `QA_REPORTS/YYYY-MM-DD.md`: broken flows, type errors,
  edge cases, RLS gaps, API error handling gaps, UI inconsistencies found
- **Improvement log** — suggested fixes and enhancements ranked by impact,
  written as actionable change descriptions
- **Optional v2 branch** — agent applies straightforward fixes to a git
  worktree and opens a draft PR; user reviews and merges or discards

Implementation approach:
- Claude Code CLI running in non-interactive mode via a script or Windows
  Task Scheduler job
- Uses worktree isolation so in-progress fixes don't touch the working tree
- Report and branch link left for morning review
- Scope of each run configurable (QA-only vs. QA + fixes)

This replaces the manual reviewer subagent planned in CLAUDE.md and extends
it to run autonomously rather than on-demand.

**Parking lot (known deferred items):**
- Firecrawl URL crawling — proper JS-rendered scraping for Zillow/Redfin
  with screenshot support. Needs `FIRECRAWL_API_KEY` from firecrawl.dev.
- Hardcoded `PROPERTY_ID` — must become a per-user lookup before
  multi-property or sharing features ship
- Visual/zones — satellite + floor plan property map, zone-to-asset linking
- Onboarding wizard — new user links a Zillow/Redfin URL, agent parses it
  and asks for a first goal

---

### Phase 3 — The Consultant ✓ Complete

Agent gained broader capabilities and the Notebook became fully interactive.

**Built:**
- Interactive task status cycling in the Notebook UI (click to advance)
- Agent can modify existing projects, tasks, goals, and budgets
- Goals layer with named goals, priority hierarchy (drag to reorder), rank badges
- Budget model unified (estimated + actual per line item; target_budget on projects and goals)
- Parent project relationships (design budget flows into renovation estimate)
- Project archive view (Active / Completed / Cancelled tabs)
- Historical project entry form ("Add past project")
- To-Do restructure: unified timeline list (This Week / Rest of Quarter),
  three category badges (Suggested / Ongoing / Project), task expansion with
  Go to project, Add cost line, Ask Agent actions; category filter; progress bars
- Ongoing tasks table (recurring seasonal tasks, separate from project tasks)
- Home Details page (/home-details) with four tabs:
  - Details — editable property fields (acreage, year built, sq footage, heating, well/septic)
  - Documents — Supabase Storage file management with signed URLs
  - Assets — full CRUD (make, model, serial, install date, last serviced, location)
  - Photos — stub (deferred)
- Agent document parsing — upload a PDF or paste text → agent extracts
  property details, assets, and suggested projects with tasks → confirmation
  modal with per-item checkboxes before any writes
- Suggestions API enhanced with property details + asset inventory context

**Migrations shipped:** 011–021

---

### Phase 2 — The First Agent Workflow ✓ Complete

Agent with add-project capability, including tasks, budget lines, and
timeline events. Deployed to Vercel.

---

### Phase 1 — The Skeleton ✓ Complete

User and Property scaffolding with RLS. Core domain-agnostic data model.
Basic Notebook UI. Hand-seeded farm plan. Auth via magic link.

**Migrations shipped:** 001–010

---

## Stack

- **Next.js 15** (App Router) — unified frontend and backend
- **Supabase** — Postgres + auth + RLS. Free tier covers personal use.
- **TypeScript**, **Tailwind**, **shadcn/ui**
- **Anthropic API** — Agent runs on Claude Sonnet 4.6
- **Vercel** — hosting

## Data model — current state

### Platform-level
- **User** — Supabase Auth
- **Property** — address, name, detail fields (acreage, year_built, sq_footage, heat_type, well_septic, details_notes)
- **PropertyMember** — User ↔ Property with role (owner | viewer)

### Property-scoped
- **Project** — domain, status, priority, target_budget, actual_spend, parent_project_id, goal_id
- **Task** — title, status, due_date, project_id
- **Asset** — name, asset_type, make, model, serial_number, install_date, last_serviced_at, location, notes
- **BudgetLine** — description, estimated_amount, actual_amount, project_id (owner-only)
- **TimelineEvent** — title, event_date, project_id
- **Goal** — name, description, target_budget, sort_order (drag-ordered priority)
- **QuarterlyBudget** — year, quarter, allocated, notes (owner-only)
- **OngoingTask** — title, description, recurrence, active_months[]
- **SavedReference** — title, url, notes
- **CalendarEvent** — title, start_date, end_date, type (vacation/holiday/busy/sale_window/other), notes
- **Purchase** — item_name, vendor, price, purchased_at, project_id (nullable), category, notes

### Storage
- **Home Agent** bucket — documents at `{property_id}/{filename}`, signed URLs for access

## Decisions log

- **2026-04-20:** Product named "Home Management Platform" (HMP). Two layers
  per property: "Property Notebook" and "Property Agent."
- **2026-04-20:** Domain-agnostic architecture; farm as first seeded domain.
- **2026-04-20:** Multi-tenant-ready with RLS; sharing UI deferred.
- **2026-04-20:** Two roles: Owner (full) and Viewer (read-only, no budget).
- **2026-04-20:** Stack locked: Next.js 15 + Supabase + TypeScript + Tailwind
  + shadcn/ui + Anthropic API + Vercel.
- **2026-04-20:** Staged subagent adoption — single agent through Phase 3,
  revisit in Phase 4.
- **2026-04-20:** Budget lines unified to single rows with estimated_amount
  and actual_amount (replacing separate estimated/actual row types).
- **2026-04-20:** Document parsing uses Claude's native PDF/image reading +
  a paste-text fallback for JS-rendered sites (Zillow/Redfin block scraping).
  Firecrawl parked for later.
