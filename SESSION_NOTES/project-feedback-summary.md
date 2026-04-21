# Parcel — Project & Collaboration Feedback Request

I am building a personal home management platform called **Parcel** with Claude Code as my primary development collaborator. I'd like your honest, specific feedback on my performance as a user/builder — not on the product, but on me: how I'm working, what I could do better, and how to get more out of AI-assisted development. Be direct and candid.

---

## About me

- **Role:** VP of Innovation at a large company. Technically literate but haven't shipped production React/Node in several years.
- **Platform:** Windows 11 / PowerShell. New to modern JS tooling (npm, Next.js App Router, Supabase RLS).
- **Goal:** Build a real personal tool, learn how to direct AI-assisted development, and evaluate this workflow for potential use in my professional context.

---

## What we built (overview)

A full-stack web app over several multi-hour sessions:

- **Stack:** Next.js 15 (App Router), Supabase (Postgres + Auth + RLS), TypeScript, Tailwind CSS, Anthropic API
- **Core product:** A property notebook (projects, tasks, budgets, timelines, goals) plus a conversational AI agent that reads and modifies the notebook
- **Auth and multi-tenancy:** Cookie-based property switching, RLS enforcement at the database level, service-role admin client for bootstrap operations
- **Agent tools:** 18+ tools (create_project, create_goal, parse_listing, update_property_details, create_asset, log_purchase, etc.)
- **Onboarding:** Empty-state detection, agent-guided setup for new properties, URL/text parsing of property listings
- **Deployment:** Vercel

---

## Session arc (what happened across sessions)

### Session 1 — Scaffold
Set up Next.js + Supabase with auth, RLS, core schema. Hand-seeded a farm plan. Basic Notebook UI.

### Session 2–3 — Agent
Built the conversational agent: Anthropic API, streaming-style tool use loop, 10+ tools. System prompt with context injection. Connected to Supabase data.

### Session 4 — Property management + Phase 8a
- Archive/cancel for projects (discovered missing `doArchive` function, fixed)
- Real-time optimistic archive without page refresh
- Property dropdown with New Property creation
- Resolved hardcoded PROPERTY_ID across ~14 API routes (replaced with cookie-respecting `getPropertyId` utility)
- RLS errors on new property insert (3 failed attempts before landing on service-role client)
- New property showing old data (layout/page.tsx ignoring cookie — fixed)
- Agent "Something went wrong" (missing return statement in buildSystemPrompt, agent route not passing property arg)

### Session 5 — Agent onboarding + parsing
- Added parse_listing tool (URL fetch + pasted text, Zillow/Redfin detection)
- Added update_property_details and create_asset tools
- Rewrote onboarding section of system prompt to be directive
- Fixed home-details, references, purchases pages — all used .limit(1) ignoring the property cookie

---

## My interaction patterns (describe to Claude.ai for evaluation)

1. **I tend to give open-ended direction** and trust Claude to figure out implementation. ("knock it out" was a common phrase.) I rarely pre-specify how something should be built.

2. **I approve rather than specify.** I let Claude propose, then say go/no-go. I don't usually write requirements documents before asking for code.

3. **I give feedback in short bursts.** "done", "still get the same error", "nice, but X doesn't work". I rarely provide detailed error logs unless asked.

4. **I jump between tasks.** Within a session I'll address three bugs and a new feature in the same exchange, sometimes without clear delineation.

5. **I asked good "why" questions** occasionally but didn't always retain the technical detail.

6. **I missed context windows.** One session hit the context limit mid-fix, leaving the agent route in a broken state that required re-reading and resumption.

7. **I tested in production (Vercel/browser).** I rarely ran tests locally. Test failures appeared as "the thing doesn't work" rather than specific errors.

---

## What went well

- Product moved fast. A functional, deployed multi-tenant AI agent app in ~5 sessions is genuinely impressive output.
- I stayed in my lane — didn't try to debug TypeScript myself, trusted Claude's judgment on architecture decisions.
- CLAUDE.md discipline: we wrote and respected project orientation docs, session notes, parking lot.
- The "propose before implement" workflow worked. I rarely had to roll back something Claude did.

---

## What was hard

- The RLS issue took 3 migration attempts before the right abstraction (service role client) was identified. I didn't help narrow it down — I just said "still failing."
- The context-window collapse in Session 4 left a partially broken file. We recovered, but it was disorienting.
- I have limited visibility into TypeScript errors — pre-existing errors in the codebase are invisible to me unless Claude flags them.
- I couldn't always tell if a feature was "done" vs "done enough to test." The line between those was blurry.

---

## Questions I want you (Claude.ai) to evaluate

**On my usage:**
1. How effectively am I directing an AI coding collaborator? What's the biggest gap in my approach?
2. Am I at the right level of specificity in my instructions — too vague, too specific, or well-calibrated?
3. What should I be doing differently when I hit a repeated failure (like the RLS issue)? What's the better way to collaborate through a debugging loop?
4. Am I learning? Or am I just getting things built without building durable understanding?
5. What's the highest-leverage thing I could change about how I work with Claude Code?

**On the project:**
6. Is the CLAUDE.md orientation file doing its job? What's missing or could be improved?
7. The PLAN.md + SESSION_NOTES approach — is this a good pattern for AI-assisted development? What would you add?
8. We're at the end of Phase 1 / entering Phase 2. What should the handoff checklist look like?
9. Where is this project most likely to accumulate technical debt that bites later?

**On next steps:**
10. What capability or workflow change would most improve the collaboration in Phase 2?
11. Should I be using subagents yet? When would they help vs. hurt?
12. What would you add to the CLAUDE.md to better guide future sessions?

---

## CLAUDE.md (current, for reference)

The CLAUDE.md covers: product vision, two architectural principles (domain-agnostic, multi-tenant from day one), roles, build order (Phases 1–3), stack rationale, how the user works, collaboration norms, automation staging, and what the product is not.

**Possible gaps I've noticed:**
- Nothing about how to handle cross-session context loss
- Nothing about what to do when repeated fixes fail (escalation protocol)
- No guidance on when to extract shared utilities vs. inline
- No testing philosophy (we have none currently)

---

Please give me honest, specific, actionable feedback. Treat me as a smart non-expert who wants to improve. Don't be encouraging for its own sake.
