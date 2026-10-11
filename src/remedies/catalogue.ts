import type { Planet } from "@/engine/constants";

export const REMEDY_CATALOGUE = "starter-catalogue@1.0.0";

export type RemedyKind = "mantra" | "seva" | "daan" | "gemstone";
export type SafetyFlag = "fasting_health" | "large_cost" | "metal_on_skin" | "food_waste" | "third_party_involved";

export type StarterRemedy = {
  key: string;
  planet: Planet;
  kind: RemedyKind;
  title: string;
  detail: string;
  cost: "free" | "low" | "high";
  safety: SafetyFlag[];
};

/**
 * Starter entries: widely known associations in common North Indian practice.
 * They are NOT verified against a specific text — each is a draft for the owner to check
 * and replace with sourced entries. Nothing here is a prescription.
 */
export const ATTRIBUTION = "Common tradition · not yet source-verified";

type PlanetInfo = { day: string; mantra: string; conduct: string | null; daan: string; stone: string; substitute: string | null; cautionStone?: boolean };

export const PLANET_REMEDY: Record<Planet, PlanetInfo> = {
  Sun: { day: "Sunday", mantra: "Om Suryaya Namah", conduct: "Offer water to the rising Sun; honour your father and mentors.", daan: "Wheat, jaggery (gur)", stone: "Ruby (Manik)", substitute: "Red garnet" },
  Moon: { day: "Monday", mantra: "Om Chandraya Namah", conduct: "Care for your mother; keep a steady sleep routine.", daan: "Rice, milk, white cloth", stone: "Pearl (Moti)", substitute: "Moonstone" },
  Mars: { day: "Tuesday", mantra: "Om Mangalaya Namah", conduct: "Regular physical training; support your brothers and team.", daan: "Red lentils (masoor dal)", stone: "Red coral (Moonga)", substitute: "Carnelian" },
  Mercury: { day: "Wednesday", mantra: "Om Budhaya Namah", conduct: "Support a student's books or fees; keep your word in dealings.", daan: "Whole green moong", stone: "Emerald (Panna)", substitute: "Peridot" },
  Jupiter: { day: "Thursday", mantra: "Om Gurave Namah", conduct: "Respect teachers and elders; give time to learning.", daan: "Chana dal, turmeric", stone: "Yellow sapphire (Pukhraj)", substitute: "Citrine" },
  Venus: { day: "Friday", mantra: "Om Shukraya Namah", conduct: "Respect and care in marriage; keep home and workspace clean.", daan: "Rice, sugar, white cloth", stone: "Diamond (Heera)", substitute: "White sapphire" },
  Saturn: { day: "Saturday", mantra: "Om Shanaishcharaya Namah", conduct: "Pay workers fairly and on time; help the elderly and those in need.", daan: "Black sesame (til), mustard oil", stone: "Blue sapphire (Neelam)", substitute: "Amethyst", cautionStone: true },
  Rahu: { day: "Saturday", mantra: "Om Rahave Namah", conduct: null, daan: "Black sesame, a blanket", stone: "Hessonite (Gomed)", substitute: null, cautionStone: true },
  Ketu: { day: "Tuesday", mantra: "Om Ketave Namah", conduct: null, daan: "A blanket, sesame", stone: "Cat's eye (Lehsunia)", substitute: null, cautionStone: true },
};

/** Ordered zero-cost first; the gemstone is always last and handled by the reasoning module. */
export function starterRemedies(planet: Planet): StarterRemedy[] {
  const p = PLANET_REMEDY[planet];
  const out: StarterRemedy[] = [
    { key: `${planet}-mantra`, planet, kind: "mantra", title: `Japa: ${p.mantra}`, detail: `Traditionally on ${p.day}s or daily. One mala is 108 repetitions.`, cost: "free", safety: [] },
  ];
  if (p.conduct) out.push({ key: `${planet}-seva`, planet, kind: "seva", title: "Conduct and service", detail: p.conduct, cost: "free", safety: [] });
  out.push({ key: `${planet}-daan`, planet, kind: "daan", title: `Daan on ${p.day}`, detail: `${p.daan}. Give within your monthly cap, to someone who will use it.`, cost: "low", safety: ["food_waste"] });
  return out;
}

export const SAFETY_TEXT: Record<SafetyFlag, string> = {
  fasting_health: "Fasting: check with a doctor if you have a medical condition, are pregnant, or take medication.",
  large_cost: "High cost: stay inside the budget you set. No remedy is mandatory.",
  metal_on_skin: "Rings and metals can irritate skin; stop if they do.",
  food_waste: "Give food to people who will eat it; avoid waste.",
  third_party_involved: "Involves other people or places; be considerate and lawful.",
};

export const GENERAL_SAFETY = [
  "These are traditional practices, not proven causes of wealth or any outcome. None is mandatory.",
  "Never stop medical treatment or professional advice because of a remedy.",
  "The app never buys, donates or books anything. It only keeps your record.",
];
