import { describe, expect, it } from "vitest";
import { buildAiContext } from "@/ai/context";
import { validateAnswer, type AiAnswer } from "@/ai/schema";
import { wealthIndicators } from "@/business/indicators";
import { computeChart } from "@/engine/chart";
import { evaluateForBirth } from "@/rules/evaluate";

// Synthetic birth with distinctive values so any leak is easy to detect.
const input = { birthDate: "1990-06-15", timeKind: "exact" as const, birthTime: "10:20", lat: 28.6139, lon: 77.209, ianaTz: "Asia/Kolkata" };
const now = new Date("2026-10-11T00:00:00Z");
const chart = computeChart(input, now);
const yogas = evaluateForBirth(input).results;
const ai = buildAiContext(chart, yogas, input.birthDate, now);
const json = JSON.stringify(ai.context);

describe("AI context privacy", () => {
  it("contains no birth date, time, coordinates, timezone or UTC instant", () => {
    for (const secret of ["1990-06-15", "1990", "10:20", "28.61", "77.2", "Asia/Kolkata", chart.chart.utc.slice(0, 10)]) {
      expect(json, `leaked ${secret}`).not.toContain(secret);
    }
  });

  it("has no person-identifying fields (the only \"name\" keys are yoga names)", () => {
    expect(json).not.toMatch(/"(display_name|person|relationship|place|place_name|lat|lon|birth_date|birthDate|birth_time|utc)"\s*:/);
    // buildAiContext takes no person record at all: only the chart, yoga results, the date for numerology, and "now".
    expect(buildAiContext.length).toBe(4);
  });

  it("gives every citable item a reference the validator knows", () => {
    for (const p of ai.context.planets) expect(ai.refs.has(p.ref)).toBe(true);
    for (const y of ai.context.yogas) expect(ai.refs.has(y.ref)).toBe(true);
    for (const r of ai.context.remedies) for (const x of r.practices) expect(ai.refs.has(x.ref)).toBe(true);
    expect(ai.refs.has("dasha:MD")).toBe(true);
  });
});

const good = (): AiAnswer => ({
  conclusion: "A Kendra–Trikona Raja Yoga is present but weak.",
  evidence: [{ ref: "PAR-RY-001", note: "Two lords are conjunct." }, { ref: "planet:Saturn", note: `Saturn in ${ai.signsByPlanet.Saturn[0]}.` }],
  interpretation: "Traditionally indicates recognition, reduced here by weak placement.",
  timing: [{ ref: "dasha:MD", note: "The current Mahadasha." }],
  practical_actions: ["Hire a strong second-in-command."],
  traditional_remedies: [{ ref: "remedy:Saturn-mantra", note: "An optional practice." }],
  uncertainty: ["Rules are unverified drafts."],
  cannot_conclude: ["Whether wealth will come."],
});

describe("answer validation", () => {
  it("accepts an answer that cites only real references and correct placements", () => {
    expect(validateAnswer(good(), ai.refs, ai.signsByPlanet)).toEqual([]);
  });

  it("rejects an invented rule ID or remedy", () => {
    const a = good();
    a.evidence.push({ ref: "PAR-RY-999", note: "made up" });
    a.traditional_remedies.push({ ref: "remedy:Sun-yantra", note: "made up" });
    const kinds = validateAnswer(a, ai.refs, ai.signsByPlanet);
    expect(kinds.filter((i) => i.kind === "unknown_ref")).toHaveLength(2);
  });

  it("rejects a planet placed in a sign it is not in", () => {
    const wrong = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"].find((s) => !ai.signsByPlanet.Saturn.includes(s))!;
    const a = good();
    a.interpretation = `Saturn is in ${wrong}, which is strong.`;
    expect(validateAnswer(a, ai.refs, ai.signsByPlanet).some((i) => i.kind === "wrong_sign")).toBe(true);
  });

  it("rejects guarantee and instruction-to-buy language", () => {
    for (const phrase of ["This is guaranteed to bring wealth.", "You will definitely will get rich.", "It is 100% certain.", "You must buy a blue sapphire."]) {
      const a = good();
      a.conclusion = phrase;
      expect(validateAnswer(a, ai.refs, ai.signsByPlanet).some((i) => i.kind === "banned_phrase"), phrase).toBe(true);
    }
  });

  it("rejects an answer with no evidence", () => {
    const a = good();
    a.evidence = [];
    expect(validateAnswer(a, ai.refs, ai.signsByPlanet).some((i) => i.kind === "empty_evidence")).toBe(true);
  });
});

describe("wealth indicators", () => {
  it("lists the five wealth houses and career data when the Lagna is settled", () => {
    const w = wealthIndicators(chart, yogas, now, true);
    expect(w.houses!.map((h) => h.house)).toEqual([2, 5, 9, 10, 11]);
    expect(w.career).not.toBeNull();
    expect(w.now.md).not.toBeNull();
    for (const x of w.windows) expect(x.reasons.length).toBeGreaterThan(0);
  });

  it("drops house-based indicators when the Lagna is not settled", () => {
    const w = wealthIndicators(chart, yogas, now, false);
    expect(w.houses).toBeNull();
    expect(w.career).toBeNull();
    expect(w.now.mdRules).toEqual([]);
  });
});
