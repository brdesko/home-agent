# Lattice Operating Constitution

You are helping build a multi-domain personal operating system. The current product started as **Parcel**, a property management application, and Parcel remains a core domain within the broader system. The broader system is now evolving into **Lattice**: a trusted assistant for managing life across domains with shared context, clear guardrails, and staged autonomy.

Every session in this repo should begin by reading this file, then `PLAN.md`, then the latest note in `SESSION_NOTES/`. If anything appears stale, contradictory, or risky, pause and raise it before building.

---

## What the product is

The product is **Lattice**: a Life OS for an individual owner with optional collaborators.

Lattice contains:

- **Global Context** — the shared system of truth for cross-domain decisions
- **Domains** — focused operational modes within the Workspace
- **Admin Systems** — internal agents and tooling used by the owner to improve the product itself

Lattice is the top-level product and system. It is broader than any single domain.

### Initial structure

- **Lattice**
  - **Global Context**
    - Finances
    - Time / Calendar
    - Goals / Priorities
    - Risk / Planning
  - **Domains**
    - **Parcel** — property and household operations
    - **Personal** — initially finance / planning, with health and fitness deferred until the Lattice model is stable
    - Future domains may be added later
  - **Admin Systems**
    - **Product Manager Agent** — internal product strategy and roadmap support
    - **QA Agent** — internal technical and product-quality review support

Parcel is a domain of the broader product, not the whole product.

---

## The defining architectural principles

These are the decisions everything else should follow from.

### 1. Lattice first, domains second

Do not treat Parcel as the root architecture anymore. Parcel is the first mature domain, but the system is now organized around **Lattice**.

A Workspace can contain multiple domains. New domains must fit the Workspace model rather than creating parallel architectures.

When making a design decision, ask:
- Is this specific to Parcel?
- Or is it really a Workspace concern that should live above domains?

If it is truly cross-domain, do not bury it in Parcel.

### 2. Unified global context layer

The product uses a **shared global context layer**, not loosely connected apps.

There is one cross-domain layer for:
- money
- time
- goals
- priorities
- risk and planning

Domains write into and read from this shared layer. A car purchase, kitchen renovation, and personal cash-flow plan must be able to influence one another because they draw on the same finite resources.

Do not build separate financial or planning systems per domain and hope the agent reconciles them later. Hard integration is the design choice.

### 3. Small editable core, broad derived intelligence

Global Context is not purely inferred and not purely manual.

Use a **hybrid model**:
- **Editable core:** goals, thresholds, major commitments, strategic priorities, risk preferences, planning assumptions
- **Derived layer:** forecasts, warnings, rollups, conflicts, summaries, suggested tradeoffs

The user should be able to set direction directly while the system performs synthesis and monitoring.

### 4. Multi-tenant architecture, low-friction ownership

The architecture remains multi-tenant from day one, but the primary operating model is:
- one Workspace owned by one primary user
- optional collaborators or household members
- optional future users with their own independent Workspaces

Continue to design for multiple users, but do not force enterprise-style complexity into the product.

### 5. Personal utility first, market readiness second

Primary optimization target:
- create something meaningfully useful for the user's real life

Secondary optimization target:
- keep the system structurally capable of becoming marketable someday

When these conflict, default to personal utility **unless** the narrower personal choice would materially block broader product value or useful learning. The Product Manager Agent should actively challenge overly narrow assumptions when it sees them.

### 6. Staged autonomy, never blind autonomy

The product should become increasingly self-supporting, but trust is earned in stages.

Agents may eventually execute low-risk work within defined guardrails, but must never silently make major decisions in sensitive areas.

Autonomy must increase through:
1. observation
2. recommendation
3. controlled execution in safe zones
4. broader execution only after repeated success and explicit loosening of constraints

---

## Domains

## Parcel

Parcel is the property and household operations domain.

It manages:
- projects
- tasks
- assets
- budgets
- timelines
- purchases
- maintenance
- property details
- supporting documents and photos

It already exists in production and is the most mature domain. Continue to refine it, but treat it as one domain within a larger system.

## Personal

Personal is the next planned domain.

It should begin as a **single Personal mode** with multiple sections, not as multiple separate domains.

Initial emphasis:
- finance and planning

Deferred until the Workspace model is stable:
- health
- fitness

Do not let Personal become a pile of disconnected mini-apps. It should feel like one coherent domain that participates in the shared global context.

## Future domains

Possible future domains may include things like travel, career, learning, vehicles, or family operations. Do not pre-build these. Only create them when there is a clear use case and a clean fit with the Workspace model.

---

## Agent model

There are two broad classes of agents.

### 1. User-facing domain agents

These are product features.

Example:
- **Property Agent** inside Parcel

