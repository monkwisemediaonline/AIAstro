export const PLANETS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
] as const;
export type Planet = (typeof PLANETS)[number];

export const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;
export type Sign = (typeof SIGNS)[number];

export const SIGN_HINDI = [
  "Mesha",
  "Vrishabha",
  "Mithuna",
  "Karka",
  "Simha",
  "Kanya",
  "Tula",
  "Vrishchika",
  "Dhanu",
  "Makara",
  "Kumbha",
  "Meena",
] as const;

/** Parashari sign lords, indexed by sign (0 = Aries). */
export const SIGN_LORDS: readonly Planet[] = [
  "Mars",
  "Venus",
  "Mercury",
  "Moon",
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Saturn",
  "Jupiter",
];

export const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

export const NAKSHATRA_SPAN = 360 / 27; // 13°20'
export const PADA_SPAN = NAKSHATRA_SPAN / 4; // 3°20'

/** Vimshottari order starting from Ashwini's lord, with Mahadasha years. */
export const DASHA_ORDER: readonly Planet[] = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
];
export const DASHA_YEARS: Readonly<Record<Planet, number>> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

/** Exaltation sign index and deep-exaltation degree (Parashari). Rahu/Ketu: Taurus/Scorpio default (disputed). */
export const EXALTATION: Readonly<Record<Planet, { sign: number; deg: number }>> = {
  Sun: { sign: 0, deg: 10 },
  Moon: { sign: 1, deg: 3 },
  Mars: { sign: 9, deg: 28 },
  Mercury: { sign: 5, deg: 15 },
  Jupiter: { sign: 3, deg: 5 },
  Venus: { sign: 11, deg: 27 },
  Saturn: { sign: 6, deg: 20 },
  Rahu: { sign: 1, deg: 20 },
  Ketu: { sign: 7, deg: 20 },
};

/** Moolatrikona sign and degree range [from, to). */
export const MOOLATRIKONA: Readonly<Partial<Record<Planet, { sign: number; from: number; to: number }>>> = {
  Sun: { sign: 4, from: 0, to: 20 },
  Moon: { sign: 1, from: 4, to: 30 },
  Mars: { sign: 0, from: 0, to: 12 },
  Mercury: { sign: 5, from: 16, to: 20 },
  Jupiter: { sign: 8, from: 0, to: 10 },
  Venus: { sign: 6, from: 0, to: 15 },
  Saturn: { sign: 10, from: 0, to: 20 },
};

/**
 * Naisargika (natural) friendships for the seven classical planets, BPHS.
 * Anything not listed (including Rahu/Ketu) is treated as neutral.
 */
export const NATURAL_RELATIONS: Readonly<
  Partial<Record<Planet, { friends: Planet[]; neutral: Planet[]; enemies: Planet[] }>>
> = {
  Sun: { friends: ["Moon", "Mars", "Jupiter"], neutral: ["Mercury"], enemies: ["Venus", "Saturn"] },
  Moon: { friends: ["Sun", "Mercury"], neutral: ["Mars", "Jupiter", "Venus", "Saturn"], enemies: [] },
  Mars: { friends: ["Sun", "Moon", "Jupiter"], neutral: ["Venus", "Saturn"], enemies: ["Mercury"] },
  Mercury: { friends: ["Sun", "Venus"], neutral: ["Mars", "Jupiter", "Saturn"], enemies: ["Moon"] },
  Jupiter: { friends: ["Sun", "Moon", "Mars"], neutral: ["Saturn"], enemies: ["Mercury", "Venus"] },
  Venus: { friends: ["Mercury", "Saturn"], neutral: ["Mars", "Jupiter"], enemies: ["Sun", "Moon"] },
  Saturn: { friends: ["Mercury", "Venus"], neutral: ["Jupiter"], enemies: ["Sun", "Moon", "Mars"] },
};

export type Relation = "friend" | "neutral" | "enemy";
export function naturalRelation(of: Planet, toward: Planet): Relation {
  const r = NATURAL_RELATIONS[of];
  if (!r || of === toward) return "neutral";
  if (r.friends.includes(toward)) return "friend";
  if (r.enemies.includes(toward)) return "enemy";
  return "neutral";
}

/** Combustion orbs in degrees from the Sun (Surya Siddhanta tradition). */
export const COMBUSTION_ORBS: Readonly<Partial<Record<Planet, { direct: number; retro: number }>>> = {
  Moon: { direct: 12, retro: 12 },
  Mars: { direct: 17, retro: 17 },
  Mercury: { direct: 14, retro: 12 },
  Jupiter: { direct: 11, retro: 11 },
  Venus: { direct: 10, retro: 8 },
  Saturn: { direct: 15, retro: 15 },
};

/** Special graha drishti (sign counts, inclusive). All planets also aspect the 7th. */
export const SPECIAL_ASPECTS: Readonly<Partial<Record<Planet, number[]>>> = {
  Mars: [4, 8],
  Jupiter: [5, 9],
  Saturn: [3, 10],
};
