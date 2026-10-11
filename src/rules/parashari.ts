import { EXALTATION, SIGNS, SIGN_LORDS, type Planet } from "@/engine/constants";
import {
  CLASSICAL,
  DIGNITY_PHRASE,
  DUSTHANAS,
  KENDRAS,
  NATURAL_BENEFICS,
  RELATION_LABEL,
  TRIKONAS,
  UPACHAYAS,
  ordinal,
  type Ctx,
  type RelationType,
} from "./context";
import { strengthOf } from "./strength";
import type { Evaluation, Instance, RuleDef } from "./types";

export const PARASHARI_RULESET = "parashari-yogas@1.0.0";

const STRONG: RelationType[] = ["exchange", "conjunction", "mutual_aspect"];
const best = (r: RelationType[]) => STRONG.find((x) => r.includes(x));
const list = (hs: number[]) => hs.map(ordinal).join(" & ");

/** Instances for every related pair of lords between two sets of houses. */
function lordPairs(ctx: Ctx, housesA: number[], housesB: number[], label: (a: number[], b: number[]) => string): Instance[] {
  const seen = new Map<string, Instance>();
  for (const ha of housesA) {
    for (const hb of housesB) {
      if (ha === hb) continue;
      const a = ctx.lord(ha);
      const b = ctx.lord(hb);
      if (a === b) continue;
      const rel = best(ctx.relations(a, b));
      if (!rel) continue;
      const key = [a, b].sort().join("|");
      const existing = seen.get(key);
      if (existing) {
        for (const h of [ha, hb]) if (!existing.houses.includes(h)) existing.houses.push(h);
        continue;
      }
      seen.set(key, {
        title: label([ha], [hb]),
        planets: [a, b],
        houses: [ha, hb],
        relation: rel,
        facts: [`${a} rules the ${list(ctx.rules(a))}`, `${b} rules the ${list(ctx.rules(b))}`, ctx.describe(a), ctx.describe(b), `Linked by ${RELATION_LABEL[rel]}`],
        strength: strengthOf(ctx, [a, b], rel),
      });
    }
  }
  return [...seen.values()].map((i) => ({ ...i, houses: i.houses.sort((x, y) => x - y), title: `${i.planets[0]} + ${i.planets[1]} (lords of ${list(i.houses.sort((x, y) => x - y))})` }));
}

const single = (ctx: Ctx, planet: Planet, title: string, facts: string[] = []): Instance => ({
  title,
  planets: [planet],
  houses: ctx.hasAsc ? [ctx.house(planet)] : [],
  facts: [ctx.describe(planet), ...facts],
  strength: strengthOf(ctx, [planet]),
});

// ---------------------------------------------------------------- Raja yogas

const kendraTrikona: RuleDef = {
  id: "PAR-RY-001",
  name: "Kendra–Trikona Raja Yoga",
  category: "raja",
  definition:
    "The lord of a kendra (1, 4, 7, 10) and the lord of a trikona (1, 5, 9) are joined by conjunction, mutual aspect, or exchange of signs. A single planet ruling both is handled under Yogakaraka.",
  source: "BPHS, Raja Yoga chapter; Phaladeepika ch. 6 (verify chapter in your edition)",
  themes: "Status, authority, recognition, rise in life",
  needsAscendant: true,
  evaluate(ctx) {
    const instances = lordPairs(ctx, KENDRAS, TRIKONAS, () => "");
    return {
      status: instances.length ? "detected" : "not_detected",
      conditions: [{ text: "At least one kendra lord and one trikona lord are conjunct, in mutual aspect, or exchanged", met: instances.length > 0 }],
      instances,
    };
  },
};

const yogakaraka: RuleDef = {
  id: "PAR-RY-002",
  name: "Yogakaraka planet",
  category: "raja",
  definition: "One planet, other than the Lagna lord, rules both a kendra (4, 7, 10) and a trikona (5, 9). Its placement and dignity decide how much it gives.",
  source: "BPHS, functional nature of planets per Lagna (verify chapter in your edition)",
  themes: "A single planet able to give rise and success, especially in its Dasha",
  needsAscendant: true,
  evaluate(ctx) {
    const lagnaLord = ctx.lord(1);
    const found = CLASSICAL.filter((pl) => {
      if (pl === lagnaLord) return false;
      const r = ctx.rules(pl);
      return r.some((h) => [4, 7, 10].includes(h)) && r.some((h) => [5, 9].includes(h));
    });
    const instances = found.map((pl) => single(ctx, pl, `${pl} rules the ${list(ctx.rules(pl))}`));
    const notes = found.filter((pl) => ctx.p(pl).dignity === "debilitated" || ctx.p(pl).combust || DUSTHANAS.includes(ctx.house(pl))).map((pl) => `${pl} is the yogakaraka but is weakly placed — results are traditionally reduced or delayed.`);
    return {
      status: found.length ? "detected" : "not_detected",
      conditions: [{ text: `A planet other than the Lagna lord (${lagnaLord}) rules both a kendra and a trikona`, met: found.length > 0 }],
      instances,
      notes,
    };
  },
};

