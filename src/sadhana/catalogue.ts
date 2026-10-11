import type { ChartSnapshot } from "@/engine/chart";
import { SIGNS, SIGN_LORDS, type Planet } from "@/engine/constants";

export const SADHANA_CATALOGUE = "sadhana@1.0.0";

/**
 * Only practices a person does themselves, for themselves or their household:
 * mantra, stotra, yantra meditation, lamp, charity. Nothing aimed at another person.
 */
export const EXCLUDED = [
  "Anything aimed at controlling, harming or binding another person (vashikaran, maran, uchchatan, stambhan, vidveshan).",
  "Animal offerings, cremation-ground rites, intoxicants, or anything that risks health or breaks the law.",
  "Paid rituals done on your behalf by someone promising a result.",
  "Initiation-only practices. Deeper tantric sadhana is traditionally taken up only under a guru.",
];

export type Practice = {
  key: string;
  group: "obstacles" | "wealth" | "protection" | "family" | "discipline";
  title: string;
  deity: string;
  how: string;
  when: string;
  /** Tracking defaults. Count-based practices use the japa counter. */
  kind: "mantra" | "puja";
  target?: number;
  note?: string;
};

export const PRACTICES: Practice[] = [
  { key: "ganesha-japa", group: "obstacles", title: "Om Gam Ganapataye Namah", deity: "Ganesha", how: "108 repetitions on a mala before starting the day's work or any new venture.", when: "Daily; especially Wednesdays and Chaturthi.", kind: "mantra", target: 12500, note: "Traditionally done first, before any other practice, to clear obstacles." },
  { key: "lakshmi-japa", group: "wealth", title: "Om Shreem Mahalakshmyai Namah", deity: "Mahalakshmi", how: "108 repetitions facing east or north, with a ghee lamp lit. Shreem is Lakshmi's seed syllable.", when: "Daily; Fridays and full-moon evenings are traditional.", kind: "mantra", target: 125000 },
  { key: "shri-sukta", group: "wealth", title: "Shri Sukta recitation", deity: "Lakshmi", how: "Recite or listen to the Shri Sukta (16 verses from the Rig Veda Khila) attentively.", when: "Fridays, and on Purnima.", kind: "puja" },
  { key: "kanakadhara", group: "wealth", title: "Kanakadhara Stotram", deity: "Lakshmi", how: "Recite the 21-verse hymn attributed to Adi Shankara.", when: "Fridays, or daily for a fixed span such as 41 days.", kind: "puja" },
  { key: "kubera-japa", group: "wealth", title: "Kubera mantra", deity: "Kubera", how: "“Om Yakshaya Kuberaya Vaishravanaya Dhana-Dhanyadhipataye Dhana-Dhanya Samriddhim Me Dehi Dapaya Svaha” — 108 repetitions.", when: "Daily or on Thursdays and Fridays; Dhanteras is traditional.", kind: "mantra", target: 12500 },
  { key: "sri-yantra", group: "wealth", title: "Sri Yantra meditation", deity: "Tripura Sundari / Lakshmi", how: "Keep a Sri Yantra in the prayer place or office. Sit before it for 10 minutes with steady gaze on the centre point, breathing slowly, then repeat the Lakshmi mantra.", when: "Daily, at a fixed time.", kind: "puja", note: "The central practice of the Sri Vidya tradition in its simplest, householder form." },
  { key: "evening-lamp", group: "wealth", title: "Evening lamp at the entrance and prayer place", deity: "Lakshmi", how: "Light a ghee or sesame-oil lamp at dusk; keep the entrance and cash/accounts area clean.", when: "Daily at sunset.", kind: "puja", note: "Never leave a flame unattended." },
  { key: "hanuman-chalisa", group: "protection", title: "Hanuman Chalisa", deity: "Hanuman", how: "Recite once (or 7 times on Tuesdays and Saturdays).", when: "Daily; Tuesdays and Saturdays.", kind: "puja", note: "The most widely used protective recitation; also traditional during Sade Sati." },
  { key: "durga-japa", group: "protection", title: "Om Dum Durgayai Namah", deity: "Durga", how: "108 repetitions. For a fuller practice, recite the Devi Kavach.", when: "Daily; Tuesdays, Fridays and Navratri.", kind: "mantra", target: 12500 },
  { key: "mahamrityunjaya", group: "family", title: "Mahamrityunjaya mantra", deity: "Shiva", how: "“Om Tryambakam Yajamahe Sugandhim Pushtivardhanam, Urvarukamiva Bandhanan Mrityor Mukshiya Maamritat” — 108 repetitions for the health and long life of the family.", when: "Mondays, or daily.", kind: "mantra", target: 125000 },
  { key: "gayatri", group: "family", title: "Gayatri mantra", deity: "Savitri (the Sun)", how: "108 repetitions at sunrise for clarity of mind.", when: "Daily at sunrise.", kind: "mantra", target: 125000 },
  { key: "annadaan", group: "family", title: "Annadaan — feeding people", deity: "—", how: "Give food regularly to those who need it, in your family's name. Tradition holds this as the charity that carries merit to coming generations.", when: "Monthly, or on birthdays and anniversaries.", kind: "puja" },
  { key: "sitting", group: "discipline", title: "Ten minutes of still sitting", deity: "—", how: "Sit upright, breathe slowly through the nose, count breaths from 1 to 10 and start again. No mantra needed.", when: "Daily, before the other practices.", kind: "puja", note: "Every tradition of sadhana treats a steady mind as the base. Decisions made from a steady mind are also better business decisions." },
];

