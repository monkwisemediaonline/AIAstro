# AI Assistant Spec (Claude inside the app)

Claude explains; the engine calculates. The assistant is off until enabled in Settings,
and each person needs their own `ai_allowed` flag. The daughter's profile is excluded by
default.

## 1. Pipeline
1. Owner asks a question on a person's page (e.g. "Is my Raj Yoga strong? How do I
   activate it for business?").
2. **Context builder** (`src/ai/context.ts`) selects only what the question needs:
   - chart facts: planet table (sign, house, nakshatra, dignity, retro, combust),
     Ascendant, relevant varga rows
   - evaluated Yoga results with conditions, modifiers, strength breakdown
   - current + next Dasha periods (MD/AD with dates)
   - matched remedy records and practical-action library rows
   - reviewed source notes for the rules involved
   - **never**: name, exact birth date, birthplace, coordinates. Persons are referred to
     as "the native" / "spouse". Birth time shown only as confidence level.
3. **Prompt**: system prompt (below) + context JSON + question.
4. **Structured output** via tool use / JSON schema (below).
5. **Validator** (`src/ai/validate.ts`) checks the response:
   - every `ruleId` exists in the context
   - every planet/house/sign fact quoted matches the chart JSON
   - no dates outside the provided Dasha periods
   - banned phrases (guarantee, 100%, definitely will, must buy, …) → reject + retry once
   - if validation fails twice, show the raw evaluated rules instead of AI text
6. Display with "show calculation" and "show sources" buttons per evidence row.

## 2. Model
Default `claude-opus-5-5`, overridable with `ANTHROPIC_MODEL` (for example `claude-sonnet-5-5` for lower cost).
Implemented in `src/ai/ask.ts` with `client.beta.messages.parse` + `betaZodOutputFormat` (structured output),
the chart context cached in the system prompt, and the server-side refusal fallback (`fallbacks: "default"`).
Server-side only; key in `ANTHROPIC_API_KEY`.

## 3. System prompt (starting point)
```
You are an explainer inside a private Vedic astrology research tool.
You receive computed chart data and rule-engine results as JSON. Treat them as the only
facts. Do not calculate positions, degrees, houses, dashas or numerology yourself, and do
not add yogas or rules that are not in the input.

School: {selectedSchool}. Do not mix in other schools unless the input contains a
labelled comparison section.

Answer in the required JSON schema:
- conclusion: 2–4 plain sentences
- evidence: list of {ruleId or fact, what it shows}
- interpretation: traditional meaning, framed as "traditionally indicates", not prediction
- timing: relevant dasha/transit windows from the input only
- practical_actions: concrete business/life actions that make sense regardless of astrology
- traditional_remedies: only from the provided remedy records, with their IDs and safety notes
- uncertainty: what is uncertain or missing (birth time, unverified rules, conflicting factors)
- cannot_conclude: what this data cannot tell

Never promise wealth, marriage outcomes, health or any event. Never advise investing,
borrowing, quitting a job, medical changes, or buying anything because of the chart.
Be warm, direct and specific. Write in the owner's chosen language (English / Hindi /
Hinglish).
```

## 4. Output schema (Zod)
```ts
const AiAnswer = z.object({
  conclusion: z.string().max(800),
  evidence: z.array(z.object({ ref: z.string(), note: z.string() })).min(1),
  interpretation: z.string(),
  timing: z.array(z.object({ periodRef: z.string(), note: z.string() })),
  practical_actions: z.array(z.string()).max(8),
  traditional_remedies: z.array(z.object({ remedyId: z.string(), note: z.string() })),
  uncertainty: z.array(z.string()),
  cannot_conclude: z.array(z.string()),
});
```

## 5. Disclosure & storage
- Before first use, a modal lists the exact fields that will be sent and to which provider.
- Conversations are not stored unless the owner turns it on. Prompts are never logged.

## 6. Tests
- Validator rejects: unknown rule ID, wrong planet sign, invented date, banned phrase.
- Context builder never includes name/date/place/lat/lon (snapshot test).
- Daughter profile excluded unless `ai_allowed`.
- Mocked provider in tests; no real API calls in CI.