const dharmaKarma: RuleDef = {
  id: "PAR-RY-003",
  name: "Dharma–Karmadhipati Yoga",
  category: "raja",
  definition: "The 9th lord (fortune) and the 10th lord (career) are joined by conjunction, mutual aspect, or exchange — or one planet rules both.",
  source: "BPHS, Raja Yoga chapter (verify chapter in your edition)",
  themes: "Career aligned with fortune; public standing",
  needsAscendant: true,
  evaluate(ctx) {
    const l9 = ctx.lord(9);
    const l10 = ctx.lord(10);
    if (l9 === l10) {
      return {
        status: "detected",
        conditions: [{ text: `One planet (${l9}) rules both the 9th and 10th`, met: true }],
        instances: [single(ctx, l9, `${l9} rules both the 9th and 10th`)],
      };
    }
    const instances = lordPairs(ctx, [9], [10], () => "");
    return {
      status: instances.length ? "detected" : "not_detected",
      conditions: [{ text: `9th lord ${l9} and 10th lord ${l10} are conjunct, in mutual aspect, or exchanged`, met: instances.length > 0 }],
      instances,
      notes: instances.length ? ["This pair is also counted under Kendra–Trikona Raja Yoga."] : [],
    };
  },
};

/** Parivartana (exchange) yogas, classified as Maha / Khala / Dainya by the houses involved. */
function parivartana(kind: "maha" | "khala" | "dainya"): RuleDef {
  const GOOD = [1, 2, 4, 5, 7, 9, 10, 11];
  const meta = {
    maha: { id: "PAR-RY-004", name: "Maha Parivartana Yoga", category: "raja" as const, text: "both houses are among 1, 2, 4, 5, 7, 9, 10, 11", themes: "Two strong houses reinforce each other: wealth, status, support" },
    khala: { id: "PAR-OT-001", name: "Khala Parivartana Yoga", category: "other" as const, text: "one house is the 3rd and the other is not a dusthana", themes: "Fluctuating results; effort and initiative drive outcomes" },
    dainya: { id: "PAR-OT-002", name: "Dainya Parivartana Yoga", category: "caution" as const, text: "one house is a dusthana (6, 8, 12)", themes: "Traditionally a strain on the non-dusthana house involved" },
  }[kind];
  return {
    id: meta.id,
    name: meta.name,
    category: meta.category,
    definition: `Two house lords occupy each other's signs, where ${meta.text}.`,
    source: "Phaladeepika ch. 6, Parivartana yogas (verify in your edition)",
    themes: meta.themes,
    needsAscendant: true,
    evaluate(ctx) {
      const instances: Instance[] = [];
      for (let i = 0; i < CLASSICAL.length; i++) {
        for (let j = i + 1; j < CLASSICAL.length; j++) {
          const a = CLASSICAL[i];
          const b = CLASSICAL[j];
          if (!ctx.relations(a, b).includes("exchange")) continue;
          // the two houses actually exchanged are the houses the planets occupy
          const hs = [ctx.house(a), ctx.house(b)].sort((x, y) => x - y);
          const hasDusthana = hs.some((h) => DUSTHANAS.includes(h));
          const cls = hasDusthana ? "dainya" : hs.includes(3) ? "khala" : hs.every((h) => GOOD.includes(h)) ? "maha" : null;
          if (cls !== kind) continue;
          instances.push({
            title: `${a} ⇄ ${b} (houses ${list(hs)})`,
            planets: [a, b],
            houses: hs,
            relation: "exchange",
            facts: [ctx.describe(a), ctx.describe(b), `${a} is in ${b}'s sign and ${b} is in ${a}'s sign`],
            strength: strengthOf(ctx, [a, b], "exchange"),
          });
        }
      }
      return {
        status: instances.length ? "detected" : "not_detected",
        conditions: [{ text: `Two lords exchange signs where ${meta.text}`, met: instances.length > 0 }],
        instances,
      };
    },
  };
}

