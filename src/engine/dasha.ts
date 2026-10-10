import { DASHA_ORDER, DASHA_YEARS, type Planet } from "./constants";
import { nakshatraOf } from "./zodiac";

const DAY_MS = 86_400_000;

export type DashaPeriod = {
  lord: Planet;
  level: 1 | 2 | 3;
  start: string; // ISO UTC
  end: string;
  children?: DashaPeriod[];
};

export type VimshottariResult = {
  yearDays: number;
  birthNakshatra: string;
  startingLord: Planet;
  balanceYears: number; // remaining years of the first Mahadasha at birth
  mahadashas: DashaPeriod[];
};

function subPeriods(parentLord: Planet, parentStart: number, parentYears: number, level: 2 | 3, yearDays: number, depth: number): DashaPeriod[] {
  const startIdx = DASHA_ORDER.indexOf(parentLord);
  let t = parentStart;
  return Array.from({ length: 9 }, (_, i) => {
    const lord = DASHA_ORDER[(startIdx + i) % 9];
    const years = (parentYears * DASHA_YEARS[lord]) / 120;
    const start = t;
    t += years * yearDays * DAY_MS;
    return {
      lord,
      level,
      start: new Date(start).toISOString(),
      end: new Date(t).toISOString(),
      children: depth > 1 && level === 2 ? subPeriods(lord, start, years, 3, yearDays, depth - 1) : undefined,
    };
  });
}

/**
 * Vimshottari Dasha from the Moon's sidereal longitude.
 * First Mahadasha theoretically started before birth by the elapsed fraction of the nakshatra.
 * `depth`: 1 = MD only, 2 = +AD, 3 = +PD.
 */
export function vimshottari(moonLon: number, birth: Date, opts: { yearDays?: number; depth?: 1 | 2 | 3 } = {}): VimshottariResult {
  const yearDays = opts.yearDays ?? 365.25;
  const depth = opts.depth ?? 2;
  const nak = nakshatraOf(moonLon);
  const first = nak.lord;
  const firstYears = DASHA_YEARS[first];
  const theoreticalStart = birth.getTime() - nak.fractionElapsed * firstYears * yearDays * DAY_MS;

  const startIdx = DASHA_ORDER.indexOf(first);
  let t = theoreticalStart;
  const mahadashas: DashaPeriod[] = Array.from({ length: 9 }, (_, i) => {
    const lord = DASHA_ORDER[(startIdx + i) % 9];
    const years = DASHA_YEARS[lord];
    const start = t;
    t += years * yearDays * DAY_MS;
    return {
      lord,
      level: 1 as const,
      start: new Date(start).toISOString(),
      end: new Date(t).toISOString(),
      children: depth >= 2 ? subPeriods(lord, start, years, 2, yearDays, depth - 1) : undefined,
    };
  });

  return {
    yearDays,
    birthNakshatra: nak.name,
    startingLord: first,
    balanceYears: (1 - nak.fractionElapsed) * firstYears,
    mahadashas,
  };
}

/** Find the active periods at a given instant. */
export function activePeriods(result: VimshottariResult, at: Date) {
  const t = at.toISOString();
  const md = result.mahadashas.find((p) => p.start <= t && t < p.end);
  const ad = md?.children?.find((p) => p.start <= t && t < p.end);
  const pd = ad?.children?.find((p) => p.start <= t && t < p.end);
  return { md, ad, pd };
}
