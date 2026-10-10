# Product Requirements — Personal Jyotish AI

**Owner / only user:** the portal owner (single account)
**Purpose:** A private research and decision-support portal. It calculates charts
correctly, detects classical Yogas with visible evidence, maps timing (Dasha/transit),
runs numerology, keeps Lal Kitab separate, and journals remedies alongside real
business actions and results.

**Primary questions the app must answer well**
1. Do I have Raj Yoga / Dhana Yoga? Which ones, under which rules, how strong, and why?
2. If a Yoga is absent or weak — what is traditionally said to activate or support it,
   and when (Dasha) are its planets emphasised?
3. What does my chart traditionally say about business, wealth, career, love/marriage,
   my wife, and my daughter?
4. Which name spelling / business name / phone number is numerologically favourable
   under each named system?
5. What remedies (mantra, puja, daan, gemstone, Lal Kitab upay) are traditionally
   linked to my chart conditions — with source, cost, and safety notes?
6. Am I actually executing the business plan? (metrics tracked next to the astrology,
   so results are judged by reality, not memory)

## 1. Principles
1. Calculation accuracy before interpretation.
2. Rules are explicit data with IDs, versions, and a named school/source.
3. The AI explains computed results; it never calculates.
4. Interpretations are traditional views with uncertainty. Nothing is guaranteed.
5. "Why?" is always one click away: show calculation, show rules, show sources.
6. Family data is private, exportable, deletable. The daughter's data is extra-private.
7. Remedies are tracked, never pushed. No purchase, donation or booking is ever made
   by the app.

## 2. Access and deployment
- **Default: local-first.** Runs on the owner's laptop at `localhost`, SQLite file in
  `data/`. No auth needed while bound to localhost.
- **Optional private hosting later** (Phase 8): owner passcode (argon2id) + secure
  httpOnly session cookie, rate-limited login, `noindex`, no public routes. A secret
  URL alone is not security.
- No signup, no public pages, no sharing links, no third-party analytics.

## 3. Navigation
1. Overview (today's Dasha, active transits over natal points, open remedies, business
   metric snapshot)
2. People & Birth Profiles
3. Kundli (D1 + vargas, planet/house tables)
4. Raj Yoga & Dhana Yoga
5. Dasha & Transit Timeline
6. Business & Wealth
7. Numerology (Name · Birth date · Numbers)
8. Lal Kitab
9. Remedies & Ritual Planner
10. Family & Compatibility
11. Research Library (sources, rules, review status)
12. AI Assistant
13. Settings · Privacy · Export

## 4. People & birth profiles
Fields: display name, relationship, date of birth, birth time (`exact` | `range` |
`unknown`), confidence (`exact` | `certificate` | `family_reported` | `approximate` |
`unknown`), birthplace (name, lat, lon, source), IANA timezone, derived UTC instant
(or range), data source note, names with script + effective dates, privacy flag.

- Place search uses the offline GeoNames list; the user confirms the match and the
  timezone before saving.
- UTC is derived with the IANA rules valid **on the birth date**; the derivation
  (offset used, tzdb version) is stored and shown.
- Seed records from `private/seed.local.json` import as **drafts** and show a
  "confirm details" banner until confirmed.

**Uncertain time behaviour**
- `range`: compute charts at start, end, and every 4 minutes between. Show a
  "sensitivity" panel: which items stay the same across the range (planet signs,
  nakshatras, usually Moon) and which change (Ascendant, house placements, D9, D10,
  Dasha balance by a few days). Yoga results that depend on houses show
  "indeterminate" if they flip inside the range.
- `unknown`: compute at local noon for planet signs/nakshatras only. Disable Ascendant,
  houses, vargas and house-based Yogas; show the Moon's sign/nakshatra as uncertain if
  it changes during the day.
- Offer a **rectification helper** later (Phase 8): user enters known life events; app
  lists candidate times. Labelled as experimental.

## 5. Kundli
- Sidereal zodiac, Lahiri ayanamsha default (configurable: Lahiri, Raman, KP/Krishnamurti,
  True Chitrapaksha). Mean node default, true node optional.
