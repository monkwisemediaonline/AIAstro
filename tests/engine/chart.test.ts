import { describe, expect, it } from "vitest";
import { computeChart } from "@/engine/chart";
import { readiness } from "@/engine/readiness";
import { activePeriods, vimshottari } from "@/engine/dasha";
import { localToUtc } from "@/engine/time";
import { dignityOf, nakshatraOf, vargaSign } from "@/engine/zodiac";
import { signIndex } from "@/engine/math";

describe("sign & nakshatra boundaries", () => {
  it("exact boundary belongs to the next division", () => {
    expect(signIndex(30)).toBe(1);
    expect(signIndex(29.9999)).toBe(0);
    expect(signIndex(359.9999)).toBe(11);
    expect(signIndex(360)).toBe(0);
    expect(nakshatraOf(40 / 3).name).toBe("Bharani");
    expect(nakshatraOf(40 / 3 - 1e-6).name).toBe("Ashwini");
  });
  it("padas", () => {
    expect(nakshatraOf(0).pada).toBe(1);
    expect(nakshatraOf(3.34).pada).toBe(2);
    expect(nakshatraOf(13.3).pada).toBe(4);
  });
  it("nakshatra lords follow Vimshottari order", () => {
    expect(nakshatraOf(0).lord).toBe("Ketu"); // Ashwini
    expect(nakshatraOf(30).lord).toBe("Sun"); // Krittika
    expect(nakshatraOf(40).lord).toBe("Moon"); // exactly 40° = start of Rohini
    expect(nakshatraOf(359).lord).toBe("Mercury"); // Revati
  });
});

describe("dignity", () => {
  it("exalted / debilitated / moolatrikona / own", () => {
    expect(dignityOf("Sun", 10)).toBe("exalted"); // Aries
    expect(dignityOf("Sun", 190)).toBe("debilitated"); // Libra
    expect(dignityOf("Sun", 125)).toBe("moolatrikona"); // Leo 5°
    expect(dignityOf("Sun", 145)).toBe("own"); // Leo 25°
    expect(dignityOf("Jupiter", 275)).toBe("debilitated"); // Capricorn
    expect(dignityOf("Saturn", 240)).toBe("neutral"); // Sagittarius, lord Jupiter
    expect(dignityOf("Saturn", 125)).toBe("enemy"); // Leo, lord Sun
  });
});

describe("vargas", () => {
  // Navamsha: Aries 0–3°20 → Aries; Taurus 0° → Capricorn; Gemini 0° → Libra
  it("D9 movable/fixed/dual starts", () => {
    expect(vargaSign("D9", 1)).toBe(0);
    expect(vargaSign("D9", 30.1)).toBe(9);
    expect(vargaSign("D9", 60.1)).toBe(6);
    expect(vargaSign("D9", 359.9)).toBe(11);
  });
  it("D10 odd from self, even from 9th", () => {
    expect(vargaSign("D10", 0.5)).toBe(0); // Aries part 1 → Aries
    expect(vargaSign("D10", 29.5)).toBe(9); // Aries part 10 → Capricorn
    expect(vargaSign("D10", 30.5)).toBe(9); // Taurus part 1 → 9th from Taurus = Capricorn
  });
  it("D2 hora", () => {
    expect(vargaSign("D2", 5)).toBe(4); // Aries first half → Leo
    expect(vargaSign("D2", 20)).toBe(3); // Aries second half → Cancer
    expect(vargaSign("D2", 35)).toBe(3); // Taurus first half → Cancer
  });
  it("D3, D7, D12", () => {
    expect(vargaSign("D3", 25)).toBe(8); // Aries 3rd drekkana → Sagittarius
    expect(vargaSign("D7", 30.1)).toBe(7); // Taurus (even) starts from 7th → Scorpio
    expect(vargaSign("D12", 29.9)).toBe(11); // Aries last dwadashamsha → Pisces
  });
});

