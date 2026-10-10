import { ENGINE_NAME, ENGINE_VERSION, siderealAngles, siderealPlanets } from "./astro";
import { PLANETS, SIGNS, SIGN_LORDS, type Planet } from "./constants";
import { activePeriods, vimshottari, type VimshottariResult } from "./dasha";
import { degInSign, distanceToSignBoundary } from "./math";
import { addMinutes, localToUtc, minutesBetween } from "./time";
import {
  VARGAS,
  aspectedHouseOffsets,
  dignityOf,
  houseFrom,
  isCombust,
  nakshatraOf,
  signsRuledBy,
  vargaSign,
  type Dignity,
  type VargaKey,
} from "./zodiac";

export const CHART_SCHEMA_VERSION = "1.0.0";

export type BirthInput = {
  birthDate: string; // YYYY-MM-DD
  timeKind: "exact" | "range" | "unknown";
  birthTime?: string | null; // HH:MM
  rangeFrom?: string | null;
  rangeTo?: string | null;
  lat: number;
  lon: number;
  ianaTz: string;
};

export type PlanetRow = {
  planet: Planet;
  lon: number;
  sign: number;
  degInSign: number;
  nakshatra: string;
  pada: number;
  nakshatraLord: Planet;
  retrograde: boolean;
  combust: boolean;
  dignity: Dignity;
  house: number | null; // whole-sign from Lagna, null when time unknown
  rules: number[] | null; // houses ruled
  aspectsHouses: number[] | null;
  nearBoundary: boolean;
  vargas: Partial<Record<VargaKey, number>>;
};

export type ChartSnapshot = {
  utc: string;
  ayanamsha: number;
  ascendant: null | {
    lon: number;
    sign: number;
    degInSign: number;
    nakshatra: string;
    pada: number;
    lord: Planet;
    nearBoundary: boolean;
    vargas: Partial<Record<VargaKey, number>>;
  };
  planets: PlanetRow[];
  houses: null | { house: number; sign: number; lord: Planet; occupants: Planet[] }[];
};

export type SensitivityRow = {
  item: string;
  stable: boolean;
  values: { value: string; from: string; to: string }[]; // local HH:MM spans
};

export type ChartResult = {
  schemaVersion: string;
  settings: {
    zodiac: "sidereal";
    ayanamsha: "lahiri";
    node: "mean";
    houseSystem: "whole_sign";
    dashaYearDays: number;
    engine: string;
    engineVersion: string;
    tzdbVersion: string | null;
  };
  input: {
    timeKind: BirthInput["timeKind"];
    localDate: string;
    localTime: string | null;
    range: { from: string; to: string } | null;
    ianaTz: string;
    utcOffsetMinutes: number;
    lat: number;
    lon: number;
    warnings: string[];
  };
  /** Primary snapshot: exact time, range start, or local noon for unknown time. */
  chart: ChartSnapshot;
  /** What is available given the birth-time quality. */
  availability: {
    ascendant: boolean;
    houses: boolean;
    vargas: boolean;
    dasha: "exact" | "approximate" | "unreliable";
  };
  dasha: VimshottariResult;
  current: { md: Planet | null; ad: Planet | null; mdEnd: string | null; adEnd: string | null };
  sensitivity: SensitivityRow[] | null;
  computedAt: string;
};

const BOUNDARY_WARN_DEG = 0.05;

