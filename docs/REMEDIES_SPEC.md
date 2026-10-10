# Remedies & Ritual Planner Spec

The app catalogues traditional remedies and tracks the owner's practice. It does not
prescribe, pressure, purchase, donate or book. Every remedy is labelled as a
**traditional practice**; none is presented as a proven cause of wealth or any outcome.

## 1. Remedy record
```ts
type Remedy = {
  id: string;                      // "REM-JUP-MANTRA-01"
  type: "mantra" | "puja" | "vrat" | "daan" | "gemstone" | "rudraksha" | "yantra"
      | "lal_kitab_upay" | "lifestyle" | "seva";
  tradition: "parashari" | "lal_kitab" | "general_hindu" | "sikh" | "other";
  planets: Planet[];               // what it is traditionally linked to
  triggers: string[];              // rule IDs or conditions (e.g. "PAR-RY-001:weak", "LK-H-SAT-08")
  title: string; description: string;   // owner-written summary
  sources: Source[];
  attribution: "classical_text" | "commentary" | "practitioner" | "family" | "owner";
  costRange?: { minInr: number; maxInr: number; note: string };
  timeRequired?: string;           // "15 min daily for 40 days"
  safetyFlags: SafetyFlag[];       // see §4
  status: "draft" | "reviewed" | "enabled" | "blocked";
  blockedReason?: string;
};
```

## 2. How remedies are suggested (deterministic)
1. Rule engine produces Yoga results + planet conditions (weak/afflicted/strong).
2. Remedy matcher selects catalogue entries whose `triggers` or `planets` match.
3. Ordered by: (a) zero-cost practices first (mantra, seva, lifestyle), (b) low cost,
   (c) gemstones last, each with its reasoning.
4. The AI may phrase the explanation, but only from the matched records.

## 3. Gemstone reasoning (Parashari, labelled as a practice with disagreement)
Traditional pairs: Sun–Ruby (Manik), Moon–Pearl (Moti), Mars–Red Coral (Moonga),
Mercury–Emerald (Panna), Jupiter–Yellow Sapphire (Pukhraj), Venus–Diamond (Heera; white
sapphire as alternative), Saturn–Blue Sapphire (Neelam), Rahu–Hessonite (Gomed),
Ketu–Cat's eye (Lehsunia). Upratnas (substitutes) stored as alternatives.

Reasoning the app shows (common Parashari approach, label as one school's view):
- Usually considered for **functional benefics**: Lagna lord, 5th lord, 9th lord, and
  yogakaraka — to strengthen a *weak* benefic.
- Usually **avoided** for lords of 6, 8, 12 and for planets that are both a benefic lord
  and a dusthana lord (mixed — show as "practitioner judgement needed").
- Blue Sapphire and Cat's eye: "high-caution stones" flag in many traditions; trial
  periods are a practitioner custom — note only.
- Output: candidate stones with reasons, stones to avoid with reasons, alternatives
  (mantra, daan) for the same planet, and an explicit "practitioners disagree" note.

Always show: counterfeit/treated-stone warning, lab certificate advice, user-entered
budget cap, skin sensitivity note for metals, and that no stone is mandatory. No links
to sellers. No purchase actions.

## 4. Safety flags
`animal_involved`, `food_waste`, `water_body`, `fire`, `public_place`, `travel`,
`large_cost`, `fasting_health`, `metal_on_skin`, `legal_check`, `third_party_involved`.
- `fasting_health`: show "consult a doctor if you have a medical condition, are
  pregnant, or take medication".
- `large_cost`: anything above the owner's monthly remedy budget is shown with a warning.
- Remedies that could harm animals, people, the environment, or break law: `blocked`.
- Never suggest stopping medical treatment or replacing professional advice.

## 5. Ritual planner
- **Mantra japa**: mantra text (owner-entered), target count, mala counter (tap to count,
  108 per mala), daily schedule, streak, notes.
- **Puja / vrat calendar**: date, deity, intention, done/not done, notes. Tithi-based
  dates (Ekadashi, Purnima, Pradosh) only once a Panchang module is implemented and
  tested; until then owner enters dates manually.
- **Daan log**: item, recipient type, amount, date, monthly budget cap with progress bar.
- **Gemstone research notes**: candidate, reasoning snapshot (rule versions), quotes from
  practitioners, cost, decision, and date — the app records the decision, not makes it.
- **Experience log**: free text + 1–5 self-rating, linked to the remedy, so the owner can
  review honestly later.
- Reminders: local browser notifications, opt-in per item.

## 6. Business action pairing
Every remedy view for wealth/career Yogas shows a "practical actions" column next to it,
from a small owner-editable library keyed by house:
- 2nd: savings rate, pricing, family business ties
- 10th: leadership visibility, hiring a #2, process and authority
- 11th: network, partnerships, new revenue channels, sales pipeline
- 7th: partnerships/contracts review, key customers
- 3rd: marketing output, outreach volume, courage to pitch
- 5th: product creativity, speculative bets kept small
- 9th: mentors, learning, ethical conduct
The owner sets targets; the Business dashboard tracks them.

## 7. Tests
- Schema: every enabled remedy has source, attribution, safety flags.
- Matcher: deterministic ordering; gemstone never appears first; dusthana-lord stones
  appear only under "avoid" or "mixed".
- No component renders a purchase/donate/book button (UI test).
