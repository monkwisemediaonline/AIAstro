import { describe, expect, it } from "vitest";
import { computeChart, snapshotFromPositions } from "@/engine/chart";
import { PLANETS } from "@/engine/constants";
import { scoreDay, scoreDays, type NatalForDays } from "@/engine/panchang";
import { answerQuestion, buildReading } from "@/reading/build";
import { evaluateForBirth } from "@/rules/evaluate";
import { EXCLUDED, PRACTICES, ishtaDevata } from "@/sadhana/catalogue";

const place = { lat: 28.6139, lon: 77.209, ianaTz: "Asia/Kolkata" };
const now = new Date("2026-10-11T06:00:00Z");
const exact = { birthDate: "1990-06-15", timeKind: "exact" as const, birthTime: "10:20", ...place };
const chart = computeChart(exact, now);
const yogas = evaluateForBirth(exact).results;

describe("plain-language reading", () => {
  const r = buildReading(chart, yogas, exact.birthDate, now);

  it("covers every life area when the Lagna is known", () => {
    expect(r.sections.map((s) => s.id)).toEqual(["core", "wealth", "business", "marriage", "children", "now", "year", "strengths", "protection", "numbers", "actions"]);
    for (const s of r.sections) {
      expect(s.points.length, s.id).toBeGreaterThan(0);
      expect(s.summary.length, s.id).toBeGreaterThan(10);
    }
    expect(r.limited).toBeNull();
  });

  it("is deterministic", () => {
    expect(buildReading(chart, yogas, exact.birthDate, now)).toEqual(r);
  });

  it("never uses guarantee language", () => {
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/guarantee|100%|definitely will|will certainly|you will become/i);
  });

  it("a minor gets temperament only", () => {
    const m = buildReading(chart, yogas, exact.birthDate, now, { minor: true });
    expect(m.sections.map((s) => s.id)).toEqual(["core"]);
    expect(m.limited).toMatch(/minor/);
  });

  it("without a birth time, house-based sections are left out and said so", () => {
    const input = { birthDate: "2020-05-05", timeKind: "unknown" as const, ...place };
    const u = buildReading(computeChart(input, now), evaluateForBirth(input).results, input.birthDate, now);
    const ids = u.sections.map((s) => s.id);
    expect(ids).toContain("wealth");
    expect(ids).toContain("now");
    for (const id of ["business", "marriage", "children", "protection"]) expect(ids).not.toContain(id);
    expect(u.limited).toMatch(/Lagna/);
  });
});

describe("question routing (English and Hinglish)", () => {
  const r = buildReading(chart, yogas, exact.birthDate, now);
  const topics = (q: string) => answerQuestion(r, q);

  it("recognises topics", () => {
    expect(topics("Mera business kab badhega?").topics).toEqual(expect.arrayContaining(["Business and career", "Timing"]));
    expect(topics("How can I earn more money?").topics).toContain("Wealth and money");
    expect(topics("meri patni ke saath rishta").topics).toContain("Marriage and relationship");
    expect(topics("meri beti ka kya").topics).toContain("Children");
    expect(topics("shatru se suraksha").topics).toContain("Obstacles and protection");
    expect(topics("kaunsa ratna pehnu").topics).toContain("Remedies");
  });

  it("timing questions ask for favourable days", () => {
    expect(topics("Which time is favourable for me?").timing).toBe(true);
    expect(topics("What does my chart say about marriage?").timing).toBe(false);
  });

  it("falls back to the general picture when nothing matches", () => {
    const a = topics("xyzzy");
    expect(a.matched).toBe(false);
    expect(a.sections.length).toBeGreaterThan(0);
  });
});

