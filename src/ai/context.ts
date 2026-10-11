import { wealthIndicators } from "@/business/indicators";
import type { ChartResult } from "@/engine/chart";
import { PLANETS, SIGNS, type Planet } from "@/engine/constants";
import { saturnPhases, transitsAt } from "@/engine/transits";
import { bhagyank, mulank } from "@/numerology/indian";
import { PLANET_REMEDY, starterRemedies } from "@/remedies/catalogue";
import { assessPlanets } from "@/remedies/gemstones";
import { makeCtx } from "@/rules/context";
import type { YogaResult } from "@/rules/types";

export const AI_CONTEXT_VERSION = "ai-context@1.0.0";

/** Exactly what leaves the app. Shown to the owner on the Assistant page. */
export const FIELDS_SENT = [
  "Lagna sign, and each planet's sign, house, nakshatra, dignity, retrograde/combust flags, houses ruled, Navamsha sign",
  "Yoga results: rule ID, name, status, conditions, notes, strength band",
  "Current and upcoming Dasha periods (planet names and month/year)",
  "Current transit signs and houses; current Sade Sati / Dhaiya phase",
  "Mulank and Bhagyank numbers (two single digits)",
  "The starter remedy list and gemstone reasoning for each planet",
  "Whether the birth time is exact, a range, or unknown",
  "Your question",
];
export const FIELDS_NOT_SENT = ["Name", "Date of birth", "Time of birth", "Birthplace and coordinates", "Relationship to you", "Anyone else's chart", "Your business figures, notes or logs"];

const month = (iso: string) => iso.slice(0, 7);

/**
 * Builds the structured context for the model. No name, birth date, time, place or coordinates.
 * Every item the model may cite carries a reference ID; the validator rejects any other reference.
 */
