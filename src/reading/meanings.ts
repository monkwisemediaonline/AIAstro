import type { Planet } from "@/engine/constants";

/**
 * Plain-language significations used to compose readings.
 * These are the general, widely shared meanings of traditional Jyotish (planet natures, house
 * themes, sign temperaments), written in our own words. They are starting points, not verdicts.
 */
export const READING_TEXT = "reading-text@1.0.0";

export const PLANET_KEY: Record<Planet, string> = {
  Sun: "authority, confidence, recognition and dealings with seniors or government",
  Moon: "the mind, the public, comfort and emotional steadiness",
  Mars: "drive, courage, competition, property and technical work",
  Mercury: "trade, communication, calculation and quick learning",
  Jupiter: "wisdom, expansion, wealth, advisers and children",
  Venus: "comfort, relationships, luxury, design and vehicles",
  Saturn: "discipline, patience, labour, structure and results that come slowly but last",
  Rahu: "ambition, foreign links, technology and unconventional routes",
  Ketu: "detachment, insight, research and sudden breaks",
};

export const HOUSE_THEME: Record<number, string> = {
  1: "self, health and personal direction",
  2: "savings, family wealth and speech",
  3: "initiative, marketing, courage and siblings",
  4: "home, property, vehicles and peace of mind",
  5: "ideas, creativity, children and calculated bets",
  6: "competition, debts, disputes and daily work",
  7: "marriage, partners, clients and contracts",
  8: "sudden change, shared money, risk and research",
  9: "fortune, mentors, ethics and long journeys",
  10: "career, authority and public reputation",
  11: "income, gains, networks and large goals",
  12: "expenses, foreign lands, rest and letting go",
};

export const LAGNA_TEXT: string[] = [
  "Direct, pioneering and quick to act. You do best leading from the front; patience and follow-through are the things to build.",
  "Steady, patient and value-minded. You build wealth slowly and hold on to it; sudden change is uncomfortable for you.",
  "Quick-minded, communicative and versatile. Strong in trade, sales and media; the risk is scattering your attention.",
  "Caring, intuitive and protective. You do well in work around people, food, homes and the public; moods need steadying.",
  "Confident, generous and drawn to authority. Leadership and brand-building come naturally; sharing credit keeps people with you.",
  "Analytical, precise and service-minded. Systems, quality and numbers are your ground; watch for over-criticism.",
  "Diplomatic, fair and partnership-minded. Trade, design and deal-making suit you; deciding faster helps.",
  "Intense, strategic and private. Research, finance and turnarounds suit you; choose whom to trust, then do trust them.",
  "Optimistic, principled and expansive. Advising, teaching and expansion suit you; keep promises realistic.",
  "Disciplined, ambitious and patient. You are an organisation-builder; success tends to come later and last longer.",
  "Independent, a thinker in systems and networks. Technology and large groups suit you; let people see your warmth.",
  "Imaginative, compassionate and adaptable. Creative, healing and overseas work suit you; keep firm boundaries with money.",
];

export const MOON_TEXT: string[] = [
  "Your mind is quick and restless; you need action and fresh challenges to feel settled.",
  "Your mind seeks comfort and stability; security and routine keep you calm.",
  "Your mind is curious and talkative; you need variety and conversation.",
  "Your mind is sensitive and protective; home and close family are your anchor.",
  "Your mind wants respect and warmth; recognition matters to you more than you show.",
  "Your mind analyses everything; order and usefulness settle you, worry unsettles you.",
  "Your mind wants harmony and company; conflict drains you quickly.",
  "Your mind is deep and intense; you feel strongly and keep much private.",
  "Your mind is hopeful and freedom-loving; meaning and learning keep you going.",
  "Your mind is serious and dutiful; you feel best when you are achieving something concrete.",
  "Your mind is independent and idea-driven; you need space and a cause.",
  "Your mind is gentle and imaginative; quiet time and faith restore you.",
];

