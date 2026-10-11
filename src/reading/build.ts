import type { ChartResult } from "@/engine/chart";
import { SIGNS, type Planet } from "@/engine/constants";
import { GOCHARA_GOOD, saturnPhases, transitsAt } from "@/engine/transits";
import { bhagyank, mulank } from "@/numerology/indian";
import { personalYear } from "@/numerology/systems";
import { PLANET_REMEDY } from "@/remedies/catalogue";
import { assessPlanets } from "@/remedies/gemstones";
import { HOUSE_FOCUS } from "@/rules/actions";
import { DIGNITY_PHRASE, DUSTHANAS, KENDRAS, TRIKONAS, makeCtx, ordinal, type Ctx } from "@/rules/context";
import type { YogaResult } from "@/rules/types";
import { CAREER_FIELDS, HOUSE_THEME, LAGNA_TEXT, MOON_TEXT, NAKSHATRA_KEY, NUMBER_TEXT, PERSONAL_YEAR_TEXT, PLANET_KEY, TRANSIT_FROM_MOON } from "./meanings";

export type Tone = "good" | "mixed" | "care" | "info";
export type Point = { text: string; tone: Tone };
export type SectionId = "core" | "wealth" | "business" | "marriage" | "children" | "now" | "year" | "strengths" | "protection" | "numbers" | "actions";
export type Section = { id: SectionId; title: string; summary: string; points: Point[]; basis: string };
export type Reading = { sections: Section[]; lagnaSettled: boolean; limited: string | null };

const p = (text: string, tone: Tone = "info"): Point => ({ text, tone });
const month = (iso: string, tz: string) => new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: tz }).format(new Date(iso));

/** How well a house lord is placed, by the common Parashari reading of placement and dignity. */
function lordState(ctx: Ctx, lord: Planet): { tone: Tone; why: string } {
  const row = ctx.p(lord);
  const h = ctx.house(lord);
  const weak = row.dignity === "debilitated" || row.combust;
  const strong = ["exalted", "own", "moolatrikona"].includes(row.dignity);
  const goodHouse = KENDRAS.includes(h) || TRIKONAS.includes(h) || h === 2 || h === 11;
  const why = `${lord} is ${DIGNITY_PHRASE[row.dignity]}${row.combust ? " and combust" : ""}, in the ${ordinal(h)} house`;
  if (DUSTHANAS.includes(h) && !strong) return { tone: "care", why };
  if (weak) return { tone: goodHouse ? "mixed" : "care", why };
  if (goodHouse || strong) return { tone: "good", why };
  return { tone: "mixed", why };
}

const TONE_WORD: Record<Tone, string> = { good: "well supported", mixed: "workable, with effort", care: "an area needing care", info: "" };

function houseLine(ctx: Ctx, house: number, label: string): Point {
  const lord = ctx.lord(house);
  const s = lordState(ctx, lord);
  const sits = ctx.house(lord);
  return p(`${label}: ${TONE_WORD[s.tone]}. The ${ordinal(house)} lord ${s.why}, tying ${HOUSE_THEME[house].split(",")[0]} to ${HOUSE_THEME[sits]}.`, s.tone);
}

const yogaLine = (y: YogaResult): Point => {
  const band = y.instances[0]?.strength?.band;
  const tone: Tone = y.category === "caution" ? "care" : band === "weak" ? "mixed" : "good";
  return p(`${y.name}${band ? ` (${band})` : ""}: traditionally linked with ${y.themes.charAt(0).toLowerCase()}${y.themes.slice(1)}.${y.verification === "unverified" ? "" : y.verification === "verified" ? " Verified in your Library." : " You marked this rule disputed."}`, tone);
};

/**
 * Composes a plain-language reading from already-calculated results. Deterministic and free:
 * the same chart always gives the same reading, and no outside service is used.
 */
