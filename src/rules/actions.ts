/**
 * Practical actions keyed by house. These are ordinary business and life actions that make sense
 * regardless of astrology; the house is only used to pick which ones are relevant to a yoga.
 */
export const HOUSE_FOCUS: Record<number, { area: string; actions: string[] }> = {
  1: { area: "Self, health, personal brand", actions: ["Protect sleep, fitness and energy — the business runs on you", "Be the visible face: speak, publish, show up"] },
  2: { area: "Savings, family wealth, pricing", actions: ["Set a fixed monthly savings rate before spending", "Review pricing and margins every quarter"] },
  3: { area: "Initiative, marketing, outreach", actions: ["Raise outreach volume: pitches, content, calls per week", "Ship small experiments quickly instead of planning long"] },
  4: { area: "Property, base, peace of mind", actions: ["Stabilise fixed costs and the home/office base", "Build assets that hold value"] },
  5: { area: "Creativity, product, calculated bets", actions: ["Invest time in product quality and original ideas", "Keep speculative bets small and capped"] },
  6: { area: "Competition, debt, daily operations", actions: ["Tighten processes and service quality", "Keep debt and disputes under written control"] },
  7: { area: "Partnerships, clients, contracts", actions: ["Put every partnership and client deal in writing", "Review your top 10 clients and deepen those accounts"] },
  8: { area: "Risk, shared money, sudden change", actions: ["Hold a cash reserve of several months of costs", "Insure key risks; avoid unhedged leverage"] },
  9: { area: "Mentors, learning, ethics, luck", actions: ["Find and meet mentors who have built what you want", "Keep conduct clean — reputation compounds"] },
  10: { area: "Career, authority, reputation", actions: ["Hire or develop a strong second-in-command", "Build systems so authority does not depend on your presence"] },
  11: { area: "Income, network, large goals", actions: ["Open one new revenue channel at a time and measure it", "Grow your network on purpose: clients, peers, investors"] },
  12: { area: "Expenses, foreign links, rest", actions: ["Cap and review expenses monthly", "Explore export or overseas clients if it fits the business"] },
};

export const CANNOT_CONCLUDE = [
  "That wealth, status or any event will happen, or when.",
  "That a ritual, gemstone, mantra or donation will switch a yoga on.",
  "Anything about investing, borrowing or business risk — decide those on numbers.",
];