describe("Vimshottari", () => {
  it("Moon at Ashwini start: full 7-year Ketu dasha from birth", () => {
    const birth = new Date("2000-01-01T00:00:00Z");
    const v = vimshottari(0, birth);
    expect(v.startingLord).toBe("Ketu");
    expect(v.balanceYears).toBeCloseTo(7, 6);
    expect(v.mahadashas[0].start).toBe(birth.toISOString());
    expect(v.mahadashas.map((m) => m.lord)).toEqual(["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]);
  });
  it("half-elapsed nakshatra gives half balance; antardashas sum to mahadasha", () => {
    const birth = new Date("2000-01-01T00:00:00Z");
    const v = vimshottari(40 / 3 + 20 / 3, birth); // middle of Bharani (Venus)
    expect(v.startingLord).toBe("Venus");
    expect(v.balanceYears).toBeCloseTo(10, 6);
    const md = v.mahadashas[0];
    expect(md.children![0].lord).toBe("Venus");
    expect(md.children![8].end).toBe(md.end);
  });
  it("active periods", () => {
    const birth = new Date("2000-01-01T00:00:00Z");
    const v = vimshottari(0, birth);
    expect(activePeriods(v, new Date("2003-01-01T00:00:00Z")).md?.lord).toBe("Ketu");
    expect(activePeriods(v, new Date("2010-01-01T00:00:00Z")).md?.lord).toBe("Venus");
  });
});

describe("local time → UTC", () => {
  it("India uses +05:30 in 1985", () => {
    const r = localToUtc("1985-08-09", "06:10", "Asia/Kolkata");
    expect(r.offsetMinutes).toBe(330);
    expect(r.utc.toISOString()).toBe("1985-08-09T00:40:00.000Z");
  });
  it("India war time 1943 was +06:30", () => {
    expect(localToUtc("1943-06-01", "12:00", "Asia/Kolkata").offsetMinutes).toBe(390);
  });
  it("DST gap is flagged (New York, 2021-03-14 02:30)", () => {
    expect(localToUtc("2021-03-14", "02:30", "America/New_York").nonexistent).toBe(true);
  });
  it("DST overlap is flagged (New York, 2021-11-07 01:30)", () => {
    expect(localToUtc("2021-11-07", "01:30", "America/New_York").ambiguous).toBe(true);
  });
  it("rejects bad input", () => {
    expect(() => localToUtc("1985-13-01", "06:10", "Asia/Kolkata")).toThrow();
    expect(() => localToUtc("1985-08-09", "25:00", "Asia/Kolkata")).toThrow();
    expect(() => localToUtc("1985-08-09", "06:10", "Mars/Olympus")).toThrow();
  });
});

const place = { lat: 28.61, lon: 77.21, ianaTz: "Asia/Kolkata" };

describe("computeChart (synthetic people)", () => {
  it("exact time: ascendant, houses, vargas, exact dasha", () => {
    const c = computeChart({ birthDate: "1990-06-15", timeKind: "exact", birthTime: "10:20", ...place });
    expect(c.chart.ascendant).not.toBeNull();
    expect(c.chart.houses).toHaveLength(12);
    expect(c.chart.planets.every((p) => p.house !== null)).toBe(true);
    expect(c.availability.dasha).toBe("exact");
    expect(c.sensitivity).toBeNull();
    expect(c.chart.planets.find((p) => p.planet === "Rahu")!.retrograde).toBe(true);
  });

  it("range: samples every 4 minutes and reports what changes; never uses midpoint", () => {
    const c = computeChart({ birthDate: "1992-03-01", timeKind: "range", rangeFrom: "18:00", rangeTo: "18:45", ...place });
    expect(c.input.range).toEqual({ from: "18:00", to: "18:45" });
    const asc = c.sensitivity!.find((r) => r.item === "Navamsha (D9) Lagna")!;
    expect(asc.values[0].from).toBe("18:00");
    expect(asc.values.at(-1)!.to).toBe("18:45");
    // D9 Lagna changes roughly every ~13 minutes, so a 45-minute window must show several values
    expect(asc.stable).toBe(false);
    expect(c.sensitivity!.find((r) => r.item === "Saturn Navamsha (D9)")!.stable).toBe(true);
  });

  it("unknown time: no ascendant or houses, dasha unreliable", () => {
    const c = computeChart({ birthDate: "2020-05-05", timeKind: "unknown", ...place });
    expect(c.chart.ascendant).toBeNull();
    expect(c.chart.houses).toBeNull();
    expect(c.availability.houses).toBe(false);
    expect(c.availability.dasha).toBe("unreliable");
    expect(c.sensitivity!.some((r) => r.item === "Moon nakshatra & pada")).toBe(true);
    expect(c.sensitivity!.some((r) => r.item.includes("house"))).toBe(false);
  });

  it("rejects invalid ranges", () => {
    expect(() => computeChart({ birthDate: "1992-03-01", timeKind: "range", rangeFrom: "18:45", rangeTo: "18:00", ...place })).toThrow();
  });

  it("is deterministic for identical input", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const i = { birthDate: "1990-06-15", timeKind: "exact" as const, birthTime: "10:20", ...place };
    expect(computeChart(i, now)).toEqual(computeChart(i, now));
  });
});

describe("readiness (intake panel)", () => {
  it("blocks calculation until date, place and the chosen time kind are complete", () => {
    expect(readiness({}).canCalculate).toBe(false);
    expect(readiness({ birthDate: "2020-01-01", timeKind: "exact" , ...place }).canCalculate).toBe(false);
    expect(readiness({ birthDate: "2020-01-01", timeKind: "exact", birthTime: "10:00", ...place }).canCalculate).toBe(true);
    expect(readiness({ birthDate: "2020-01-01", timeKind: "unknown", ...place }).canCalculate).toBe(true);
    const r = readiness({ birthDate: "2020-01-01", timeKind: "unknown", ...place });
    expect(r.items.find((i) => i.key === "ascendant")!.status).toBe("blocked");
    expect(readiness({ birthDate: "2020-01-01", timeKind: "range", rangeFrom: "12:00", rangeTo: "11:30", ...place }).canCalculate).toBe(false);
  });
});