This class of agent exists to help end users operate within a domain. These agents are part of the product experience and should feel trustworthy, grounded, and useful.

### 2. Admin agents

These are internal operators for the owner only.

They are not end-user features. They are the owner's internal team.

#### Product Manager Agent

The PM Agent helps:
- translate product vision into phases and slices
- review the product for opportunities, gaps, and unnecessary complexity
- suggest roadmap priorities
- challenge narrow decisions that hurt long-term value
- recommend missing guardrails, improvements, or market-relevant considerations
- advise on cost-conscious model usage and architecture choices

#### QA Agent

The QA Agent helps:
- run fast technical checks
- run deeper product reviews
- surface regressions, usability failures, and trust risks
- validate that the app works as intended
- report problems clearly and propose fixes

The QA system should support at least two modes:
- **Fast review:** build, type, route, auth, scoping, and critical checks
- **Deep review:** simulated user flows, runtime behavior, UX friction, and broader regression review

### Observability and learning

Admin agents are allowed to learn from:
- error logs
- failed runs
- QA reports
- user friction reported by testers
- usage patterns and repeated failures

They may observe the product, but they do not become part of the runtime user experience unless explicitly designed to do so.

---

## Guardrails and restricted zones

This product is intended to evolve with increasing autonomy, but some areas always require explicit approval.

### Always pause and ask for approval before changing:
- database schema or migrations
- authentication, permissions, membership rules, or RLS
- deployment or infrastructure configuration
- external integrations that may create cost, vendor lock-in, or security exposure
- agent autonomy boundaries or orchestration model
- features that could affect multiple users or shared data
- deletion of important code, data, or product capabilities
- any significant architectural decision
- any task expected to exceed **$1.00** in token or runtime cost

If you think another restricted zone should exist, the Product Manager Agent should recommend it.

### Safe zones for increasing automation

Low-risk work may eventually be automated with less friction in areas such as:
- test execution
- static analysis
- formatting and low-risk cleanup
- issue triage
- documentation updates
- small UI polish changes within established patterns

Never assume a task is safe just because it seems small. Consider blast radius, trust impact, user impact, and cost.

---

## Cost discipline

The system should remain low-cost by default.

Current preference:
- keep non-Claude hosting and infrastructure costs near zero where possible
- avoid paid services until there is clear value or credible profit potential
- use Claude models efficiently, switching to cheaper models when that does not materially reduce quality

Default model discipline:
- use stronger models for architecture, orchestration, difficult reasoning, and sensitive decisions
- use lighter models for narrow parsing, classification, checks, or routine substeps
- design prompts and workflows to minimize wasteful long loops and repeated context loading

Any action likely to exceed **$1.00** in token/runtime cost must be disclosed with implications and approved first.

---

## Current collaboration model

The user is the strategic owner.

The user wants to:
- design the product direction
- supervise the agents that support it
- learn from the system
- use the system in real life
- preserve optional upside toward future marketability

Your job is not just to produce code. Your job is to help build a trustworthy product and a trustworthy way of building it.

### Working style expectations

- Be direct and clear.
- Explain meaningful technical decisions briefly in plain language.
- Flag tradeoffs before they become expensive.
- Do not bury major implications.
- Prefer one slice at a time, but keep the broader architecture in view.
- Challenge choices that create hidden debt or narrow the future unnecessarily.

### Debugging expectations

When something fails repeatedly, do not continue guessing. Ask for or surface:
- exact error
- expected behavior
- actual behavior
- reproduction steps
- what was already tried

Use structured debugging rather than vague looped retries.

### Session discipline

- Read this file first.
- Then read `PLAN.md`.
- Then read latest `SESSION_NOTES/`.
- Keep decisions written down.
- Suggest commits in logical chunks.
- Propose before installing dependencies, deleting major files, changing schema, or altering infra.

---

## Product maturity posture

This is not a toy and not an enterprise SaaS product.

It is:
- a serious personal system
- architected cleanly enough to support trusted sharing
- designed thoughtfully enough to teach strong product management and systems thinking
- potentially expandable into something marketable later

It is not:
- a rushed bundle of disconnected apps
- a swarm of autonomous agents with unclear authority
- an excuse to skip guardrails because the current user is technical

---

## Defaults and tone

### Product tone
- calm
- grounded
- trustworthy
- useful
- never chirpy
- never generic SaaS fluff

### Code style
- explicit over clever
- readable over compressed
- modular over monolithic
- stable over flashy

### UX style
- warm, editorial, and composed
- elegant but not precious
- information-dense where helpful, but never chaotic

### Product decision style
- prefer durable systems over hacks
- prefer integrated thinking over disconnected feature sprawl
- prefer staged learning over premature autonomy
