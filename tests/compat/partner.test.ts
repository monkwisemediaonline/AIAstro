import { describe, expect, it } from "vitest";
import { computeChart } from "@/engine/chart";
import { partnerReport } from "@/compat/partner";
import { bhagyank, mulank, reduce } from "@/numerology/indian";

const place = { lat: 19.08, lon: 72.88, ianaTz: "Asia/Kolkata" };
const now = new Date("2026-10-10T00:00:00Z");

describe("numerology (Indian)", () => {
  it("reduces with visible steps", () => {
    expect(reduce(29)).toEqual({ value: 2, steps: [{ expression: "2 + 9", result: 11 }, { expression: "1 + 1", result: 2 }] });
    expect(mulank("1990-06-29").number).toBe(2);
    expect(bhagyank("1990-06-15").number).toBe(4); // 1+5+0+6+1+9+9+0 = 31 → 4
    expect(mulank("1990-06-15").planet).toBe("Venus"); // 15 → 1+5 = 6
  });
});

describe("partner report", () => {
  const a = { name: "Person A", birthDate: "1988-04-12", chart: computeChart({ birthDate: "1988-04-12", timeKind: "exact", birthTime: "07:30", ...place }, now) };
  const b = { name: "Person B", birthDate: "1991-11-03", chart: computeChart({ birthDate: "1991-11-03", timeKind: "exact", birthTime: "22:10", ...place }, now) };
  const c = { name: "Person C", birthDate: "1991-11-03", chart: computeChart({ birthDate: "1991-11-03", timeKind: "unknown", ...place }, now) };

  it("returns all seven factors with a basis label", () => {
    const r = partnerReport(a, b, now);
    expect(r.factors).toHaveLength(7);
    for (const f of r.factors) expect(f.basisNote.length).toBeGreaterThan(10);
    expect(Object.values(r.tally).reduce((x, y) => x + y, 0)).toBe(7);
  });

  it("marks Lagna factor indeterminate without birth time", () => {
    const r = partnerReport(a, c, now);
    expect(r.factors.find((f) => f.id === "lagna-lords")!.verdict).toBe("indeterminate");
    expect(r.caveats.some((x) => x.includes("unknown"))).toBe(true);
  });

  it("is symmetric in its verdicts for Moon-sign distance and Tara", () => {
    const ab = partnerReport(a, b, now);
    const ba = partnerReport(b, a, now);
    for (const id of ["moon-sign-distance", "tara", "graha-maitri"]) {
      expect(ab.factors.find((f) => f.id === id)!.verdict).toBe(ba.factors.find((f) => f.id === id)!.verdict);
    }
  });
});
