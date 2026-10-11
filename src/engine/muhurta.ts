import * as A from "astronomy-engine";
import { DateTime } from "luxon";
import type { Planet } from "./constants";

export const MUHURTA_RULES = "muhurta@1.0.0";

export type Place = { lat: number; lon: number; tz: string };
export type Span = { start: string; end: string }; // ISO UTC
export type Quality = "good" | "neutral" | "avoid";

const WEEKDAY_LORD: Planet[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]; // Sunday first
/** Order of planetary hours (and of Choghadiya): each next lord is the one ruling the next hour. */
const HORA_ORDER: Planet[] = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"];

/** Which eighth of the daytime (1–8, from sunrise) each period occupies, Sunday first. */
const RAHU_KAAL = [8, 2, 7, 5, 6, 4, 3];
const YAMAGANDA = [5, 4, 3, 2, 1, 7, 6];
const GULIKA = [7, 6, 5, 4, 3, 2, 1];

const CHOGHADIYA: Record<Planet, { name: string; quality: Quality; note: string }> = {
  Sun: { name: "Udveg", quality: "avoid", note: "anxiety; kept for dealings with government only" },
  Venus: { name: "Char", quality: "neutral", note: "movement; fine for travel and routine" },
  Mercury: { name: "Labh", quality: "good", note: "gain; good for trade, sales and starting work" },
  Moon: { name: "Amrit", quality: "good", note: "nectar; good for every kind of work" },
  Saturn: { name: "Kaal", quality: "avoid", note: "loss; avoided for new work" },
  Jupiter: { name: "Shubh", quality: "good", note: "auspicious; good for ceremonies, agreements, learning" },
  Mars: { name: "Rog", quality: "avoid", note: "strife; avoided for new work" },
  Rahu: { name: "", quality: "neutral", note: "" },
  Ketu: { name: "", quality: "neutral", note: "" },
};

export type Slot = Span & { name: string; lord: Planet; quality: Quality; note: string };
export type DayMuhurta = {
  date: string;
  weekday: number; // 0 = Sunday
  sunrise: string;
  sunset: string;
  nextSunrise: string;
  rahuKaal: Span;
  yamaganda: Span;
  gulika: Span;
  /** Midday muhurta: the 8th of 15 equal parts of the day. Traditionally not used on Wednesdays. */
  abhijit: Span & { usable: boolean };
  /** 96 to 48 minutes before sunrise; kept for prayer, japa and study. */
  brahmaMuhurta: Span;
  choghadiya: Slot[]; // 8 daytime slots
  horas: Slot[]; // 12 daytime planetary hours
  /** Good Choghadiya slots with Rahu Kaal, Yamaganda and Gulika cut out. */
  bestWindows: (Span & { label: string })[];
};

const iso = (ms: number) => new Date(ms).toISOString();

function sunEvent(direction: 1 | -1, fromMs: number, place: Place): number {
  const t = A.SearchRiseSet(A.Body.Sun, new A.Observer(place.lat, place.lon, 0), direction, new Date(fromMs), 2);
  if (!t) throw new Error("The Sun does not rise or set at this latitude on this date");
  return t.date.getTime();
}

/** Removes the blocked spans from a span, returning what is left (pieces shorter than 10 minutes are dropped). */
function subtract(span: [number, number], blocked: [number, number][]): [number, number][] {
  let parts: [number, number][] = [span];
  for (const [bs, be] of blocked) {
    parts = parts.flatMap(([s, e]) => {
      if (be <= s || bs >= e) return [[s, e] as [number, number]];
      const out: [number, number][] = [];
      if (bs > s) out.push([s, bs]);
      if (be < e) out.push([be, e]);
      return out;
    });
  }
  return parts.filter(([s, e]) => e - s >= 10 * 60_000);
}

/**
 * Daytime muhurta for one calendar date at a place. All periods are fractions of the actual
 * sunrise-to-sunset span at that location, so they shift with season and city.
 */
export function dayMuhurta(date: string, place: Place): DayMuhurta {
  const midnight = DateTime.fromISO(`${date}T00:00:00`, { zone: place.tz });
  const sunrise = sunEvent(1, midnight.toMillis(), place);
  const sunset = sunEvent(-1, sunrise, place);
  const nextSunrise = sunEvent(1, sunset, place);
  const weekday = midnight.weekday % 7;
  const day = sunset - sunrise;
  const eighth = (n: number): [number, number] => [sunrise + ((n - 1) * day) / 8, sunrise + (n * day) / 8];
  const span = ([s, e]: [number, number]): Span => ({ start: iso(s), end: iso(e) });

  const rahu = eighth(RAHU_KAAL[weekday]);
  const yama = eighth(YAMAGANDA[weekday]);
  const guli = eighth(GULIKA[weekday]);
  const abhijit: [number, number] = [sunrise + (7 * day) / 15, sunrise + (8 * day) / 15];

  const first = HORA_ORDER.indexOf(WEEKDAY_LORD[weekday]);
  const choghadiya: Slot[] = Array.from({ length: 8 }, (_, i) => {
    const lord = HORA_ORDER[(first + i) % 7];
    const c = CHOGHADIYA[lord];
    return { ...span(eighth(i + 1)), name: c.name, lord, quality: c.quality, note: c.note };
  });
  const horas: Slot[] = Array.from({ length: 12 }, (_, i) => {
    const lord = HORA_ORDER[(first + i) % 7];
    const quality: Quality = ["Mercury", "Jupiter", "Venus", "Moon"].includes(lord) ? "good" : lord === "Sun" ? "neutral" : "avoid";
    return { start: iso(sunrise + (i * day) / 12), end: iso(sunrise + ((i + 1) * day) / 12), name: `${lord} hora`, lord, quality, note: "" };
  });

  const blocked = [rahu, yama, guli];
  const bestWindows = choghadiya
    .filter((c) => c.quality === "good")
    .flatMap((c) => subtract([Date.parse(c.start), Date.parse(c.end)], blocked).map(([s, e]) => ({ start: iso(s), end: iso(e), label: c.name })));

  return {
    date,
    weekday,
    sunrise: iso(sunrise),
    sunset: iso(sunset),
    nextSunrise: iso(nextSunrise),
    rahuKaal: span(rahu),
    yamaganda: span(yama),
    gulika: span(guli),
    abhijit: { ...span(abhijit), usable: weekday !== 3 },
    brahmaMuhurta: { start: iso(sunrise - 96 * 60_000), end: iso(sunrise - 48 * 60_000) },
    choghadiya,
    horas,
    bestWindows,
  };
}

export const clock = (isoUtc: string, tz: string) => DateTime.fromISO(isoUtc, { zone: "utc" }).setZone(tz).toFormat("h:mm a");
export const spanText = (s: Span, tz: string) => `${clock(s.start, tz)} – ${clock(s.end, tz)}`;
