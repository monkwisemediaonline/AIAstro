# Yoga Rules Spec — Raj Yoga, Dhana Yoga, Mahapurusha and others

Rules are **data + small predicate functions**, evaluated deterministically against a
`ChartResult`. The LLM never decides whether a Yoga exists.

## 1. Rule schema

```ts
type YogaRule = {
  id: string;                    // "PAR-RY-001" (school-category-number), never reused
  name: string;                  // "Kendra–Trikona Raja Yoga"
  aliases?: string[];
  school: "parashari" | "jaimini" | "kp" | "lal_kitab";
  category: "raja" | "dhana" | "mahapurusha" | "chandra" | "viparita" | "neecha_bhanga"
          | "arishta" | "other";
  sources: { text: string; locator: string; edition?: string; note?: string }[];
  status: "draft" | "reviewed" | "enabled" | "disabled";
  version: string;               // semver; bump when predicate changes
  requires: { ascendant: boolean; moon: boolean; vargas?: ("D9" | "D10")[] };
  reference: "lagna" | "moon" | "lagna_or_moon";
  predicate: (c: ChartResult, s: ChartSettings) => Condition[];  // all must hold
  modifiers: Modifier[];         // strengthen / weaken, never flip status
  cancellations: Cancellation[]; // can flip Detected → Cancelled
  interpretation: { summary: string; houses: number[]; themes: string[] };
  tests: string[];               // fixture IDs: positive, negative, boundary, missing
};

type Condition = { id: string; text: string; met: boolean | "unknown"; facts: Fact[] };
type Fact = { kind: "placement" | "lordship" | "relation" | "dignity" | "aspect";
              planet?: Planet; house?: number; sign?: Sign; detail: string };
type YogaResult = {
  ruleId: string; ruleVersion: string;
  status: "detected" | "partial" | "not_detected" | "cancelled" | "indeterminate";
  instances: { planets: Planet[]; houses: number[]; conditions: Condition[] }[];
  modifiers: { id: string; effect: "strengthen" | "weaken"; text: string; facts: Fact[] }[];
  strength?: StrengthBreakdown;   // heuristic, see §4
  dashaLinks: { lord: Planet; level: "MD" | "AD"; start: string; end: string }[];
};
```

**Status logic**
- Any required input missing (e.g. no birth time and rule needs Ascendant) → `indeterminate`.
- Birth time is a range and result differs across the range → `indeterminate` with the
  sub-results per time shown.
- All conditions met → `detected`, then cancellations checked → may become `cancelled`.
- Some but not all core conditions met (rule declares which conditions are "core")
  → `partial`. Partial is how the "how to activate" panel finds near-misses.

## 2. Shared definitions (see ENGINE_SPEC)
- Kendras: 1, 4, 7, 10. Trikonas: 1, 5, 9. Dusthanas: 6, 8, 12. Upachayas: 3, 6, 10, 11.
  Dhana houses: 2, 5, 9, 11 (+1).
- `lord(h)` = ruler of the sign on house h (whole-sign from Lagna, or from Moon when the
  rule's reference is Moon).
- Natural benefics: Jupiter, Venus, well-associated Mercury, waxing Moon (Moon is benefic
  when its elongation from the Sun is 72°–288°, configurable; Mercury is malefic if
  conjunct a malefic — setting). Natural malefics: Sun, Mars, Saturn, Rahu, Ketu,
  waning Moon.
- `related(A,B)` relation types: conjunction, mutual_aspect, exchange (strong);
  one_way_aspect (weak). Each rule lists what counts.
- When one planet owns both houses in a pair, that is a self-relation (yogakaraka) and is
  handled by PAR-RY-002, not double-counted in PAR-RY-001.

## 3. First rule set (v1.0.0) — all start as `draft`

Source locators are **candidates to verify** against the owner's edition (chapter
numbering differs between BPHS translations). A rule moves to `enabled` only after the
owner (or Claude, with the owner confirming) checks the source in the Research Library.

### Raja Yogas

**PAR-RY-001 Kendra–Trikona Raja Yoga**
- Sources: BPHS, Raja Yoga chapter (Santhanam ed. ~Ch. 39–41); Phaladeepika Ch. 6.
- Requires: Ascendant. Reference: lagna.
- Predicate: for each pair (K, T), K ∈ {4,7,10} lords, T ∈ {5,9} lords, `lord(K) ≠ lord(T)`:
  `related(lord(K), lord(T))` via conjunction | mutual_aspect | exchange.
  Lagna lord counts as both kendra and trikona lord: also test (1, 4/7/10/5/9).
