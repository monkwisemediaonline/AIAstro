# Jyotish Desk — Personal Jyotish AI

A private astrology + numerology + Lal Kitab research portal for one owner.
Next.js 16 · Supabase (Postgres + Auth, owner-only RLS) · Vercel.

## What works today
- **Birth-details intake panel** — enter name, date, time (exact / range / unknown) and place;
  a live "Before calculation" checklist shows what can be calculated, and calculation unlocks
  only when the essentials are in.
- **Chart calculation** — sidereal (Lahiri), whole-sign houses, mean node: planets, dignity,
  nakshatra/pada, combustion, retrograde, aspects, D1 + D9 North-Indian charts, D2/D3/D7/D9/D10/D12
  signs, Vimshottari Dasha (MD/AD/PD).
- **Birth-time sensitivity** — range births are calculated every 4 minutes across the window and
  show which results change; unknown times give a Moon chart with warnings.
- **Raj & Dhana Yoga** — 27 Parashari rules with conditions met/not met, evidence, a labelled strength
  heuristic, Dasha timing and practical actions. All rules are drafts awaiting source verification.
- **Dasha & Transits** — current Mahadasha/Antardasha/Pratyantardasha, life timeline, transits on any
  date with houses from Moon and Lagna, Sade Sati and Dhaiya windows, Jupiter/Saturn/Rahu sign changes.
- **Lal Kitab** — house-based teva, kept separate from Parashari. No built-in readings: notes and upay
  are entered by the owner from their own edition, with source, page and a safety check.
- **Business & Wealth** — traditional wealth/career indicators next to a real execution tracker
  (monthly revenue, margin, cash, pipeline), goals, and a retrospective log of indicated vs actual.
- **AI Assistant** — Claude explains already-computed results in a fixed structure; per-person opt-in,
  no name/date/place sent, every answer fact-checked against the chart before display.
- **Numerology** — Chaldean, Pythagorean and Indian (Mulank, Bhagyank, Lo Shu, personal year); phone and
  other numbers; a name-change lab. Every letter value and step is shown.
- **Remedies & Rituals** — per-planet starter practices (free first), gemstone reasoning by lordship,
  japa counter and daan log with a monthly cap.
- **Partner Vibes** — business-partner comparison, seven factors each labelled by basis.
- Owner-only login (Supabase), no public sign-up.

Planned next (see `docs/IMPLEMENTATION_PLAN.md`): research library for verifying rules against sources.

## Run locally
```bash
npm install
npm run dev
```
Without Supabase env vars the app runs in **local dev mode** and saves to `data/dev-store.json`
(git-ignored). To go live, follow `docs/SETUP_SUPABASE_VERCEL.md`.

## Checks
```bash
npm run lint
npm run typecheck
npm test
npm run build
```
Planet longitudes, Ascendant and ayanamsha are tested against Swiss Ephemeris reference values
for 12 synthetic births (`tests/fixtures/reference-charts.json`).

## Docs
| File | Purpose |
|---|---|
| `CLAUDE.md` | Rules Claude Code follows in every session |
| `docs/SETUP_SUPABASE_VERCEL.md` | GitHub → Supabase → Vercel go-live steps |
| `docs/PRD.md` | Product: modules, screens, acceptance criteria |
| `docs/IMPLEMENTATION_PLAN.md` | Phases and test gates |
| `docs/ENGINE_SPEC.md` | Formulas: ayanamsha, houses, vargas, dignity, aspects, Dasha |
| `docs/YOGA_RULES_SPEC.md` | Rule schema + first 20 Raj/Dhana/Mahapurusha rules |
| `docs/NUMEROLOGY_SPEC.md` · `LAL_KITAB_SPEC.md` · `REMEDIES_SPEC.md` | Module specs |
| `docs/DATA_MODEL.md` · `AI_ASSISTANT_SPEC.md` · `RESEARCH.md` | Schema, AI contract, decisions |

## Privacy
Real birth details live only in the database (or `data/` in dev mode) and `private/`, all
git-ignored. Run `git status` before every push. Astrology output here is traditional
interpretation, not prediction or advice.
