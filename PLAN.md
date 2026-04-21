# Home Management Platform — Plan

Living document. Updated as we learn. Last touched: 2026-04-21.

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

---

## Phased roadmap

### Phase 5 — New User Access & Onboarding (planned — after Phase 6)

Enable a real second user to receive an invite, create an account with
credentials, log in to an empty property, and be guided through setup by the
Agent — with no manual intervention from the owner.

**Exit criteria (hard):** Two successful end-to-end tests:
1. Erin uses the shared account at a known URL, logs in, and can view and
   interact with the existing property.
2. A second independent tester (friend or parent) receives an invite, creates
   their own account, logs into a blank notebook, and uses the Agent to create
   their first property and at least one project.

**Slices:**

**5-A: Invite flow**
- Owner can generate an invite link from within the app (or a simple admin
  page) that creates a Supabase auth invitation email
- Invited user clicks link → lands on an account-creation page (set password)
- On first login, user is a member of no properties

**5-B: Blank-state onboarding**
- When a user has no active properties, the Agent greets them with a guided
  onboarding flow: name your property, provide an address or Zillow/Redfin URL,
  set a first goal
- Agent creates the property record, sets the cookie, and redirects to the
  Notebook — no manual DB work required

**5-C: Erin test**
- Walk Erin through the existing login at the Vercel URL
- Confirm she can view the property, interact with tasks, and use the Agent
- Fix any friction discovered

**5-D: Independent tester test**
- Invite a friend or parent via the new invite flow
- Observe or debrief — note every point of confusion
- Fix blocking issues before Phase 8

---

### Phase 6 — Interactivity & Visual Layer (active)

Make the Notebook more dynamic and visually rich.

**Slices:**

**6-A: Drag-and-drop scheduling**
- Projects can be dragged between quarters on the Budget or Timeline tab
- Dragging updates the project's target quarter (new field or existing)
- Optionally: dragging a project onto the Calendar view creates or updates
  a CalendarEvent for that project's date range

**6-B: Visual tab**
- Property map view: satellite image or uploaded floor plan as backdrop
- Zones / areas annotated on the map (garden, barn, driveway, etc.)
- Assets and projects linkable to a zone
- Clicking a zone shows linked projects and assets

**6-C: Parsing improvements**
- Improve Agent's Zillow/Redfin parsing (consider Firecrawl integration if
  the manual-paste fallback remains too rough)
- Better extraction of year built, sq footage, lot size from listing text
- Confidence scoring: Agent flags fields it isn't sure about before writing

---

### Phase 7 — Agent Evolution & Autonomous QA

Elevate the Agent from a reactive tool to an ongoing product intelligence layer,
and establish a real automated QA cadence.

**Slices:**

**7-A: PM Agent**
- A persistent "Product Manager" agent that knows the project's goals,
  architectural principles (from CLAUDE.md), and current roadmap (from PLAN.md)
- Runs on demand or on a schedule; reads recent session notes and QA reports
- Produces a prioritized improvement log with specific, actionable suggestions
- Can optionally open GitHub issues for flagged items

**7-B: QA Agent (automated)**
- Implemented as a **GitHub Actions scheduled workflow** (not a Claude Code
  session cron — see decision log) running nightly or on push to main
- Checks: TypeScript build clean, RLS policy gaps, broken API routes, UI
  flow smoke tests, property-scoping correctness
- Output: `QA_REPORTS/YYYY-MM-DD.md` committed to the repo (or as a PR
  artifact), flagging any regressions
- PM Agent reads QA reports as part of its context

**7-C: Goals and evolution principles**
- Define the evolution charter for the PM Agent: what this product should
  and should not become, quality bar, aesthetic direction, non-negotiables
- Stored as a document the PM Agent reads on every run
- First draft written collaboratively in session, then owned by the user

---

### Phase 8 — Polish, Final QA & Sustainability

Bring the product to a state that is pleasant to hand to a new user and
sustainable to maintain long-term with minimal session overhead.

**Slices:**