function viparita(house: 6 | 8 | 12, id: string, name: string): RuleDef {
  return {
    id,
    name: `Viparita Raja Yoga — ${name}`,
    category: "raja",
    definition: `The lord of the ${ordinal(house)} house is placed in a dusthana (6th, 8th or 12th).`,
    source: "Phaladeepika ch. 6 (Harsha, Sarala, Vimala); verify in your edition",
    themes: "Gain after adversity; strength from setbacks",
    needsAscendant: true,
    evaluate(ctx) {
      const l = ctx.lord(house);
      const h = ctx.house(l);
      const met = DUSTHANAS.includes(h);
      const notes: string[] = [];
      if (met) {
        const good = ctx.rules(l).filter((x) => KENDRAS.includes(x) || TRIKONAS.includes(x));
        if (good.length) notes.push(`${l} also rules the ${list(good)}, so the result is mixed: that house's matters can suffer.`);
        const joined = CLASSICAL.filter((o) => o !== l && ctx.p(o).sign === ctx.p(l).sign && ctx.rules(o).some((x) => KENDRAS.includes(x) || TRIKONAS.includes(x)) && !ctx.rules(o).some((x) => DUSTHANAS.includes(x)));
        if (joined.length) notes.push(`Stricter versions require the dusthana lord to be free of kendra/trikona lords; here it is with ${joined.join(", ")}.`);
      }
      return {
        status: met ? "detected" : "not_detected",
        conditions: [{ text: `${ordinal(house)} lord ${l} is in the 6th, 8th or 12th (it is in the ${ordinal(h)})`, met }],
        instances: met ? [single(ctx, l, `${l}, lord of the ${ordinal(house)}, in the ${ordinal(h)}`)] : [],
        notes,
      };
    },
  };
}

const neechaBhanga: RuleDef = {
  id: "PAR-NB-001",
  name: "Neecha Bhanga Raja Yoga",
  category: "raja",
  definition:
    "A debilitated planet has its debilitation cancelled when: the lord of its debilitation sign, the lord of its exaltation sign, or the planet exalted in its debilitation sign is in a kendra from Lagna or Moon; or the debilitation-sign lord aspects, joins, or exchanges with it. Navamsha exaltation is counted as a variant.",
  source: "Phaladeepika ch. 7; Saravali (verify verses in your edition)",
  themes: "Early struggle turning into strength",
  needsAscendant: false,
  evaluate(ctx) {
    const debilitated = CLASSICAL.filter((pl) => ctx.p(pl).dignity === "debilitated");
    if (!debilitated.length) {
      return { status: "not_detected", conditions: [{ text: "A planet is debilitated in the birth chart", met: false }], instances: [] };
    }
    const instances: Instance[] = [];
    const uncancelled: string[] = [];
    for (const pl of debilitated) {
      const debSign = ctx.p(pl).sign;
      const debLord = SIGN_LORDS[debSign];
      const exLord = SIGN_LORDS[EXALTATION[pl].sign];
      const exaltedHere = CLASSICAL.find((o) => EXALTATION[o].sign === debSign);
      const checks: [string, boolean][] = [
        [`${debLord} (lord of ${SIGNS[debSign]}) is in a kendra from Lagna or Moon`, debLord !== pl && ctx.inKendraFromLagnaOrMoon(debLord)],
        [`${exLord} (lord of ${pl}'s exaltation sign) is in a kendra from Lagna or Moon`, exLord !== pl && ctx.inKendraFromLagnaOrMoon(exLord)],
        ...(exaltedHere ? ([[`${exaltedHere} (exalted in ${SIGNS[debSign]}) is in a kendra from Lagna or Moon`, ctx.inKendraFromLagnaOrMoon(exaltedHere)]] as [string, boolean][]) : []),
        [`${debLord} aspects ${pl}`, debLord !== pl && ctx.aspects(debLord, pl)],
        [`${pl} and ${debLord} exchange signs`, ctx.relations(pl, debLord).includes("exchange")],
        [`${pl} is conjunct ${debLord} or ${exLord}`, [debLord, exLord].some((o) => o !== pl && ctx.p(o).sign === debSign)],
        [`${pl} is exalted in Navamsha (variant)`, ctx.d9Dignity(pl) === "exalted"],
      ];
      const met = checks.filter(([, ok]) => ok);
      if (met.length) {
        instances.push({
          title: `${pl} debilitated in ${SIGNS[debSign]} — cancelled by ${met.length} condition${met.length > 1 ? "s" : ""}`,
          planets: [pl],
          houses: ctx.hasAsc ? [ctx.house(pl)] : [],
          facts: [ctx.describe(pl), ...checks.map(([t, ok]) => `${ok ? "✓" : "✗"} ${t}`)],
          strength: strengthOf(ctx, [pl]),
        });
      } else {
        uncancelled.push(`${pl} is debilitated in ${SIGNS[debSign]} with no cancellation condition met.`);
      }
    }
    return {
      status: instances.length ? "detected" : "not_detected",
      conditions: [
        { text: `A planet is debilitated (${debilitated.join(", ")})`, met: true },
        { text: "At least one cancellation condition is met for it", met: instances.length > 0 },
      ],
      instances,
      notes: [...uncancelled, ...(ctx.hasAsc ? [] : ["Birth time unknown: kendra positions were checked from the Moon only."])],
    };
  },
};

