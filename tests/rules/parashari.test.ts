import { describe, expect, it } from "vitest";
import { snapshotFromPositions } from "@/engine/chart";
import { PLANETS, SIGNS, type Planet, type Sign } from "@/engine/constants";
import { evaluateForBirth, evaluateSnapshot } from "@/rules/evaluate";
import { PARASHARI_RULES } from "@/rules/parashari";
import type { YogaResult } from "@/rules/types";

type Place = Partial<Record<Planet, [Sign, number?]>>;

// A deliberately dull base chart; each test overrides what it needs.
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

function chart(lagna: Sign | null, place: Place = {}) {
  const lon = (s: Sign, d: number) => SIGNS.indexOf(s) * 30 + d;
  const list = PLANETS.map((planet) => {
    const [s, d] = place[planet] ?? BASE[planet];
    return { planet, sidereal: lon(s, d ?? BASE[planet][1]), speed: planet === "Rahu" || planet === "Ketu" ? -0.05 : 1 };
  });
  return snapshotFromPositions(list, lagna === null ? null : lon(lagna, 15), "2000-01-01T00:00:00.000Z", 23.85);
}

const run = (lagna: Sign | null, place: Place = {}) => {
  const results = evaluateSnapshot(chart(lagna, place));
  return (id: string): YogaResult => results.find((r) => r.ruleId === id)!;
};

describe("rule set integrity", () => {
  it("has unique IDs and every rule returns conditions", () => {
    const ids = PARASHARI_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of evaluateSnapshot(chart("Aries"))) {
      expect(r.verification).toBe("unverified");
      expect(r.conditions.length, r.ruleId).toBeGreaterThan(0);
    }
  });

  it("rules that need the Ascendant are indeterminate without a birth time", () => {
    const get = run(null);
    expect(get("PAR-RY-001").status).toBe("indeterminate");
    expect(get("PAR-PM-003").status).toBe("indeterminate");
    expect(get("PAR-GK-001").status).not.toBe("indeterminate"); // Moon-based
  });
});

describe("Raja yogas", () => {
  it("Kendra–Trikona: 4th and 5th lords conjunct (Aries Lagna, Moon + Sun in Leo)", () => {
    const y = run("Aries", { Sun: ["Leo", 5], Moon: ["Leo", 20] })("PAR-RY-001");
    expect(y.status).toBe("detected");
    const inst = y.instances.find((i) => i.planets.includes("Sun") && i.planets.includes("Moon"))!;
    expect(inst.relation).toBe("conjunction");
    expect(inst.houses).toEqual([4, 5]);
    expect(inst.strength!.components.length).toBeGreaterThan(0);
  });

  it("Kendra–Trikona: not detected when no kendra and trikona lords are linked", () => {
    // Aries Lagna. Kendra lords Moon(4), Venus(7), Saturn(10) sit together in Cancer; trikona lords Sun(5), Jupiter(9)
    // sit in Taurus; Lagna lord Mars is alone in Leo. No conjunction, mutual aspect or exchange crosses the groups.
    const y = run("Aries", { Mars: ["Leo", 3], Moon: ["Cancer", 3], Venus: ["Cancer", 9], Saturn: ["Cancer", 20], Sun: ["Taurus", 3], Jupiter: ["Taurus", 9], Mercury: ["Gemini", 20] })("PAR-RY-001");
    expect(y.status).toBe("not_detected");
    expect(y.conditions[0].met).toBe(false);
  });

  it("Yogakaraka: Saturn for Taurus Lagna; none for Aries Lagna", () => {
    const taurus = run("Taurus")("PAR-RY-002");
    expect(taurus.status).toBe("detected");
    expect(taurus.instances[0].planets).toEqual(["Saturn"]);
    expect(run("Aries")("PAR-RY-002").status).toBe("not_detected");
  });

  it("Dharma–Karmadhipati: one planet rules 9th and 10th for Taurus Lagna", () => {
    expect(run("Taurus")("PAR-RY-003").status).toBe("detected");
  });

  it("Maha Parivartana: Sun in Cancer and Moon in Leo (4th ⇄ 5th from Aries)", () => {
    const get = run("Aries", { Sun: ["Cancer", 10], Moon: ["Leo", 10] });
    expect(get("PAR-RY-004").status).toBe("detected");
    expect(get("PAR-RY-004").instances[0].houses).toEqual([4, 5]);
    expect(get("PAR-OT-002").status).toBe("not_detected"); // not a dainya exchange
  });

  it("Dainya Parivartana: exchange involving the 6th", () => {
    // Aries Lagna: Mercury (lord of 6th, Virgo) in Leo; Sun (lord of 5th) in Virgo → 5th ⇄ 6th
    const get = run("Aries", { Mercury: ["Leo", 10], Sun: ["Virgo", 10] });
    expect(get("PAR-OT-002").status).toBe("detected");
    expect(get("PAR-RY-004").status).toBe("not_detected");
  });

  it("Viparita (Harsha): 6th lord in the 8th", () => {
    const y = run("Aries", { Mercury: ["Scorpio", 10] })("PAR-VR-001");
    expect(y.status).toBe("detected");
    expect(run("Aries", { Mercury: ["Leo", 10] })("PAR-VR-001").status).toBe("not_detected");
  });
});

