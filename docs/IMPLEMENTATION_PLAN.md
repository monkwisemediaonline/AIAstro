# Implementation Plan

One phase per Claude Code session (or a few). Each phase ends with:
`npm run typecheck && npm run lint && npm test` green, browser check done, and a short
report (files changed, commands, results, known limits, next phase). Never start a phase
while an earlier foundation test fails.

## Phase 0 — Scaffold + engine proof (≈1 session)
- `create-next-app` (TypeScript, Tailwind v4, App Router, src dir), shadcn/ui init,
  Vitest, Playwright, ESLint, `tsconfig` strict.
- Install `astronomy-engine`, `luxon`, `zod`; dev: `sweph` (reference only).
- `src/engine/`: time (local→UTC), planets (tropical), mean node, Lahiri ayanamsha,
  Ascendant, signs/nakshatras.
- `scripts/gen-reference.ts` (sweph) → `tests/fixtures/charts/*.json` for 12 synthetic
  births.
- Tests: planets within 0.01° (Moon 0.02°), ayanamsha 0.001°, Ascendant 0.02°,
  boundary epsilon, DST zone (e.g. America/New_York), pre-1955 India.
- `docs/LICENSES.md` listing every dependency + licence.

**Exit gate:** all fixture tests pass.

## Phase 1 — App shell + profiles (≈1–2 sessions)
- Layout, navigation (13 items, most "coming soon"), navy/gold/ivory theme, dark mode,
  mobile nav.
- SQLite + Drizzle schema for person, birth_data, person_name, chart_settings.
- Profile CRUD with time kind (exact/range/unknown), confidence, place search (GeoNames
  import script), tz confirmation, UTC preview.
- `npm run seed:private` imports `private/seed.local.json` as drafts.
- Export person JSON, delete person (with confirm).
- Logger with redaction.
- Tests: Zod validation, range rules (from < to), UTC derivation, seed import, delete
  cascade, Playwright smoke on 375px width.

## Phase 2 — Kundli D1 + D9 + D10 (≈2 sessions)
- Chart computation service with `input_hash` caching.
- Planet table (all columns from PRD §5), house table, aspects, dignity, combustion.
- North & South Indian SVG charts.
- D9, D10, D2, D3, D7, D12 + tests per varga.
- Settings footer on every chart. "Near boundary" badge.
- **Birth-time sensitivity panel** for range births (sample every 4 min).
- Tests: varga fixtures vs reference, sensitivity panel lists changing items.

## Phase 3 — Vimshottari Dasha + transits (≈1–2 sessions)
- MD/AD/PD with exact dates; timeline UI; "current period" on Overview.
- Slow-planet transits over natal Moon/Lagna; Sade Sati windows.
- Tests: Dasha start dates vs Jagannatha Hora within 1 day; year-length setting.

## Phase 4 — Raj/Dhana Yoga engine (≈2–3 sessions) ★ core feature
- Rule schema, evaluator, 20 rules from `YOGA_RULES_SPEC.md` as `draft`.
- Research Library screens: sources, rule ↔ source, review → enable.
- Yoga page: status, conditions ✓/✗ with facts, modifiers, cancellations, strength
  table, Dasha links, "how to activate / support" panel (timing, transit, practical
  actions; remedies placeholder until Phase 6).
- Tests: positive/negative/boundary/missing/cancellation per rule.

## Phase 5 — Numerology (≈1–2 sessions)
- Chaldean, Pythagorean, Indian modules; name, birth-date, number numerology;
  name-change lab; saved comparisons.
- Tests: per `NUMEROLOGY_SPEC.md §8`.

## Phase 6 — Remedies + ritual planner + business dashboard (≈2 sessions)
- Remedy catalogue CRUD with safety flags; matcher linked to Yoga/planet conditions;
  gemstone reasoning view.
- Planner: japa counter, puja/vrat calendar, daan log + budget cap, gemstone notes,
  experience log.
- Business & Wealth page: traditional indicators + metrics tracker + goals +
  retrospective log.
- Tests: per `REMEDIES_SPEC.md §7`.

## Phase 7 — Lal Kitab (≈2–3 sessions)
- Per `LAL_KITAB_SPEC.md §6` order. Starts with chart + source registry; rules enabled
  only after the owner enters/reviews source data.

## Phase 8 — AI assistant + family + hardening (≈2–3 sessions)
- Claude adapter, context builder, validator, disclosure modal, per-person opt-in.
- Ashtakoot (after tables reviewed), Mangal dosha with cancellations, family view.
- Encrypted backup/restore, optional passcode auth for hosting, security headers,
  dependency licence audit, README for setup/backup/restore.
- Optional: rectification helper (experimental), Panchang module.

## Order rationale
Correct chart → timing → Yogas is the dependency chain. Numerology is independent and
can be pulled earlier if wanted. AI is last because it only explains what the earlier
phases compute.
