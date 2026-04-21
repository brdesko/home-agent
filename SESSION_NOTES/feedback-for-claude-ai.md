# Parcel — Project Debrief & Feedback Request

I am building a personal home management platform called **Parcel** using Claude Code as my primary development collaborator across multiple sessions. I want honest, direct feedback — on me as a collaborator and director of AI-assisted development, not on the product itself. Treat me as a smart non-expert who wants to improve. Don't be encouraging for its own sake.

---

## What I built and with whom

- **Stack:** Next.js 15 (App Router), Supabase (Postgres + Auth + RLS), TypeScript, Tailwind CSS, Anthropic API, deployed on Vercel
- **Product:** A property notebook (projects, tasks, budgets, timelines, goals) plus a conversational AI agent that reads and modifies the notebook using 20+ tools
- **Collaborator:** Claude Code (Sonnet 4.6) — I directed it, it wrote nearly all the code
- **Duration:** ~5–6 multi-hour sessions over roughly one week
- **My background:** VP of Innovation. Technically literate but haven't shipped production React/Node in years. New to Next.js App Router, Supabase RLS, and modern JS tooling. On Windows/PowerShell.

---

## Full arc of what was built

### Sessions 1–2: Scaffold + core model
- Next.js + Supabase setup with auth, RLS, core schema
- Property, Projects, Tasks, Assets, BudgetLines, TimelineEvents, Goals
- Basic Notebook UI with tabs (projects, goals, budget, calendar, to-do)
- Hand-seeded farm plan data

### Sessions 3–4: Agent + property management
- Conversational AI agent: Anthropic API, tool-use loop, 15+ tools
- System prompt with context injection (projects, goals, references)
- Property dropdown with switching, new property creation
- Resolved hardcoded PROPERTY_ID across ~14 API routes
- RLS bootstrap error on new property (3 failed migration attempts → service role client)
- New property showing old data (layout/page not respecting cookie)
- Agent "Something went wrong" (missing return statement in buildSystemPrompt)

### Session 5: Agent onboarding + parsing + shipping
- Added `parse_listing`, `update_property_details`, `create_asset` tools to agent
- Rewrote onboarding system prompt to be directive (URL parsing, Ctrl+A/C instruction for Zillow)
- Fixed home-details, references, purchases pages — all used `.limit(1)` ignoring the property cookie
- Fixed 6 TypeScript build errors (BudgetLine field names, duplicate style props, type mismatch)
- Redesigned login page: split-screen with sage green left panel, topographic SVG imagery, Playfair Display wordmark
- Wrote Erin's invitation HTML (styled product invite)
- Written QA architecture review and this feedback document

---

## My interaction patterns — please evaluate these

1. **"Knock it out"** — my most common instruction. I give direction, trust Claude to figure out implementation, and say go/no-go on proposals. I rarely pre-specify how something should be built.

2. **Short feedback bursts** — "done", "still getting the same error", "nice, but X doesn't work." I rarely paste error logs unless asked. I expect Claude to ask if it needs them.

3. **Context-window management** — I don't monitor context length and twice ran out mid-fix, leaving partially broken files. I don't have a habit of asking "how much context do we have left?"

4. **Parallel task-switching** — within a session I'll address a bug, a new feature, and a UX concern in quick succession without clear delineation.

5. **Testing in production** — I test by using the deployed app on Vercel, not locally. Failures present as "the thing doesn't work" rather than specific errors.

6. **Approval over specification** — I let Claude propose, then approve or redirect. I'm not writing requirements documents. This works but sometimes leads to misaligned scope.

7. **I didn't retain technical detail** — I can direct and evaluate output but I don't retain how the cookie-based property switching works or what RLS policies do. Each session I start fresh on implementation details.

---

## What worked well

- Shipped a genuinely functional, deployed, multi-tenant AI agent app in roughly 5 sessions
- The "propose before implement" norm worked — I rarely had to roll back something Claude did
- CLAUDE.md, PLAN.md, SESSION_NOTES discipline — context was captured across sessions
- The product reflects a coherent architectural vision (domain-agnostic, multi-tenant-ready)
- I trusted Claude's judgment on architecture and was mostly right to do so

---

## What was hard or went wrong

- **The RLS issue took 3 attempts** — I said "still failing" each time without narrowing down the error. I wasn't helping.
- **Context collapse mid-fix** — left the agent route with a missing `return` statement that caused "Something went wrong" in production. Took a full session to diagnose.
- **Pre-existing TypeScript errors** — accumulated across sessions and finally broke the Vercel build. I had no visibility into them until the build failed.
- **Property scoping bug was systemic** — the `.limit(1)` bug appeared in 4 separate pages. It wasn't caught until a user (me) noticed wrong data.
- **I can't always tell "done" from "done enough to test"** — the line was consistently blurry.

---

## Tomorrow's planned work (for context on next priorities)

In no particular order:
- Agent evolution: refine goals, rules, and persona
- Quality control agent / project manager layer
- Review and improve agent behavior and tools
- Access workflow for friends/family (Erin, parents)
- Parking lot items (Firecrawl URL crawling, etc.)
- Visual tab development (richer UI for notebook tabs)
- Drag and drop for moving projects between quarters / calendar
- Continued testing

---

## Questions I want you to answer

**On my effectiveness as a director:**
1. Based on my patterns, what's the single biggest thing I could change to get better output from Claude Code?
2. Am I at the right level of specificity in my instructions — too vague, too specific, or well-calibrated?
3. When I hit repeated failures (like the RLS issue), what's the better collaboration pattern? What should I have done differently?
4. Am I learning through this process, or just getting things built? How would I know the difference?
5. My short feedback style ("done", "still failing") — is this efficient or is it costing me quality?

**On the project and process:**
6. Is CLAUDE.md doing its job? What's missing that would make future sessions significantly better?
7. Where is this project most likely to accumulate technical debt that bites me in Phase 2?
8. The systemic `.limit(1)` / property-scoping bug appeared in 4 places and wasn't caught until tested in production. What process change would catch this class of error earlier?
9. We have no automated tests. Is that a problem at this stage? When does it become one?

**On tomorrow's priorities:**
10. Of my planned activities for tomorrow, what order would you recommend and why?
11. "Quality control agent / project manager" — what does that actually mean in this context and is it premature?
12. What would you add to CLAUDE.md before the next session to make tomorrow more effective?

---

## CLAUDE.md gaps I've already noticed

- Nothing about cross-session context loss (what to do when context fills)
- Nothing about what to do when repeated fixes fail (escalation protocol)
- No guidance on when to extract shared utilities vs. inline
- No testing philosophy
- No guidance on how to prioritize within a session when multiple things come up

---

Please give me direct, specific, actionable feedback. Prioritize what would actually change how I work, not what is technically interesting.
