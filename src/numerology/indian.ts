import type { Planet } from "@/engine/constants";

export const NUMEROLOGY_SYSTEM = "indian@1.0.0";

/** Number → planet, Indian numerology convention. */
export const NUMBER_PLANET: Readonly<Record<number, Planet>> = {
  1: "Sun",
  2: "Moon",
  3: "Jupiter",
  4: "Rahu",
  5: "Mercury",
  6: "Venus",
  7: "Ketu",
  8: "Saturn",
  9: "Mars",
};

export type ReductionStep = { expression: string; result: number };

/** Sum digits repeatedly until a single digit (1–9), recording each step. */
export function reduce(n: number): { value: number; steps: ReductionStep[] } {
  const steps: ReductionStep[] = [];
  let v = Math.abs(Math.trunc(n));
  while (v > 9) {
    const digits = String(v).split("").map(Number);
    const next = digits.reduce((a, b) => a + b, 0);
    steps.push({ expression: digits.join(" + "), result: next });
    v = next;
  }
  return { value: v, steps };
}

/** Mulank (root number) = reduced day of birth. */
export function mulank(birthDate: string) {
  const day = Number(birthDate.slice(8, 10));
  const r = reduce(day);
  return { number: r.value, planet: NUMBER_PLANET[r.value], steps: [{ expression: `day ${day}`, result: day }, ...r.steps] };
}

/** Bhagyank (destiny number) = reduced sum of every digit of DD MM YYYY. */
export function bhagyank(birthDate: string) {
  const digits = birthDate.replaceAll("-", "").split("").map(Number);
  const sum = digits.reduce((a, b) => a + b, 0);
  const r = reduce(sum);
  return {
    number: r.value,
    planet: NUMBER_PLANET[r.value],
    steps: [{ expression: digits.join(" + "), result: sum }, ...r.steps],
  };
}
