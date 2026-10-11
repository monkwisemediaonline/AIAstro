import { DateTime } from "luxon";
import { siderealLongitude } from "./astro";
import { NAKSHATRAS, naturalRelation, type Planet } from "./constants";
import { norm360 } from "./math";
import { houseFrom, nakshatraOf } from "./zodiac";

export const DAY_RULES = "favourable-days@1.1.0";

const WEEKDAY_LORD: Planet[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]; // Sunday first
const WEEKDAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TARA = ["Janma", "Sampat", "Vipat", "Kshema", "Pratyari", "Sadhaka", "Vadha", "Mitra", "Param Mitra"];
const YOGA = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];
const BAD_YOGA = new Set(["Vishkambha", "Atiganda", "Shula", "Ganda", "Vyaghata", "Vajra", "Vyatipata", "Parigha", "Vaidhriti"]);
const MOVABLE_KARANA = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti (Bhadra)"];
const TITHI = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"];

export type Factor = { name: string; value: string; score: number; note: string };
export type DayRating = "very_good" | "good" | "neutral" | "avoid";
export type DayScore = {
  date: string; // YYYY-MM-DD (local)
  weekday: string;
  tithi: string;
  yoga: string;
  karana: string;
  nakshatra: string;
  moonSign: number;
  score: number;
  rating: DayRating;
  factors: Factor[];
  /** The Moon changes nakshatra during this day, so the reading holds for part of it. */
  nakshatraChanges: boolean;
};

export type NatalForDays = { moonSign: number; moonNakshatra: string; lagnaLord: Planet | null; mulank: number };

const reduce = (n: number) => {
  let v = n;
  while (v > 9) v = String(v).split("").reduce((a, b) => a + Number(b), 0);
  return v;
};
const NUMBER_PLANET: Record<number, Planet> = { 1: "Sun", 2: "Moon", 3: "Jupiter", 4: "Rahu", 5: "Mercury", 6: "Venus", 7: "Ketu", 8: "Saturn", 9: "Mars" };

/**
 * Scores one calendar day for starting things and for business dealings, from seven traditional factors:
 * Chandra Bala (Moon's house from the natal Moon), Tara Bala (day star counted from the birth star),
 * tithi class, yoga, karana, weekday lord, and the day number against the Mulank.
 * Positions are taken at local noon; clock-time windows within the day come from muhurta.ts.
 */
