import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { snapshotFromPositions } from "@/engine/chart";
import { PLANETS, SIGNS, type Sign } from "@/engine/constants";
import { lalKitabTeva } from "@/lalkitab/chart";

const lon = (s: Sign, d: number) => SIGNS.indexOf(s) * 30 + d;

function snap(lagna: Sign | null) {
  // One planet per sign starting at Aries: Sun Aries, Moon Taurus, … Ketu Sagittarius.
  const list = PLANETS.map((planet, i) => ({ planet, sidereal: i * 30 + 10, speed: 1 }));
  return snapshotFromPositions(list, lagna === null ? null : lon(lagna, 15), "2000-01-01T00:00:00.000Z", 23.85);
}

describe("Lal Kitab teva", () => {
  it("places planets by house from the Lagna, ignoring signs", () => {
    const aries = lalKitabTeva(snap("Aries"))!;
    expect(aries.placements.find((p) => p.planet === "Sun")!.house).toBe(1);
    expect(aries.placements.find((p) => p.planet === "Ketu")!.house).toBe(9);
    expect(aries.emptyHouses).toEqual([10, 11, 12]);

    const cancer = lalKitabTeva(snap("Cancer"))!;
    expect(cancer.placements.find((p) => p.planet === "Sun")!.house).toBe(10); // Aries is 10th from Cancer
    expect(cancer.placements.find((p) => p.planet === "Moon")!.house).toBe(11);
  });

  it("works for every Lagna and always places nine planets in twelve houses", () => {
    for (const s of SIGNS) {
      const t = lalKitabTeva(snap(s))!;
      expect(t.placements).toHaveLength(9);
      expect(t.houses).toHaveLength(12);
      expect(t.houses.reduce((n, h) => n + h.planets.length, 0)).toBe(9);
    }
  });

  it("is unavailable without a birth time", () => {
    expect(lalKitabTeva(snap(null))).toBeNull();
  });
});

describe("module isolation", () => {
  it("nothing in src/lalkitab imports the Parashari rules or remedies", () => {
    const dir = path.join(import.meta.dirname, "..", "..", "src", "lalkitab");
    for (const file of readdirSync(dir)) {
      const text = readFileSync(path.join(dir, file), "utf8");
      expect(text, file).not.toMatch(/from ["']@\/(rules|remedies|compat)\//);
    }
  });
});