describe("Neecha Bhanga", () => {
  it("not detected when nothing is debilitated", () => {
    const y = run("Aries", { Mars: ["Taurus", 10] })("PAR-NB-001");
    expect(y.status).toBe("not_detected");
    expect(y.conditions[0].met).toBe(false);
  });

  it("detected: Sun debilitated in Libra, Venus (sign lord) in a kendra", () => {
    const y = run("Aries", { Sun: ["Libra", 5], Venus: ["Capricorn", 10], Mercury: ["Scorpio", 1] })("PAR-NB-001");
    expect(y.status).toBe("detected");
    expect(y.instances[0].planets).toEqual(["Sun"]);
    expect(y.instances[0].facts.some((f) => f.startsWith("✓ Venus"))).toBe(true);
  });

  it("debilitated without any cancellation is reported, not detected", () => {
    // Sun in Libra 5°. Moon Gemini. Venus Taurus, Mars Taurus, Saturn Leo — none in a kendra from Aries Lagna or from the Moon.
    const y = run("Aries", { Sun: ["Libra", 5], Mercury: ["Scorpio", 1] })("PAR-NB-001");
    expect(y.status).toBe("not_detected");
    expect(y.conditions[0].met).toBe(true);
    expect(y.conditions[1].met).toBe(false);
    expect(y.notes.some((n) => n.includes("no cancellation"))).toBe(true);
  });
});

describe("Neecha Bhanga — Moon is not counted as a kendra from itself", () => {
  it("debilitated Jupiter: the Moon (exaltation lord) must be in a kendra from the Lagna", () => {
    // Aries Lagna. Jupiter in Capricorn 5° (Navamsha Aquarius, not exalted). Moon in Taurus (2nd): not a Lagna kendra.
    // Saturn and Mars in Gemini: no kendra from Lagna or Moon, and neither aspects Capricorn.
    const place = { Jupiter: ["Capricorn", 5], Moon: ["Taurus", 25], Saturn: ["Gemini", 3], Mars: ["Gemini", 6] } as const;
    const y = run("Aries", place as never)("PAR-NB-001");
    expect(y.status).toBe("not_detected");
    // Same chart with the Moon in Cancer (4th from Lagna) → cancelled
    expect(run("Aries", { ...place, Moon: ["Cancer", 25] } as never)("PAR-NB-001").status).toBe("detected");
  });
});

describe("Mahapurusha", () => {
  it("Hamsa: Jupiter exalted in a kendra", () => {
    expect(run("Aries", { Jupiter: ["Cancer", 5] })("PAR-PM-003").status).toBe("detected");
  });
  it("partial when dignified but not in a kendra; none when neither", () => {
    expect(run("Taurus", { Jupiter: ["Cancer", 5] })("PAR-PM-003").status).toBe("partial"); // 3rd house
    expect(run("Aries", { Jupiter: ["Taurus", 5] })("PAR-PM-003").status).toBe("not_detected"); // 2nd, enemy sign
  });
  it("boundary: Jupiter at 29°59' Gemini is not exalted; at 0°00' Cancer it is", () => {
    expect(run("Aries", { Jupiter: ["Gemini", 29.99] })("PAR-PM-003").status).toBe("not_detected");
    expect(run("Aries", { Jupiter: ["Cancer", 0] })("PAR-PM-003").status).toBe("detected");
  });
  it("combust Mahapurusha planet gets a weakening note", () => {
    const y = run("Aries", { Venus: ["Libra", 10], Sun: ["Libra", 12], Mercury: ["Scorpio", 1] })("PAR-PM-004");
    expect(y.status).toBe("detected");
    expect(y.notes.some((n) => n.includes("combust"))).toBe(true);
  });
});