**8-A: Pizazz & usability pass**
- Final round of UI polish: spacing, transitions, empty states, loading states
- Maneuverability improvements: keyboard shortcuts, tab URL state (browser
  back works), deep links to specific projects
- Any remaining rough edges surfaced during Phases 5-7 testing

**8-B: Final QA run**
- Full QA Agent run against the production deployment
- PM Agent produces a final improvement log
- Any blocking issues fixed before distribution

**8-C: Tester distribution**
- Invite one friend or parent (independent of the Erin test) to use the app
  for a real project on their own property
- Observe or debrief — document friction
- Decide what (if anything) to fix before calling it stable

**8-D: Sustainability mode**
- Define what "maintenance" looks like: how often to run a QA pass, how to
  handle Supabase/Vercel/Anthropic API changes, how to onboard future testers
- Archive completed phases in this document, keep roadmap current
- Hand off to PM Agent as the ongoing steward of the improvement backlog

---

### Phase 4 — Aesthetics, Maneuverability & Access ✓ Complete

Polished the product for real daily use, extended access, and deployed to Vercel.

**Built:**
- Redesigned login page: split-screen brand panel with topographic SVG,
  "Parcel" wordmark in Playfair Display, warm-white form panel
- Property archive and switch: archive button (owner-only, only when >1
  property), cookie-based property switching, archived recovery UI
- Notebook header redesigned: property name, active project count, open tasks,
  current quarter + budgeted amount
- AutoRefresh on window focus (keeps Notebook current without manual reload)
- Calendar tab with CalendarEvent CRUD
- Purchases tab with Purchase CRUD
- Ongoing tasks / To-Do tab restructure (Suggested / Ongoing / Project badges)
- Agent: parse_listing, update_property_details, create_asset tools
- Agent: onboarding system prompt rewrite (directive about Zillow/Redfin parsing)
- Agent: parse API (sub-call to Haiku for structured extraction)
- Property scoping fixed on all server pages (home-details, references,
  purchases all now respect the cookie-selected property)
- Layout: archived properties filtered from property switcher
- Budget line fields unified (estimated_amount, actual_amount)
- Weather integration in Suggestions (OpenWeatherMap 5-day forecast)
- Multiple TypeScript build errors resolved; clean build on Vercel

**Migrations shipped:** 022–025 (approx)

---

### Phase 3 — The Consultant ✓ Complete

Agent gained broader capabilities and the Notebook became fully interactive.

**Built:**
- Interactive task status cycling in the Notebook UI
- Agent can modify existing projects, tasks, goals, and budgets
- Goals layer with named goals, priority hierarchy, rank badges
- Budget model unified (estimated + actual per line item)
- Parent project relationships
- Project archive view (Active / Completed / Cancelled tabs)
- Historical project entry form
- To-Do restructure: unified timeline list with category badges and filters
- Ongoing tasks table
- Home Details page with Details, Documents, Assets, Photos tabs
- Agent document parsing with confirmation modal
- Suggestions API with property details + asset inventory context

**Migrations shipped:** 011–021

---

### Phase 2 — The First Agent Workflow ✓ Complete

Agent with add-project capability. Deployed to Vercel.

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
- **CalendarEvent** — title, start_date, end_date, type, notes
- **Purchase** — item_name, vendor, price, purchased_at, project_id, category, notes

### Storage
- **Home Agent** bucket — documents at `{property_id}/{filename}`, signed URLs

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
  and actual_amount.
- **2026-04-20:** Document parsing uses Claude's native PDF/image reading +
  a paste-text fallback. Firecrawl parked for later.
- **2026-04-21:** Product name finalized as "Parcel."
- **2026-04-21:** Automated QA to be implemented as GitHub Actions scheduled
  workflow, not Claude Code session cron — session crons are lost when context
  limit is hit, even if terminal stays open.
- **2026-04-21:** PM Agent and QA Agent scoped to Phase 7; evolution charter
  to be written collaboratively and stored as a document the PM Agent reads.
