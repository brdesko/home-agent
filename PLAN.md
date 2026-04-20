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

### Phase 1 — The Skeleton (active)

User and Property scaffolding with RLS. Core domain-agnostic data model.
Basic Notebook UI. Hand-seeded farm plan as the first domain. No Agent.

Goal: prove the abstractions hold when confronted with real content.

**Exit criteria:**
- User can sign in as an Owner of the 5090 Durham Rd Property.
- Erin can sign in as an Owner of the same Property.
- A full farm plan (projects, tasks, budget lines, timeline) is visible in
  the Notebook UI.
- A second domain (e.g., a stub kitchen renovation Project) can be added
  manually via the database with no schema changes.
- RLS policies in place: an imagined second user cannot read this
  Property's data.

### Phase 2 — The First Agent Workflow

Add the Agent with one capability: "add a new project to the Notebook" via
conversation. Target the "home gym in Barn 2" example as the proof.

**Exit criteria:** user says "add a home gym project in Barn 2" in chat;
Agent asks clarifying questions; Agent proposes a Notebook change; user
approves; change commits; Notebook shows the new project wired into the
Property's budget and timeline.

### Phase 3 — The Consultant

Agent gains broader capabilities: modify existing projects, respond to
disruptions, suggest proactively, track assets with predictable maintenance.

Exit criteria defined when we get there.

## Stack

- **Next.js 15** (App Router) — unified frontend and backend, good patterns
  for AI streaming (matters for Phase 2), easy Vercel deploy.
- **Supabase** — Postgres + auth + RLS. Free tier covers personal use.
  RLS matters for getting multi-tenancy right from the start.
- **TypeScript**, **Tailwind**, **shadcn/ui** — standard choices, good
  Claude Code support, large community.
- **Anthropic API** (Phase 2+) — the Agent runs on Claude via the API.
- **Vercel** — hosting. Free tier covers personal use.

## Data model — early draft

### Platform-level

- **User** — an authenticated individual. Owned by Supabase Auth.
- **Property** — a property someone manages. Has an address and a name.
- **PropertyMember** — links a User to a Property with a role
  (`owner` or `viewer`). Many-to-many.

### Property-scoped entities

- **Project** — a bounded effort on a Property. Has a domain tag
  (`farm`, `renovation`, `maintenance`, etc.), status, priority.
- **Task** — a unit of work within a Project. Has an owner (a User who is a
  Property Member), optional due window, status.
- **Asset** — a physical thing on the Property that Projects can depend on
  (barn, greenhouse, garden bed, mower). Has a maintenance profile (Phase 3).
- **BudgetLine** — an expected or actual spend within a Project. Rolls up to
  Property budget. **RLS-sensitive: Owners only.**
- **TimelineEvent** — a dated thing (plant tomatoes, move sheep, start
  renovation). Belongs to a Project or Property. Rolls up to a calendar.
- **Note** — freeform text attached to any other entity.

### Property-level aggregates

- **Budget** — Property-level totals and constraints (income, reserve,
  category caps). **RLS-sensitive: Owners only.**
- **Capacity** — available hours per week, seasonal variation. Projects draw
  against this.

### Domain-specific (farm only, for now)

- **Crop**, **Planting**, **Harvest** — seeded for the farm plan. Scoped to
  the farm domain. Not part of core.

### RLS boundary summary

- Users see only Properties they are a Member of.
- Within a Property, Owners see everything. Viewers see everything except
  anything tagged RLS-sensitive (Budget, BudgetLine, and anything similar
  we add later).
- Only Owners can write.

Schema gets more specific as we implement. This is a sketch.

## Active slice — Phase 2, Slice 1

**Goal:** Add the Agent with one capability: accept a natural-language request
to add a new project, ask clarifying questions, propose the Notebook change,
and commit it on approval. Target example: "add a home gym project in Barn 2."

**Steps:** TBD — to be planned at the start of the next session.

---

## Completed — Phase 1, Slice 1

**Goal:** stand up the project with Next.js, connect Supabase, set up auth
and the `User`/`Property`/`PropertyMember` tables with RLS. Get a simple
authenticated landing page that says "Welcome, [your name]. You are an
Owner of 5090 Durham Rd."

**Steps:**

1. Initialize Next.js 15 project in current directory.
2. Set up Tailwind and shadcn/ui.
3. Create Supabase project (free tier) and connect it.
4. Define `users` (handled by Supabase Auth), `properties`, and
   `property_members` tables with RLS policies.
5. Seed: one Property (5090 Durham Rd), two Users (you, Erin), two
   PropertyMember rows (both Owners).
6. Build basic auth flow — email magic link.
7. Build a minimal landing page that reads the current User's Properties and
   displays them, confirming RLS works.
8. Commit and push to GitHub; deploy to Vercel.

**Not in this slice:** Projects, Tasks, Budget, any UI polish, any farm
content, any Viewer role features.

**Why this slice:** it's deliberately small. It proves the full stack works
end to end (Next.js, Supabase, Auth, RLS, Vercel) before we build on top of
it. If any of these steps reveal a problem, we'd much rather find it now.

**Scope creep watch:** if you find yourself wanting to add Projects or Tasks
"while we're here," stop. Finish this slice cleanly first.

## Open questions

- **Email magic link vs. password.** Magic links are friendlier for a
  two-person household tool and don't require password hygiene. Going with
  magic links unless a reason emerges.
- **How the Agent proposes changes (Phase 2).** Diff-style preview is the
  right pattern. UX variants to be explored later.
- **Design direction.** The v1 artifact used an "agricultural almanac"
  aesthetic (cream paper, serif display font). It suited farm content; needs
  to generalize for renovations and other domains. Revisit when we start
  building real UI beyond the landing page.
- **Where to seed domain content.** Farm-specific seed data (crops, planting
  calendar) — probably a separate migration or a seeded JSON file. Decide
  in Slice 2.
- **Subagent adoption timing.** User's colleagues use parallel subagents for
  dramatic speedup. We're staging adoption deliberately (see `CLAUDE.md` →
  "Automation, subagents, and tooling"). Revisit at end of Phase 1 with
  `reviewer` subagent as first addition.
- **Slash commands to define as patterns emerge.** Candidates:
  `/session-start`, `/review`, `/commit-slice`. Add to `.claude/commands/`
  when we've run the underlying workflow manually enough times to codify
  it.

## Decisions log

- **2026-04-20:** Product named "Home Management Platform" (HMP). Two layers
  per property: "Property Notebook" and "Property Agent." Top-level entities
  are User and Property; Property is the scoping unit for all content.
- **2026-04-20:** Committed to domain-agnostic architecture with farm as
  first seeded domain, rather than enumerating domains upfront.
- **2026-04-20:** Multi-tenant-ready data model from day one with RLS
  enabled; sharing UI (invitations, property switcher) deferred until later
  phase.
- **2026-04-20:** Two roles within a Property: Owner (full access) and
  Viewer (read-only, no budget visibility). User and Erin are both Owners of
  5090 Durham Rd. Parents anticipated as Viewers once sharing ships.
- **2026-04-20:** Stack locked: Next.js 15 + Supabase + TypeScript + Tailwind
  + shadcn/ui + Anthropic API + Vercel.
- **2026-04-20:** Phased roadmap agreed (Skeleton → First Agent Workflow →
  Consultant).
- **2026-04-20:** Staged subagent adoption: single agent in Phase 1, reviewer
  subagent at end of Phase 1, specialists in Phase 2, parallelism in Phase 3+.
