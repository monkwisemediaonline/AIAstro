import { naturalRelation, type Planet } from "@/engine/constants";
import { NUMBER_PLANET, reduce, type ReductionStep } from "./indian";

export const CHALDEAN_SYSTEM = "chaldean@1.0.0";
export const PYTHAGOREAN_SYSTEM = "pythagorean@1.0.0";

/** Chaldean (Cheiro tradition). No letter maps to 9. */
const CHALDEAN_GROUPS: Record<number, string> = { 1: "AIJQY", 2: "BKR", 3: "CGLS", 4: "DMT", 5: "EHNX", 6: "UVW", 7: "OZ", 8: "FP" };
/** Pythagorean: A=1 … I=9, J=1 … R=9, S=1 … Z=8. */
const PYTHAGOREAN_GROUPS: Record<number, string> = { 1: "AJS", 2: "BKT", 3: "CLU", 4: "DMV", 5: "ENW", 6: "FOX", 7: "GPY", 8: "HQZ", 9: "IR" };

const toTable = (groups: Record<number, string>) =>
  Object.fromEntries(Object.entries(groups).flatMap(([n, letters]) => letters.split("").map((l) => [l, Number(n)]))) as Record<string, number>;

export const CHALDEAN: Readonly<Record<string, number>> = toTable(CHALDEAN_GROUPS);
export const PYTHAGOREAN: Readonly<Record<string, number>> = toTable(PYTHAGOREAN_GROUPS);

export type Normalised = { original: string; words: string[]; ignored: string[] };

