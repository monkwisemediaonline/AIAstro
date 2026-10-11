import { describe, expect, it } from "vitest";
import { bhagyank, mulank } from "@/numerology/indian";
import { CHALDEAN, PYTHAGOREAN, analyseNumber, chaldeanName, harmony, lifePath, loShu, normaliseName, personalYear, pythagoreanName, reduceKeepingMasters } from "@/numerology/systems";

describe("letter tables", () => {
  it("Chaldean covers A–Z and never uses 9", () => {
    const expected = "A1 B2 C3 D4 E5 F8 G3 H5 I1 J1 K2 L3 M4 N5 O7 P8 Q1 R2 S3 T4 U6 V6 W6 X5 Y1 Z7".split(" ");
    for (const e of expected) expect(CHALDEAN[e[0]], e[0]).toBe(Number(e.slice(1)));
    expect(Object.keys(CHALDEAN)).toHaveLength(26);
    expect(Object.values(CHALDEAN)).not.toContain(9);
  });
  it("Pythagorean runs 1–9 in alphabetical order", () => {
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((l, i) => expect(PYTHAGOREAN[l], l).toBe((i % 9) + 1));
  });
});

describe("normalisation", () => {
  it("strips diacritics, case, punctuation; reports digits", () => {
    expect(normaliseName("  José   O'Neil-Smith ").words).toEqual(["JOSE", "ONEIL", "SMITH"]);
    expect(normaliseName("Agent 47").ignored).toEqual(["4", "7"]);
    expect(normaliseName("").words).toEqual([]);
  });
});

describe("name numbers (synthetic names)", () => {
  it("Chaldean: per-word totals, compound and reduced", () => {
    // RAVI = 2+1+6+1 = 10; KUMAR = 2+6+4+1+2 = 15; compound 25 → 7
    const n = chaldeanName("Ravi Kumar");
    expect(n.words.map((w) => w.total)).toEqual([10, 15]);
    expect(n.total).toBe(25);
    expect(n.reduced).toBe(7);
    expect(n.steps).toEqual([{ expression: "2 + 5", result: 7 }]);
    expect(n.planet).toBe("Ketu");
  });

  it("Pythagorean: expression = soul urge + personality letters", () => {
    // RAVI = 9+1+4+9 = 23; KUMAR = 2+3+4+1+9 = 19; total 42 → 6
    const p = pythagoreanName("Ravi Kumar");
    expect(p.expression.total).toBe(42);
    expect(p.expression.reduced).toBe(6);
    expect(p.soulUrge.total + p.personality.total).toBe(p.expression.total);
    expect(p.soulUrge.total).toBe(1 + 9 + 3 + 1); // A, I, U, A
  });

  it("master numbers are kept only when asked", () => {
    expect(reduceKeepingMasters(29, true)).toMatchObject({ value: 2, master: 11 });
    expect(reduceKeepingMasters(29, false)).toMatchObject({ value: 2, master: null });
    expect(reduceKeepingMasters(22, true).master).toBe(22);
    expect(reduceKeepingMasters(0, true).value).toBe(0);
  });

  it("Y as vowel only when it stands alone between consonants", () => {
    expect(pythagoreanName("Lynn", { yAsVowel: true }).soulUrge.total).toBe(7);
    expect(pythagoreanName("Lynn", { yAsVowel: false }).soulUrge.total).toBe(0);
    expect(pythagoreanName("Maya", { yAsVowel: true }).soulUrge.total).toBe(2); // Y next to vowels stays a consonant
  });
});

describe("birth-date numbers", () => {
  it("Mulank, Bhagyank, Life Path", () => {
    expect(mulank("1990-06-29").number).toBe(2);
    expect(bhagyank("2000-01-01").number).toBe(4);
    // 1990-06-15: month 6, day 15→6, year 1+9+9+0=19→10→1 ; 6+6+1 = 13 → 4
    const lp = lifePath("1990-06-15");
    expect(lp.parts.map((p) => p.value)).toEqual([6, 6, 1]);
    expect(lp.number).toBe(4);
    // 29 Feb 1988: day 29 → 11 (master kept)
    expect(lifePath("1988-02-29").parts[1].value).toBe(11);
  });

  it("Lo Shu counts digits, ignoring zeros", () => {
    const g = loShu("1990-06-15");
    expect(g.counts[1]).toBe(2);
    expect(g.counts[9]).toBe(2);
    expect(g.missing).toEqual([2, 3, 4, 7, 8]);
    expect(g.repeated).toEqual([1, 9]);
  });

  it("personal year", () => {
    // 15 + 6 + 2026 → 1+5+6+2+0+2+6 = 22 → 4
    expect(personalYear("1990-06-15", 2026).number).toBe(4);
  });
});

describe("number numerology", () => {
  it("sums digits, ignores symbols, gives last-4", () => {
    const a = analyseNumber("+91 98765-43210")!;
    expect(a.digits).toBe("919876543210");
    expect(a.total).toBe(55);
    expect(a.reduced).toBe(1);
    expect(a.last4).toEqual({ digits: "3210", total: 6, reduced: 6 });
    expect(a.zeros).toBe(1);
    expect(analyseNumber("no digits")).toBeNull();
  });
});

describe("harmony", () => {
  it("uses planet friendship both ways", () => {
    expect(harmony(1, 3).verdict).toBe("friendly"); // Sun–Jupiter
    expect(harmony(1, 8).verdict).toBe("challenging"); // Sun–Saturn
    expect(harmony(5, 5).verdict).toBe("same");
    expect(harmony(4, 7).verdict).toBe("neutral"); // Rahu–Ketu: not in the classical table
  });
});
