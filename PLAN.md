# Lattice Product Plan

Living document. Updated for the transition from Parcel-as-product to Lattice-as-product. Last touched: 2026-04-24.

---

## What we're building

We are building **Lattice**: a trusted, multi-domain personal operating system that helps a user stay organized, realistic, balanced, and proactive across life domains.

The system began as **Parcel**, a property management app. Parcel remains a core domain, but the broader product now expands above it.

Lattice contains:
- **Global Context** — shared finances, time, goals, and planning/risk context
- **Domains** — operational modes like Parcel and Personal
- **Admin systems** — internal PM and QA agents used by the owner to improve the product itself

The defining bet is no longer just integration within property management. It is **integration across life domains** through a shared system of truth.

---

## Product principles

1. **Lattice first.** Parcel is a domain, not the whole product.
2. **Unified global context.** Financial, temporal, and planning decisions should be made against a shared cross-domain layer.
3. **Personal value first, market awareness second.** The product should improve the user's real life while staying structurally capable of broader value.
4. **Staged autonomy.** Agents earn trust through bounded execution, not open-ended authority.
5. **Low-cost by default.** Keep infrastructure lean and use model capability intentionally.
6. **Stability before expansion.** New domains and advanced autonomy should not be layered onto an unstable core.

---

## Current state

### What already exists

Parcel is live and meaningfully functional.

Built and working at a meaningful level:
- projects, tasks, goals, budgets, timelines, purchases, references, assets
- property details and documents
- property agent with multiple tools
- multi-property / multi-user-ready architecture with RLS
- onboarding for a new independent user
- deployed production environment

This product has already proven that the concept is valuable in real use. See prior summary and recent notes for detailed implementation history.

### Known reality

Phases A and B are complete. Parcel has been stabilized, hardened, and given a QA backbone. A substantial refinement pass (visual system, room tracking, agent tool improvements, UI polish) was completed as bridging work between stabilization and Lattice development.

Phase C is active. C1 and C2 are complete.

**C1 complete (2026-04-25):**
- `lattices` table introduced (1:1 with user, owner_id unique)
- `lattice_id` FK added to `properties` (nullable, backward compatible)
- `member_role.viewer` renamed to `member_role.member`
- `lib/get-lattice-id.ts` added
- Properties POST auto-creates Lattice on first property creation
- Migration 028 run in Supabase

**Lattice user model (locked 2026-04-25):**
- Lattice is strictly 1:1 with a user — private, not shared
- Two roles in the system: `owner` (Lattice owner, full admin) and `member` (Parcel collaborator, full edit in Parcel only)
- Parcel members go directly to the Parcel on login; they do not see the owner's Lattice
- Parcel members may also have their own Lattice independently

**C2 complete (2026-04-25):**
- `global_context` table: one row per Lattice (upserted), JSONB fields for goals, planning_assumptions, risk_preferences, thresholds
- `global_commitments` table: structured rows with recurrence_type (one_time/annual/monthly/quarterly), domain check constraint (parcel/personal/null), target_year/quarter, owner-only RLS
- API routes: GET/PATCH /api/global-context, GET/POST /api/global-commitments, PATCH/DELETE /api/global-commitments/[id]
- Migration 029 run in Supabase

**Zone/Space model (locked 2026-04-25 — Parcel Z, builds after C2):**
- "Rooms" concept renamed to "Spaces" (UI and eventual DB rename)
- Zones become a proper DB table (currently JSONB in site_config) — required for FK linkage
- Projects, tasks, assets, and ongoing tasks all get nullable zone_id + space_id FKs
- Project linkage is hierarchical: pinned to Space, Zone, or Property
- Completion % is bottom-up only: space items → zone %, zone items → property %; property-level items do not pull down zone/space %
- OngoingTask gets an `ongoing_task_instances` table (one row per task per year) for annual cycle tracking; tasks only count toward completion % when in their active window

Outstanding Parcel items tracked as deferred WARNs:
- Hardcoded owner names in welcome page and system prompt — Phase E (multi-tenancy)
- Visual tab continual improvement — parked, revisit when Lattice is stable
- Existing production properties have `lattice_id = null` — Brady's Lattice auto-creates on next property creation, or C4 shell handles bootstrap

**Parcel Z next (before C3):** Zone-to-table migration, spaces rename, zone_id/space_id linkage on projects/tasks/assets/ongoing tasks, ongoing_task_instances table.

---

## Roadmap overview

### Phase A — Parcel Stabilization & Hardening (complete)

Objective:
Make Parcel reliable, reviewable, and easier to evolve before adding major new architecture.

Why now:
The fastest path to a strong Workspace is to stabilize the mature domain first rather than layering complexity onto moving ground.

#### A1. Defect triage and resolution
- gather and write down Erin and Dad defects clearly
- reproduce each defect with steps, expected behavior, and actual behavior
- resolve blockers first, then friction points
- close or defer each item explicitly

