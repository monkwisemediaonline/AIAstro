import type { ChartResult } from "@/engine/chart";
import { NAKSHATRAS, SIGNS, SIGN_LORDS, naturalRelation, type Planet, type Relation } from "@/engine/constants";
import { activePeriods } from "@/engine/dasha";
import { houseFrom } from "@/engine/zodiac";
import { bhagyank, mulank } from "@/numerology/indian";

export const PARTNER_RULESET = "partner-vibes@1.0.0";

export type Verdict = "favourable" | "mixed" | "challenging" | "indeterminate";

export type Factor = {
  id: string;
  title: string;
  basis: "classical" | "classical-by-analogy" | "product-heuristic" | "numerology";
  basisNote: string;
  verdict: Verdict;
  summary: string;
  evidence: string[];
};

export type PartnerReport = {
  ruleset: string;
  you: string;
  partner: string;
  factors: Factor[];
  tally: Record<Verdict, number>;
  overall: { label: "Mostly harmonious" | "Mixed — workable with clear roles" | "Friction-prone" | "Not enough data"; note: string };
  caveats: string[];
};

type Side = { name: string; chart: ChartResult; birthDate: string };

const moonOf = (c: ChartResult) => c.chart.planets.find((p) => p.planet === "Moon")!;
const planetOf = (c: ChartResult, p: Planet) => c.chart.planets.find((x) => x.planet === p)!;
const exactish = (c: ChartResult) => c.availability.ascendant;

function relationPair(a: Planet, b: Planet): { verdict: Verdict; text: string } {
  const ab = naturalRelation(a, b);
  const ba = naturalRelation(b, a);
  if (a === b) return { verdict: "favourable", text: `Same planet (${a}) rules both — natural alignment.` };
  const score = (r: Relation) => (r === "friend" ? 1 : r === "enemy" ? -1 : 0);
  const s = score(ab) + score(ba);
  const verdict: Verdict = s >= 1 ? "favourable" : s <= -1 ? "challenging" : "mixed";
  return { verdict, text: `${a} sees ${b} as ${ab}; ${b} sees ${a} as ${ba}.` };
}

/** 1. Moon-sign distance (Bhakoot concept from Ashtakoot, applied by analogy to partnership). */
function moonSignFactor(a: Side, b: Side): Factor {
  const ma = moonOf(a.chart).sign;
  const mb = moonOf(b.chart).sign;
  const ab = houseFrom(ma, mb);
  const ba = houseFrom(mb, ma);
  const pair = [ab, ba].sort((x, y) => x - y).join("/");
  const hard = ["2/12", "6/8", "5/9"].includes(pair);
  const unsure = !exactish(a.chart) || !exactish(b.chart);
  return {
    id: "moon-sign-distance",
    title: "Moon-sign distance (Bhakoot)",
    basis: "classical-by-analogy",
    basisNote: "Bhakoot is one of the 8 kootas in marriage matching. Applied here to temperament fit, not as a classical business rule.",
    verdict: hard ? "challenging" : "favourable",
    summary: hard
      ? `Moons are ${pair} from each other — traditionally a friction pattern (different emotional rhythms, money priorities).`
      : `Moons are ${pair} from each other — traditionally compatible temperaments.`,
    evidence: [
      `${a.name}: Moon in ${SIGNS[ma]}${unsure && !exactish(a.chart) ? " (time uncertain)" : ""}`,
      `${b.name}: Moon in ${SIGNS[mb]}${unsure && !exactish(b.chart) ? " (time uncertain)" : ""}`,
    ],
  };
}

/** 2. Graha Maitri between Moon-sign lords. */
function moonLordFactor(a: Side, b: Side): Factor {
  const la = SIGN_LORDS[moonOf(a.chart).sign];
  const lb = SIGN_LORDS[moonOf(b.chart).sign];
  const r = relationPair(la, lb);
  return {
    id: "graha-maitri",
    title: "Mental wavelength (Graha Maitri of Moon-sign lords)",
    basis: "classical-by-analogy",
    basisNote: "Uses BPHS natural friendships between the Moon-sign lords, as in Ashtakoot Graha Maitri.",
    verdict: r.verdict,
    summary: r.text,
    evidence: [`${a.name}: Moon-sign lord ${la}`, `${b.name}: Moon-sign lord ${lb}`],
  };
}

const TARA_NAMES = ["Janma", "Sampat", "Vipat", "Kshema", "Pratyari", "Sadhaka", "Vadha", "Mitra", "Param Mitra"];
const BAD_TARA = new Set([3, 5, 7]);