export const NAKSHATRA_KEY: Record<string, string> = {
  Ashwini: "speed, initiative and healing",
  Bharani: "carrying responsibility and restraint",
  Krittika: "sharpness and cutting through to the point",
  Rohini: "growth, attraction and comfort",
  Mrigashira: "searching and curiosity",
  Ardra: "intensity, then renewal after a storm",
  Punarvasu: "return, renewal and optimism",
  Pushya: "nourishment and teaching; counted among the most supportive stars",
  Ashlesha: "insight, strategy and a firm grip",
  Magha: "lineage, authority and pride",
  "Purva Phalguni": "enjoyment, creativity and rest",
  "Uttara Phalguni": "agreements, patronage and dependable help",
  Hasta: "skill of hand, craft and cleverness",
  Chitra: "design, brilliance and building",
  Swati: "independence, trade and flexibility",
  Vishakha: "single-minded pursuit of a goal",
  Anuradha: "friendship, devotion and organisation",
  Jyeshtha: "seniority, protection and responsibility",
  Mula: "going to the root of things",
  "Purva Ashadha": "conviction and the will to win",
  "Uttara Ashadha": "lasting victory and integrity",
  Shravana: "listening, learning and connection",
  Dhanishta: "wealth, rhythm and achievement in groups",
  Shatabhisha: "healing, independence and privacy",
  "Purva Bhadrapada": "intensity, idealism and transformation",
  "Uttara Bhadrapada": "depth, stability and wisdom",
  Revati: "nourishment, safe journeys and completion",
};

/** Fields traditionally associated with the planet ruling or influencing the 10th house. */
export const CAREER_FIELDS: Partial<Record<Planet, string>> = {
  Sun: "administration, leadership roles, government-facing work",
  Moon: "public-facing business, food, hospitality, care services",
  Mars: "engineering, property, machinery, security, sports",
  Mercury: "trade, marketing, media, IT, accounts and brokerage",
  Jupiter: "advisory, education, finance, law",
  Venus: "fashion, design, luxury, entertainment, hospitality",
  Saturn: "manufacturing, infrastructure, logistics, labour-heavy and long-contract work",
};

export const NUMBER_TEXT: Record<number, string> = {
  1: "leadership, independence and originality (Sun)",
  2: "cooperation, sensitivity and diplomacy (Moon)",
  3: "expression, optimism and growth (Jupiter)",
  4: "structure, hard work and unconventional thinking (Rahu)",
  5: "trade, movement and adaptability (Mercury)",
  6: "responsibility, comfort and relationships (Venus)",
  7: "analysis, research and inwardness (Ketu)",
  8: "ambition, endurance and material results that come through patience (Saturn)",
  9: "courage, drive and completion (Mars)",
};

export const PERSONAL_YEAR_TEXT: Record<number, string> = {
  1: "a year for new starts: launch, lead, begin the thing you have been planning",
  2: "a year for patience and partnership: build relationships, do not force outcomes",
  3: "a year for visibility and growth: market, speak, create",
  4: "a year for foundations: systems, hard work, fixing what is weak",
  5: "a year of change and movement: new markets, travel, flexibility",
  6: "a year of responsibility: family, home, clients who depend on you",
  7: "a year for study and reflection: research, plan, improve skill; less outward push",
  8: "a year for money and authority: negotiate, scale, harvest earlier effort",
  9: "a year for completion: finish, clear out, give back; avoid starting big new things at its end",
};

/** Themes read from the house a slow planet transits, counted from the natal Moon. */
export const TRANSIT_FROM_MOON: Record<number, string> = {
  1: "focus turns to yourself, your health and how you carry yourself",
  2: "money, family and speech come into focus",
  3: "effort, initiative and short journeys are highlighted",
  4: "home, property and peace of mind are highlighted",
  5: "ideas, children and judgement are highlighted",
  6: "competition, health routines and debts need handling",
  7: "partnerships, clients and marriage are highlighted",
  8: "a time for caution with risk, health and shared money",
  9: "fortune, mentors and learning are highlighted",
  10: "career, responsibility and reputation are highlighted",
  11: "gains, networks and goals are highlighted",
  12: "expenses, rest and distant places are highlighted",
};