// ---------------------------------------------------------------- Pancha Mahapurusha

function mahapurusha(planet: Planet, id: string, name: string, themes: string): RuleDef {
  return {
    id,
    name: `${name} Yoga (Mahapurusha)`,
    category: "mahapurusha",
    definition: `${planet} is in its own sign or exaltation sign and in a kendra (1, 4, 7, 10) from the Lagna.`,
    source: "BPHS, Pancha Mahapurusha chapter; Phaladeepika ch. 6 (verify in your edition)",
    themes,
    needsAscendant: true,
    evaluate(ctx) {
      const row = ctx.p(planet);
      const dignified = ["own", "exalted", "moolatrikona"].includes(row.dignity);
      const h = ctx.house(planet);
      const inKendra = KENDRAS.includes(h);
      const ok = dignified && inKendra;
      const notes: string[] = [];
      if (ok && row.combust) notes.push(`${planet} is combust — many authors treat the yoga as much reduced.`);
      if (ok && [ctx.p("Sun").sign, ctx.p("Moon").sign].includes(row.sign)) notes.push(`${planet} is with the Sun or Moon — some texts say the full result is not given.`);
      return {
        status: ok ? "detected" : dignified || inKendra ? "partial" : "not_detected",
        conditions: [
          { text: `${planet} is in own or exaltation sign (it is ${DIGNITY_PHRASE[row.dignity]}, in ${SIGNS[row.sign]})`, met: dignified },
          { text: `${planet} is in a kendra from Lagna (it is in the ${ordinal(h)})`, met: inKendra },
        ],
        instances: ok ? [single(ctx, planet, `${planet} ${DIGNITY_PHRASE[row.dignity]}, in the ${ordinal(h)}`)] : [],
        notes,
      };
    },
  };
}

// ---------------------------------------------------------------- Moon-based and benefic yogas

const gajakesari: RuleDef = {
  id: "PAR-GK-001",
  name: "Gajakesari Yoga",
  category: "chandra",
  definition: "Jupiter is in a kendra (1st, 4th, 7th or 10th) counted from the Moon.",
  source: "BPHS, yoga chapters; Phaladeepika ch. 6 (verify in your edition)",
  themes: "Reputation, wisdom, lasting goodwill",
  needsAscendant: false,
  common: true,
  evaluate(ctx) {
    const h = ctx.houseFromMoon("Jupiter");
    const ok = KENDRAS.includes(h);
    const j = ctx.p("Jupiter");
    const notes: string[] = [];
    if (ok && (j.dignity === "debilitated" || j.dignity === "enemy" || j.combust)) notes.push("Jupiter is weak (debilitated, combust or in an enemy sign), which traditionally reduces this yoga.");
    if (ok && ctx.hasAsc && [ctx.house("Jupiter"), ctx.house("Moon")].some((x) => DUSTHANAS.includes(x))) notes.push("Jupiter or the Moon sits in a dusthana from the Lagna, which traditionally reduces this yoga.");
    return {
      status: ok ? "detected" : "not_detected",
      conditions: [{ text: `Jupiter is in a kendra from the Moon (it is ${ordinal(h)} from the Moon)`, met: ok }],
      instances: ok ? [{ title: `Jupiter ${ordinal(h)} from the Moon`, planets: ["Jupiter", "Moon"], houses: [], facts: [ctx.describe("Jupiter"), ctx.describe("Moon")], strength: strengthOf(ctx, ["Jupiter", "Moon"]) }] : [],
      notes,
    };
  },
};