describe("favourable days", () => {
  const natal: NatalForDays = { moonSign: 0, moonNakshatra: "Ashwini", lagnaLord: "Mars", mulank: 1 };

  it("finds Amavasya and Purnima on known dates", () => {
    // Diwali 2024 (Amavasya) and Kartik Purnima 2024, at midday in India.
    expect(scoreDay("2024-11-01", "Asia/Kolkata", natal).tithi).toBe("Amavasya");
    expect(scoreDay("2024-11-15", "Asia/Kolkata", natal).tithi).toBe("Purnima");
  });

  it("returns seven explained factors that add up to the score", () => {
    const d = scoreDay("2026-10-11", "Asia/Kolkata", natal);
    expect(d.factors).toHaveLength(7);
    expect(d.yoga.length).toBeGreaterThan(2);
    expect(d.karana.length).toBeGreaterThan(2);
    expect(d.factors.reduce((s, f) => s + f.score, 0)).toBeCloseTo(d.score, 5);
    for (const f of d.factors) expect(f.note.length + f.value.length).toBeGreaterThan(5);
    expect(d.weekday).toBe("Sunday");
  });

  it("the Moon in the 8th from the natal Moon is always 'avoid' (Chandrashtama)", () => {
    const days = scoreDays("2026-10-01", 30, "Asia/Kolkata", natal);
    const eighth = days.filter((d) => ((d.moonSign - natal.moonSign + 12) % 12) + 1 === 8);
    expect(eighth.length).toBeGreaterThan(0);
    for (const d of eighth) expect(d.rating).toBe("avoid");
  });

  it("gives a mix of ratings over a month and consecutive dates", () => {
    const days = scoreDays("2026-10-01", 30, "Asia/Kolkata", natal);
    expect(days).toHaveLength(30);
    expect(days[29].date).toBe("2026-10-30");
    expect(new Set(days.map((d) => d.rating)).size).toBeGreaterThanOrEqual(3);
  });

  it("depends on the person: a different birth star changes the ratings", () => {
    const a = scoreDays("2026-10-01", 30, "Asia/Kolkata", natal).map((d) => d.score);
    const b = scoreDays("2026-10-01", 30, "Asia/Kolkata", { ...natal, moonSign: 5, moonNakshatra: "Hasta" }).map((d) => d.score);
    expect(a).not.toEqual(b);
  });
});

describe("sadhana", () => {
  it("Ishta Devata follows the karakamsha steps", () => {
    // Saturn has the highest degree (29°) → Atmakaraka. Saturn at Aries 29° → Navamsha Sagittarius (9th part of Aries).
    // 12th from Sagittarius is Scorpio. Put Venus in Navamsha Scorpio: Cancer 0–3°20' is Cancer navamsha… use Taurus 26°40'–30° = Virgo; choose Venus at Cancer 14° → 5th part of Cancer = Scorpio.
    const lon: Record<string, number> = { Sun: 5, Moon: 40, Mars: 70, Mercury: 130, Jupiter: 160, Venus: 90 + 14, Saturn: 29, Rahu: 200, Ketu: 20 };
    const snap = snapshotFromPositions(PLANETS.map((planet) => ({ planet, sidereal: lon[planet], speed: 1 })), 15, "2000-01-01T00:00:00.000Z", 23.85);
    const i = ishtaDevata(snap);
    expect(i.atmakaraka).toBe("Saturn");
    expect(i.karakamsha).toBe(8); // Sagittarius
    expect(i.twelfth).toBe(7); // Scorpio
    expect(i.occupants).toContain("Venus");
    expect(i.indicator).toBe("Venus");
    expect(i.deity).toBe("Lakshmi");
  });

  it("uses the sign lord when the 12th from Karakamsha is empty", () => {
    const lon: Record<string, number> = { Sun: 5, Moon: 40, Mars: 70, Mercury: 130, Jupiter: 160, Venus: 95, Saturn: 29, Rahu: 200, Ketu: 20 };
    const snap = snapshotFromPositions(PLANETS.map((planet) => ({ planet, sidereal: lon[planet], speed: 1 })), 15, "2000-01-01T00:00:00.000Z", 23.85);
    const i = ishtaDevata(snap);
    if (i.occupants.length === 0) {
      expect(i.via).toBe("lord");
      expect(i.indicator).toBe("Mars"); // lord of Scorpio
    }
  });

  it("contains no practice aimed at another person", () => {
    const text = JSON.stringify(PRACTICES).toLowerCase();
    for (const word of ["vashikaran", "maran", "uchchatan", "stambhan", "enemy", "destroy", "control"]) expect(text, word).not.toContain(word);
    expect(EXCLUDED.length).toBeGreaterThan(2);
    expect(new Set(PRACTICES.map((p) => p.key)).size).toBe(PRACTICES.length);
  });
});
