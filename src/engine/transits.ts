import { siderealLongitude, siderealPlanets } from "./astro";
import { PLANETS, type Planet } from "./constants";
import { houseFrom, nakshatraOf } from "./zodiac";

const DAY = 86_400_000;
const signOf = (planet: Planet, t: number) => Math.floor(siderealLongitude(planet, new Date(t)) / 30) % 12;

export type TransitPosition = {
  planet: Planet;
  lon: number;
  sign: number;
  degInSign: number;
  nakshatra: string;
  retrograde: boolean;
  fromMoon: number;
  fromLagna: number | null;
  /** Classical gochara: is this house from the natal Moon counted as favourable for this planet? */
  favourable: boolean;
};

/**
 * Favourable transit houses counted from the natal Moon (classical gochara, e.g. Phaladeepika ch. 26).
 * Vedha (obstruction) points are NOT applied. Rahu/Ketu follow the common 3-6-11 convention.
 */
export const GOCHARA_GOOD: Readonly<Record<Planet, number[]>> = {
  Sun: [3, 6, 10, 11],
  Moon: [1, 3, 6, 7, 10, 11],
  Mars: [3, 6, 11],
  Mercury: [2, 4, 6, 8, 10, 11],
  Jupiter: [2, 5, 7, 9, 11],
  Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  Saturn: [3, 6, 11],
  Rahu: [3, 6, 11],
  Ketu: [3, 6, 11],
};

export function transitsAt(date: Date, natalMoonSign: number, natalLagnaSign: number | null): TransitPosition[] {
  return siderealPlanets(date, PLANETS).list.map((p) => {
    const sign = Math.floor(p.sidereal / 30) % 12;
    const fromMoon = houseFrom(natalMoonSign, sign);
    return {
      planet: p.planet,
      lon: p.sidereal,
      sign,
      degInSign: p.sidereal - sign * 30,
      nakshatra: nakshatraOf(p.sidereal).name,
      retrograde: p.planet === "Rahu" || p.planet === "Ketu" ? true : p.speed < 0,
      fromMoon,
      fromLagna: natalLagnaSign === null ? null : houseFrom(natalLagnaSign, sign),
      favourable: GOCHARA_GOOD[p.planet].includes(fromMoon),
    };
  });
}

export type SignStay = { planet: Planet; sign: number; start: string; end: string; startsBeforeWindow: boolean; endsAfterWindow: boolean };

/** Exact moment (to about a minute) the sign changes between two instants. */
function bisect(planet: Planet, lo: number, hi: number): number {
  const before = signOf(planet, lo);
  while (hi - lo > 60_000) {
    const mid = (lo + hi) / 2;
    if (signOf(planet, mid) === before) lo = mid;
    else hi = mid;
  }
  return hi;
}

/**
 * Every stay of a planet in a sign between two dates, including retrograde re-entries.
 * `stepDays` must be shorter than the shortest stay in a sign.
 */
export function signStays(planet: Planet, from: Date, to: Date, stepDays: number): SignStay[] {
  const out: SignStay[] = [];
  const end = to.getTime();
  let t = from.getTime();
  let sign = signOf(planet, t);
  let start = t;
  let first = true;
  while (t < end) {
    const next = Math.min(t + stepDays * DAY, end);
    const s = signOf(planet, next);
    if (s !== sign) {
      const change = bisect(planet, t, next);
      out.push({ planet, sign, start: new Date(start).toISOString(), end: new Date(change).toISOString(), startsBeforeWindow: first, endsAfterWindow: false });
      first = false;
      sign = s;
      start = change;
    }
    t = next;
  }
  out.push({ planet, sign, start: new Date(start).toISOString(), end: new Date(end).toISOString(), startsBeforeWindow: first, endsAfterWindow: true });
  return out;
}

export type SaturnPhase = { kind: "sade_sati" | "dhaiya"; phase: string; house: number; sign: number; start: string; end: string; open: boolean };

const SATURN_LABEL: Record<number, [SaturnPhase["kind"], string]> = {
  12: ["sade_sati", "Rising — 12th from Moon"],
  1: ["sade_sati", "Peak — over the Moon"],
  2: ["sade_sati", "Setting — 2nd from Moon"],
  4: ["dhaiya", "Dhaiya — 4th from Moon"],
  8: ["dhaiya", "Dhaiya — 8th from Moon"],
};

/**
 * Saturn relative to the natal Moon.
 * Sade Sati = Saturn in the 12th, 1st and 2nd from the Moon; Dhaiya = Saturn in the 4th or 8th.
 */
export function saturnPhases(natalMoonSign: number, from: Date, to: Date): SaturnPhase[] {
  return signStays("Saturn", from, to, 10).flatMap((s) => {
    const house = houseFrom(natalMoonSign, s.sign);
    const l = SATURN_LABEL[house];
    return l ? [{ kind: l[0], phase: l[1], house, sign: s.sign, start: s.start, end: s.end, open: s.startsBeforeWindow || s.endsAfterWindow }] : [];
  });
}