#### A2. Route and codebase hardening
- break large monolithic routes, especially agent-heavy files, into modules
- enforce property/workspace scoping patterns consistently
- reduce hidden coupling between UI, API, and tool logic

#### A3. Technical guardrails
- add stronger validation around critical routes and tool inputs
- review sensitive flows for blast radius
- ensure restricted-zone rules are documented and followed

#### A4. Baseline observability
- establish logging and failure capture sufficient for debugging and admin review
- define what gets recorded from runtime failures, agent errors, and user friction
- create a lightweight issue and review cadence

**Exit criteria:**
- critical reported defects resolved or intentionally deferred with rationale
- major agent monolith split to a maintainable structure
- core runtime failures are observable
- Parcel feels stable enough to confidently use and demo

---

### Phase B — QA Foundation (complete)

Objective:
Create a real QA backbone before introducing admin-agent-led product evolution.

Why now:
A QA agent without a good test and observability base becomes a narrator, not a useful operator.

#### B1. Fast review path
Implement a quick technical review mode that can be triggered frequently.

Checks should include:
- build / typecheck
- lint or equivalent static review
- critical route verification
- auth and permissions checks
- scoping correctness checks
- key runtime smoke checks

#### B2. Deep review path
Implement a slower, richer review mode for broader quality validation.

Checks should include:
- simulated user flows
- onboarding review
- property / domain workflows
- key user-facing agent flows
- UX and trust issues surfaced through realistic usage

#### B3. QA reporting
- define report format for fast and deep reviews
- store reports in-repo or in a durable review location
- ensure reports are readable by both the user and future PM/QA agents

**Exit criteria:**
- fast QA run is easy to trigger and trustworthy
- deep QA run exists, even if still limited in scope
- QA reports produce actionable output rather than noise

---

### Phase C — Lattice/Workspace Core Architecture (active)

Objective:
Build the Lattice layer above Parcel — workspace entity, shared Global Context, and the structural foundation that all domains and admin systems will build on.

Why now:
Admin agents belong at the Lattice layer, not inside Parcel. Building the workspace first means every subsequent layer — agents, Personal domain, autonomy expansion — lands in the right place from the start.

#### C1. Introduce Workspace as top-level unit
- define Workspace entity and membership semantics
- preserve full compatibility with existing Parcel/property structures
- model primary owner plus optional collaborators
- Parcel becomes a domain within the Workspace, not a standalone product

#### C2. Introduce Global Context foundation
Build the first version of the shared cross-domain layer.

Initial editable core:
- major goals and strategic priorities
- planning assumptions and risk preferences
- major financial commitments
- thresholds / spending targets

Initial derived layer:
- budget rollups across domains
- conflict detection between commitments
- planning and risk flags
- upcoming pressure points

#### C3. Shared planning model
- define how domains publish into finances, time, and goal systems
- avoid duplicating cross-domain planning structures inside individual domains

#### C4. Lattice shell and navigation
- top-level product navigation (Workspace switcher, domain switcher)
- Lattice home / Global Context view
- visual identity and information architecture that reflects the full product, not just Parcel

**Exit criteria:**
- Workspace exists conceptually and technically above Parcel
- Global Context can support cross-domain reasoning in a real, not hand-wavy, way
- the product feels like Lattice with Parcel inside it, not Parcel with extra tabs

---

### Phase D — Admin Agents + Panel (Lattice-layer)

Objective:
Introduce the internal team — PM Agent, QA Agent, and admin dashboard — built as Lattice-level infrastructure, not domain-level tooling.

Why here:
Admin agents need visibility across the full system to be useful. Building them before the Lattice layer exists would mean building them in the wrong place. They belong above domains, not inside one.

#### D1. Product Manager Agent v1
Responsibilities:
- read vision, constraints, roadmap, session notes, and QA reports
- identify gaps, debt, opportunities, and sequencing risks
- recommend missing restricted zones or guardrails
- propose roadmap slices and priorities
- challenge decisions that optimize too narrowly for current use if broader value is being lost
- recommend cost-conscious model routing and workflow improvements

#### D2. QA Agent v1
Responsibilities:
- run or coordinate fast review mode (already exists as /qa slash command)
- run deeper product-quality reviews
- summarize regressions and trust issues across the full system
- recommend targeted fixes and escalate risks clearly

#### D3. Admin dashboard foundation
- simple internal surface for invoking PM and QA workflows
- owner-only, clearly separated from user-facing product
- plain and operational, not over-designed

**Exit criteria:**
- PM Agent produces useful prioritization rather than generic advice
- QA Agent helps surface real regressions across domains efficiently
- owner can use both as an internal team with clear authority and boundaries

---

### Phase E — Personal Domain v1

Objective:
Launch the first non-Parcel domain inside the Workspace.

Scope choice:
Personal begins as **one domain** with multiple sections. It does not begin as separate finance, health, and fitness apps.

