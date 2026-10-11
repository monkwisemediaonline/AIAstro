import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { dayMuhurta, spanText } from "@/engine/muhurta";
import { scoreDay } from "@/engine/panchang";

const delhi = { lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" };
const local = (iso: string) => DateTime.fromISO(iso, { zone: "utc" }).setZone(delhi.tz);
const ms = (iso: string) => Date.parse(iso);

describe("sunrise-based day muhurta (New Delhi)", () => {
  const sun = dayMuhurta("2026-10-11", delhi); // a Sunday

  it("finds sunrise and sunset on the right local day at plausible times", () => {
    const rise = local(sun.sunrise);
    const set = local(sun.sunset);
    expect(rise.toFormat("yyyy-LL-dd")).toBe("2026-10-11");
    expect(rise.hour * 60 + rise.minute).toBeGreaterThan(6 * 60 + 5); // about 06:19 IST in mid-October
    expect(rise.hour * 60 + rise.minute).toBeLessThan(6 * 60 + 35);
    expect(set.hour * 60 + set.minute).toBeGreaterThan(17 * 60 + 40); // about 17:55 IST
    expect(set.hour * 60 + set.minute).toBeLessThan(18 * 60 + 10);
    expect(sun.weekday).toBe(0);
  });

  it("Rahu Kaal is the last eighth of the day on Sunday and the second on Monday", () => {
    const eighth = (ms(sun.sunset) - ms(sun.sunrise)) / 8;
    expect(ms(sun.rahuKaal.end)).toBe(ms(sun.sunset));
    expect(ms(sun.rahuKaal.end) - ms(sun.rahuKaal.start)).toBeCloseTo(eighth, -2);

    const mon = dayMuhurta("2026-10-12", delhi);
    const e2 = (ms(mon.sunset) - ms(mon.sunrise)) / 8;
    expect(ms(mon.rahuKaal.start) - ms(mon.sunrise)).toBeCloseTo(e2, -2);
    // The familiar clock times: roughly 7:30–9:00 on Monday
    expect(local(mon.rahuKaal.start).hour).toBe(7);
  });

  it("Rahu Kaal, Yamaganda and Gulika never coincide", () => {
    for (const date of ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"]) {
      const m = dayMuhurta(date, delhi);
      const starts = new Set([m.rahuKaal.start, m.yamaganda.start, m.gulika.start]);
      expect(starts.size, date).toBe(3);
    }
  });

  it("Choghadiya and hora start with the weekday's own lord", () => {
    const first = (date: string) => dayMuhurta(date, delhi).choghadiya[0].name;
    expect([first("2026-10-11"), first("2026-10-12"), first("2026-10-13"), first("2026-10-14"), first("2026-10-15"), first("2026-10-16"), first("2026-10-17")]).toEqual(["Udveg", "Amrit", "Rog", "Labh", "Shubh", "Char", "Kaal"]);
    expect(sun.choghadiya.map((c) => c.name)).toEqual(["Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg"]);
    expect(sun.horas).toHaveLength(12);
    expect(sun.horas[0].lord).toBe("Sun");
    expect(dayMuhurta("2026-10-15", delhi).horas[0].lord).toBe("Jupiter");
    expect(sun.choghadiya[0].start).toBe(sun.sunrise);
    expect(sun.choghadiya[7].end).toBe(sun.sunset);
  });

  it("Abhijit straddles solar noon and is not used on Wednesday", () => {
    const noon = (ms(sun.sunrise) + ms(sun.sunset)) / 2;
    expect(ms(sun.abhijit.start)).toBeLessThan(noon);
    expect(ms(sun.abhijit.end)).toBeGreaterThan(noon);
    expect(sun.abhijit.usable).toBe(true);
    expect(dayMuhurta("2026-10-14", delhi).abhijit.usable).toBe(false);
  });

  it("Brahma Muhurta ends 48 minutes before sunrise", () => {
    expect(ms(sun.sunrise) - ms(sun.brahmaMuhurta.end)).toBe(48 * 60_000);
    expect(ms(sun.brahmaMuhurta.end) - ms(sun.brahmaMuhurta.start)).toBe(48 * 60_000);
  });

  it("best windows are good Choghadiya with the three avoided periods removed", () => {
    for (const date of ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"]) {
      const m = dayMuhurta(date, delhi);
      expect(m.bestWindows.length, date).toBeGreaterThan(0);
      for (const w of m.bestWindows) {
        expect(["Amrit", "Shubh", "Labh"]).toContain(w.label);
        for (const b of [m.rahuKaal, m.yamaganda, m.gulika]) {
          const overlap = Math.min(ms(w.end), ms(b.end)) - Math.max(ms(w.start), ms(b.start));
          expect(overlap, `${date} ${w.label}`).toBeLessThanOrEqual(0);
        }
      }
    }
  });

  it("shifts with the city and the season", () => {
    const mumbai = dayMuhurta("2026-10-11", { lat: 19.076, lon: 72.8777, tz: "Asia/Kolkata" });
    expect(mumbai.sunrise).not.toBe(sun.sunrise);
    const winter = dayMuhurta("2026-12-21", delhi);
    expect(ms(winter.sunset) - ms(winter.sunrise)).toBeLessThan(ms(sun.sunset) - ms(sun.sunrise));
    expect(spanText(sun.rahuKaal, delhi.tz)).toMatch(/PM – \d+:\d\d PM/);
  });
});

describe("yoga and karana in the day score", () => {
  const natal = { moonSign: 0, moonNakshatra: "Ashwini", lagnaLord: "Mars" as const, mulank: 1 };

  it("the first half of Shukla Pratipada is Kimstughna karana; Amavasya ends in Naga", () => {
    // 11 Oct 2026 midday IST is Shukla Pratipada (Navratri begins).
    const d = scoreDay("2026-10-11", "Asia/Kolkata", natal);
    expect(d.tithi).toBe("Shukla Pratipada");
    expect(["Kimstughna", "Bava"]).toContain(d.karana);
    const am = scoreDay("2024-11-01", "Asia/Kolkata", natal);
    expect(["Chatushpada", "Naga"]).toContain(am.karana);
  });

  it("an avoided yoga or Vishti karana lowers the score by one each", () => {
    for (let i = 1; i <= 28; i++) {
      const d = scoreDay(`2026-10-${String(i).padStart(2, "0")}`, "Asia/Kolkata", natal);
      const yoga = d.factors.find((f) => f.name === "Yoga")!;
      const karana = d.factors.find((f) => f.name === "Karana")!;
      expect([0, -1]).toContain(yoga.score);
      expect(karana.score).toBe(d.karana.startsWith("Vishti") ? -1 : 0);
    }
  });
});