/** 3. Tara (nakshatra count) in both directions. */
function taraFactor(a: Side, b: Side): Factor {
  const na = NAKSHATRAS.indexOf(moonOf(a.chart).nakshatra as (typeof NAKSHATRAS)[number]);
  const nb = NAKSHATRAS.indexOf(moonOf(b.chart).nakshatra as (typeof NAKSHATRAS)[number]);
  const tara = (from: number, to: number) => (((to - from + 27) % 27) % 9) + 1;
  const t1 = tara(na, nb);
  const t2 = tara(nb, na);
  const bad = [t1, t2].filter((t) => BAD_TARA.has(t)).length;
  return {
    id: "tara",
    title: "Day-to-day support (Tara)",
    basis: "classical-by-analogy",
    basisNote: "Tara counting from Ashtakoot / muhurta practice. Vipat (3), Pratyari (5), Vadha (7) are traditionally obstructive.",
    verdict: bad === 0 ? "favourable" : bad === 1 ? "mixed" : "challenging",
    summary: `From ${a.name}'s nakshatra, ${b.name} is ${TARA_NAMES[t1 - 1]} (${t1}); from ${b.name}'s, ${a.name} is ${TARA_NAMES[t2 - 1]} (${t2}).`,
    evidence: [`${a.name}: ${moonOf(a.chart).nakshatra}`, `${b.name}: ${moonOf(b.chart).nakshatra}`],
  };
}

/** 4. Lagna lords' friendship — needs both birth times. */
function lagnaLordFactor(a: Side, b: Side): Factor {
  const base = {
    id: "lagna-lords",
    title: "Working style (Lagna lords)",
    basis: "product-heuristic" as const,
    basisNote: "Natural friendship between the Ascendant lords. Common practitioner check; not a named classical rule.",
  };
  if (!a.chart.chart.ascendant || !b.chart.chart.ascendant) {
    return { ...base, verdict: "indeterminate", summary: "Needs both birth times.", evidence: [] };
  }
  const la = a.chart.chart.ascendant.lord;
  const lb = b.chart.chart.ascendant.lord;
  const r = relationPair(la, lb);
  const rangeNote = a.chart.input.timeKind === "range" || b.chart.input.timeKind === "range" ? " (range start used — check sensitivity panel)" : "";
  return {
    ...base,
    verdict: r.verdict,
    summary: r.text + rangeNote,
    evidence: [
      `${a.name}: ${SIGNS[a.chart.chart.ascendant.sign]} Lagna, lord ${la}`,
      `${b.name}: ${SIGNS[b.chart.chart.ascendant.sign]} Lagna, lord ${lb}`,
    ],
  };
}

const BENEFICS: Planet[] = ["Jupiter", "Venus", "Mercury"];
const MALEFICS: Planet[] = ["Saturn", "Mars", "Rahu"];
const WEALTH_HOUSES = [2, 7, 10, 11];

/** 5. Overlay: where one person's planets fall in the other's chart. */
function overlay(from: Side, onto: Side): { good: string[]; hard: string[]; ref: string } {
  const asc = onto.chart.chart.ascendant;
  const refSign = asc ? asc.sign : moonOf(onto.chart).sign;
  const ref = asc ? "Lagna" : "Moon (time unknown)";
  const good: string[] = [];
  const hard: string[] = [];
  for (const p of BENEFICS) {
    const h = houseFrom(refSign, planetOf(from.chart, p).sign);
    if (WEALTH_HOUSES.includes(h)) good.push(`${from.name}'s ${p} falls in ${onto.name}'s ${h}th from ${ref}`);
  }
  const moonSign = moonOf(onto.chart).sign;
  for (const p of MALEFICS) {
    const s = planetOf(from.chart, p).sign;
    if (s === refSign) hard.push(`${from.name}'s ${p} sits on ${onto.name}'s ${ref}`);
    else if (s === moonSign) hard.push(`${from.name}'s ${p} sits on ${onto.name}'s Moon`);
  }
  return { good, hard, ref };
}

function overlayFactor(a: Side, b: Side): Factor {
  const ab = overlay(a, b);
  const ba = overlay(b, a);
  const good = [...ab.good, ...ba.good];
  const hard = [...ab.hard, ...ba.hard];
  const verdict: Verdict = good.length > hard.length ? "favourable" : hard.length > good.length ? "challenging" : "mixed";
  return {
    id: "overlay",
    title: "Money & partnership overlay",
    basis: "product-heuristic",
    basisNote:
      "Synastry-style overlay: benefics (Jupiter, Venus, Mercury) landing in the other's 2nd/7th/10th/11th are read as support; Saturn/Mars/Rahu on the other's Lagna or Moon as pressure. Product heuristic, not classical Parashari.",
    verdict,
    summary: `${good.length} supportive and ${hard.length} pressure contacts.`,
    evidence: [...good, ...hard].length ? [...good, ...hard] : ["No notable contacts."],
  };
}

