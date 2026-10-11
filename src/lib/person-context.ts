import "server-only";
import { computeChart, type ChartResult } from "@/engine/chart";
import type { NatalForDays } from "@/engine/panchang";
import { applyReviews } from "@/library/reviews";
import { mulank } from "@/numerology/indian";
import { buildReading, type Reading } from "@/reading/build";
import { evaluateForBirth } from "@/rules/evaluate";
import type { YogaResult } from "@/rules/types";
import { loadReviewIndex } from "./library-store";
import { toBirthInput, type Person } from "./people";
import { getStore } from "./store";

export type PersonContext = {
  people: Person[];
  person: Person | null;
  now: Date;
  /** Null when there is no person or their birth details are incomplete. */
  data: { chart: ChartResult; yogas: YogaResult[]; reading: Reading; natal: NatalForDays; birthDate: string; tz: string } | null;
};

/** Loads the selected person and everything the free guidance pages are built from. */
export async function loadPersonContext(selectedId: unknown): Promise<PersonContext> {
  const store = await getStore();
  const people = await store.listPeople();
  const person = people.find((p) => p.id === selectedId) ?? people.find((p) => p.relationship === "self") ?? people[0] ?? null;
  const now = new Date();
  const input = person ? toBirthInput(person) : null;
  if (!person || !input) return { people, person, now, data: null };

  const chart = computeChart(input, now);
  const yogas = applyReviews(evaluateForBirth(input).results, await loadReviewIndex()).results;
  const reading = buildReading(chart, yogas, input.birthDate, now, { minor: person.is_minor });
  const moon = chart.chart.planets.find((p) => p.planet === "Moon")!;
  const natal: NatalForDays = {
    moonSign: moon.sign,
    moonNakshatra: moon.nakshatra,
    lagnaLord: reading.lagnaSettled ? chart.chart.ascendant!.lord : null,
    mulank: mulank(input.birthDate).number,
  };
  return { people, person, now, data: { chart, yogas, reading, natal, birthDate: input.birthDate, tz: input.ianaTz } };
}