describe("Moon-based yogas", () => {
  it("Gajakesari: Jupiter in a kendra from the Moon — works without birth time", () => {
    expect(run(null, { Moon: ["Aries", 10], Jupiter: ["Cancer", 10] })("PAR-GK-001").status).toBe("detected");
    expect(run(null, { Moon: ["Aries", 10], Jupiter: ["Taurus", 10] })("PAR-GK-001").status).toBe("not_detected");
  });

  it("Chandra–Mangala and Budhaditya conjunctions", () => {
    const get = run("Aries", { Moon: ["Taurus", 5] });
    expect(get("PAR-CH-002").status).toBe("detected"); // Mars is in Taurus in the base chart
    expect(get("PAR-OT-003").status).toBe("detected"); // Sun + Mercury in Gemini
    expect(get("PAR-OT-003").common).toBe(true);
  });

  it("Adhi: all three benefics 6th–8th from the Moon; two is partial", () => {
    const full = run(null, { Moon: ["Aries", 10], Mercury: ["Virgo", 5], Jupiter: ["Libra", 5], Venus: ["Scorpio", 5] });
    expect(full("PAR-CH-001").status).toBe("detected");
    const two = run(null, { Moon: ["Aries", 10], Mercury: ["Virgo", 5], Jupiter: ["Libra", 5], Venus: ["Leo", 5] });
    expect(two("PAR-CH-001").status).toBe("partial");
  });

  it("Kemadruma: detected, then cancelled by a planet in a kendra from the Moon", () => {
    const lonely: Place = { Moon: ["Aries", 10], Mars: ["Gemini", 5], Mercury: ["Gemini", 25], Jupiter: ["Leo", 5], Venus: ["Leo", 15], Saturn: ["Sagittarius", 5], Sun: ["Gemini", 10] };
    expect(run(null, lonely)("PAR-AR-001").status).toBe("detected");
    const y = run(null, { ...lonely, Jupiter: ["Cancer", 5] })("PAR-AR-001");
    expect(y.status).toBe("cancelled");
    expect(y.notes[0]).toContain("Jupiter");
    expect(run(null, { ...lonely, Venus: ["Taurus", 5] })("PAR-AR-001").status).toBe("not_detected");
  });
});

describe("Dhana yogas", () => {
  it("2nd and 11th lords conjunct (Aries Lagna: Venus + Saturn)", () => {
    const y = run("Aries", { Venus: ["Gemini", 5], Saturn: ["Gemini", 15] })("PAR-DY-001");
    expect(y.status).toBe("detected");
    expect(y.instances[0].houses).toEqual(expect.arrayContaining([2, 11]));
  });

  it("Lakshmi: 9th lord dignified in a trikona with a strong Lagna lord; partial when one part fails", () => {
    // Aries Lagna: Jupiter (9th lord) in Sagittarius (9th), Mars (Lagna lord) in Aries.
    expect(run("Aries", { Jupiter: ["Sagittarius", 5], Mars: ["Aries", 5] })("PAR-DY-003").status).toBe("detected");
    expect(run("Aries", { Jupiter: ["Sagittarius", 5], Mars: ["Cancer", 5] })("PAR-DY-003").status).toBe("partial");
  });

  it("Strain on wealth lords is flagged as a product indicator", () => {
    const y = run("Aries", { Venus: ["Virgo", 10] })("PAR-AR-002"); // 2nd lord debilitated in the 6th
    expect(y.status).toBe("detected");
    expect(y.productIndicator).toBe(true);
  });
});

describe("evaluateForBirth", () => {
  const place = { lat: 28.61, lon: 77.21, ianaTz: "Asia/Kolkata" };

  it("exact time: one sample, every rule answered", () => {
    const r = evaluateForBirth({ birthDate: "1990-06-15", timeKind: "exact", birthTime: "10:20", ...place });
    expect(r.samples).toBe(1);
    expect(r.results).toHaveLength(PARASHARI_RULES.length);
    expect(r.results.every((x) => x.status !== "indeterminate")).toBe(true);
  });

  it("unknown time: Lagna rules are indeterminate, Moon rules still evaluated", () => {
    const r = evaluateForBirth({ birthDate: "2020-05-05", timeKind: "unknown", ...place });
    expect(r.results.find((x) => x.ruleId === "PAR-RY-001")!.status).toBe("indeterminate");
    expect(r.results.find((x) => x.ruleId === "PAR-OT-003")!.status).not.toBe("indeterminate");
  });

  it("range across a Lagna change marks flipping rules indeterminate with time spans", () => {
    // A 6-hour window always crosses several Lagna signs.
    const r = evaluateForBirth({ birthDate: "1992-03-01", timeKind: "range", rangeFrom: "06:00", rangeTo: "11:59", ...place });
    const flipped = r.results.filter((x) => x.status === "indeterminate");
    expect(flipped.length).toBeGreaterThan(0);
    expect(flipped[0].notes[0]).toMatch(/Changes with birth time/);
  });
});