export function snapshot(utc: Date, lat: number, lon: number, withAngles: boolean): ChartSnapshot {
  const { ayanamsha, list } = siderealPlanets(utc, PLANETS);
  const sun = list.find((p) => p.planet === "Sun")!;
  const angles = withAngles ? siderealAngles(utc, lat, lon) : null;
  const ascSign = angles ? Math.floor(angles.asc / 30) % 12 : null;
  const vargaKeys = VARGAS.map((v) => v.key);

  const planets: PlanetRow[] = list.map((p) => {
    const nak = nakshatraOf(p.sidereal);
    const retro = p.planet === "Rahu" || p.planet === "Ketu" ? true : p.speed < 0;
    const sign = Math.floor(p.sidereal / 30) % 12;
    const house = ascSign === null ? null : houseFrom(ascSign, sign);
    return {
      planet: p.planet,
      lon: p.sidereal,
      sign,
      degInSign: degInSign(p.sidereal),
      nakshatra: nak.name,
      pada: nak.pada,
      nakshatraLord: nak.lord,
      retrograde: retro,
      combust: p.planet === "Sun" ? false : isCombust(p.planet, p.sidereal, sun.sidereal, retro).combust,
      dignity: dignityOf(p.planet, p.sidereal),
      house,
      rules: ascSign === null ? null : signsRuledBy(p.planet).map((s) => houseFrom(ascSign, s)).sort((a, b) => a - b),
      aspectsHouses:
        house === null ? null : aspectedHouseOffsets(p.planet).map((o) => ((house - 1 + o - 1) % 12) + 1),
      nearBoundary: distanceToSignBoundary(p.sidereal) < BOUNDARY_WARN_DEG,
      vargas: Object.fromEntries(vargaKeys.map((k) => [k, vargaSign(k, p.sidereal)])),
    };
  });

  let ascendant: ChartSnapshot["ascendant"] = null;
  let houses: ChartSnapshot["houses"] = null;
  if (angles && ascSign !== null) {
    const nak = nakshatraOf(angles.asc);
    ascendant = {
      lon: angles.asc,
      sign: ascSign,
      degInSign: degInSign(angles.asc),
      nakshatra: nak.name,
      pada: nak.pada,
      lord: SIGN_LORDS[ascSign],
      nearBoundary: distanceToSignBoundary(angles.asc) < BOUNDARY_WARN_DEG,
      vargas: Object.fromEntries(vargaKeys.map((k) => [k, vargaSign(k, angles.asc)])),
    };
    houses = Array.from({ length: 12 }, (_, i) => {
      const sign = (ascSign + i) % 12;
      return {
        house: i + 1,
        sign,
        lord: SIGN_LORDS[sign],
        occupants: planets.filter((p) => p.sign === sign).map((p) => p.planet),
      };
    });
  }

  return { utc: utc.toISOString(), ayanamsha, ascendant, planets, houses };
}

/** Values tracked across a birth-time range or across an unknown day. */
function trackedItems(s: ChartSnapshot, dasha: VimshottariResult): [string, string][] {
  const items: [string, string][] = [];
  if (s.ascendant) {
    items.push(["Ascendant (Lagna) sign", SIGNS[s.ascendant.sign]]);
    items.push(["Ascendant nakshatra", `${s.ascendant.nakshatra} ${s.ascendant.pada}`]);
    items.push(["Navamsha (D9) Lagna", SIGNS[s.ascendant.vargas.D9!]]);
    items.push(["Dashamsha (D10) Lagna", SIGNS[s.ascendant.vargas.D10!]]);
  }
  const moon = s.planets.find((p) => p.planet === "Moon")!;
  items.push(["Moon sign (Rashi)", SIGNS[moon.sign]]);
  items.push(["Moon nakshatra & pada", `${moon.nakshatra} ${moon.pada}`]);
  items.push(["Birth Mahadasha", `${dasha.startingLord}`]);
  for (const p of s.planets) {
    if (p.house !== null) items.push([`${p.planet} house`, String(p.house)]);
  }
  for (const p of s.planets) items.push([`${p.planet} Navamsha (D9)`, SIGNS[p.vargas.D9!]]);
  return items;
}

function buildSensitivity(samples: { label: string; snap: ChartSnapshot; dasha: VimshottariResult }[]): SensitivityRow[] {
  const rows = new Map<string, SensitivityRow>();
  for (const { label, snap, dasha } of samples) {
    for (const [item, value] of trackedItems(snap, dasha)) {
      const row = rows.get(item) ?? { item, stable: true, values: [] };
      const last = row.values.at(-1);
      if (last && last.value === value) last.to = label;
      else row.values.push({ value, from: label, to: label });
      rows.set(item, row);
    }
  }
  return [...rows.values()]
    .map((r) => ({ ...r, stable: r.values.length === 1 }))
    .sort((a, b) => Number(a.stable) - Number(b.stable));
}

/** Range births are sampled every SAMPLE_MINUTES across the reported window. */
export const SAMPLE_MINUTES = 4;