- Each matching pair is one instance; list all.
- Modifiers: either lord debilitated (weaken), combust (weaken), in a dusthana (weaken),
  also owns 6/8/12 (weaken — "tainted lordship"), exalted/own/moolatrikona (strengthen),
  same in D9 (strengthen), joined by 6/8/12 lords (weaken), aspected by Jupiter (strengthen).
- Interpretation houses: K and T involved. Themes: status, authority, recognition.

**PAR-RY-002 Yogakaraka planet**
- Predicate: a single planet (not the Lagna lord) owns one kendra (4/7/10) and one
  trikona (5/9). Happens for: Taurus & Libra Lagna → Saturn; Cancer & Leo → Mars;
  Capricorn & Aquarius → Venus. Derive from tables, do not hard-code the list.
- Status `detected` = yogakaraka exists. Strength from its dignity, house, combustion,
  D9 sign. Always link its Mahadasha/Antardasha periods.

**PAR-RY-003 Dharma–Karmadhipati Yoga**
- Predicate: `related(lord(9), lord(10))` via conjunction | mutual_aspect | exchange.
- Special case of PAR-RY-001 shown separately because it is named in texts. Mark
  instance as "also counted in PAR-RY-001" to avoid double counting in summaries.

**PAR-RY-004 Maha Parivartana Yoga**
- Predicate: exchange of signs between lords of two houses both in {1,2,4,5,7,9,10,11}.
- Sources: Phaladeepika Ch. 6 (parivartana: maha / khala / dainya).
- Also classify khala (involves 3rd) and dainya (involves 6/8/12) and show them as
  separate rules PAR-OT-001/002 (dainya = weakening).

**PAR-VR-001/002/003 Viparita Raja Yoga — Harsha / Sarala / Vimala**
- Sources: Phaladeepika Ch. 6; BPHS (effects of dusthana lords).
- Harsha: lord(6) placed in 6, 8 or 12. Sarala: lord(8) in 6, 8 or 12. Vimala: lord(12)
  in 6, 8 or 12.
- Common stricter variant (setting `viparitaStrict`): the dusthana lord is not conjunct
  or aspected by lords of kendras/trikonas, and not conjunct the Lagna lord.
- Cancellation (variant, labelled): dusthana lord also owns a kendra/trikona — treat as
  mixed, shown as modifier not cancellation unless setting says otherwise.

**PAR-NB-001 Neecha Bhanga Raja Yoga**
- Precondition: planet P debilitated in D1.
- Sub-conditions (each a separate condition; any one = Neecha Bhanga; ≥2 = stronger):
  1. Lord of P's debilitation sign is in a kendra from Lagna or Moon.
  2. Lord of P's exaltation sign is in a kendra from Lagna or Moon.
  3. Planet that gets exalted in P's debilitation sign is in a kendra from Lagna or Moon.
  4. Lord of the debilitation sign aspects P.
  5. P is exchanged with the lord of its debilitation sign.
  6. P is exalted in D9 (Navamsha). (Variant — label as such.)
  7. P is conjunct the lord of its debilitation sign or its exaltation lord. (Variant.)
- Sources: Phaladeepika Ch. 7; Saravali. Each sub-condition records its source.
- "Raja" upgrade: only when ≥1 condition met AND P or the canceller is in a kendra
  (setting; label as interpretive).

### Pancha Mahapurusha Yogas
**PAR-PM-001..005 Ruchaka (Mars), Bhadra (Mercury), Hamsa (Jupiter), Malavya (Venus),
Sasa (Saturn)**
- Sources: BPHS Mahapurusha chapter; Phaladeepika Ch. 6.
- Predicate: planet in its own sign or exaltation sign AND in a kendra (1/4/7/10) from
  Lagna. Setting `mahapurushaFromMoon` (default false) also allows kendra from Moon,
  labelled as variant.
- Modifiers: combust (weaken; some authors cancel — setting), conjunct Sun/Moon (some
  texts say yields different results — modifier), retrograde (note only), aspected by
  malefics (weaken), D9 dignity (strengthen/weaken).

### Chandra / benefic yogas
**PAR-GK-001 Gajakesari Yoga**
- Predicate: Jupiter in a kendra (1/4/7/10) from the Moon.
- Modifiers: Jupiter debilitated/combust/in enemy sign (weaken); Jupiter or Moon in
  6/8/12 from Lagna (weaken); aspect from Mercury/Venus (strengthen); Moon waxing
  (strengthen).
- Note in UI: very common (~1 in 3 charts); weight accordingly.

**PAR-CH-001 Adhi Yoga** — natural benefics (Mercury, Jupiter, Venus) in the 6th, 7th
and/or 8th from the Moon; full form = all three houses occupied by benefics; partial if
some. Not conjunct/aspected by malefics (modifier).

