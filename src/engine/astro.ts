import * as A from "astronomy-engine";
import type { Planet } from "./constants";
import { deg, norm360, rad } from "./math";

/**
 * Lahiri (Chitrapaksha) mean ayanamsha.
 * Calibrated to Swiss Ephemeris SE_SIDM_LAHIRI at J2000.0 (23.857092353708822°),
 * advanced with the IAU 2006 general precession in longitude p_A.
 */
const LAHIRI_J2000 = 23.857092353708822;

export function lahiriMean(time: A.AstroTime): number {
  const T = time.tt / 36525;
  const pA = 5028.796195 * T + 1.1054348 * T ** 2 + 0.00007964 * T ** 3 - 0.000023857 * T ** 4;
  return LAHIRI_J2000 + pA / 3600;
}

/** True ayanamsha = mean ayanamsha + nutation in longitude (matches Swiss Ephemeris sidereal positions). */
export function ayanamshaTrue(time: A.AstroTime): number {
  return lahiriMean(time) + A.e_tilt(time).dpsi / 3600;
}

const BODY: Partial<Record<Planet, A.Body>> = {
  Sun: A.Body.Sun,
  Moon: A.Body.Moon,
  Mars: A.Body.Mars,
  Mercury: A.Body.Mercury,
  Jupiter: A.Body.Jupiter,
  Venus: A.Body.Venus,
  Saturn: A.Body.Saturn,
};

/** Apparent geocentric tropical longitude on the true ecliptic of date. */
function tropicalLongitude(planet: Planet, time: A.AstroTime): number {
  if (planet === "Rahu") return meanNode(time);
  if (planet === "Ketu") return norm360(meanNode(time) + 180);
  const body = BODY[planet]!;
  return norm360(A.Ecliptic(A.GeoVector(body, time, true)).elon);
}

/** Mean lunar ascending node (Meeus 47.7), referred to the true equinox of date. */
export function meanNode(time: A.AstroTime): number {
  const T = time.tt / 36525;
  const omega =
    125.0445479 - 1934.1362891 * T + 0.0020754 * T ** 2 + T ** 3 / 467441 - T ** 4 / 60616000;
  return norm360(omega + A.e_tilt(time).dpsi / 3600);
}

export type RawPlanet = { planet: Planet; tropical: number; sidereal: number; speed: number };

export function siderealPlanets(date: Date, planets: readonly Planet[]): { ayanamsha: number; list: RawPlanet[] } {
  const time = A.MakeTime(date);
  const ayan = ayanamshaTrue(time);
  const dt = 1 / 24; // 1 hour, in days
  const before = time.AddDays(-dt);
  const after = time.AddDays(dt);
  const list = planets.map((planet) => {
    const tropical = tropicalLongitude(planet, time);
    let delta = tropicalLongitude(planet, after) - tropicalLongitude(planet, before);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return { planet, tropical, sidereal: norm360(tropical - ayan), speed: delta / (2 * dt) };
  });
  return { ayanamsha: lahiriMean(time), list };
}

/** Sidereal Ascendant and MC for a geographic location. */
export function siderealAngles(date: Date, latDeg: number, lonDeg: number): { asc: number; mc: number } {
  const time = A.MakeTime(date);
  const tilt = A.e_tilt(time);
  const eps = rad(tilt.tobl);
  const ramc = rad(norm360(A.SiderealTime(time) * 15 + lonDeg));
  const phi = rad(latDeg);
  const asc = norm360(deg(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)))));
  const mc = norm360(deg(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps))));
  const ayan = ayanamshaTrue(time);
  return { asc: norm360(asc - ayan), mc: norm360(mc - ayan) };
}

/** Sidereal longitude of one planet at an instant (no speed). Used for transit scans. */
export function siderealLongitude(planet: Planet, date: Date): number {
  const time = A.MakeTime(date);
  return norm360(tropicalLongitude(planet, time) - ayanamshaTrue(time));
}

export const ENGINE_NAME = "astronomy-engine";
export const ENGINE_VERSION = "2.1.19";