export function computeChart(input: BirthInput, now: Date = new Date()): ChartResult {
  const warnings: string[] = [];
  const yearDays = 365.25;
  let primaryTime: string;
  let sampleTimes: string[] | null = null;

  if (input.timeKind === "exact") {
    if (!input.birthTime) throw new Error("Exact birth time is required");
    primaryTime = input.birthTime;
  } else if (input.timeKind === "range") {
    if (!input.rangeFrom || !input.rangeTo) throw new Error("Both range start and end are required");
    const span = minutesBetween(input.rangeFrom, input.rangeTo);
    if (span <= 0) throw new Error("Range end must be after range start (same day)");
    if (span > 6 * 60) throw new Error("Range is longer than 6 hours — record the time as unknown instead");
    primaryTime = input.rangeFrom;
    sampleTimes = [];
    for (let m = 0; m < span; m += SAMPLE_MINUTES) sampleTimes.push(addMinutes(input.rangeFrom, m));
    sampleTimes.push(input.rangeTo);
    warnings.push(
      `Birth time is a range (${input.rangeFrom}–${input.rangeTo}). The main chart uses the range start; see the sensitivity panel for what changes inside the window.`,
    );
  } else {
    primaryTime = "12:00";
    sampleTimes = ["00:00", "06:00", "12:00", "18:00", "23:59"];
    warnings.push(
      "Birth time unknown. Planet positions use local noon; Ascendant, houses and divisional-chart Lagnas are not calculated. The Moon may change nakshatra during the day.",
    );
  }

  const primary = localToUtc(input.birthDate, primaryTime, input.ianaTz);
  if (primary.nonexistent) warnings.push("The entered local time did not exist (daylight-saving gap); it was shifted by timezone rules.");
  if (primary.ambiguous) warnings.push("The entered local time occurred twice (daylight-saving change); the earlier offset was used.");

  const withAngles = input.timeKind !== "unknown";
  const chart = snapshot(primary.utc, input.lat, input.lon, withAngles);
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const dasha = vimshottari(moon.lon, primary.utc, { yearDays, depth: 3 });

  let sensitivity: SensitivityRow[] | null = null;
  if (sampleTimes) {
    const samples = sampleTimes.map((t) => {
      const utc = localToUtc(input.birthDate, t, input.ianaTz).utc;
      const snap = snapshot(utc, input.lat, input.lon, withAngles);
      const m = snap.planets.find((p) => p.planet === "Moon")!;
      return { label: t, snap, dasha: vimshottari(m.lon, utc, { yearDays, depth: 1 }) };
    });
    sensitivity = buildSensitivity(samples);
  }

  if (chart.ascendant?.nearBoundary) warnings.push("Ascendant is within 0.05° of a sign boundary — a few seconds of birth time could change it.");
  for (const p of chart.planets) if (p.nearBoundary) warnings.push(`${p.planet} is within 0.05° of a sign boundary.`);

  const act = activePeriods(dasha, now);
  const moonStable = !sensitivity?.find((r) => r.item === "Moon nakshatra & pada" && !r.stable);

  return {
    schemaVersion: CHART_SCHEMA_VERSION,
    settings: {
      zodiac: "sidereal",
      ayanamsha: "lahiri",
      node: "mean",
      houseSystem: "whole_sign",
      dashaYearDays: yearDays,
      engine: ENGINE_NAME,
      engineVersion: ENGINE_VERSION,
      tzdbVersion: primary.tzdbVersion,
    },
    input: {
      timeKind: input.timeKind,
      localDate: input.birthDate,
      localTime: input.timeKind === "exact" ? input.birthTime! : null,
      range: input.timeKind === "range" ? { from: input.rangeFrom!, to: input.rangeTo! } : null,
      ianaTz: input.ianaTz,
      utcOffsetMinutes: primary.offsetMinutes,
      lat: input.lat,
      lon: input.lon,
      warnings,
    },
    chart,
    availability: {
      ascendant: withAngles,
      houses: withAngles,
      vargas: withAngles,
      dasha: input.timeKind === "exact" ? "exact" : input.timeKind === "range" && moonStable ? "approximate" : "unreliable",
    },
    dasha,
    current: {
      md: act.md?.lord ?? null,
      ad: act.ad?.lord ?? null,
      mdEnd: act.md?.end ?? null,
      adEnd: act.ad?.end ?? null,
    },
    sensitivity,
    computedAt: now.toISOString(),
  };
}
