import type { Planet } from "@/engine/constants";
import type { Dignity } from "@/engine/zodiac";
import { DIGNITY_PHRASE, DUSTHANAS, KENDRAS, TRIKONAS, UPACHAYAS, ordinal, type Ctx, type RelationType } from "./context";

export const STRENGTH_RUBRIC = "strength-rubric@1.0.0";

export type StrengthComponent = { label: string; score: number };
export type Strength = { score: number; band: "strong" | "moderate" | "weak"; components: StrengthComponent[] };

const DIGNITY_SCORE: Record<Dignity, number> = {
  exalted: 2,
  moolatrikona: 1.5,
  own: 1,
  friend: 0.5,
  neutral: 0,
  enemy: -0.5,
  debilitated: -2,
};

const RELATION_SCORE: Record<RelationType, number> = { exchange: 1, conjunction: 1, mutual_aspect: 0.75 };

/**
 * Product heuristic — NOT a classical measure. Every component is returned so the UI can show
 * the full breakdown instead of one unexplained number.
 */
export function strengthOf(ctx: Ctx, planets: Planet[], relation?: RelationType): Strength {
  const c: StrengthComponent[] = [];
  const add = (label: string, score: number) => {
    if (score !== 0) c.push({ label, score });
  };

  for (const pl of planets) {
    const row = ctx.p(pl);
    add(`${pl} is ${DIGNITY_PHRASE[row.dignity]} (D1)`, DIGNITY_SCORE[row.dignity]);
    add(`${pl} is ${DIGNITY_PHRASE[ctx.d9Dignity(pl)]} (Navamsha D9)`, DIGNITY_SCORE[ctx.d9Dignity(pl)] / 2);
    if (row.combust) add(`${pl} is combust`, -1);

    if (ctx.hasAsc) {
      const h = ctx.house(pl);
      if (KENDRAS.includes(h) || TRIKONAS.includes(h)) add(`${pl} sits in the ${ordinal(h)} (kendra/trikona)`, 1);
      else if (DUSTHANAS.includes(h)) add(`${pl} sits in the ${ordinal(h)} (dusthana)`, -1);
      else if (UPACHAYAS.includes(h)) add(`${pl} sits in the ${ordinal(h)} (upachaya)`, 0.5);
      const bad = ctx.rules(pl).filter((x) => DUSTHANAS.includes(x));
      if (bad.length) add(`${pl} also rules the ${bad.map(ordinal).join(" & ")} (dusthana lordship)`, -0.5);
    }

    if (pl !== "Jupiter" && !planets.includes("Jupiter") && ctx.aspects("Jupiter", pl)) add(`Jupiter aspects ${pl}`, 0.5);
    for (const m of ["Saturn", "Mars", "Rahu", "Ketu"] as Planet[]) {
      if (planets.includes(m) || m === pl) continue;
      if (ctx.p(m).sign === row.sign) add(`${m} is conjunct ${pl}`, -0.5);
      else if (ctx.aspects(m, pl)) add(`${m} aspects ${pl}`, -0.5);
    }
  }
  if (relation) add(`Link is by ${relation.replace("_", " ")}`, RELATION_SCORE[relation]);

  const score = Math.round(c.reduce((s, x) => s + x.score, 0) * 100) / 100;
  return { score, band: score >= 4 ? "strong" : score >= 1.5 ? "moderate" : "weak", components: c };
}
