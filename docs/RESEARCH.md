# Research & Technical Decisions

Snapshot: 10 October 2026. Claude Code must re-check versions with `npm view <pkg>`
before installing.

## 1. Deployment decision: local-first
**Decision:** run on the owner's laptop (`npm run dev` / `npm start` on localhost),
SQLite database file. Optional private hosting later.

Why: one user, highly personal family data, zero hosting cost, no RLS/auth surface to
get wrong. Supabase/Vercel can be added later behind the same Drizzle schema (Drizzle
supports both SQLite and Postgres) if mobile access from anywhere is needed.

## 2. Calculation engine

| Option | License | Pros | Cons |
|---|---|---|---|
| **astronomy-engine** (npm, v2.1.19, cosinekitty) | MIT | Pure TS, no native build, works on Windows/Vercel/edge; ~1 arcminute accuracy or better for planets, well tested vs NOVAS/JPL | No built-in ayanamsha or nodes — we implement (formulas in ENGINE_SPEC) |
| **sweph** (npm, 2.10.3-b-1, Swiss Ephemeris bindings) | AGPL-3.0 (or LGPL with paid Swiss Ephemeris pro licence) | Gold standard used by Jagannatha Hora-type software; ayanamshas, nodes, houses built in | Native addon (needs build tools on Windows); AGPL obligations if the app is offered to others over a network |
| swisseph (old npm) | GPL-2.0 | — | Unmaintained; avoid |
| Python pyswisseph sidecar | AGPL | Mature | Adds a second runtime; not needed |

**Decision:** `astronomy-engine` in the app; `sweph` as a **dev-only reference oracle**
in `scripts/gen-reference.ts` to generate expected values for synthetic fixtures. Never
imported by `app/` or `src/`. For a private tool never distributed or offered to others,
AGPL obligations are minimal; keeping it out of the shipped code removes the question
entirely. If accuracy tests fail beyond tolerance, revisit and use `sweph` at runtime
(the engine interface makes it a swap).

Accuracy needed: a 1-arcminute error moves the Ascendant ~4 seconds of time — far below
birth-time uncertainty. Sign, nakshatra and D9 are what matter, and they're safe at this
precision except within ~1′ of a boundary (flag "near boundary" in the UI when |distance
to boundary| < 0.05°).

## 3. Ayanamsha
Lahiri = official Indian ayanamsha (Calendar Reform Committee; Indian Astronomical
Ephemeris since 1950s; zero year 285 CE). Value at J2000.0 ≈ 23°51′25.5″ (23.8571°),
moving ~50.3″/year. Implement as J2000 constant + IAU 2006 general precession
polynomial; verify against `sweph` (SE_SIDM_LAHIRI) to 0.001° over 1900–2100.

## 4. Other libraries
| Need | Choice | License |
|---|---|---|
| Framework | Next.js (latest stable; read bundled docs) + React | MIT |
| Styling | Tailwind CSS v4 + shadcn/ui | MIT |
| DB | better-sqlite3 + drizzle-orm + drizzle-kit | MIT / Apache-2.0 |
| Validation | zod | MIT |
| Time zones | luxon (uses Intl/ICU tzdb) | MIT |
| Places | GeoNames `cities15000.txt` imported to SQLite | CC-BY 4.0 (attribute in About) |
| Charts (timeline, metrics) | recharts or visx | MIT |
| Kundli drawing | custom SVG components | own |
| AI | @anthropic-ai/sdk | MIT |
| Tests | vitest, @playwright/test | MIT / Apache-2.0 |
| Passcode hash (if hosted) | @node-rs/argon2 | MIT |

## 5. Reference software for manual cross-checks
- Jagannatha Hora (free, Windows) — Parashari/Jaimini, all vargas, Vimshottari.
  Excellent for checking D-charts and Dasha dates.
- Open-source repos worth reading for ideas only (check licence before copying any code):
  OpenJyotish, Hora Prakash, jyotish-dashboard. Several are AGPL/GPL.

## 6. Classical sources (for the Research Library)
Owner should record which editions they own/use:
- Brihat Parashara Hora Shastra (BPHS) — Raja/Dhana/Mahapurusha yogas, vargas, Dasha.
  Chapter numbers differ between translations (e.g. Santhanam vs Sharma); record edition.
- Phaladeepika (Mantreswara) — Ch. 6 yogas (incl. Parivartana, Viparita), Neecha Bhanga.
- Saravali (Kalyana Varma), Jataka Parijata — additional yoga definitions.
- Lal Kitab (1939–1952 editions, Urdu; Hindi/English translations vary).
- Cheiro, *Book of Numbers* — Chaldean system.
Translations are often copyrighted: store citations + the owner's own summaries only.

## 7. Key risks
1. **Wrong rule definitions** — mitigated by rule review workflow + tests.
2. **Birth-time uncertainty** — range and unknown-time profiles get
   sensitivity views; Yoga results that flip are "indeterminate".
3. **Mixing schools** — module boundaries + import-isolation tests.
4. **Overconfidence from AI** — validator, banned phrases, evidence requirement.
5. **Money spent on remedies** — budget caps, cost-first ordering, no purchase actions.
6. **Data leak** — local-first, git-ignored `private/` and `data/`, no telemetry, AI
   field minimisation.

## Sources
- astronomy-engine: https://github.com/cosinekitty/astronomy ; https://snyk.io/advisor/npm-package/astronomy-engine
- sweph (Node Swiss Ephemeris): https://github.com/timotejroiko/sweph ; https://npmjs.com/package/sweph
- Swiss Ephemeris licence: https://www.astro.com/swisseph/
- Lahiri ayanamsha background: https://kerykeion.net/libephemeris/docs/reference/ayanamsha ; https://jagannathhora.com/?p=1406
- GeoNames: https://download.geonames.org/export/dump/