- Planets: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu. Uranus/Neptune/
  Pluto optional and labelled "non-classical".
- House system: Whole-sign (default, Parashari) and Bhava Chalit / Sripati (optional).
- Planet table: longitude (sidereal, D°M'S"), sign, degree in sign, nakshatra + pada +
  nakshatra lord, retrograde, combust (with orb used), dignity (exalted/debilitated/
  moolatrikona/own/friend/neutral/enemy), house, houses ruled.
- House table: sign, lord, lord's placement, occupants, aspects received.
- Aspects: Parashari graha drishti (see ENGINE_SPEC).
- Vargas in order: D1, D9, D10, D2, D3, D7, D12, then D4, D16, D20, D24, D27, D30, D40,
  D45, D60 only after each formula has passing tests. D60/D45/D40 always show a
  birth-time sensitivity warning.
- Chart styles: North Indian (diamond) and South Indian (fixed signs), SVG, printable.
- Settings footer on every chart: ayanamsha + value, node, house system, engine version,
  tzdb version, UTC instant, confidence.

## 6. Raj Yoga & Dhana Yoga (primary feature)
Rule engine, not LLM. Schema and first rule set in `YOGA_RULES_SPEC.md`.

Per Yoga the UI shows:
- Status: **Detected / Not detected / Partially met / Indeterminate (missing data)**
- The exact conditions, each with ✓ / ✗ and the chart facts that satisfied or failed it
- Modifiers: strengthening and weakening factors (dignity, combustion, dusthana
  placement, aspects from benefics/malefics, D9 dignity), each listed separately
- Cancellation conditions and whether any apply
- Planets and houses involved; their current and upcoming Dasha/Antardasha periods
- Source: school, text, chapter/verse, rule version, review status
- **Strength rubric** (product heuristic, clearly labelled as such, never "classical"):
  shown as component factors, not one magic number

### "How can I activate / support this Yoga?" panel
For a detected-but-weak or absent Yoga, list in this order, each separately labelled:
1. **Timing** — which Mahadasha/Antardasha periods involve the Yoga's planets (dates)
2. **Transit** — upcoming Jupiter/Saturn transits over the involved houses/lords
3. **Practical actions** — real-world actions aligned with the houses involved
   (e.g. 10th = career/authority, 11th = income/network, 2nd = savings/family wealth),
   framed as business advice that is sensible regardless of astrology
4. **Traditional remedies** — from the remedy catalogue, linked to the specific
   planets, with source, cost range, safety notes, and the "traditional belief" label
5. **What cannot be concluded** — explicit list

## 7. Dasha & transit
- Vimshottari: Mahadasha → Antardasha → Pratyantardasha (→ Sookshma optional), exact
  start/end timestamps in local time + UTC. Year length configurable (365.25 default).
- Timeline view, zoomable. Each period shows lord's natal placement, houses ruled,
  linked Yogas, and remedy/action items tagged to that lord.
- Transits: Jupiter, Saturn, Rahu/Ketu (slow movers) over natal Moon and Lagna;
  Sade Sati detection (Saturn in 12th/1st/2nd from natal Moon) with dates.
- Date-range search: "show periods where Jupiter or 10th lord is active".
- Everything framed as traditional timing, not event prediction.
- Yogini and Jaimini Chara Dasha only later, as separate modules.

## 8. Business & Wealth
Two halves on one page, intentionally:

**Traditional indicators** — 2nd, 5th, 9th, 10th, 11th houses and lords; Dhana/Raj Yogas
detected; D10 and D2 views; Arudha Lagna (A1) and A11 (Jaimini, labelled); current/next
Dasha lords' link to these houses; "favourable windows" with evidence and assumptions.

**Execution tracker** (owner-entered) — monthly revenue, gross margin, cash in bank,
pipeline value, deals won, team size, key goals with deadlines. Charts over time.

**Retrospective log** — when the app shows a "favourable window", the owner can log what
actually happened. Over time this shows honestly which signals tracked reality.

The app never advises investing, borrowing, quitting, or risking capital based on
astrology.

## 9. Numerology
Separate, versioned systems (see `NUMEROLOGY_SPEC.md`): Chaldean, Pythagorean, Indian
(Mulank / Bhagyank / Lo Shu grid). Every result shows the letter→number mapping and
each arithmetic step.

- **Name numerology**: full name, first name, variants side by side; compound number +
  reduced number; vowels/consonants (Pythagorean soul urge / personality).
- **Birth date**: Mulank, Bhagyank (life path), personal year/month.
- **Number numerology**: phone, vehicle, house, bank-account last digits, business name,
  launch dates. Compatibility with Mulank/Bhagyank per system.
- **Name-change lab**: try spellings for business or personal name; compare across
  systems; never instructs a legal change.

## 10. Lal Kitab
Separate module, separate rules, see `LAL_KITAB_SPEC.md`. House-based (Lagna = house 1,
signs ignored), Lal Kitab chart view, planet-in-house readings, debts (rin), Varshphal
(annual chart) once its table is sourced, and upay (remedies) linked to exact
conditions.

## 11. Remedies & Ritual Planner
See `REMEDIES_SPEC.md`. Catalogue entries carry: planet/condition link, tradition,
source, type (mantra, puja, vrat, daan, gemstone, Lal Kitab upay, lifestyle), cost
range, time required, safety flags, and the user's own experience log.

Planner: mantra japa counter with schedule, puja/vrat calendar, daan log with monthly
budget cap, gemstone research notes, optional reminders (local notifications only).

## 12. Family & Compatibility
- Separate profiles and charts for wife and daughter.
- Ashtakoot (Guna Milan, 36 points) for spouse only — shown as a traditional score with
  each koota explained. Mangal dosha check with listed cancellation conditions.
- Daughter: chart views and Dasha only. No predictions about health, intelligence or
  fate. Her profile is excluded from AI prompts unless separately enabled.

## 13. AI Assistant
See `AI_ASSISTANT_SPEC.md`. Claude receives structured chart JSON + evaluated rules +
reviewed source notes, answers in a fixed schema (conclusion, evidence with rule IDs,
interpretation, uncertainty, practical next steps, traditional remedies). The server
validates every cited rule ID and planet fact before display. Opt-in, per-person.

## 14. Research Library
Bibliography (title, author, edition, translator, language), owner's notes, rule ↔
source links, review status (`draft` → `reviewed` → `enabled`). No copyrighted book
text stored wholesale; summaries and citations only.

## 15. Privacy, security, backup
- Local SQLite; `data/` git-ignored. Encrypted export (`.jyotish.zip`, AES-256 with
  owner passphrase) and restore.
- Per-person export (JSON) and permanent delete.
- No raw birth details or prompts in logs. No telemetry.
- AI off by default; when on, a disclosure shows exactly which fields are sent.

## 16. MVP acceptance criteria
1. Profiles: create/edit/delete with exact/range/unknown time and confidence.
2. Local time + IANA tz + UTC + coordinates + source stored and displayed.
3. D1 planet longitudes match the `sweph` reference within 0.01° (Moon 0.02°) for all
   synthetic fixtures, under identical settings.
4. Sign, nakshatra, pada, house, D9, D10 match the reference for all fixtures,
   including boundary cases.
5. Vimshottari Dasha start dates match the reference within 1 day.
6. 20 Yoga rules implemented with positive, negative, boundary and missing-data tests.
7. Numerology shows every mapping and step; table-driven tests per letter.
8. Remedies saved with source, cost, safety and personal notes.
9. Export and delete work; restore from backup tested.
10. AI answers only cite existing rule IDs and chart facts (validator test).
11. Every chart page shows calculation settings.
12. Works on a phone-width screen.

## 17. Out of scope
Multi-user SaaS, payments, auto-purchasing stones, puja booking, donation execution,
guaranteed predictions, medical/legal/trading advice, scraping astrology websites,
bulk-importing unreviewed rules.