/** Uppercase A–Z only. Diacritics are stripped; digits and other symbols are reported, not counted. */
export function normaliseName(input: string): Normalised {
  const stripped = input.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const ignored = [...new Set((stripped.match(/[^A-Za-z\s.\-']/g) ?? []).map((c) => c))];
  const words = stripped
    .toUpperCase()
    .split(/[\s\-]+/)
    .map((w) => w.replace(/[^A-Z]/g, ""))
    .filter(Boolean);
  return { original: input, words, ignored };
}

export type LetterValue = { letter: string; value: number };
export type WordTotal = { word: string; letters: LetterValue[]; total: number; reduced: number };
export type NameNumber = {
  system: string;
  words: WordTotal[];
  /** Unreduced total (the Chaldean "compound number"). */
  total: number;
  reduced: number;
  /** Set when a master number (11, 22, 33) was kept. */
  master: number | null;
  steps: ReductionStep[];
  planet: Planet;
  ignored: string[];
};

const MASTERS = new Set([11, 22, 33]);

/** Reduce to one digit, optionally stopping at a master number. */
export function reduceKeepingMasters(n: number, keepMasters: boolean): { value: number; master: number | null; steps: ReductionStep[] } {
  const steps: ReductionStep[] = [];
  let v = n;
  while (v > 9 && !(keepMasters && MASTERS.has(v))) {
    const digits = String(v).split("").map(Number);
    const next = digits.reduce((a, b) => a + b, 0);
    steps.push({ expression: digits.join(" + "), result: next });
    v = next;
  }
  const master = MASTERS.has(v) ? v : null;
  return { value: master ? reduce(v).value : v, master, steps };
}

function nameNumber(input: string, table: Readonly<Record<string, number>>, system: string, keepMasters: boolean, pick: (letter: string, word: string, index: number) => boolean = () => true): NameNumber {
  const n = normaliseName(input);
  const words = n.words.map((word) => {
    const letters = word.split("").flatMap((letter, i) => (pick(letter, word, i) ? [{ letter, value: table[letter] }] : []));
    const total = letters.reduce((s, l) => s + l.value, 0);
    return { word, letters, total, reduced: reduce(total).value };
  });
  const total = words.reduce((s, w) => s + w.total, 0);
  const r = reduceKeepingMasters(total, keepMasters);
  return { system, words, total, reduced: r.value, master: r.master, steps: r.steps, planet: NUMBER_PLANET[r.value], ignored: n.ignored };
}

export const chaldeanName = (name: string): NameNumber => nameNumber(name, CHALDEAN, CHALDEAN_SYSTEM, false);

const VOWELS = new Set(["A", "E", "I", "O", "U"]);
/** Y counts as a vowel when the option is on and the word has no other vowel next to it. */
const isVowel = (letter: string, word: string, i: number, yAsVowel: boolean) =>
  VOWELS.has(letter) || (yAsVowel && letter === "Y" && !VOWELS.has(word[i - 1] ?? "") && !VOWELS.has(word[i + 1] ?? ""));

export function pythagoreanName(name: string, opts: { keepMasters?: boolean; yAsVowel?: boolean } = {}) {
  const keep = opts.keepMasters ?? true;
  const y = opts.yAsVowel ?? false;
  return {
    expression: nameNumber(name, PYTHAGOREAN, PYTHAGOREAN_SYSTEM, keep),
    soulUrge: nameNumber(name, PYTHAGOREAN, PYTHAGOREAN_SYSTEM, keep, (l, w, i) => isVowel(l, w, i, y)),
    personality: nameNumber(name, PYTHAGOREAN, PYTHAGOREAN_SYSTEM, keep, (l, w, i) => !isVowel(l, w, i, y)),
  };
}

/** Pythagorean Life Path: reduce month, day and year separately, then add and reduce. */
export function lifePath(birthDate: string, keepMasters = true) {
  const [y, m, d] = birthDate.split("-").map(Number);
  const parts = [
    { label: "Month", raw: m, ...reduceKeepingMasters(m, keepMasters) },
    { label: "Day", raw: d, ...reduceKeepingMasters(d, keepMasters) },
    { label: "Year", raw: y, ...reduceKeepingMasters(String(y).split("").reduce((s, c) => s + Number(c), 0), keepMasters) },
  ];
  const sum = parts.reduce((s, p) => s + (p.master ?? p.value), 0);
  const r = reduceKeepingMasters(sum, keepMasters);
  return { parts: parts.map((p) => ({ label: p.label, raw: p.raw, value: p.master ?? p.value })), sum, number: r.value, master: r.master, steps: r.steps };
}

/** Lo Shu grid: how many times each digit 1–9 appears in the date of birth. */
export const LO_SHU_LAYOUT = [
  [4, 9, 2],
  [3, 5, 7],
  [8, 1, 6],
];
export function loShu(birthDate: string) {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  for (const c of birthDate.replaceAll("-", "")) if (c !== "0") counts[Number(c)]++;
  return { counts, missing: Object.keys(counts).map(Number).filter((n) => counts[n] === 0), repeated: Object.keys(counts).map(Number).filter((n) => counts[n] > 1) };
}

/** Personal year = reduce(day + month + calendar year). */
export function personalYear(birthDate: string, year: number) {
  const [, m, d] = birthDate.split("-").map(Number);
  const digits = `${d}${m}${year}`.split("").map(Number);
  const sum = digits.reduce((a, b) => a + b, 0);
  const r = reduce(sum);
  return { number: r.value, steps: [{ expression: digits.join(" + "), result: sum }, ...r.steps] };
}

/** Any number: phone, vehicle, house, account. Letters and symbols are ignored. */
export function analyseNumber(input: string) {
  const digits = (input.match(/\d/g) ?? []).map(Number);
  if (!digits.length) return null;
  const sum = digits.reduce((a, b) => a + b, 0);
  const r = reduce(sum);
  const tail = (k: number) => {
    if (digits.length <= k) return null;
    const t = digits.slice(-k);
    const s = t.reduce((a, b) => a + b, 0);
    return { digits: t.join(""), total: s, reduced: reduce(s).value };
  };
  return {
    digits: digits.join(""),
    total: sum,
    reduced: r.value,
    planet: NUMBER_PLANET[r.value],
    steps: [{ expression: digits.join(" + "), result: sum }, ...r.steps],
    zeros: digits.filter((d) => d === 0).length,
    last4: tail(4),
    last2: tail(2),
  };
}

export type Harmony = "friendly" | "neutral" | "challenging" | "same";

/**
 * Compatibility of two single-digit numbers via their planets' natural friendship (BPHS table).
 * A product heuristic: numerology schools publish different "friendly number" tables.
 */
export function harmony(a: number, b: number): { verdict: Harmony; text: string } {
  const pa = NUMBER_PLANET[a];
  const pb = NUMBER_PLANET[b];
  if (a === b) return { verdict: "same", text: `Both are ${a} (${pa}).` };
  const score = (r: string) => (r === "friend" ? 1 : r === "enemy" ? -1 : 0);
  const ab = naturalRelation(pa, pb);
  const ba = naturalRelation(pb, pa);
  const s = score(ab) + score(ba);
  return {
    verdict: s >= 1 ? "friendly" : s <= -1 ? "challenging" : "neutral",
    text: `${a} (${pa}) treats ${b} (${pb}) as ${ab}; ${b} treats ${a} as ${ba}.`,
  };
}