export function buildReading(chart: ChartResult, yogas: YogaResult[], birthDate: string, at: Date, opts: { minor?: boolean } = {}): Reading {
  const lagnaSettled = !!chart.chart.ascendant && !(chart.sensitivity?.some((r) => r.item === "Ascendant (Lagna) sign" && !r.stable) ?? false);
  const ctx = makeCtx(lagnaSettled ? chart.chart : { ...chart.chart, ascendant: null, houses: null });
  const tz = chart.input.ianaTz;
  const moon = ctx.p("Moon");
  const detected = yogas.filter((y) => y.status === "detected");
  const sections: Section[] = [];
  const atIso = at.toISOString();

  // ---------------------------------------------------------------- core nature
  {
    const pts: Point[] = [];
    if (ctx.ascSign !== null) {
      pts.push(p(`${SIGNS[ctx.ascSign]} Lagna. ${LAGNA_TEXT[ctx.ascSign]}`));
      const ll = ctx.lord(1);
      const s = lordState(ctx, ll);
      pts.push(p(`Your Lagna lord ${s.why}. Your energy naturally flows toward ${HOUSE_THEME[ctx.house(ll)]}.`, s.tone));
    }
    pts.push(p(`Moon in ${SIGNS[moon.sign]}. ${MOON_TEXT[moon.sign]}`));
    pts.push(p(`Birth star ${moon.nakshatra}: traditionally a star of ${NAKSHATRA_KEY[moon.nakshatra]}.`));
    sections.push({
      id: "core",
      title: opts.minor ? "Nature and temperament" : "Who you are",
      summary: ctx.ascSign !== null ? `${SIGNS[ctx.ascSign]} rising with the Moon in ${SIGNS[moon.sign]} (${moon.nakshatra}).` : `Moon in ${SIGNS[moon.sign]}, ${moon.nakshatra} star.`,
      points: pts,
      basis: "Lagna sign, Lagna lord, Moon sign and birth nakshatra",
    });
  }

  if (opts.minor) {
    return { sections, lagnaSettled, limited: "This profile is marked as a minor. Only nature and temperament are shown — no readings about fate, health, ability or future." };
  }

  // ---------------------------------------------------------------- wealth
  {
    const pts: Point[] = [];
    const dhana = detected.filter((y) => y.category === "dhana");
    if (ctx.hasAsc) {
      pts.push(houseLine(ctx, 2, "Savings and family wealth (2nd house)"));
      pts.push(houseLine(ctx, 11, "Income and gains (11th house)"));
      pts.push(houseLine(ctx, 9, "Fortune (9th house)"));
      pts.push(houseLine(ctx, 5, "Ideas and judgement (5th house)"));
    }
    for (const y of dhana) pts.push(yogaLine(y));
    if (dhana.length === 0) pts.push(p("No Dhana Yoga is formed under the rules checked. Tradition then reads wealth mainly from the house lords above and from the periods you pass through.", "mixed"));
    const jup = ctx.p("Jupiter");
    const jTone: Tone = jup.dignity === "debilitated" || jup.combust ? "care" : ["exalted", "own", "moolatrikona", "friend"].includes(jup.dignity) ? "good" : "mixed";
    pts.push(p(`Jupiter, the natural significator of wealth, is ${DIGNITY_PHRASE[jup.dignity]}${jup.combust ? " and combust" : ""} in ${SIGNS[jup.sign]}${ctx.hasAsc ? `, ${ordinal(ctx.house("Jupiter"))} house` : ""}.`, jTone));
    for (const y of detected.filter((x) => x.ruleId === "PAR-AR-002" || x.ruleId === "PAR-AR-001")) pts.push(yogaLine(y));

    const good = pts.filter((x) => x.tone === "good").length;
    const care = pts.filter((x) => x.tone === "care").length;
    const band = good >= care + 2 ? "The traditional indications for wealth are favourable" : care >= good + 2 ? "The traditional indications say wealth comes through sustained effort and careful handling" : "The traditional indications for wealth are mixed: real support in some places, care needed in others";
    sections.push({ id: "wealth", title: "Wealth", summary: `${band} (${good} supportive, ${care} needing care).`, points: pts, basis: "Lords of the 2nd, 11th, 9th and 5th, Dhana yogas, Jupiter" });
  }

  // ---------------------------------------------------------------- business and career
  if (ctx.hasAsc) {
    const pts: Point[] = [];
    const l10 = ctx.lord(10);
    pts.push(houseLine(ctx, 10, "Career and authority (10th house)"));
    const in10 = chart.chart.planets.filter((x) => ctx.house(x.planet) === 10).map((x) => x.planet);
    if (in10.length) pts.push(p(`${in10.join(" and ")} in your 10th house colour${in10.length === 1 ? "s" : ""} your work with ${in10.map((x) => PLANET_KEY[x].split(",")[0]).join(" and ")}.`));
    const fields = [l10, ...in10].map((x) => CAREER_FIELDS[x]).filter(Boolean);
    if (fields.length) pts.push(p(`Fields traditionally linked to these planets: ${[...new Set(fields)].join("; ")}.`));
    pts.push(houseLine(ctx, 7, "Partners, clients and contracts (7th house)"));
    pts.push(houseLine(ctx, 3, "Initiative and marketing (3rd house)"));
    const mer = ctx.p("Mercury");
    pts.push(p(`Mercury, the planet of trade, is ${DIGNITY_PHRASE[mer.dignity]}${mer.combust ? " and combust" : ""} in the ${ordinal(ctx.house("Mercury"))} house.`, mer.dignity === "debilitated" ? "care" : mer.combust ? "mixed" : "good"));
    for (const y of detected.filter((x) => x.category === "raja" || x.category === "mahapurusha")) pts.push(yogaLine(y));
    const s10 = lordState(ctx, l10).tone;
    sections.push({
      id: "business",
      title: "Business and career",
      summary: `Your 10th lord is ${l10}; career is ${TONE_WORD[s10]}. ${detected.filter((x) => x.category === "raja" || x.category === "mahapurusha").length} Raja-type yoga(s) present.`,
      points: pts,
      basis: "10th, 7th and 3rd houses and lords, Mercury, Raja and Mahapurusha yogas",
    });
  }

  // ---------------------------------------------------------------- marriage
  if (ctx.hasAsc) {
    const pts: Point[] = [houseLine(ctx, 7, "Marriage and partnership (7th house)")];
    const in7 = chart.chart.planets.filter((x) => ctx.house(x.planet) === 7).map((x) => x.planet);
    if (in7.length) pts.push(p(`${in7.join(" and ")} in the 7th bring${in7.length === 1 ? "s" : ""} ${in7.map((x) => PLANET_KEY[x].split(",")[0]).join(" and ")} into the relationship.`));
    const ven = ctx.p("Venus");
    pts.push(p(`Venus, significator of marriage and comfort, is ${DIGNITY_PHRASE[ven.dignity]}${ven.combust ? " and combust" : ""} in the ${ordinal(ctx.house("Venus"))} house.`, ven.dignity === "debilitated" || ven.combust ? "care" : "good"));
    pts.push(p("For how two charts sit together, use the comparison on the Partner Vibes page. A chart is never a reason for suspicion or pressure in a marriage."));
    sections.push({ id: "marriage", title: "Marriage and family life", summary: `7th lord ${ctx.lord(7)} ${lordState(ctx, ctx.lord(7)).why}.`, points: pts, basis: "7th house and lord, Venus" });

    const cp: Point[] = [houseLine(ctx, 5, "Children (5th house)")];
    cp.push(p("Jupiter is also the significator of children; see its state under Wealth."));
    cp.push(p("Tradition reads this house for your relationship with your children and what you pass on to them, not for a child's own fate. For that, read the child's own chart."));
    sections.push({ id: "children", title: "Children and legacy", summary: `5th lord ${ctx.lord(5)} ${lordState(ctx, ctx.lord(5)).why}.`, points: cp, basis: "5th house and lord, Jupiter" });
  }

  // ---------------------------------------------------------------- current period
  {
    const md = chart.dasha.mahadashas.find((m) => m.start <= atIso && atIso < m.end);
    const ad = md?.children?.find((a) => a.start <= atIso && atIso < a.end);
    const assess = assessPlanets(ctx);
    const pts: Point[] = [];
    const describe = (level: string, lord: Planet, end: string) => {
      const role = assess.find((a) => a.planet === lord)!.role;
      const tone: Tone = role === "considered" ? "good" : role === "avoided" ? "care" : "mixed";
      const houses = ctx.hasAsc ? [...new Set([ctx.house(lord), ...(lord === "Rahu" || lord === "Ketu" ? [] : ctx.rules(lord))])] : [];
      const themes = houses.map((h) => HOUSE_THEME[h].split(",")[0]).join(", ");
      const roleText = role === "considered" ? "a supportive planet for your Lagna" : role === "avoided" ? "a demanding planet for your Lagna" : role === "mixed" ? "a planet of mixed results for your Lagna" : role === "neutral" ? "a neutral planet for your Lagna" : "read by the house it occupies";
      return p(`${level} of ${lord} until ${month(end, tz)}. ${lord} signifies ${PLANET_KEY[lord]}; it is ${roleText}${themes ? `, bringing forward ${themes}` : ""}.`, tone);
    };
    if (md) pts.push(describe("Mahadasha (main period)", md.lord, md.end));
    if (ad) pts.push(describe("Antardasha (sub-period)", ad.lord, ad.end));
    const inYoga = (lord: Planet) => detected.filter((y) => y.category !== "caution" && y.instances.some((i) => i.planets.includes(lord))).map((y) => y.name);
    for (const lord of [md?.lord, ad?.lord].filter(Boolean) as Planet[]) {
      const ys = inYoga(lord);
      if (ys.length) pts.push(p(`${lord} takes part in ${ys.join(", ")}, so tradition expects those yogas to be felt more strongly now.`, "good"));
    }
    const next = md?.children?.find((a) => a.start > atIso) ?? chart.dasha.mahadashas.find((m) => m.start > atIso)?.children?.[0];
    if (next) pts.push(p(`Next change: ${next.lord} sub-period begins ${month(next.start, tz)}.`));
    if (chart.availability.dasha !== "exact") pts.push(p(`Birth time is uncertain, so these dates are ${chart.availability.dasha}.`, "care"));
    sections.push({ id: "now", title: "The period you are in now", summary: md ? `${md.lord} Mahadasha${ad ? `, ${ad.lord} Antardasha` : ""}.` : "Dasha not available.", points: pts, basis: "Vimshottari Dasha lords, their houses and lordships" });
  }

  // ---------------------------------------------------------------- this year (transits)
  {
    const tr = transitsAt(at, moon.sign, ctx.ascSign);
    const pts: Point[] = [];
    for (const name of ["Jupiter", "Saturn", "Rahu"] as Planet[]) {
      const t = tr.find((x) => x.planet === name)!;
      pts.push(p(`${name} is passing through ${SIGNS[t.sign]}, the ${ordinal(t.fromMoon)} from your Moon: ${TRANSIT_FROM_MOON[t.fromMoon]}. Tradition counts this as ${GOCHARA_GOOD[name].includes(t.fromMoon) ? "a favourable" : "a testing"} position for ${name}.`, t.favourable ? "good" : "mixed"));
    }
    const phase = saturnPhases(moon.sign, new Date(at.getTime() - 86_400_000), new Date(at.getTime() + 86_400_000)).at(0);
    if (phase) pts.push(p(`${phase.kind === "sade_sati" ? "Sade Sati" : "Dhaiya"} is running (${phase.phase}). Traditionally a time that rewards discipline, patience and clean dealings, and punishes shortcuts.`, "care"));
    const py = personalYear(birthDate, at.getUTCFullYear());
    pts.push(p(`Numerology personal year ${py.number}: ${PERSONAL_YEAR_TEXT[py.number]}.`));
    sections.push({ id: "year", title: "This year", summary: `Jupiter ${ordinal(tr.find((x) => x.planet === "Jupiter")!.fromMoon)} and Saturn ${ordinal(tr.find((x) => x.planet === "Saturn")!.fromMoon)} from your Moon.`, points: pts, basis: "Transits counted from the natal Moon (classical gochara), personal year number" });
  }

  // ---------------------------------------------------------------- strengths and care points
  {
    const pts: Point[] = [];
    for (const row of chart.chart.planets) {
      if (row.planet === "Rahu" || row.planet === "Ketu") continue;
      const where = ctx.hasAsc ? ` in the ${ordinal(ctx.house(row.planet))} house` : "";
      if (["exalted", "own", "moolatrikona"].includes(row.dignity) && !row.combust) pts.push(p(`${row.planet} is strong (${DIGNITY_PHRASE[row.dignity]})${where}: ${PLANET_KEY[row.planet]} come more easily to you.`, "good"));
      else if (row.dignity === "debilitated") pts.push(p(`${row.planet} is debilitated${where}: ${PLANET_KEY[row.planet].split(",")[0]} needs conscious effort. Tradition suggests ${PLANET_REMEDY[row.planet].mantra} and the conduct listed under Remedies.`, "care"));
      else if (row.combust) pts.push(p(`${row.planet} is combust (too close to the Sun)${where}: its matters can be overshadowed by ego or authority figures.`, "care"));
    }
    if (pts.length === 0) pts.push(p("No planet is in a strongly high or low state; results depend more on house placement and timing."));
    sections.push({ id: "strengths", title: "Strengths and care points", summary: `${pts.filter((x) => x.tone === "good").length} strong planet(s), ${pts.filter((x) => x.tone === "care").length} needing care.`, points: pts, basis: "Planetary dignity and combustion" });
  }

  // ---------------------------------------------------------------- protection and obstacles
  if (ctx.hasAsc) {
    const pts: Point[] = [houseLine(ctx, 6, "Competitors, disputes and debts (6th house)")];
    const in6 = chart.chart.planets.filter((x) => ctx.house(x.planet) === 6).map((x) => x.planet);
    const malefics = in6.filter((x) => ["Saturn", "Mars", "Rahu", "Ketu", "Sun"].includes(x));
    if (malefics.length) pts.push(p(`${malefics.join(" and ")} in the 6th: tradition reads natural malefics here as strength against opposition and the stamina to outlast competitors.`, "good"));
    pts.push(houseLine(ctx, 8, "Sudden risks (8th house)"));
    pts.push(p("In practice, protection comes from contracts, insurance, a cash reserve, clean accounts and choosing partners carefully. The Sadhana page lists protective prayers; none of them replaces these."));
    sections.push({ id: "protection", title: "Obstacles and protection", summary: `6th lord ${ctx.lord(6)} ${lordState(ctx, ctx.lord(6)).why}.`, points: pts, basis: "6th and 8th houses and lords" });
  }

  // ---------------------------------------------------------------- numbers
  {
    const m = mulank(birthDate);
    const b = bhagyank(birthDate);
    sections.push({
      id: "numbers",
      title: "Your numbers",
      summary: `Mulank ${m.number}, Bhagyank ${b.number}.`,
      points: [p(`Mulank ${m.number}: ${NUMBER_TEXT[m.number]}. This describes your everyday nature.`), p(`Bhagyank ${b.number}: ${NUMBER_TEXT[b.number]}. This describes the direction life pushes you in.`), p("Check a business name, phone or vehicle number against these on the Numerology page.")],
      basis: "Indian numerology: day of birth and full date of birth",
    });
  }

  // ---------------------------------------------------------------- what to do
  {
    const md = chart.dasha.mahadashas.find((m) => m.start <= atIso && atIso < m.end);
    const ad = md?.children?.find((a) => a.start <= atIso && atIso < a.end);
    const pts: Point[] = [];
    if (ctx.hasAsc) {
      const houses = [...new Set(([md?.lord, ad?.lord].filter(Boolean) as Planet[]).map((l) => ctx.house(l)))];
      for (const h of houses) for (const a of HOUSE_FOCUS[h].actions) pts.push(p(`${a} (${ordinal(h)} house is active through your current period).`));
    }
    const first = assessPlanets(ctx).filter((a) => a.weakBenefic);
    for (const a of first) pts.push(p(`Traditionally the first planet to support is ${a.planet}: ${PLANET_REMEDY[a.planet].mantra}; and in conduct: ${(PLANET_REMEDY[a.planet].conduct ?? "see the practices on the Remedies page.").replace(/^./, (c) => c.toLowerCase())}`));
    pts.push(p("Track revenue, margin and cash every month on the Business page. Those numbers, not the chart, tell you whether the business is winning."));
    sections.push({ id: "actions", title: "What to do now", summary: "Practical steps for the houses your current period activates, plus the traditional support.", points: pts, basis: "Houses occupied by the current Dasha lords; lordship-based remedy reasoning" });
  }

  return { sections, lagnaSettled, limited: ctx.hasAsc ? null : "The Lagna is not available for this birth time, so house-based sections (business, marriage, children, obstacles) are left out. Moon-based sections are shown." };
}

