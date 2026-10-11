import { z } from "zod";
import { PLANETS, SIGNS, type Planet } from "@/engine/constants";

/** The shape every answer must take. Evidence and remedies must cite reference IDs from the context. */
export const AiAnswer = z.object({
  conclusion: z.string().describe("2-4 plain sentences answering the question directly."),
  evidence: z
    .array(z.object({ ref: z.string().describe("A reference ID copied exactly from the context, e.g. PAR-RY-001, planet:Saturn, dasha:AD, transit:Jupiter."), note: z.string() }))
    .describe("The chart facts and rule results the conclusion rests on."),
  interpretation: z.string().describe("The traditional meaning, phrased as 'traditionally indicates', never as prediction."),
  timing: z.array(z.object({ ref: z.string().describe("A dasha: or transit: reference ID from the context."), note: z.string() })),
  practical_actions: z.array(z.string()).describe("Concrete actions that make sense regardless of astrology."),
  traditional_remedies: z.array(z.object({ ref: z.string().describe("A remedy: reference ID from the context."), note: z.string() })),
  uncertainty: z.array(z.string()).describe("What is uncertain or missing: birth time, unverified rules, conflicting factors."),
  cannot_conclude: z.array(z.string()).describe("What this data cannot tell."),
});
export type AiAnswer = z.infer<typeof AiAnswer>;

const BANNED = [
  /\bguarantee[ds]?\b/i,
  /\b100\s?%/i,
  /\bdefinitely will\b/i,
  /\bwill certainly\b/i,
  /\bis certain to\b/i,
  /\bwithout (a )?doubt\b/i,
  /\byou (must|should|need to) (buy|wear|purchase)\b/i,
  /\b(invest|borrow|take a loan|quit your job)\b.*\bbecause\b.*\b(chart|dasha|yoga|transit)\b/i,
];

export type ValidationIssue = { kind: "unknown_ref" | "banned_phrase" | "wrong_sign" | "empty_evidence"; detail: string };

/**
 * Server-side check of a model answer against the context it was given.
 * - every cited reference must exist
 * - no guarantee / instruction-to-buy language
 * - "<Planet> in <Sign>" must match a sign that planet actually occupies (natal, Navamsha or transit)
 */
export function validateAnswer(answer: AiAnswer, refs: ReadonlySet<string>, signsByPlanet: Record<Planet, string[]>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (answer.evidence.length === 0) issues.push({ kind: "empty_evidence", detail: "No evidence was cited." });
  for (const e of [...answer.evidence, ...answer.timing, ...answer.traditional_remedies]) {
    if (!refs.has(e.ref)) issues.push({ kind: "unknown_ref", detail: `"${e.ref}" is not a reference in the context.` });
  }
  const text = [answer.conclusion, answer.interpretation, ...answer.evidence.map((e) => e.note), ...answer.timing.map((t) => t.note), ...answer.practical_actions, ...answer.traditional_remedies.map((r) => r.note)].join("\n");
  for (const re of BANNED) {
    const m = text.match(re);
    if (m) issues.push({ kind: "banned_phrase", detail: `Contains "${m[0]}".` });
  }
  const re = new RegExp(`\\b(${PLANETS.join("|")})\\b(?:\\s+is|\\s+sits|\\s+placed)?\\s+in\\s+(${SIGNS.join("|")})\\b`, "g");
  for (const m of text.matchAll(re)) {
    const planet = m[1] as Planet;
    if (!signsByPlanet[planet].includes(m[2])) issues.push({ kind: "wrong_sign", detail: `Says ${planet} in ${m[2]}, but ${planet} is in ${signsByPlanet[planet].join(" / ")}.` });
  }
  return issues;
}