export function buildAiContext(chart: ChartResult, yogas: YogaResult[], birthDate: string, at: Date) {
  const lagnaSettled = !!chart.chart.ascendant && !(chart.sensitivity?.some((r) => r.item === "Ascendant (Lagna) sign" && !r.stable) ?? false);
  const snap = lagnaSettled ? chart.chart : { ...chart.chart, ascendant: null, houses: null };
  const ctx = makeCtx(snap);
  const moon = ctx.p("Moon");
  const atIso = at.toISOString();
  const transits = transitsAt(at, moon.sign, ctx.ascSign);
  const phase = saturnPhases(moon.sign, new Date(at.getTime() - 86_400_000), new Date(at.getTime() + 86_400_000)).at(0);
  const wealth = wealthIndicators(chart, yogas, at, lagnaSettled);
  const assess = assessPlanets(ctx);

  const md = chart.dasha.mahadashas.find((m) => m.start <= atIso && atIso < m.end);
  const ad = md?.children?.find((a) => a.start <= atIso && atIso < a.end);
  const pd = ad?.children?.find((x) => x.start <= atIso && atIso < x.end);
  const upcoming = chart.dasha.mahadashas
    .flatMap((m) => (m.children ?? []).map((a) => ({ md: m.lord, ad: a.lord, from: month(a.start), to: month(a.end), start: a.start })))
    .filter((a) => a.start > atIso)
    .slice(0, 8)
    .map((a, i) => ({ ref: `dasha:next${i + 1}`, md: a.md, ad: a.ad, from: a.from, to: a.to }));

  const context = {
    version: AI_CONTEXT_VERSION,
    school: "Parashari (sidereal Lahiri, whole-sign houses, mean node)",
    birth_time_quality: chart.input.timeKind,
    lagna: ctx.ascSign === null ? null : SIGNS[ctx.ascSign],
    lagna_note: ctx.ascSign === null ? "Lagna unavailable or not settled: no house-based statements are possible." : undefined,
    planets: PLANETS.map((p) => {
      const row = ctx.p(p);
      return {
        ref: `planet:${p}`,
        planet: p,
        sign: SIGNS[row.sign],
        house: ctx.hasAsc ? ctx.house(p) : null,
        nakshatra: row.nakshatra,
        dignity: row.dignity,
        retrograde: p !== "Rahu" && p !== "Ketu" && row.retrograde,
        combust: row.combust,
        rules_houses: ctx.hasAsc && p !== "Rahu" && p !== "Ketu" ? ctx.rules(p) : [],
        navamsha_sign: SIGNS[row.vargas.D9!],
      };
    }),
    yogas: yogas
      .filter((y) => y.status !== "not_detected")
      .map((y) => ({
        ref: y.ruleId,
        name: y.name,
        category: y.category,
        status: y.status,
        source_status: y.verification,
        very_common: y.common,
        themes: y.themes,
        conditions: y.conditions.map((c) => `${c.met ? "MET" : "NOT MET"}: ${c.text}`),
        notes: y.notes,
        instances: y.instances.map((i) => ({ what: i.title, planets: i.planets, strength: i.strength ? `${i.strength.band} (${i.strength.score})` : null })),
      })),
    yogas_not_present: yogas.filter((y) => y.status === "not_detected").map((y) => ({ ref: y.ruleId, name: y.name })),
    dasha: {
      reliability: chart.availability.dasha,
      current: [
        md && { ref: "dasha:MD", level: "Mahadasha", planet: md.lord, from: month(md.start), to: month(md.end) },
        ad && { ref: "dasha:AD", level: "Antardasha", planet: ad.lord, from: month(ad.start), to: month(ad.end) },
        pd && { ref: "dasha:PD", level: "Pratyantardasha", planet: pd.lord, from: month(pd.start), to: month(pd.end) },
      ].filter(Boolean),
      upcoming,
      money_and_career_periods: wealth.windows.slice(0, 8).map((w) => ({ md: w.md, ad: w.ad, from: month(w.start), to: month(w.end), why: w.reasons })),
    },
    transits_now: transits.map((t) => ({ ref: `transit:${t.planet}`, planet: t.planet, sign: SIGNS[t.sign], from_moon: t.fromMoon, from_lagna: t.fromLagna, classical_favourable_house_from_moon: t.favourable })),
    saturn_phase_now: phase ? { ref: "transit:Saturn", kind: phase.kind, phase: phase.phase } : null,
    numerology: { ref: "numerology", mulank: mulank(birthDate).number, bhagyank: bhagyank(birthDate).number },
    remedies: assess.map((a) => ({
      planet: a.planet,
      lordship_reading: a.role,
      weak_benefic: a.weakBenefic,
      reasons: a.reasons,
      practices: starterRemedies(a.planet).map((r) => ({ ref: `remedy:${r.key}`, kind: r.kind, title: r.title, detail: r.detail, cost: r.cost })),
      gemstone: { ref: `remedy:${a.planet}-gemstone`, stone: PLANET_REMEDY[a.planet].stone, reading: a.role, cautions: a.cautions },
    })),
    caveats: [
      "Each yoga carries source_status: 'unverified' rules are drafts awaiting source review, 'disputed' rules are contested by the owner; say so when you rely on one.",
      "Remedies are common-tradition starter entries, not source-verified.",
      "Strength scores are a product heuristic, not a classical measure.",
    ],
  };

  const refs = new Set<string>(["numerology"]);
  for (const p of PLANETS) refs.add(`planet:${p}`).add(`transit:${p}`).add(`remedy:${p}-gemstone`);
  for (const y of yogas) refs.add(y.ruleId);
  for (const r of ["dasha:MD", "dasha:AD", "dasha:PD", ...upcoming.map((u) => u.ref)]) refs.add(r);
  for (const a of assess) for (const r of starterRemedies(a.planet)) refs.add(`remedy:${r.key}`);

  /** Signs each planet may legitimately be described in (natal, Navamsha, or current transit). */
  const signsByPlanet = Object.fromEntries(
    PLANETS.map((p) => [p, [...new Set([SIGNS[ctx.p(p).sign], SIGNS[ctx.p(p).vargas.D9!], SIGNS[transits.find((t) => t.planet === p)!.sign]])]]),
  ) as Record<Planet, string[]>;

  return { context, refs, signsByPlanet };
}

export type AiContext = ReturnType<typeof buildAiContext>;
