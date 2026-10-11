import type { ChartSnapshot } from "@/engine/chart";
import { PLANETS, type Planet } from "@/engine/constants";
import { houseFrom } from "@/engine/zodiac";

/**
 * Lal Kitab is a separate tradition. This module depends only on the astronomy output
 * (planet signs and the Lagna) and must never import the Parashari rules.
 */
export const LAL_KITAB_MODULE = "lal-kitab@1.0.0";

export type LkPlacement = { planet: Planet; house: number };

export type LkTeva = {
  placements: LkPlacement[];
  /** Houses 1–12 with their occupants. */
  houses: { house: number; planets: Planet[] }[];
  emptyHouses: number[];
};

/**
 * Lal Kitab teva: the Lagna becomes house 1 and each planet is read by its house only.
 * Signs are ignored; the chart is drawn with Aries fixed in house 1 (so sign number = house number).
 * Returns null without a Lagna.
 */
export function lalKitabTeva(snap: ChartSnapshot): LkTeva | null {
  if (!snap.ascendant) return null;
  const lagna = snap.ascendant.sign;
  const placements = PLANETS.map((planet) => ({ planet, house: houseFrom(lagna, snap.planets.find((p) => p.planet === planet)!.sign) }));
  const houses = Array.from({ length: 12 }, (_, i) => ({ house: i + 1, planets: placements.filter((p) => p.house === i + 1).map((p) => p.planet) }));
  return { placements, houses, emptyHouses: houses.filter((h) => h.planets.length === 0).map((h) => h.house) };
}

/** Upay that touch any of these need the owner's explicit safety check before being treated as usable. */
export const UPAY_SAFETY = [
  "Animals: no feeding, releasing or handling that could harm an animal or break wildlife rules.",
  "Rivers, wells and public places: nothing thrown or left that pollutes or breaks local rules.",
  "Fire, food and fasting: consider health, safety and waste.",
  "Other people: nothing that involves someone without their knowledge or consent.",
  "Never stop medical treatment or professional advice because of an upay.",
];
