Review the current staged and unstaged changes against the principles in CLAUDE.md.

Steps:
1. Read CLAUDE.md
2. Run `git diff HEAD` to see all current changes
3. Evaluate each changed file against these principles from CLAUDE.md:
   - Domain-agnostic architecture: no domain-specific logic in core schema or components
   - Multi-tenant from day one: RLS enabled, no UI-level auth checks
   - One slice at a time: no Phase 2/3 features creeping into Phase 1 work (and vice versa)
   - No premature abstractions: three similar lines beats an early helper
   - No unnecessary comments: only add comments when the WHY is non-obvious
   - Explicit over clever: readable beats concise
   - No new dependencies without prior approval
   - Schema migrations are SQL; domain content is JSON

Report findings as:
- PASS: change is consistent with principles
- WARN: possible concern, worth discussing
- FAIL: clear violation that should be fixed before committing

Be direct. If everything looks good, say so briefly. If there are issues, be specific about which file and line.
