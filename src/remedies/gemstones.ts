import { PLANETS, type Planet } from "@/engine/constants";
import { DUSTHANAS, ordinal, type Ctx } from "@/rules/context";
import { PLANET_REMEDY } from "./catalogue";

export const GEMSTONE_RULES = "gemstone-reasoning@1.0.0";

export type StoneRole = "considered" | "mixed" | "neutral" | "avoided" | "not_assessed";

export type PlanetAssessment = {
  planet: Planet;
  stone: string;
  substitute: string | null;
  role: StoneRole;
  /** Functional benefic for this Lagna and weakly placed — the case tradition talks about strengthening. */
  weakBenefic: boolean;
  weak: string[];
  rules: number[];
  reasons: string[];
  cautions: string[];
};

const list = (hs: number[]) => hs.map(ordinal).join(" & ");

/**
 * One common Parashari approach, by house lordship from the Lagna:
 * lords of 1, 5, 9 are functional benefics (stone commonly considered);
 * lords of 6, 8, 12 are avoided; a planet ruling both is "mixed". The Lagna lord is treated
 * as a benefic even when it also rules a dusthana. Practitioners disagree — this is labelled as such.
 */
export function assessPlanets(ctx: Ctx): PlanetAssessment[] {
  return PLANETS.map((planet) => {
    const info = PLANET_REMEDY[planet];
    const row = ctx.p(planet);
    const cautions: string[] = [];
    if (info.cautionStone) cautions.push(`${info.stone} is treated as a high-caution stone in many traditions.`);

    const weak: string[] = [];
    if (row.dignity === "debilitated") weak.push("debilitated");
    if (row.combust) weak.push("combust");
    if (ctx.hasAsc && DUSTHANAS.includes(ctx.house(planet))) weak.push(`in the ${ordinal(ctx.house(planet))}`);

    if (planet === "Rahu" || planet === "Ketu") {
      return { planet, stone: info.stone, substitute: info.substitute, role: "not_assessed" as const, weakBenefic: false, weak, rules: [], reasons: ["Rahu and Ketu rule no signs, so the lordship method does not apply. Left to a practitioner."], cautions };
    }
    if (!ctx.hasAsc) {
      return { planet, stone: info.stone, substitute: info.substitute, role: "not_assessed" as const, weakBenefic: false, weak, rules: [], reasons: ["Needs the Lagna, which needs a birth time."], cautions };
    }

    const rules = ctx.rules(planet);
    const good = rules.filter((h) => [1, 5, 9].includes(h));
    const bad = rules.filter((h) => DUSTHANAS.includes(h));
    const reasons: string[] = [`Rules the ${list(rules)}.`];
    let role: StoneRole;
    if (rules.includes(1)) {
      role = "considered";
      reasons.push(`Lagna lord — treated as a benefic for this chart${bad.length ? ` even though it also rules the ${list(bad)}` : ""}.`);
    } else if (good.length && !bad.length) {
      role = "considered";
      reasons.push(`Lord of the ${list(good)} (trikona) with no dusthana lordship.`);
    } else if (good.length && bad.length) {
      role = "mixed";
      reasons.push(`Lord of the ${list(good)} but also of the ${list(bad)} — practitioner judgement needed.`);
    } else if (bad.length) {
      role = "avoided";
      reasons.push(`Lord of the ${list(bad)} (dusthana) — its stone is usually avoided; mantra and daan are the usual route.`);
    } else {
      role = "neutral";
      reasons.push("Neither a trikona lord nor a dusthana lord — schools differ.");
    }
    const weakBenefic = role === "considered" && weak.length > 0;
    if (weakBenefic) reasons.push(`It is weak here (${weak.join(", ")}), which is the case where strengthening is traditionally discussed.`);
    return { planet, stone: info.stone, substitute: info.substitute, role, weakBenefic, weak, rules, reasons, cautions };
  });
}

export const GEMSTONE_WARNINGS = [
  "Practitioners disagree on gemstone selection. This is one lordship-based method, shown with its reasons.",
  "Many stones sold are synthetic, treated or mislabelled. Insist on an independent lab certificate.",
  "Decide your budget first and stay inside it. No stone is mandatory; mantra and daan cost little or nothing.",
];