const adhi: RuleDef = {
  id: "PAR-CH-001",
  name: "Adhi Yoga",
  category: "chandra",
  definition: "The natural benefics Mercury, Jupiter and Venus occupy the 6th, 7th and 8th houses counted from the Moon. All three there is the full form; two is partial.",
  source: "Phaladeepika ch. 6; Brihat Jataka (verify in your edition)",
  themes: "Leadership, comfort, standing among peers",
  needsAscendant: false,
  evaluate(ctx) {
    const inPlace = NATURAL_BENEFICS.filter((b) => [6, 7, 8].includes(ctx.houseFromMoon(b)));
    const status = inPlace.length === 3 ? "detected" : inPlace.length === 2 ? "partial" : "not_detected";
    return {
      status,
      conditions: NATURAL_BENEFICS.map((b) => ({ text: `${b} is 6th, 7th or 8th from the Moon (it is ${ordinal(ctx.houseFromMoon(b))})`, met: inPlace.includes(b) })),
      instances: status === "detected" ? [{ title: "Benefics in the 6th/7th/8th from the Moon", planets: inPlace, houses: [], facts: inPlace.map((b) => ctx.describe(b)), strength: strengthOf(ctx, inPlace) }] : [],
    };
  },
};

const chandraMangala: RuleDef = {
  id: "PAR-CH-002",
  name: "Chandra–Mangala Yoga",
  category: "dhana",
  definition: "The Moon and Mars are conjunct (in the same sign).",
  source: "Phaladeepika ch. 6 (verify in your edition)",
  themes: "Earning through enterprise and drive",
  needsAscendant: false,
  evaluate(ctx) {
    const ok = ctx.p("Moon").sign === ctx.p("Mars").sign;
    return {
      status: ok ? "detected" : "not_detected",
      conditions: [{ text: `Moon and Mars are in the same sign (Moon in ${SIGNS[ctx.p("Moon").sign]}, Mars in ${SIGNS[ctx.p("Mars").sign]})`, met: ok }],
      instances: ok ? [{ title: `Moon + Mars in ${SIGNS[ctx.moonSign]}`, planets: ["Moon", "Mars"], houses: ctx.hasAsc ? [ctx.house("Moon")] : [], relation: "conjunction", facts: [ctx.describe("Moon"), ctx.describe("Mars")], strength: strengthOf(ctx, ["Moon", "Mars"], "conjunction") }] : [],
    };
  },
};

const amala: RuleDef = {
  id: "PAR-CH-003",
  name: "Amala Yoga",
  category: "other",
  definition: "The 10th house from the Lagna or from the Moon is occupied by natural benefics (Jupiter, Venus, Mercury) only, with no malefic there.",
  source: "Phaladeepika ch. 6 (verify in your edition)",
  themes: "Clean reputation, respected conduct in work",
  needsAscendant: false,
  evaluate(ctx) {
    const check = (from: number, label: string) => {
      const tenth = (from + 9) % 12;
      const here = ctx.snap.planets.filter((x) => x.sign === tenth && x.planet !== "Moon").map((x) => x.planet);
      const ok = here.length > 0 && here.every((x) => NATURAL_BENEFICS.includes(x));
      return { label, tenth, here, ok };
    };
    const refs = [...(ctx.ascSign !== null ? [check(ctx.ascSign, "Lagna")] : []), check(ctx.moonSign, "Moon")];
    const hit = refs.filter((r) => r.ok);
    return {
      status: hit.length ? "detected" : "not_detected",
      conditions: refs.map((r) => ({ text: `Only benefics in the 10th from the ${r.label} (${SIGNS[r.tenth]}: ${r.here.join(", ") || "empty"})`, met: r.ok })),
      instances: hit.map((r) => ({ title: `${r.here.join(" + ")} in the 10th from the ${r.label}`, planets: r.here, houses: r.label === "Lagna" ? [10] : [], facts: r.here.map((x) => ctx.describe(x)), strength: strengthOf(ctx, r.here) })),
    };
  },
};

