# Numerology Spec

Each system is an independent module in `src/numerology/systems/` with its own version,
letter table, reduction rules and source. Results always show: input → normalised input
→ per-letter/digit mapping → sums → reduction steps → final numbers.

## 1. Input normalisation (shared)
- Unicode NFKD, strip diacritics, uppercase A–Z only for Latin systems.
- Spaces, hyphens, apostrophes, dots: ignored in totals, but per-word totals shown.
- Non-Latin script (Gurmukhi/Devanagari): require a transliteration; store both the
  original and the transliteration used. Never transliterate silently — show it.
- Titles (Mr, Dr) excluded unless the user ticks "include".

## 2. Reduction
- `reduce(n)`: sum digits repeatedly until 1–9.
- Pythagorean: master numbers 11, 22, 33 kept unreduced when setting `keepMasters` is on
  (default on); also show the reduced value.
- Chaldean: show the **compound number** (the unreduced total, 10–52 range has
  traditional meanings) and the reduced single digit.
- Show every step: `52 → 5+2 = 7`.

## 3. Chaldean (Cheiro tradition) — `chaldean@1.0.0`
No letter maps to 9.

| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|
| A I J Q Y | B K R | C G L S | D M T | E H N X | U V W | O Z | F P |

Outputs: name compound, name single, first-name number, per-word numbers.
Compound meanings (10–52): owner-entered summaries in the Research Library with source,
not copied text.

## 4. Pythagorean — `pythagorean@1.0.0`

| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|
| A J S | B K T | C L U | D M V | E N W | F O X | G P Y | H Q Z | I R |

Outputs: Expression/Destiny (all letters), Soul Urge (vowels), Personality (consonants),
Life Path (birth date, reduce month/day/year separately then add — method stated),
Birthday number. Y-as-vowel setting (default: vowel when no other vowel in syllable;
simple mode: always consonant). Record which.

## 5. Indian (Vedic-style) numerology — `indian@1.0.0`
- **Mulank (psychic / root number)** = reduce(day of birth). 20 → 2.
- **Bhagyank (destiny)** = reduce(sum of all digits of DD+MM+YYYY). Show digits.
- Number ↔ planet: 1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu,
  8 Saturn, 9 Mars.
- **Name number** uses the Chaldean table by default (common Indian practice); the system
  setting names which table is used.
- **Lo Shu grid**: place every non-zero digit of the date of birth in the grid
  ```
  4 9 2
  3 5 7
  8 1 6
  ```
  Show repeats and missing numbers. Options (variants, labelled): add Mulank, Bhagyank,
  Kua number. Kua formula differs by gender and pre/post-2000 births — implement only
  with a cited source, else hide.
- Friendly/neutral/enemy number tables: data file with source; multiple schools may
  disagree — store per source.
- Personal year = reduce(day + month + current year).

## 6. Number numerology (phones, vehicles, house, accounts, dates)
- Total = sum of all digits; reduced number; show compound total.
- Mobile: also last-4 and last-2 digits (variants, labelled). Zero ignored in sum but
  noted (some practitioners treat 0 as amplifier — variant note only).
- Comparison with owner's Mulank and Bhagyank under the selected system: compatible /
  neutral / challenging, using the friendly-numbers data file.
- Business launch / signing date check: reduce the date; show compatibility with Mulank,
  Bhagyank and with the business name number.
- Never tells the user to change a number; shows comparisons only.

## 7. Name-change lab
- Enter up to 10 spellings (personal or business names). Table: each system's numbers
  side by side, compatibility with Mulank/Bhagyank, letter-by-letter mapping on click.
- Business-name mode: compute brand name, legal name, and domain name separately.
- Save comparisons with notes and date.

## 8. Tests
- Table-driven: every letter A–Z in each system.
- Diacritics (`É` → `E`), mixed case, hyphens, multiple spaces, empty string, digits in
  names (ignored with warning).
- Reduction: 0, single digits, 11/22/33 with and without `keepMasters`, large totals.
- Dates: 29 Feb, 1 Jan 2000, 31 Dec 1999.
- Snapshot of full step output for 3 synthetic names.