/** Maps a free-text question to the reading sections that answer it. English and Hinglish keywords. */
const TOPICS: { ids: SectionId[]; label: string; words: RegExp; timing?: boolean }[] = [
  { ids: ["wealth", "now", "actions"], label: "Wealth and money", words: /wealth|money|rich|dhan|paisa|paise|income|earn|kamai|savings|lakshmi|ameer|crore|profit/i },
  { ids: ["business", "now", "actions"], label: "Business and career", words: /business|career|job|naukri|vyapar|vyavsay|dhandha|kaam|work|company|startup|client|sales|raj\s?yog|success|growth/i },
  { ids: ["marriage"], label: "Marriage and relationship", words: /marriage|married|wife|husband|love|shaadi|shadi|patni|pati|relationship|spouse|vivah/i },
  { ids: ["children"], label: "Children", words: /child|children|daughter|son|beti|beta|bachch|santan|kids?/i },
  { ids: ["now", "year"], label: "Timing", words: /when|kab|time|timing|period|dasha|favou?rable|shubh|muhurat|muhurta|year|month|future|aage|next/i, timing: true },
  { ids: ["protection", "strengths"], label: "Obstacles and protection", words: /enemy|enemies|shatru|dushman|protect|suraksha|nazar|obstacle|problem|court|case|debt|karz|loan|competitor|fear|dar/i },
  { ids: ["strengths", "actions"], label: "Remedies", words: /remed|upay|upaay|mantra|stone|gem|ratna|puja|pooja|daan|tantra|totka|sadhana/i },
  { ids: ["numbers"], label: "Numbers", words: /number|numerolog|mulank|bhagyank|name|naam|mobile|phone|ank/i },
  { ids: ["core", "strengths"], label: "Your nature", words: /nature|personality|swabhav|who am i|myself|strength|weakness|kundli|chart/i },
];

export function answerQuestion(reading: Reading, question: string): { topics: string[]; sections: Section[]; timing: boolean; matched: boolean } {
  const hits = TOPICS.filter((t) => t.words.test(question));
  const use = hits.length ? hits : TOPICS.filter((t) => ["Wealth and money", "Business and career", "Timing"].includes(t.label));
  const ids = [...new Set(use.flatMap((t) => t.ids))];
  return {
    topics: use.map((t) => t.label),
    sections: ids.map((id) => reading.sections.find((s) => s.id === id)).filter((s): s is Section => !!s),
    timing: use.some((t) => t.timing) || !hits.length,
    matched: hits.length > 0,
  };
}