const vasumati: RuleDef = {
  id: "PAR-CH-004",
  name: "Vasumati Yoga",
  category: "dhana",
  definition: "The natural benefics Jupiter, Venus and Mercury all occupy upachaya houses (3, 6, 10, 11) from the Lagna or from the Moon. Two of three is partial.",
  source: "Phaladeepika ch. 6 (verify in your edition)",
  themes: "Steadily growing wealth",
  needsAscendant: false,
  evaluate(ctx) {
    const count = (from: number) => NATURAL_BENEFICS.filter((b) => UPACHAYAS.includes(((ctx.p(b).sign - from + 12) % 12) + 1));
    const refs = [...(ctx.ascSign !== null ? [{ label: "Lagna", list: count(ctx.ascSign) }] : []), { label: "Moon", list: count(ctx.moonSign) }];
    const top = refs.reduce((a, b) => (b.list.length > a.list.length ? b : a));
    const status = top.list.length === 3 ? "detected" : top.list.length === 2 ? "partial" : "not_detected";
    return {
      status,
      conditions: refs.map((r) => ({ text: `All three benefics in upachayas from the ${r.label} (${r.list.length} of 3: ${r.list.join(", ") || "none"})`, met: r.list.length === 3 })),
      instances: status === "detected" ? [{ title: `Benefics in upachayas from the ${top.label}`, planets: top.list, houses: [], facts: top.list.map((b) => ctx.describe(b)), strength: strengthOf(ctx, top.list) }] : [],
    };
  },
};

const budhaditya: RuleDef = {
  id: "PAR-OT-003",
  name: "Budhaditya Yoga",
  category: "other",
  definition: "The Sun and Mercury are conjunct (in the same sign).",
  source: "Widely cited in later commentaries; verify a primary source before relying on it",
  themes: "Intelligence, communication, skill in dealings",
  needsAscendant: false,
  common: true,
  evaluate(ctx) {
    const ok = ctx.p("Sun").sign === ctx.p("Mercury").sign;
    return {
      status: ok ? "detected" : "not_detected",
      conditions: [{ text: `Sun and Mercury are in the same sign (Sun in ${SIGNS[ctx.p("Sun").sign]}, Mercury in ${SIGNS[ctx.p("Mercury").sign]})`, met: ok }],
      instances: ok ? [{ title: `Sun + Mercury in ${SIGNS[ctx.p("Sun").sign]}`, planets: ["Sun", "Mercury"], houses: ctx.hasAsc ? [ctx.house("Sun")] : [], relation: "conjunction", facts: [ctx.describe("Sun"), ctx.describe("Mercury")], strength: strengthOf(ctx, ["Sun", "Mercury"], "conjunction") }] : [],
      notes: ok && ctx.p("Mercury").combust ? ["Mercury is combust here, which traditionally weakens the yoga."] : [],
    };
  },
};

// ---------------------------------------------------------------- Dhana yogas

const dhana2and11: RuleDef = {
  id: "PAR-DY-001",
  name: "Dhana Yoga — 2nd and 11th lords",
  category: "dhana",
  definition: "The 2nd lord (accumulated wealth) and the 11th lord (gains) are joined by conjunction, mutual aspect, or exchange — or one planet rules both.",
  source: "BPHS, Dhana Yoga chapter (verify chapter in your edition)",
  themes: "Income turning into savings",
  needsAscendant: true,
  evaluate(ctx) {
    const l2 = ctx.lord(2);
    const l11 = ctx.lord(11);
    if (l2 === l11) {
      return { status: "detected", conditions: [{ text: `One planet (${l2}) rules both the 2nd and 11th`, met: true }], instances: [single(ctx, l2, `${l2} rules both the 2nd and 11th`)] };
    }
    const instances = lordPairs(ctx, [2], [11], () => "");
    return {
      status: instances.length ? "detected" : "not_detected",
      conditions: [{ text: `2nd lord ${l2} and 11th lord ${l11} are conjunct, in mutual aspect, or exchanged`, met: instances.length > 0 }],
      instances,
    };
  },
};

const dhanaTrikona: RuleDef = {
  id: "PAR-DY-002",
  name: "Dhana Yoga — fortune lords with wealth lords",
  category: "dhana",
  definition: "A lord of the 1st, 5th or 9th is joined (conjunction, mutual aspect, or exchange) with a lord of the 2nd or 11th.",
  source: "BPHS, Dhana Yoga chapter (verify chapter in your edition)",
  themes: "Wealth through merit, luck and one's own effort",
  needsAscendant: true,
  evaluate(ctx) {
    const instances = lordPairs(ctx, [1, 5, 9], [2, 11], () => "");
    return {
      status: instances.length ? "detected" : "not_detected",
      conditions: [{ text: "A lord of the 1st, 5th or 9th is linked with a lord of the 2nd or 11th", met: instances.length > 0 }],
      instances,
    };
  },
};