/** 6. Numerology: Mulank and Bhagyank planets' friendship. */
function numerologyFactor(a: Side, b: Side): Factor {
  const ma = mulank(a.birthDate);
  const mb = mulank(b.birthDate);
  const ba = bhagyank(a.birthDate);
  const bb = bhagyank(b.birthDate);
  const r1 = relationPair(ma.planet, mb.planet);
  const r2 = relationPair(ba.planet, bb.planet);
  const score = [r1, r2].map((r) => (r.verdict === "favourable" ? 1 : r.verdict === "challenging" ? -1 : 0)).reduce<number>((x, y) => x + y, 0);
  return {
    id: "numerology",
    title: "Numbers (Mulank & Bhagyank)",
    basis: "numerology",
    basisNote: "Indian numerology number→planet mapping, compared with BPHS planet friendship. Numerology schools differ; product heuristic.",
    verdict: score >= 1 ? "favourable" : score <= -1 ? "challenging" : "mixed",
    summary: `Mulank ${ma.number} (${ma.planet}) & ${mb.number} (${mb.planet}): ${r1.verdict}. Bhagyank ${ba.number} (${ba.planet}) & ${bb.number} (${bb.planet}): ${r2.verdict}.`,
    evidence: [
      `${a.name}: Mulank ${ma.number}, Bhagyank ${ba.number}`,
      `${b.name}: Mulank ${mb.number}, Bhagyank ${bb.number}`,
    ],
  };
}

/** 7. Current Mahadasha lords. */
function dashaFactor(a: Side, b: Side, now: Date): Factor {
  const da = activePeriods(a.chart.dasha, now).md?.lord;
  const db = activePeriods(b.chart.dasha, now).md?.lord;
  const base = {
    id: "current-dasha",
    title: "Current phase (Mahadasha lords now)",
    basis: "product-heuristic" as const,
    basisNote: "Compares the planets running both of your lives right now. Changes when either Mahadasha changes.",
  };
  if (!da || !db) return { ...base, verdict: "indeterminate", summary: "Dasha not available.", evidence: [] };
  const r = relationPair(da, db);
  const unreliable = a.chart.availability.dasha === "unreliable" || b.chart.availability.dasha === "unreliable";
  return {
    ...base,
    verdict: unreliable ? "indeterminate" : r.verdict,
    summary: unreliable ? `${da} and ${db} — but one birth time is too uncertain to trust Dasha dates.` : r.text,
    evidence: [`${a.name}: ${da} Mahadasha`, `${b.name}: ${db} Mahadasha`],
  };
}

export function partnerReport(a: Side, b: Side, now: Date = new Date()): PartnerReport {
  const factors = [
    moonSignFactor(a, b),
    moonLordFactor(a, b),
    taraFactor(a, b),
    lagnaLordFactor(a, b),
    overlayFactor(a, b),
    numerologyFactor(a, b),
    dashaFactor(a, b, now),
  ];
  const tally: Record<Verdict, number> = { favourable: 0, mixed: 0, challenging: 0, indeterminate: 0 };
  for (const f of factors) tally[f.verdict]++;
  const decided = tally.favourable + tally.mixed + tally.challenging;
  let overall: PartnerReport["overall"];
  if (decided < 4) overall = { label: "Not enough data", note: "Add birth times and places for both people." };
  else if (tally.favourable >= tally.challenging + 2) overall = { label: "Mostly harmonious", note: "More supportive than friction signals under these rules." };
  else if (tally.challenging >= tally.favourable + 2) overall = { label: "Friction-prone", note: "Several traditional friction signals. Clear roles, written agreements and decision rules matter even more." };
  else overall = { label: "Mixed — workable with clear roles", note: "Some support, some friction. Typical for real partnerships." };

  const caveats = [
    "There is no classical Parashari 'business partner matching' system. These factors borrow marriage-matching and synastry concepts and are labelled by basis.",
    "Judge a partnership on track record, contracts, equity split, cash discipline and how you resolve disagreements. Use this as reflection, not a decision rule.",
  ];
  if (!exactish(a.chart) || !exactish(b.chart)) caveats.push("At least one birth time is unknown, so Lagna-based factors are skipped or use the Moon instead.");

  return { ruleset: PARTNER_RULESET, you: a.name, partner: b.name, factors, tally, overall, caveats };
}
