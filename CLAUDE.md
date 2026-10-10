# Personal Jyotish AI — Claude Code Instructions

Private, single-owner portal for Vedic astrology (Parashari first), Raj/Dhana Yoga
analysis, Vimshottari Dasha, numerology (name / birth-date / number), Lal Kitab, and a
remedy + business-action journal. One user. Not a SaaS.

## Read before any work
1. `docs/PRD.md` — what to build, modules, acceptance criteria
2. `docs/IMPLEMENTATION_PLAN.md` — phases and test gates (build ONE phase at a time)
3. The spec for the module you are touching:
   - `docs/ENGINE_SPEC.md` — astronomy, ayanamsha, houses, vargas, Dasha formulas
   - `docs/YOGA_RULES_SPEC.md` — rule schema + first rule set with exact predicates
   - `docs/NUMEROLOGY_SPEC.md` — letter tables, reduction rules, systems
   - `docs/LAL_KITAB_SPEC.md` — separate tradition, governance
   - `docs/REMEDIES_SPEC.md` — remedy catalogue, gemstone logic, safety
   - `docs/DATA_MODEL.md` — schema
   - `docs/AI_ASSISTANT_SPEC.md` — Claude adapter, prompt contract, output schema
4. `docs/RESEARCH.md` — library/licensing decisions and why

## Hard rules
- **Deterministic code computes; the LLM only explains.** Never ask the model for planet
  degrees, signs, houses, Dasha dates, Yoga detection, or numerology arithmetic.
- **Every computed result stores its settings**: ayanamsha, node type (mean/true),
  house system, engine + version, tz database version, birth-time confidence,
  rule-set version. Every chart page displays them.
- **Schools never mix silently.** Parashari, Jaimini, KP, Lal Kitab, Chaldean,
  Pythagorean are separate modules with separate rule IDs. Comparison only in an
  explicitly labelled comparison view.
- **Uncertain birth time is a range, never a midpoint.** Compute both ends (and steps
  between) and show what changes. Missing time ⇒ no Ascendant/houses/vargas.
- **Evidence or nothing.** Every interpretive sentence links to rule IDs + chart facts.
  Show "detected / not detected / indeterminate" with reasons.
- **No guarantees.** Remedies, stones, pujas are labelled "traditional practice", never
  causal. No financial/medical/legal advice from astrology. Never initiate purchases,
  donations or bookings.
- **Privacy.** Real birth data lives only in `private/` (git-ignored) or the database.
  Never in fixtures, tests, logs, commits or AI prompts unless AI is enabled in Settings.
  Tests use synthetic births only.
- No secrets in code. `.env.example` holds placeholders only.

## Stack (see RESEARCH.md for versions)
- Next.js (App Router) + TypeScript strict + Tailwind v4 + shadcn/ui
- Hosting: GitHub (private) → Vercel. Data: Supabase Postgres + Auth, owner-only RLS
  (`app_owner` table, sign-ups disabled). Without Supabase env vars, `npm run dev` uses a
  git-ignored JSON store in `data/` (dev only; production refuses to run unconfigured).
- Engine: `astronomy-engine` (MIT) behind `src/engine/` typed interface;
  `sweph` (AGPL) used ONLY as a dev-time reference oracle in tests, never shipped.
- Timezones: IANA via `luxon`. Places: Open-Meteo geocoding (GeoNames, CC-BY 4.0) + manual entry.
- AI: `@anthropic-ai/sdk`, server-side only, behind `src/ai/` adapter, opt-in.
- Tests: Vitest (`npm test`). Reference fixtures: `npm run gen:reference` with SWEPH_DIR.
- Next 16 Cache Components is ON: request data (cookies, store) must sit inside <Suspense>;
  `getStore()` calls `connection()` so private data is never prerendered.

Next.js versions change fast: before writing Next.js code, read the guide in
`node_modules/next/dist/docs/` and follow deprecation notices.

## Directory layout
```
src/
  engine/        astro (planets, Lahiri, Asc), zodiac (dignity, vargas), dasha, chart, readiness, time
  compat/        partner.ts — Partner Vibes factors (labelled by basis)
  numerology/    indian.ts (Mulank/Bhagyank) — Chaldean/Pythagorean next
  lib/           people (zod schema), store (Supabase | local dev), supabase/
  components/    IntakePanel, PlaceSearch, ChartView, NorthIndianChart, Nav
  app/           (app)/ pages, login/, actions.ts (server actions)
  proxy.ts       auth redirect + session refresh
supabase/migrations/   SQL schema + RLS
tests/         engine, compat; fixtures/reference-charts.json (synthetic, from sweph)
private/       real seed data (git-ignored)
```

## Working method
- Plan mode for anything touching >2 files. Return plan, assumptions, risks, tests.
- Finish a phase only when: `npm run typecheck && npm run lint && npm test` pass and the
  UI was checked in the browser. Report files changed, commands run, results, limits.
- Never start the next phase while a foundation test fails.
- Do not "improve" a rule's predicate from memory. If a classical source is unclear,
  mark the rule `status: "unverified"` and ask the owner.

## UI
Premium and calm: deep navy/charcoal, warm gold accent, ivory surfaces. North-Indian
and South-Indian chart styles. Mobile responsive, keyboard accessible, clear
empty/loading/error states. No "100% guaranteed" language anywhere.