const lakshmi: RuleDef = {
  id: "PAR-DY-003",
  name: "Lakshmi Yoga",
  category: "dhana",
  definition: "The 9th lord is in its own, moolatrikona or exaltation sign and in a kendra or trikona, and the Lagna lord is strong (well dignified or in a kendra/trikona, and neither combust nor debilitated).",
  source: "Phaladeepika ch. 6 (definitions vary between texts; verify in your edition)",
  themes: "Prosperity, grace, comfort",
  needsAscendant: true,
  evaluate(ctx) {
    const l9 = ctx.lord(9);
    const l1 = ctx.lord(1);
    const good = (h: number) => KENDRAS.includes(h) || TRIKONAS.includes(h);
    const c1 = ["own", "moolatrikona", "exalted"].includes(ctx.p(l9).dignity);
    const c2 = good(ctx.house(l9));
    const r1 = ctx.p(l1);
    const c3 = (["own", "moolatrikona", "exalted"].includes(r1.dignity) || good(ctx.house(l1))) && !r1.combust && r1.dignity !== "debilitated";
    const met = [c1, c2, c3].filter(Boolean).length;
    return {
      status: met === 3 ? "detected" : met === 2 ? "partial" : "not_detected",
      conditions: [
        { text: `9th lord ${l9} is in own, moolatrikona or exaltation sign (it is ${DIGNITY_PHRASE[ctx.p(l9).dignity]})`, met: c1 },
        { text: `9th lord ${l9} is in a kendra or trikona (it is in the ${ordinal(ctx.house(l9))})`, met: c2 },
        { text: `Lagna lord ${l1} is strong (${DIGNITY_PHRASE[r1.dignity]}, ${ordinal(ctx.house(l1))} house${r1.combust ? ", combust" : ""})`, met: c3 },
      ],
      instances: met === 3 ? [{ title: `${l9} (9th lord) with strong Lagna lord ${l1}`, planets: l1 === l9 ? [l9] : [l9, l1], houses: [9, 1], facts: [ctx.describe(l9), ctx.describe(l1)], strength: strengthOf(ctx, l1 === l9 ? [l9] : [l9, l1]) }] : [],
    };
  },
};

const wealthLordsIn11: RuleDef = {
  id: "PAR-DY-004",
  name: "Wealth lords in houses of gain",
  category: "dhana",
  definition: "The 2nd, 5th or 9th lord sits in the 11th without being debilitated or in an enemy sign, or the 11th lord sits in the 2nd, 5th or 9th.",
  source: "Grouping of classical house-lord indications (BPHS, effects of house lords). Not a named yoga.",
  themes: "Channels through which gains tend to come",
  needsAscendant: true,
  productIndicator: true,
  evaluate(ctx) {
    const instances: Instance[] = [];
    for (const h of [2, 5, 9]) {
      const l = ctx.lord(h);
      if (ctx.house(l) === 11 && !["debilitated", "enemy"].includes(ctx.p(l).dignity)) instances.push(single(ctx, l, `${ordinal(h)} lord ${l} in the 11th`));
    }
    const l11 = ctx.lord(11);
    if ([2, 5, 9].includes(ctx.house(l11))) instances.push(single(ctx, l11, `11th lord ${l11} in the ${ordinal(ctx.house(l11))}`));
    const unique = instances.filter((x, i) => instances.findIndex((y) => y.title === x.title) === i);
    return {
      status: unique.length ? "detected" : "not_detected",
      conditions: [{ text: "A 2nd/5th/9th lord is well placed in the 11th, or the 11th lord is in the 2nd/5th/9th", met: unique.length > 0 }],
      instances: unique,
    };
  },
};

// ---------------------------------------------------------------- Counter-indications