export function scoreDay(date: string, tz: string, natal: NatalForDays): DayScore {
  const noon = DateTime.fromISO(`${date}T12:00:00`, { zone: tz });
  const at = (h: number) => noon.set({ hour: h }).toUTC().toJSDate();
  const moon = siderealLongitude("Moon", at(12));
  const sun = siderealLongitude("Sun", at(12));
  const nak = nakshatraOf(moon);
  const moonSign = Math.floor(moon / 30) % 12;
  const factors: Factor[] = [];

  // 1. Chandra Bala
  const ch = houseFrom(natal.moonSign, moonSign);
  const chScore = [1, 3, 6, 7, 10, 11].includes(ch) ? 2 : ch === 8 ? -3 : [4, 12].includes(ch) ? -2 : 0;
  factors.push({
    name: "Moon strength (Chandra Bala)",
    value: `Moon ${ch}${ch === 1 ? "st" : ch === 2 ? "nd" : ch === 3 ? "rd" : "th"} from your Moon`,
    score: chScore,
    note: chScore > 0 ? "A supportive position for the mind and for dealings." : ch === 8 ? "Chandrashtama: traditionally avoided for important starts." : chScore < 0 ? "A draining position; keep the day light." : "Neutral.",
  });

  // 2. Tara Bala
  const birth = NAKSHATRAS.indexOf(natal.moonNakshatra as (typeof NAKSHATRAS)[number]);
  const tara = (((nak.index - birth + 27) % 27) % 9) + 1;
  const taraScore = [2, 4, 6, 8, 9].includes(tara) ? 2 : [3, 5, 7].includes(tara) ? -2 : 0;
  factors.push({
    name: "Star strength (Tara Bala)",
    value: `${nak.name} — ${TARA[tara - 1]} tara`,
    score: taraScore,
    note: taraScore > 0 ? "A helpful star for you." : taraScore < 0 ? "An obstructing star for you (Vipat, Pratyari or Vadha)." : "Your birth-star group: mixed, fine for routine work.",
  });

  // 3. Tithi
  const elong = norm360(moon - sun);
  const t = Math.floor(elong / 12) + 1; // 1..30
  const inPaksha = ((t - 1) % 15) + 1;
  const paksha = t <= 15 ? "Shukla" : "Krishna";
  const tithiName = t === 15 ? "Purnima" : t === 30 ? "Amavasya" : `${paksha} ${TITHI[inPaksha - 1]}`;
  const rikta = [4, 9, 14].includes(inPaksha);
  const purna = [5, 10].includes(inPaksha) || t === 15;
  const tithiScore = t === 30 ? -2 : rikta ? -1 : purna ? 1 : 0;
  factors.push({
    name: "Lunar day (Tithi)",
    value: tithiName,
    score: tithiScore,
    note: t === 30 ? "New Moon: kept for ancestors and prayer, not for new ventures." : rikta ? "A Rikta (empty) tithi: avoided for beginnings." : purna ? "A Purna (full) tithi: good for completing and for money matters." : "Ordinary tithi.",
  });

  // 3b. Yoga: the sum of the Sun's and Moon's longitudes in 27 parts
  const yoga = YOGA[Math.floor(norm360(sun + moon) / (360 / 27)) % 27];
  const badYoga = BAD_YOGA.has(yoga);
  factors.push({
    name: "Yoga",
    value: yoga,
    score: badYoga ? -1 : 0,
    note: badYoga ? "One of the nine yogas traditionally avoided for beginnings." : "Not one of the avoided yogas.",
  });

  // 3c. Karana: half of a tithi
  const k = Math.floor(elong / 6); // 0..59
  const karana = k === 0 ? "Kimstughna" : k === 57 ? "Shakuni" : k === 58 ? "Chatushpada" : k === 59 ? "Naga" : MOVABLE_KARANA[(k - 1) % 7];
  const vishti = karana.startsWith("Vishti");
  factors.push({
    name: "Karana",
    value: karana,
    score: vishti ? -1 : 0,
    note: vishti ? "Vishti (Bhadra) is avoided for auspicious work." : "Not Vishti.",
  });

  // 4. Weekday
  const wd = noon.weekday % 7; // luxon: Monday=1 … Sunday=7
  const lord = WEEKDAY_LORD[wd];
  const commerce = ["Mercury", "Jupiter", "Venus"].includes(lord) ? 0.5 : ["Mars", "Saturn"].includes(lord) ? -0.5 : 0;
  const rel = natal.lagnaLord ? naturalRelation(natal.lagnaLord, lord) : "neutral";
  const relScore = natal.lagnaLord === lord ? 1 : rel === "friend" ? 1 : rel === "enemy" ? -1 : 0;
  factors.push({
    name: "Weekday",
    value: `${WEEKDAY_NAME[wd]} (${lord})`,
    score: commerce + relScore,
    note: `${natal.lagnaLord ? `${lord} is ${natal.lagnaLord === lord ? "your Lagna lord" : `${rel === "friend" ? "a friend of" : rel === "enemy" ? "an enemy of" : "neutral to"} your Lagna lord ${natal.lagnaLord}`}. ` : ""}${commerce > 0 ? "A day traditionally good for trade." : commerce < 0 ? "A day traditionally kept for hard, routine or corrective work rather than new starts." : ""}`.trim(),
  });

  // 5. Day number
  const dayNum = reduce(Number(date.replaceAll("-", "").split("").reduce((a, b) => a + Number(b), 0)));
  const pa = NUMBER_PLANET[natal.mulank];
  const pb = NUMBER_PLANET[dayNum];
  const sc = (r: string) => (r === "friend" ? 1 : r === "enemy" ? -1 : 0);
  const numRaw = dayNum === natal.mulank ? 2 : sc(naturalRelation(pa, pb)) + sc(naturalRelation(pb, pa));
  const numScore = numRaw >= 1 ? 1 : numRaw <= -1 ? -1 : 0;
  factors.push({
    name: "Day number",
    value: `${dayNum} against your Mulank ${natal.mulank}`,
    score: numScore,
    note: numScore > 0 ? "A friendly number for you." : numScore < 0 ? "A number that sits uneasily with yours." : "Neutral number.",
  });

  const score = Math.round(factors.reduce((s, f) => s + f.score, 0) * 10) / 10;
  // Chandrashtama overrides a good total: tradition treats it as a day to avoid starting things.
  const rating: DayRating = ch === 8 ? "avoid" : score >= 4 ? "very_good" : score >= 1.5 ? "good" : score > -1.5 ? "neutral" : "avoid";
  const nakshatraChanges = nakshatraOf(siderealLongitude("Moon", at(6))).index !== nakshatraOf(siderealLongitude("Moon", at(21))).index;

  return { date, weekday: WEEKDAY_NAME[wd], tithi: tithiName, yoga, karana, nakshatra: nak.name, moonSign, score, rating, factors, nakshatraChanges };
}

export function scoreDays(from: string, days: number, tz: string, natal: NatalForDays): DayScore[] {
  const start = DateTime.fromISO(`${from}T12:00:00`, { zone: tz });
  return Array.from({ length: days }, (_, i) => scoreDay(start.plus({ days: i }).toFormat("yyyy-LL-dd"), tz, natal));
}
