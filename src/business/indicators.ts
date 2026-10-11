import type { ChartResult } from "@/engine/chart";
import { SIGN_LORDS, type Planet } from "@/engine/constants";
import { houseFrom, type Dignity } from "@/engine/zodiac";
import { dignityBySign } from "@/rules/context";
import type { YogaResult } from "@/rules/types";

export const WEALTH_HOUSES: { house: number; area: string }[] = [
  { house: 2, area: "Savings, family wealth" },
  { house: 5, area: "Ideas, product, calculated bets" },
  { house: 9, area: "Fortune, mentors" },
  { house: 10, area: "Career, authority, reputation" },
  { house: 11, area: "Income, gains, network" },
];
const MONEY = [2, 10, 11];
const YEAR = 365.25 * 86_400_000;

export type HouseRow = { house: number; area: string; sign: number; lord: Planet; lordHouse: number; lordDignity: Dignity; lordCombust: boolean; occupants: Planet[] };
export type Window = { md: Planet; ad: Planet; start: string; end: string; reasons: string[]; current: boolean };

export type WealthIndicators = {
  /** Null without a settled Lagna. */
  houses: HouseRow[] | null;
  career: { tenthLord: Planet; d10Lagna: number; tenthLordD10Sign: number; tenthLordD10Dignity: Dignity } | null;
  yogas: { raja: YogaResult[]; dhana: YogaResult[]; cautions: YogaResult[]; undecided: number };
  now: { md: Planet | null; ad: Planet | null; mdRules: number[]; adRules: number[] };
  windows: Window[];
};

/** Traditional wealth and career indicators, assembled from already-computed chart and yoga results. */
export function wealthIndicators(chart: ChartResult, yogas: YogaResult[], at: Date, lagnaSettled: boolean): WealthIndicators {
  const asc = lagnaSettled ? chart.chart.ascendant : null;
  const planet = (p: Planet) => chart.chart.planets.find((x) => x.planet === p)!;
  const rulesOf = (p: Planet) => (asc ? SIGN_LORDS.flatMap((l, s) => (l === p ? [houseFrom(asc.sign, s)] : [])).sort((a, b) => a - b) : []);

  const houses = asc
    ? WEALTH_HOUSES.map(({ house, area }) => {
        const sign = (asc.sign + house - 1) % 12;
        const lord = SIGN_LORDS[sign];
        const row = planet(lord);
        return { house, area, sign, lord, lordHouse: houseFrom(asc.sign, row.sign), lordDignity: row.dignity, lordCombust: row.combust, occupants: chart.chart.planets.filter((x) => x.sign === sign).map((x) => x.planet) };
      })
    : null;

  const career = asc
    ? (() => {
        const tenthLord = SIGN_LORDS[(asc.sign + 9) % 12];
        const d10 = planet(tenthLord).vargas.D10!;
        return { tenthLord, d10Lagna: asc.vargas.D10!, tenthLordD10Sign: d10, tenthLordD10Dignity: dignityBySign(tenthLord, d10) };
      })()
    : null;

  const detected = (cat: YogaResult["category"]) => yogas.filter((y) => y.category === cat && y.status === "detected");
  const raja = [...detected("raja"), ...detected("mahapurusha")];
  const dhana = detected("dhana");
  const yogaPlanets = new Map<Planet, string[]>();
  for (const y of [...raja, ...dhana]) for (const i of y.instances) for (const p of i.planets) yogaPlanets.set(p, [...new Set([...(yogaPlanets.get(p) ?? []), y.name])]);

  const atIso = at.toISOString();
  const horizon = new Date(at.getTime() + 10 * YEAR).toISOString();
  const md = chart.dasha.mahadashas.find((m) => m.start <= atIso && atIso < m.end) ?? null;
  const ad = md?.children?.find((a) => a.start <= atIso && atIso < a.end) ?? null;

  const windows: Window[] = chart.dasha.mahadashas
    .flatMap((m) => (m.children ?? []).map((a) => ({ md: m.lord, ad: a.lord, start: a.start, end: a.end })))
    .filter((w) => w.end > atIso && w.start < horizon)
    .flatMap((w) => {
      const reasons: string[] = [];
      const money = rulesOf(w.ad).filter((h) => MONEY.includes(h));
      if (money.length) reasons.push(`${w.ad} rules the ${money.join(" & ")}`);
      const ys = yogaPlanets.get(w.ad);
      if (ys) reasons.push(`${w.ad} forms ${ys.slice(0, 2).join(", ")}${ys.length > 2 ? ` +${ys.length - 2}` : ""}`);
      return reasons.length ? [{ ...w, reasons, current: w.start <= atIso }] : [];
    });

  return {
    houses,
    career,
    yogas: { raja, dhana, cautions: detected("caution"), undecided: yogas.filter((y) => y.status === "indeterminate").length },
    now: { md: md?.lord ?? null, ad: ad?.lord ?? null, mdRules: md ? rulesOf(md.lord) : [], adRules: ad ? rulesOf(ad.lord) : [] },
    windows,
  };
}