**PAR-CH-002 Chandra–Mangala Yoga** — Moon and Mars conjunct (or mutual aspect,
setting). Theme: earning through enterprise. Sources: Phaladeepika.

**PAR-CH-003 Amala Yoga** — only natural benefic(s) in the 10th from Lagna or from Moon,
no malefic in that house.

**PAR-CH-004 Vasumati Yoga** — natural benefics occupy upachaya houses (3, 6, 10, 11)
from Lagna or from Moon. Full form: all benefics in upachayas. Theme: wealth.

**PAR-OT-003 Budhaditya Yoga** — Sun and Mercury conjunct. Mercury not combust within
setting orb for strength. Mark "very common; low weight".

### Dhana Yogas
**PAR-DY-001 2nd–11th lord Dhana Yoga** — `related(lord(2), lord(11))` (conjunction,
mutual aspect, exchange).

**PAR-DY-002 Trikona–Dhana Yoga** — `related(X, Y)` where X ∈ {lord(5), lord(9)} and
Y ∈ {lord(2), lord(11)}; also lord(1) with any of these. Each pair an instance.
Source: BPHS Dhana Yoga chapter.

**PAR-DY-003 Lakshmi Yoga** — lord(9) in own/moolatrikona/exaltation sign in a kendra or
trikona AND Lagna lord strong (own/exalted/moolatrikona, or in kendra/trikona, not
combust/debilitated). Source: Phaladeepika Ch. 6 / BPHS. Variants exist — record which.

**PAR-DY-004 Lords of wealth in the 11th** — lord(2), lord(5) or lord(9) placed in 11th
with dignity ≥ neutral; or lord(11) in 2nd/5th/9th. Modifier-based, labelled
"product grouping of classical indications", not a named classical yoga.

### Counter-indications (shown for honesty)
**PAR-AR-001 Kemadruma Yoga** — no planet (excluding Sun, Rahu, Ketu) in the 2nd or 12th
from the Moon.
Cancellations (each listed): planet in a kendra from Moon; planet in a kendra from
Lagna; Moon in a kendra aspected by Jupiter; Moon conjunct a planet (setting).

**PAR-AR-002 Weak wealth lords (product indicator)** — lord(2) or lord(11) in 6/8/12,
debilitated or combust. Labelled as an indicator, not a named yoga.

## 4. Strength rubric (product heuristic — label it so in the UI)
Never collapse into one unexplained number. Show each component:

| Component | Values |
|---|---|
| Dignity of each participating planet (D1) | exalted +2, MT +1.5, own +1, friend +0.5, neutral 0, enemy −0.5, debilitated −2 (−0.5 if Neecha Bhanga) |
| D9 dignity of same planets | half the D1 values |
| House of placement | kendra/trikona +1, upachaya +0.5, dusthana −1 |
| Combustion | −1 |
| Tainted lordship (also rules 6/8/12) | −0.5 per planet |
| Benefic aspect (Jupiter) | +0.5 |
| Malefic aspect / conjunction (Saturn, Mars, Rahu, Ketu) | −0.5 each |
| Relation type | exchange +1, conjunction +1, mutual aspect +0.75, one-way +0.25 |
| Dasha availability | lord's MD/AD active or within next 10 years: shown, not scored |

Bands: ≥ 4 "strong", 1.5–4 "moderate", < 1.5 "weak". The bands and weights are
configurable and versioned. The UI always shows the table, never just the band.

## 5. Life-area mapping (for interpretation and dashboards)
| Area | Houses / karakas |
|---|---|
| Wealth (accumulated) | 2, 11; Jupiter; D2 |
| Business / career / authority | 10, 7 (partners, trade), 3 (initiative), 11 (gains); Sun, Saturn, Mercury; D10 |
| Fortune / luck | 9, 5; Jupiter |
| Love / marriage / wife | 7, 5 (romance), 2 (family), 12 (bed comforts); Venus; D9 |
| Children / daughter | 5; Jupiter; D7 |
| Self / health / vitality | 1, 6, 8; Sun, Moon |
These feed the Business & Wealth and Family dashboards and the AI context selection.

## 6. Tests per rule (mandatory)
For every rule: ≥1 positive fixture, ≥1 negative, ≥1 boundary (planet at 29°59' or
0°00' of a sign so a 1-arcminute change flips the sign), ≥1 missing-data (no birth time
→ indeterminate if rule needs Ascendant), and every cancellation path. Fixtures are
**synthetic chart JSON** (hand-built placements), not real people.

## 7. Adding new rules
1. Add source to Research Library. 2. Write predicate + tests. 3. Status `draft`.
4. Owner reviews in the Library UI → `reviewed`. 5. Enable. Rule IDs never change; edits
bump `version` and old results keep their version stamp.
