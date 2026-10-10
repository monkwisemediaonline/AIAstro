# Lal Kitab Spec

Lal Kitab (Pt. Roop Chand Joshi, editions 1939–1952, originally Urdu) is a distinct
tradition. It uses **houses, not signs**, has its own planet-house judgements, debts
(rin), annual chart (Varshphal) system and its own upay (remedies). It must never share
rules with the Parashari module.

## 1. Module boundaries
- `src/lalkitab/` imports only the base astronomy output (planet longitudes, Ascendant).
  It does not import `src/rules/parashari/*`.
- Rule IDs prefixed `LK-`. Results labelled "Lal Kitab" everywhere.
- A comparison view (Phase 7+) can show Parashari and Lal Kitab side by side, clearly
  split into two columns, never merged into one statement.

## 2. Lal Kitab chart
- House 1 = the Ascendant's house; the chart is drawn with Aries fixed in house 1,
  Taurus in 2 … Pisces in 12 (Kaal Purush order) and planets placed by **house from
  Lagna**, not by sign. (Implementation detail: planet house = whole-sign house from
  D1 Lagna, then render with fixed signs.) Confirm this convention with the chosen
  source edition before enabling.
- Planet set: the nine grahas. Outer planets excluded.

## 3. Concepts to model (each needs a source entry before rules are enabled)
| Concept | Data needed |
|---|---|
| Pakka ghar (permanent house) per planet | table with source page |
| Planet states: sleeping (soya) / awake, blind horoscope (andha teva), etc. | rule definitions with source |
| Friend/enemy planets per Lal Kitab (differs from Parashari) | table |
| Debts (rin): pitru, matru, stri, sambandhi, etc. | condition per debt |
| Planet-in-house results (9 × 12 = 108 judgements) | owner-written summaries + page refs |
| Varshphal (annual chart) | the 120-year house-shift table from the source |
| Upay (remedies) | each linked to exact planet + house condition |

**Do not populate these from memory or from websites.** Many online Lal Kitab tables
conflict. The owner chooses one edition (or a reputable modern commentary) and enters or
confirms the data. Every row stores: edition, page/section, language, translation note,
transcription confidence (high/medium/low), reviewer, date.

## 4. Rule schema
Same structure as `YOGA_RULES_SPEC.md §1`, with `school: "lal_kitab"` and extra fields:
```ts
lk: {
  sourceType: "original_text" | "commentary" | "practitioner" | "owner_note";
  remedyIds: string[];          // links into the remedy catalogue
}
```

## 5. Upay (remedies) handling
- Linked to the exact triggering condition (e.g. "LK-H-SAT-08": Saturn in house 8).
- Safety flags required on every upay that involves: animals (feeding, releasing),
  food items into water/fire, rivers/flowing water, public places, travel, donations,
  alcohol/meat abstinence, metals worn on skin.
- Rule: if an upay could harm animals, people, the environment, or break local law, it
  is stored as `blocked` with the reason, not shown as a recommendation.
- 40/43-day upay schedules: tracked in the Ritual Planner as an optional practice with
  start date and daily check-off. No reminders unless the owner turns them on.

## 6. Phase order inside Lal Kitab
1. Chart rendering (house-based) + planet list — testable without interpretation.
2. Source registry and data-entry screens for tables.
3. Pakka ghar + planet-in-house judgements (owner-reviewed).
4. Debts (rin) detection.
5. Upay catalogue linked to conditions.
6. Varshphal once its table is entered and cross-checked with two independent
   reference charts.

## 7. Tests
- Chart: house placement for synthetic fixtures; Lagna in every sign.
- Isolation: a test asserting no import path from `src/lalkitab` to `src/rules/parashari`.
- Each LK rule: positive/negative/missing-time tests.
- Every remedy record has source + safety flags (schema test).