#### F1. Personal foundation
- create Personal mode entry and information architecture
- keep experience coherent with Parcel but not visually identical by force

#### F2. Finance / planning first
Initial focus:
- financial planning
- commitments and discretionary decisions
- cross-domain tradeoff awareness

Examples of intended value:
- warn when a purchase conflicts with other planned obligations
- surface mismatches between goals and actual choices
- support better timing and prioritization

#### F3. Defer health and fitness
- design for them, do not fully build them yet
- only add after Personal finance/planning proves useful and the Workspace model holds

**Exit criteria:**
- Personal provides meaningful value as a domain
- cross-domain reasoning between Personal and Parcel is demonstrably useful

---

### Phase F — Controlled Autonomy Expansion

Objective:
Increase system self-support within explicit trust boundaries.

#### G1. Safe-zone execution
Allow agents to act with less friction in approved low-risk zones such as:
- test execution
- reporting
- issue triage
- documentation updates
- constrained cleanup

#### G2. Approval-aware workflows
- ensure agents pause automatically for restricted-zone work
- disclose cost, blast radius, and implications before proceeding

#### G3. Trust calibration
- define what evidence is required before autonomy expands
- revisit safe zones based on observed success, not optimism

**Exit criteria:**
- agents are materially reducing manual overhead without surprising the owner
- trust is increasing because behavior is predictable, not because the system is bold

---

### Phase G — Broader Domain Expansion and Optional Market Lens

Objective:
Expand only where value is real and architecture is ready.

Possible future tracks:
- health and fitness within Personal
- travel, career, vehicles, or learning domains
- limited trusted sharing with friends/family
- optional market-readiness analysis and selective hardening

Rules:
- do not expand just because the architecture could support it
- do not overfit to a commercial story if it harms actual usefulness
- do not let a narrow current-use definition stop the product from becoming more broadly valuable

---

## QA model

Two QA depths are intentionally supported.

### Fast review
Use frequently.

Focus:
- technical correctness
- build health
- route health
- scoping and auth correctness
- critical smoke checks

### Deep review
Use periodically.

Focus:
- simulated real user flows
- onboarding and core task completion
- product trust and usability
- user-facing agent quality
- regressions that technical checks alone miss

---

## Agent model

### User-facing
- Parcel / Property Agent
- future Personal agent(s) as needed

### Admin-facing
- Product Manager Agent
- QA Agent

The admin agents are part of the owner's operating system for product development, not part of the user-facing feature set.

---

## Stack

- **Next.js 15** (App Router) — unified frontend and backend
- **Supabase** — Postgres + Auth + RLS. Free tier covers personal use.
- **TypeScript**, **Tailwind**, **shadcn/ui**
- **Anthropic API** — Agent runs on Claude Sonnet 4.6, sub-calls on Haiku 4.5
- **Vercel** — hosting

---

## Data model — current state (Parcel domain)

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

---

## Cost discipline

Current operating preference:
- keep hosting/infrastructure free or near-free where reasonable
- add paid components only when value clearly justifies them
- keep model use efficient through task routing and bounded context

Hard rule:
- any task likely to exceed **$1.00** in token/runtime cost requires disclosure and approval first

---

## Open strategic questions to keep live

These should remain visible as the product evolves:
- what should the top-level branded product name become?
- when is the Workspace architecture mature enough to support more domains?
- when should health and fitness become active parts of Personal?
- what evidence should justify loosening autonomy constraints?
- what should remain personal-first versus intentionally generalized?
- when, if ever, is broader distribution worth the additional support burden?

---

## Decisions log

- **2026-04-20:** Domain-agnostic architecture; farm as first seeded domain.
- **2026-04-20:** Multi-tenant-ready with RLS; sharing UI deferred.
- **2026-04-20:** Two roles: Owner (full) and Viewer (read-only, no budget).
- **2026-04-20:** Stack locked: Next.js 15 + Supabase + TypeScript + Tailwind + shadcn/ui + Anthropic API + Vercel.
- **2026-04-20:** Budget lines unified to single rows with estimated_amount and actual_amount.
- **2026-04-20:** Document parsing uses Claude's native PDF/image reading + a paste-text fallback.
- **2026-04-21:** Product name finalized as "Parcel."
- **2026-04-21:** Automated QA to be implemented as GitHub Actions scheduled workflow, not Claude Code session cron.
- **2026-04-21:** PM Agent and QA Agent scoped to Phase C; evolution charter to be written collaboratively.
- **2026-04-22:** Product expanded to "Lattice" — Parcel becomes a domain within a broader Life OS. CLAUDE.md and PLAN.md replaced with Lattice versions. Active work: Phase A (Parcel stabilization).
- **2026-04-24:** Roadmap resequenced. Admin agents moved to after Lattice framework (Phase D, not Phase C). Rationale: admin agents belong at the Lattice layer — building them before the workspace exists would put them in the wrong place. New active phase: C (Lattice/Workspace Core Architecture).
