import {
  COMBUSTION_ORBS,
  EXALTATION,
  MOOLATRIKONA,
  NAKSHATRAS,
  NAKSHATRA_SPAN,
  PADA_SPAN,
  DASHA_ORDER,
  SIGN_LORDS,
  SPECIAL_ASPECTS,
  naturalRelation,
  type Planet,
} from "./constants";
import { degInSign, norm360, separation, signIndex } from "./math";

const EPS = 1e-9;

export function nakshatraOf(lon: number) {
  const l = norm360(lon);
  const index = Math.floor((l + EPS) / NAKSHATRA_SPAN) % 27;
  const within = l - index * NAKSHATRA_SPAN;
  const pada = Math.min(4, Math.floor((within + EPS) / PADA_SPAN) + 1);
  return {
    index,
    name: NAKSHATRAS[index],
    pada,
    lord: DASHA_ORDER[index % 9],
    fractionElapsed: within / NAKSHATRA_SPAN,
  };
}

export type Dignity =
  | "exalted"
  | "debilitated"
  | "moolatrikona"
  | "own"
  | "friend"
  | "neutral"
  | "enemy";

/** Parashari dignity: exaltation/debilitation > moolatrikona > own sign > natural friendship with sign lord. */
export function dignityOf(planet: Planet, lon: number): Dignity {
  const s = signIndex(lon);
  const d = degInSign(lon);
  const ex = EXALTATION[planet];
  if (s === ex.sign) return "exalted";
  if (s === (ex.sign + 6) % 12) return "debilitated";
  const mt = MOOLATRIKONA[planet];
  if (mt && s === mt.sign && d >= mt.from && d < mt.to) return "moolatrikona";
  const lord = SIGN_LORDS[s];
  if (lord === planet) return "own";
  if (planet === "Rahu" || planet === "Ketu") return "neutral";
  const rel = naturalRelation(planet, lord);
  return rel;
}

export function isCombust(planet: Planet, lon: number, sunLon: number, retrograde: boolean) {
  const orb = COMBUSTION_ORBS[planet];
  if (!orb) return { combust: false, orb: null as number | null };
  const used = retrograde ? orb.retro : orb.direct;
  return { combust: separation(lon, sunLon) < used, orb: used };
}

/** Houses (1–12, counted from the planet's own house) aspected by graha drishti. */
export function aspectedHouseOffsets(planet: Planet): number[] {
  // Rahu and Ketu cast no graha drishti in this ruleset (schools differ; see ENGINE_SPEC §8).
  if (planet === "Rahu" || planet === "Ketu") return [];
  return [7, ...(SPECIAL_ASPECTS[planet] ?? [])];
}

export const houseFrom = (fromSign: number, sign: number): number => ((sign - fromSign + 12) % 12) + 1;

/** Signs ruled by a planet. */
export const signsRuledBy = (planet: Planet): number[] =>
  SIGN_LORDS.flatMap((lord, i) => (lord === planet ? [i] : []));

// ---------------- Divisional charts (Parashari) ----------------

export type VargaKey = "D1" | "D2" | "D3" | "D7" | "D9" | "D10" | "D12";
export const VARGAS: { key: VargaKey; name: string; theme: string }[] = [
  { key: "D1", name: "Rashi", theme: "Body, life overall" },
  { key: "D2", name: "Hora", theme: "Wealth" },
  { key: "D3", name: "Drekkana", theme: "Siblings, courage" },
  { key: "D7", name: "Saptamsha", theme: "Children" },
  { key: "D9", name: "Navamsha", theme: "Spouse, dharma, planet strength" },
  { key: "D10", name: "Dashamsha", theme: "Career, status" },
  { key: "D12", name: "Dwadashamsha", theme: "Parents" },
];

const isOddSign = (s: number) => s % 2 === 0; // Aries (0) is odd

export function vargaSign(key: VargaKey, lon: number): number {
  const l = norm360(lon);
  const s = signIndex(l);
  const d = degInSign(l);
  const part = (size: number) => Math.min(Math.floor((d + EPS) / size), Math.round(30 / size) - 1);
  switch (key) {
    case "D1":
      return s;
    case "D2": {
      const firstHalf = d < 15;
      // Odd sign: first half Sun (Leo=4), second Moon (Cancer=3). Even sign: reverse.
      return isOddSign(s) === firstHalf ? 4 : 3;
    }
    case "D3":
      return (s + 4 * part(10)) % 12;
    case "D7":
      return (s + (isOddSign(s) ? 0 : 6) + part(30 / 7)) % 12;
    case "D9":
      return Math.floor((l + EPS) / (10 / 3)) % 12;
    case "D10":
      return (s + (isOddSign(s) ? 0 : 8) + part(3)) % 12;
    case "D12":
      return (s + part(2.5)) % 12;
  }
}