const kemadruma: RuleDef = {
  id: "PAR-AR-001",
  name: "Kemadruma Yoga",
  category: "caution",
  definition: "No planet (other than the Sun, Rahu and Ketu) occupies the 2nd or 12th sign from the Moon. Cancelled when a planet joins the Moon or occupies a kendra from the Moon or from the Lagna.",
  source: "BPHS and Phaladeepika, lunar yogas (cancellation lists vary; verify in your edition)",
  themes: "Traditionally: periods of feeling unsupported, uneven finances",
  needsAscendant: false,
  evaluate(ctx) {
    const others = CLASSICAL.filter((pl) => pl !== "Sun" && pl !== "Moon");
    const flanking = others.filter((pl) => [2, 12].includes(ctx.houseFromMoon(pl)));
    if (flanking.length) {
      return { status: "not_detected", conditions: [{ text: `No planet in the 2nd or 12th from the Moon (found: ${flanking.join(", ")})`, met: false }], instances: [] };
    }
    const withMoon = others.filter((pl) => ctx.houseFromMoon(pl) === 1);
    const kendraMoon = others.filter((pl) => [4, 7, 10].includes(ctx.houseFromMoon(pl)));
    const kendraLagna = ctx.hasAsc ? others.filter((pl) => KENDRAS.includes(ctx.house(pl))) : [];
    const cancels = [
      ...(withMoon.length ? [`${withMoon.join(", ")} conjunct the Moon`] : []),
      ...(kendraMoon.length ? [`${kendraMoon.join(", ")} in a kendra from the Moon`] : []),
      ...(kendraLagna.length ? [`${kendraLagna.join(", ")} in a kendra from the Lagna`] : []),
    ];
    return {
      status: cancels.length ? "cancelled" : "detected",
      conditions: [
        { text: "No planet in the 2nd or 12th from the Moon", met: true },
        { text: "No cancellation applies", met: cancels.length === 0 },
      ],
      instances: cancels.length ? [] : [{ title: "Moon without planets on either side", planets: ["Moon"], houses: ctx.hasAsc ? [ctx.house("Moon")] : [], facts: [ctx.describe("Moon")] }],
      notes: cancels.map((c) => `Cancelled: ${c}.`),
    };
  },
};

const weakWealthLords: RuleDef = {
  id: "PAR-AR-002",
  name: "Strain on wealth lords",
  category: "caution",
  definition: "The 2nd or 11th lord is in a dusthana (6, 8, 12), debilitated, or combust.",
  source: "Grouping of classical house-lord indications. Not a named yoga.",
  themes: "Where savings or income traditionally need more care",
  needsAscendant: true,
  productIndicator: true,
  evaluate(ctx) {
    const instances: Instance[] = [];
    for (const h of [2, 11]) {
      const l = ctx.lord(h);
      const row = ctx.p(l);
      const issues = [DUSTHANAS.includes(ctx.house(l)) ? `in the ${ordinal(ctx.house(l))}` : null, row.dignity === "debilitated" ? "debilitated" : null, row.combust ? "combust" : null].filter(Boolean);
      if (issues.length && !instances.some((i) => i.planets[0] === l)) instances.push({ title: `${ordinal(h)} lord ${l}: ${issues.join(", ")}`, planets: [l], houses: [h], facts: [ctx.describe(l)] });
    }
    return {
      status: instances.length ? "detected" : "not_detected",
      conditions: [{ text: "The 2nd or 11th lord is in a dusthana, debilitated or combust", met: instances.length > 0 }],
      instances,
    };
  },
};

export const PARASHARI_RULES: RuleDef[] = [
  kendraTrikona,
  yogakaraka,
  dharmaKarma,
  parivartana("maha"),
  viparita(6, "PAR-VR-001", "Harsha"),
  viparita(8, "PAR-VR-002", "Sarala"),
  viparita(12, "PAR-VR-003", "Vimala"),
  neechaBhanga,
  mahapurusha("Mars", "PAR-PM-001", "Ruchaka", "Courage, command, drive"),
  mahapurusha("Mercury", "PAR-PM-002", "Bhadra", "Intellect, trade, communication"),
  mahapurusha("Jupiter", "PAR-PM-003", "Hamsa", "Wisdom, ethics, respect"),
  mahapurusha("Venus", "PAR-PM-004", "Malavya", "Comfort, charm, luxury"),
  mahapurusha("Saturn", "PAR-PM-005", "Sasa", "Authority over organisations, endurance"),
  dhana2and11,
  dhanaTrikona,
  lakshmi,
  wealthLordsIn11,
  chandraMangala,
  vasumati,
  gajakesari,
  adhi,
  amala,
  budhaditya,
  parivartana("khala"),
  parivartana("dainya"),
  kemadruma,
  weakWealthLords,
];

export type { Evaluation };