export const GROUP_TITLE: Record<Practice["group"], { title: string; blurb: string }> = {
  obstacles: { title: "First: removing obstacles", blurb: "Traditionally begun before anything else." },
  wealth: { title: "Wealth (Lakshmi and Kubera)", blurb: "Householder practices from the Sri Vidya and devotional traditions." },
  protection: { title: "Protection", blurb: "Protective recitations for yourself and your household. They ask for protection; they do not act on anyone else." },
  family: { title: "Family and coming generations", blurb: "Practices for the health of the family and merit passed forward." },
  discipline: { title: "The base", blurb: "Without steadiness the rest is only words." },
};

/** Deity traditionally associated with each planet in the Jaimini karakamsha method. Attributions vary by text. */
export const PLANET_DEITY: Record<Planet, string> = {
  Sun: "Shiva",
  Moon: "Gauri (Parvati)",
  Mars: "Skanda (Kartikeya); many also say Hanuman",
  Mercury: "Vishnu",
  Jupiter: "Sadashiva; many also say Vishnu or one's guru",
  Venus: "Lakshmi",
  Saturn: "Vishnu; many also say Shani or Hanuman",
  Rahu: "Durga",
  Ketu: "Ganesha",
};

/** Mahavidya traditionally linked to each planet. Reference only: these are initiation-based practices. */
export const PLANET_MAHAVIDYA: Record<Planet, string> = {
  Sun: "Matangi",
  Moon: "Bhuvaneshwari",
  Mars: "Bagalamukhi",
  Mercury: "Tripura Sundari (Shodashi)",
  Jupiter: "Tara",
  Venus: "Kamala",
  Saturn: "Kali",
  Rahu: "Chhinnamasta",
  Ketu: "Dhumavati",
};

const SEVEN: Planet[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

export type IshtaReading = {
  atmakaraka: Planet;
  atmakarakaDegree: number;
  karakamsha: number; // Navamsha sign of the Atmakaraka
  twelfth: number; // 12th sign from the Karakamsha
  occupants: Planet[]; // planets in that sign in the Navamsha
  indicator: Planet;
  via: "occupant" | "lord";
  deity: string;
  close: boolean; // two planets within 1° for Atmakaraka: the result is sensitive to birth time
};

/**
 * Ishta Devata by the Jaimini karakamsha method:
 * the Atmakaraka is the planet with the highest degree within its sign (seven-planet scheme);
 * its Navamsha sign is the Karakamsha; planets in the 12th from it in the Navamsha (or, if none,
 * that sign's lord) indicate the deity.
 */
export function ishtaDevata(snap: ChartSnapshot): IshtaReading {
  const rows = SEVEN.map((pl) => snap.planets.find((x) => x.planet === pl)!).sort((a, b) => b.degInSign - a.degInSign);
  const ak = rows[0];
  const karakamsha = ak.vargas.D9!;
  const twelfth = (karakamsha + 11) % 12;
  const occupants = snap.planets.filter((x) => x.vargas.D9 === twelfth).map((x) => x.planet);
  // If several planets occupy it, the one with the highest degree is taken as the stronger indicator.
  const strongest = occupants.length ? snap.planets.filter((x) => occupants.includes(x.planet)).sort((a, b) => b.degInSign - a.degInSign)[0].planet : null;
  const indicator = strongest ?? SIGN_LORDS[twelfth];
  return {
    atmakaraka: ak.planet,
    atmakarakaDegree: ak.degInSign,
    karakamsha,
    twelfth,
    occupants,
    indicator,
    via: strongest ? "occupant" : "lord",
    deity: PLANET_DEITY[indicator],
    close: rows[0].degInSign - rows[1].degInSign < 1,
  };
}

export const signName = (i: number) => SIGNS[i];
