import type { ChartSnapshot, PlanetRow } from "@/engine/chart";
import { EXALTATION, SIGNS, SIGN_LORDS, naturalRelation, type Planet } from "@/engine/constants";
import { aspectedHouseOffsets, houseFrom, type Dignity } from "@/engine/zodiac";

export const KENDRAS = [1, 4, 7, 10];
export const TRIKONAS = [1, 5, 9];
export const DUSTHANAS = [6, 8, 12];
export const UPACHAYAS = [3, 6, 10, 11];

export const CLASSICAL: Planet[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
export const NATURAL_BENEFICS: Planet[] = ["Jupiter", "Venus", "Mercury"];
export const NATURAL_MALEFICS: Planet[] = ["Saturn", "Mars", "Rahu", "Ketu", "Sun"];

export type RelationType = "conjunction" | "mutual_aspect" | "exchange";

/** Read-only helpers over one chart snapshot. All house numbers are whole-sign. */
export type Ctx = {
  snap: ChartSnapshot;
  hasAsc: boolean;
  ascSign: number | null;
  moonSign: number;
  p(planet: Planet): PlanetRow;
  /** House (1–12) of a planet from the Lagna. Requires Ascendant. */
  house(planet: Planet): number;
  /** House of a planet counted from the Moon. */
  houseFromMoon(planet: Planet): number;
  /** Lord of house h from the Lagna. Requires Ascendant. */
  lord(h: number): Planet;
  /** Houses ruled by a planet from the Lagna. Requires Ascendant. */
  rules(planet: Planet): number[];
  aspectsSign(planet: Planet, sign: number): boolean;
  aspects(a: Planet, b: Planet): boolean;
  relations(a: Planet, b: Planet): RelationType[];
  inKendraFromLagnaOrMoon(planet: Planet): boolean;
  d9Dignity(planet: Planet): Dignity;
  describe(planet: Planet): string;
};

/** Dignity from a sign alone (no moolatrikona degrees) — used for divisional charts. */
export function dignityBySign(planet: Planet, sign: number): Dignity {
  const ex = EXALTATION[planet];
  if (sign === ex.sign) return "exalted";
  if (sign === (ex.sign + 6) % 12) return "debilitated";
  const lord = SIGN_LORDS[sign];
  if (lord === planet) return "own";
  if (planet === "Rahu" || planet === "Ketu") return "neutral";
  return naturalRelation(planet, lord);
}

export const DIGNITY_PHRASE: Record<Dignity, string> = {
  exalted: "exalted",
  debilitated: "debilitated",
  moolatrikona: "in moolatrikona",
  own: "in its own sign",
  friend: "in a friend’s sign",
  neutral: "in a neutral sign",
  enemy: "in an enemy’s sign",
};

export const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

export function makeCtx(snap: ChartSnapshot): Ctx {
  const byName = new Map(snap.planets.map((x) => [x.planet, x]));
  const p = (planet: Planet) => byName.get(planet)!;
  const ascSign = snap.ascendant?.sign ?? null;
  const moonSign = p("Moon").sign;
  const needAsc = () => {
    if (ascSign === null) throw new Error("Ascendant required");
    return ascSign;
  };
  const aspectsSign = (planet: Planet, sign: number) =>
    aspectedHouseOffsets(planet).some((o) => (p(planet).sign + o - 1) % 12 === sign);
  const aspects = (a: Planet, b: Planet) => aspectsSign(a, p(b).sign);
  const house = (planet: Planet) => houseFrom(needAsc(), p(planet).sign);

  return {
    snap,
    hasAsc: ascSign !== null,
    ascSign,
    moonSign,
    p,
    house,
    houseFromMoon: (planet) => houseFrom(moonSign, p(planet).sign),
    lord: (h) => SIGN_LORDS[(needAsc() + h - 1) % 12],
    rules: (planet) => {
      const asc = needAsc();
      return SIGN_LORDS.flatMap((l, s) => (l === planet ? [houseFrom(asc, s)] : [])).sort((x, y) => x - y);
    },
    aspectsSign,
    aspects,
    relations: (a, b) => {
      if (a === b) return [];
      const out: RelationType[] = [];
      if (p(a).sign === p(b).sign) out.push("conjunction");
      if (aspects(a, b) && aspects(b, a)) out.push("mutual_aspect");
      if (SIGN_LORDS[p(a).sign] === b && SIGN_LORDS[p(b).sign] === a) out.push("exchange");
      return out;
    },
    // The Moon is always 1st from itself, so for the Moon only the Lagna counts.
    inKendraFromLagnaOrMoon: (planet) =>
      (planet !== "Moon" && KENDRAS.includes(houseFrom(moonSign, p(planet).sign))) || (ascSign !== null && KENDRAS.includes(houseFrom(ascSign, p(planet).sign))),
    d9Dignity: (planet) => dignityBySign(planet, p(planet).vargas.D9!),
    describe: (planet) => {
      const row = p(planet);
      const h = ascSign !== null ? `, ${ordinal(houseFrom(ascSign, row.sign))} house` : "";
      return `${planet} in ${SIGNS[row.sign]}${h} (${DIGNITY_PHRASE[row.dignity]}${row.combust ? ", combust" : ""}${row.retrograde && planet !== "Rahu" && planet !== "Ketu" ? ", retrograde" : ""})`;
    },
  };
}

export const RELATION_LABEL: Record<RelationType, string> = {
  conjunction: "conjunction (same sign)",
  mutual_aspect: "mutual aspect",
  exchange: "exchange of signs (parivartana)",
};
