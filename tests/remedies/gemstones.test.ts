import { describe, expect, it } from "vitest";
import { snapshotFromPositions } from "@/engine/chart";
import { PLANETS, SIGNS, type Planet, type Sign } from "@/engine/constants";
import { PLANET_REMEDY, starterRemedies } from "@/remedies/catalogue";
import { assessPlanets } from "@/remedies/gemstones";
import { makeCtx } from "@/rules/context";

const BASE: Record<Planet, [Sign, number]> = {
  Sun: ["Gemini", 10],
  Moon: ["Gemini", 20],
  Mars: ["Taurus", 10],
  Mercury: ["Gemini", 25],
  Jupiter: ["Taurus", 15],
  Venus: ["Taurus", 20],
  Saturn: ["Leo", 10],
  Rahu: ["Pisces", 5],
  Ketu: ["Virgo", 5],
};

function assess(lagna: Sign | null, place: Partial<Record<Planet, [Sign, number]>> = {}) {
  const lon = (s: Sign, d: number) => SIGNS.indexOf(s) * 30 + d;
  const list = PLANETS.map((planet) => {
    const [s, d] = place[planet] ?? BASE[planet];
    return { planet, sidereal: lon(s, d), speed: 1 };
  });
  const rows = assessPlanets(makeCtx(snapshotFromPositions(list, lagna === null ? null : lon(lagna, 15), "2000-01-01T00:00:00.000Z", 23.85)));
  return (p: Planet) => rows.find((r) => r.planet === p)!;
}

describe("gemstone reasoning by lordship (Aries Lagna)", () => {
  const get = assess("Aries");
  it("Lagna lord is considered even though it also rules the 8th", () => {
    expect(get("Mars").role).toBe("considered");
    expect(get("Mars").reasons.join(" ")).toContain("Lagna lord");
  });
  it("pure trikona lord is considered; trikona + dusthana lord is mixed", () => {
    expect(get("Sun").role).toBe("considered"); // 5th
    expect(get("Jupiter").role).toBe("mixed"); // 9th & 12th
  });
  it("dusthana lord is avoided; others neutral", () => {
    expect(get("Mercury").role).toBe("avoided"); // 3rd & 6th
    expect(get("Venus").role).toBe("neutral"); // 2nd & 7th
    expect(get("Saturn").role).toBe("neutral"); // 10th & 11th
  });
  it("Rahu and Ketu are not assessed and carry a caution", () => {
    expect(get("Rahu").role).toBe("not_assessed");
    expect(get("Ketu").cautions.length).toBeGreaterThan(0);
  });
});

describe("weak benefic flag", () => {
  it("set when a benefic lord is debilitated, combust or in a dusthana", () => {
    expect(assess("Aries", { Sun: ["Libra", 10] })("Sun").weakBenefic).toBe(true); // debilitated 5th lord
    expect(assess("Aries", { Sun: ["Leo", 10] })("Sun").weakBenefic).toBe(false);
    expect(assess("Aries", { Mercury: ["Pisces", 10] })("Mercury").weakBenefic).toBe(false); // weak but a dusthana lord
  });
});

describe("without a birth time", () => {
  it("nothing is judged by lordship", () => {
    const get = assess(null);
    for (const p of PLANETS) expect(get(p).role).toBe("not_assessed");
  });
});

describe("starter catalogue", () => {
  it("every planet has a mantra first and daan last; all free or low cost", () => {
    for (const p of PLANETS) {
      const list = starterRemedies(p);
      expect(list[0].kind).toBe("mantra");
      expect(list.at(-1)!.kind).toBe("daan");
      expect(list.every((r) => r.cost !== "high")).toBe(true);
      expect(PLANET_REMEDY[p].stone.length).toBeGreaterThan(0);
    }
  });
});
