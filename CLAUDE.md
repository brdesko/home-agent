# Home Management Platform — Orientation for Claude

You are helping build the **Home Management Platform** (HMP), a tool for
homeowners to plan and manage everything happening on their property — farm
projects, renovations, maintenance, budgets, timelines. The user is building
it primarily for himself and his partner Erin, for their 5.3-acre property at
5090 Durham Rd, Pipersville, PA. It is designed from day one to work for
other users and properties in the future, but the current sole user is this
household.

Every time you start a session in this repo, read this file first. Then read
`PLAN.md` for the current state of the project and `SESSION_NOTES/` for recent
decisions. If anything seems stale or unclear, ask before assuming.

---

## What the product is

HMP has two layers, both scoped to a single Property at a time:

- **Property Notebook** — structured view of projects, tasks, budgets,
  timelines, assets, and seasonal data for that Property. The state of the
  property.
- **Property Agent** — conversational interface that reads and modifies the
  Notebook on behalf of the owners.

The Notebook is what you see. The Agent is who you talk to. The Notebook is
state; the Agent is the editor of that state.

## The two architectural principles

These are the decisions that everything else follows from.

### 1. Domain-agnostic

A Property hosts many domains — farm planning, kitchen renovation, ongoing
maintenance, guest room updates, a future home gym, whatever comes next. Domains
are not enumerated up front. They are added over time, primarily by the Agent
in response to the owners' conversations.

Therefore the core data model is domain-agnostic. Projects, Tasks, Assets,
BudgetLines, and TimelineEvents are first-class entities scoped to a Property.
A "farm plan" is not a special type of thing in the schema — it is a set of
Projects with Tasks, linked to Assets (barns, garden beds), participating in
the Property's shared Budget and Calendar. A "kitchen renovation" is
structurally the same kind of thing.

Cross-cutting concerns (budget, time, attention) live at the Property level,
not inside any domain. Every domain participates in them.

When tempted to add domain-specific logic to the core, stop and ask: could
this be generalized? If yes, generalize it. Domain-specific content (planting
calendars, tomato varieties, paint-finish comparisons) belongs in seed data or
domain plugins, not in the schema.

### 2. Multi-tenant from day one, sharing UI deferred

The data model is built for many Users and many Properties. A User can be a
member of multiple Properties; a Property can have multiple Users. Row-Level
Security (RLS) is enabled from the very first schema migration.

However, the UI and features for *using* multi-tenancy — property switcher,
invitation flows, public sign-up — are explicitly deferred until much later.
In the current phase, the app shows the user's one Property. No switcher. No
invite button.

This gets the architecture right without paying the product-scope cost now.

## Roles within a Property

Two roles, no more:

- **Owner** — full read/write access to everything, including budgets.
  (The user and Erin are both Owners of the 5090 Durham Rd Property.)
- **Viewer** — read-only access to non-sensitive data. Can see projects,
  tasks, and the timeline. Cannot see budget lines, financial totals, or any
  other data flagged sensitive. (The user's parents are anticipated Viewers
  once sharing is enabled.)

RLS policies enforce these boundaries at the database level, not in
application code. Never rely on UI-level checks for authorization.

## What we are building, in order

- **Phase 1 — The Skeleton.** User and Property scaffolding with RLS. Core
  data model (Project, Task, Asset, BudgetLine, TimelineEvent). Basic
  Notebook UI. Hand-seeded farm plan as the first domain. No Agent yet.
- **Phase 2 — The First Agent Workflow.** Agent with one capability: "add a
  new project to the Notebook" via conversation. Proves the architecture.
- **Phase 3 — The Consultant.** Agent expands to modify existing projects,
  respond to disruptions, suggest proactively, track asset maintenance.

We are currently in Phase 1. Do not build Phase 2 or 3 features unless
explicitly directed. See `PLAN.md` for the active slice.

## Stack

- **Next.js 15** (App Router) — frontend and API routes in one framework
- **Supabase** — Postgres + auth + row-level security
- **TypeScript** throughout
- **Tailwind CSS** for styling
- **shadcn/ui** for component primitives
- **Anthropic API** for the Agent (Phase 2+)
- Deployed to **Vercel**

Rationales in `PLAN.md`. If you want to add a dependency, propose it in chat
first; don't just install it.

## How the user works

- Technically literate (VP of Innovation) but has not shipped production
  React/Node in years. Do not assume fluency with modern JS tooling, npm,
  git internals, or shell specifics.
- On **Windows with PowerShell**. Node CLI tools on Windows often need a
  `cmd /c` wrapper. Watch for this.
- The user wants to learn. When you make a non-obvious choice, explain why
  briefly — as part of the main response, not as an aside.
- When you need information, ask one clarifying question if it would
  meaningfully change what you build. Don't ask three.

## How we work together

- **One slice at a time.** We are working on the active slice in `PLAN.md`.
  Don't jump ahead.
- **Write things down.** When we make a decision, capture it in `PLAN.md` or
  a session note. Do not rely on chat memory across sessions.
- **Session notes.** At the end of each session, append a summary to
  `SESSION_NOTES/YYYY-MM-DD.md` — what we built, what we decided, what's open.
- **Propose before you install or delete.** For new dependencies, schema
  migrations, or deletion of existing files, propose first and wait for
  approval.
- **Commit in logical chunks.** After a working slice of functionality,
  suggest a commit with a clear message.

## Automation, subagents, and tooling — a staged approach

The user has colleagues using agent swarms to compress weeks of development
into days. That is real, but it requires taste the user is still building.
For this project we stage up deliberately rather than starting there.

- **Phase 1 (current):** single session, single agent, user watching. Goal
  is for the user to learn how Claude Code works — how it succeeds, how it
  fails, how to steer it. Do not introduce parallel work or subagents at
  this phase unless explicitly requested.
- **End of Phase 1:** introduce a `reviewer` subagent that audits changes
  against `CLAUDE.md` principles before the user sees them. Single extra
  layer, no parallelism.
- **Phase 2:** introduce specialist subagents for clear role boundaries
  (database, API, UI). Mostly sequential still, but with focused context
  windows.
- **Phase 3+:** parallel subagents for genuinely parallel work (bulk UI,
  tests, refactors). By this point the user can evaluate subagent output
  quickly and redirect when it drifts.

Slash commands are the other productivity lever and have almost pure upside.
Define them in `.claude/commands/` as common workflows emerge. Early
candidates: `/review` (audit against principles), `/session-start` (read
CLAUDE.md, PLAN.md, latest session note, and propose next step),
`/commit-slice` (write a commit message for the current slice against
`PLAN.md`'s active-slice definition).

When the user asks "could subagents speed this up?", evaluate honestly: is
the work actually parallel, or sequential with a dependency chain? Does the
user have enough context to evaluate the output? If the answer to either is
no, say so.

## What this product is NOT

- Not a farm-planning app. Farm planning is the first domain. It is not the
  product.
- Not a CMS or an Airtable clone. The Agent is central, not an add-on.
- Not intended for organizations, teams, or commercial tenants. It is a
  personal tool that happens to be multi-tenant-ready for small-scale
  friend-to-friend sharing.
- Not an on-call product. Reliability standards are "this should work when
  we use it on weekends," not "99.9% uptime." We are not paging anyone.

## Defaults and tone

- Code style: explicit over clever. Readable beats concise.
- UI style: editorial and warm, not generic SaaS. See `PLAN.md` for the
  aesthetic direction.
- Copy in the app: direct, grounded, a bit literary. Never chirpy.
