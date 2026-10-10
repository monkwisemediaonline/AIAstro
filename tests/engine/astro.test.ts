import { describe, expect, it } from "vitest";
import * as A from "astronomy-engine";
import { lahiriMean, siderealAngles, siderealPlanets } from "@/engine/astro";
import { PLANETS } from "@/engine/constants";
import { separation } from "@/engine/math";
import reference from "../fixtures/reference-charts.json";

const TOL = { planet: 0.01, Moon: 0.02, ascendant: 0.02, ayanamsha: 0.001 };

describe("astronomy vs Swiss Ephemeris reference (synthetic births)", () => {
  for (const b of reference.births) {
    const date = new Date(b.utc);

    it(`${b.id}: Lahiri ayanamsha within ${TOL.ayanamsha}°`, () => {
      expect(Math.abs(lahiriMean(A.MakeTime(date)) - b.ayanamshaMean)).toBeLessThan(TOL.ayanamsha);
    });

    it(`${b.id}: sidereal planet longitudes`, () => {
      const { list } = siderealPlanets(date, PLANETS);
      for (const p of list) {
        const ref = b.planets[p.planet as keyof typeof b.planets];
        const tol = p.planet === "Moon" ? TOL.Moon : TOL.planet;
        expect(separation(p.sidereal, ref.lon), `${p.planet}`).toBeLessThan(tol);
        expect(Math.sign(p.speed), `${p.planet} direction`).toBe(Math.sign(ref.speed));
      }
    });

    it(`${b.id}: sidereal Ascendant`, () => {
      const { asc } = siderealAngles(date, b.lat, b.lon);
      expect(separation(asc, b.ascendant)).toBeLessThan(TOL.ascendant);
    });
  }
});
