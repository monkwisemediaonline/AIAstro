# First prompt for Claude Code

Paste this in a new Claude Code session opened in this folder:

---

Read `CLAUDE.md` and every file in `docs/` fully. This is a new, empty project. Build
it as a private, single-owner, local-first app.

Before writing code, reply with:
1. Your understanding of the product in 10 lines.
2. Anything in the specs that is contradictory, unclear or technically wrong.
3. The exact package versions you will install (check with `npm view`) and their licences.
4. The Phase 0 plan: files to create, tests, acceptance checks.

Then wait for my approval. After I approve, implement **Phase 0 only**, run
`npm run typecheck`, `npm run lint` and `npm test`, show me the results, and stop.

Constraints:
- Do not read or print the contents of `private/seed.local.json` except when
  implementing the seed import in Phase 1. Tests use synthetic births only.
- Do not use an LLM to calculate anything.
- Do not mix astrology schools or numerology systems.
- Do not invent Yoga or Lal Kitab rules beyond the specs; ask me when unsure.

---

For later phases:
> Read `CLAUDE.md` and `docs/IMPLEMENTATION_PLAN.md`. Phase N-1 is done (tests green).
> Plan Phase N, wait for approval, implement, test, report, stop.
