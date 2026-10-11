import { describe, expect, it } from "vitest";
import { siderealLongitude } from "@/engine/astro";
import { PLANETS } from "@/engine/constants";
import { GOCHARA_GOOD, saturnPhases, signStays, transitsAt } from "@/engine/transits";

describe("sign stays", () => {
  const from = new Date("2020-01-01T00:00:00Z");
  const to = new Date("2030-01-01T00:00:00Z");
  const saturn = signStays("Saturn", from, to, 10);

  it("are contiguous and cover the whole window", () => {
    expect(saturn[0].start).toBe(from.toISOString());
    expect(saturn.at(-1)!.end).toBe(to.toISOString());
    for (let i = 1; i < saturn.length; i++) expect(saturn[i].start).toBe(saturn[i - 1].end);
  });

  it("each boundary is a real sign change, located to about a minute", () => {
    for (let i = 1; i < saturn.length; i++) {
      const t = new Date(saturn[i].start).getTime();
      const before = Math.floor(siderealLongitude("Saturn", new Date(t - 120_000)) / 30);
      const after = Math.floor(siderealLongitude("Saturn", new Date(t + 120_000)) / 30);
      expect(before).not.toBe(after);
    }
  });

  it("Saturn entered sidereal Capricorn in January 2020", () => {
    expect(saturn[0].sign).toBe(8); // Sagittarius on 1 Jan 2020
    expect(saturn[1].sign).toBe(9);
    expect(saturn[1].start.slice(0, 7)).toBe("2020-01");
    expect(saturn.length).toBeGreaterThanOrEqual(4);
    expect(saturn.length).toBeLessThanOrEqual(12);
  });

  it("Rahu moves backwards through the signs", () => {
    const rahu = signStays("Rahu", from, to, 10);
    expect(rahu.length).toBeGreaterThan(5);
    for (let i = 1; i < rahu.length; i++) expect((rahu[i - 1].sign - rahu[i].sign + 12) % 12).toBe(1);
  });
});

describe("Saturn phases from the Moon", () => {
  it("Sade Sati covers the 12th, 1st and 2nd; Dhaiya the 4th and 8th", () => {
    // Natal Moon in Aquarius (10): Saturn in Capricorn = 12th, Aquarius = 1st, Pisces = 2nd.
    const phases = saturnPhases(10, new Date("2019-01-01T00:00:00Z"), new Date("2030-01-01T00:00:00Z"));
    const sade = phases.filter((p) => p.kind === "sade_sati");
    expect(new Set(sade.map((p) => p.house))).toEqual(new Set([12, 1, 2]));
    expect(sade[0].sign).toBe(9);
    expect(phases.every((p) => [12, 1, 2, 4, 8].includes(p.house))).toBe(true);
  });
});

describe("transits on a date", () => {
  it("returns nine planets with houses from Moon and Lagna and a gochara flag", () => {
    const t = transitsAt(new Date("2026-01-01T00:00:00Z"), 0, 3);
    expect(t.map((x) => x.planet)).toEqual([...PLANETS]);
    for (const x of t) {
      expect(x.fromMoon).toBeGreaterThanOrEqual(1);
      expect(x.fromMoon).toBeLessThanOrEqual(12);
      expect(x.favourable).toBe(GOCHARA_GOOD[x.planet].includes(x.fromMoon));
    }
    expect(transitsAt(new Date("2026-01-01T00:00:00Z"), 0, null)[0].fromLagna).toBeNull();
  });
});
