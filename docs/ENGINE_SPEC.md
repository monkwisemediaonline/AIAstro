# Engine Spec — Astronomy, Chart, Vargas, Dasha

All functions are pure (no I/O). Input: `BirthInstant` + `ChartSettings`.
Output: versioned `ChartResult` JSON. Angles in degrees, `[0, 360)`.

```ts
type ChartSettings = {
  zodiac: "sidereal";
  ayanamsha: "lahiri" | "raman" | "krishnamurti" | "true_chitrapaksha";
  node: "mean" | "true";
  houseSystem: "whole_sign" | "sripati";
  dashaYearDays: 365.25 | 365.2425 | 360;
  combustionOrbs: Record<Planet, number>;   // see §7
  ruleSetVersion: string;
};
type BirthInstant = {
  localDate: string; localTime: string | null;  // as entered
  ianaTz: string; utcOffsetMinutes: number; tzdbVersion: string;
  utc: string;                                  // ISO
  lat: number; lon: number; placeSource: string;
};
```

## 1. Time
- Local → UTC with `luxon` `DateTime.fromISO(local, { zone: ianaTz })`. Store offset used.
- India: `Asia/Kolkata`. Note pre-1955 India had other zones (Bombay/Calcutta time) and
  1942–45 war time (+6:30); tzdb handles these — never hard-code +5:30.
- Julian Day (UT) from UTC; ΔT handled by `astronomy-engine` (`MakeTime`).

## 2. Planet positions (tropical → sidereal)
- `astronomy-engine`: `GeoVector(body, time, aberration=true)` → `Ecliptic(vec)` gives
  apparent geocentric ecliptic longitude of date for Sun..Saturn. Moon: `GeoMoon` or
  `EclipticGeoMoon`.
- Retrograde: compare longitude at t−1h and t+1h (or speed sign).
- **Mean lunar node (Rahu)** (Meeus 47.7):
  `Ω = 125.0445479 − 1934.1362891·T + 0.0020754·T² + T³/467441 − T⁴/60616000`
  (T = Julian centuries TT from J2000). Ketu = Rahu + 180. True node optional (later).
- Sidereal longitude = tropical − ayanamsha(t).

## 3. Ayanamsha
Lahiri (Chitrapaksha) — implement as precession of the equinox in ecliptic longitude
from a reference epoch, calibrated so that the value at J2000.0 = **23°51'25.53"
(23.857092°)**, matching Swiss Ephemeris `SE_SIDM_LAHIRI`.

Implementation: `ayan(T) = 23.857092 + p_A(T)` where `p_A` is IAU 2006 general
precession in longitude: `p_A = 5028.796195·T + 1.1054348·T² + 0.00007964·T³ …` (arcsec;
convert to degrees). Verify against `sweph.get_ayanamsa_ut` for 1900–2100 at 10-year
steps; tolerance 0.001°. Other ayanamshas: store their J2000 constants in
`src/engine/ayanamsha.ts`, each tested against sweph.

## 4. Ascendant & houses
- Local sidereal time: `astronomy-engine` `SiderealTime(time)` (GAST, hours) + lon/15.
- Obliquity ε: true obliquity of date (`e_tilt(time).tobl`).
- RAMC θ = LST × 15°. Ascendant (tropical):
  `λ = atan2(cos θ, −(sin θ·cos ε + tan φ·sin ε))`, normalised to [0, 360).
  MC: `atan2(sin θ, cos θ·cos ε)`. Sanity test: Asc − MC must lie in (0°, 180°).
  Then subtract ayanamsha.
- Whole-sign: house n = sign (AscSign + n − 1).
- Sripati (optional): Porphyry-style trisection between Asc/MC/Dsc/IC quadrants, cusps
  at bhava madhya; test against Jagannatha Hora "Sripati" output.
- High latitude (|φ| > 66°) warning; not relevant for India but handle gracefully.

## 5. Signs, nakshatras
- Sign index = `floor(λ / 30)` (0 = Aries). Degree in sign = `λ mod 30`.
- Nakshatra index = `floor(λ / (360/27))`, pada = `floor((λ mod 13.3333…) / 3.3333…) + 1`.
- Nakshatra lords (from Ashwini, repeating ×3): Ketu, Venus, Sun, Moon, Mars, Rahu,
  Jupiter, Saturn, Mercury.
- Boundary rule: a value exactly on a boundary belongs to the *next* sign/nakshatra.
  Use an epsilon of 1e-9 and test 29°59'59" and 0°00'00".

## 6. Sign lordship & dignity (Parashari)
Lords: Ar Mars, Ta Venus, Ge Mercury, Cn Moon, Le Sun, Vi Mercury, Li Venus, Sc Mars,
Sg Jupiter, Cp Saturn, Aq Saturn, Pi Jupiter. (Rahu/Ketu co-lordship of Aq/Sc:
configurable, off by default.)

| Planet | Exaltation (deep) | Debilitation | Moolatrikona | Own |
|---|---|---|---|---|
| Sun | Aries 10° | Libra 10° | Leo 0–20° | Leo |
| Moon | Taurus 3° | Scorpio 3° | Taurus 4–30° | Cancer |
| Mars | Capricorn 28° | Cancer 28° | Aries 0–12° | Aries, Scorpio |
| Mercury | Virgo 15° | Pisces 15° | Virgo 16–20° | Gemini, Virgo |
| Jupiter | Cancer 5° | Capricorn 5° | Sagittarius 0–10° | Sagittarius, Pisces |
| Venus | Pisces 27° | Virgo 27° | Libra 0–15° | Taurus, Libra |
| Saturn | Libra 20° | Aries 20° | Aquarius 0–20° | Capricorn, Aquarius |
| Rahu | Taurus* | Scorpio* | — | — |
| Ketu | Scorpio* | Taurus* | — | — |

*Rahu/Ketu dignity varies by school (some use Gemini/Sagittarius). Make it a setting;
default Taurus/Scorpio; label as disputed.

Precedence for a planet in a sign: exalted/debilitated > moolatrikona (within degree
range) > own > friendship (naisargika, BPHS Ch.3). Compound (panchadha) friendship
optional, labelled.

Natural friendships (BPHS):
| Planet | Friends | Neutral | Enemies |
|---|---|---|---|
| Sun | Moon, Mars, Jupiter | Mercury | Venus, Saturn |
| Moon | Sun, Mercury | Mars, Jupiter, Venus, Saturn | — |
| Mars | Sun, Moon, Jupiter | Venus, Saturn | Mercury |
| Mercury | Sun, Venus | Mars, Jupiter, Saturn | Moon |
| Jupiter | Sun, Moon, Mars | Saturn | Mercury, Venus |
| Venus | Mercury, Saturn | Mars, Jupiter | Sun, Moon |
| Saturn | Mercury, Venus | Jupiter | Sun, Moon, Mars |

## 7. Combustion (default orbs, configurable)
Moon 12°, Mars 17°, Mercury 14° (12° if retrograde), Jupiter 11°, Venus 10° (8° if
retrograde), Saturn 15°. Measured as absolute longitude separation from the Sun.
Rahu/Ketu never combust.

## 8. Aspects (graha drishti, sign-based)
Every planet aspects the 7th sign from itself. Special: Mars 4th & 8th; Jupiter 5th & 9th;
Saturn 3rd & 10th. Rahu/Ketu: setting — `none` (default) | `jupiter_like` (5th, 9th).
Counting is inclusive (own sign = 1st). Rashi drishti (Jaimini) is a separate module.

## 9. Relationships used by rules
`related(A, B)` is a set of typed relations, each returned as evidence:
- `conjunction` — same sign (D1). Optional degree orb shown but not required.
- `mutual_aspect` — A aspects B's sign and B aspects A's sign.
- `one_way_aspect` — only one aspects the other (weaker; separate type).
- `exchange` (parivartana) — A in a sign of B and B in a sign of A.
- `in_house_of` — A placed in a sign owned by B (weakest; used by some rules only).
Rules declare which relation types count.

## 10. Divisional charts (Parashari)
Let `s` = D1 sign index (0–11), `d` = degree in sign, odd sign = s ∈ {0,2,4,…} (Aries,
Gemini, …).

| Varga | Rule |
|---|---|
| D2 Hora | odd sign: 0–15° → Leo, 15–30° → Cancer; even sign: 0–15° → Cancer, 15–30° → Leo |
| D3 Drekkana | part k = floor(d/10): sign s + 4k |
| D4 Chaturthamsha | part k = floor(d/7.5): sign s + 3k |
| D7 Saptamsha | k = floor(d/(30/7)); odd: s + k; even: s + 6 + k |
| D9 Navamsha | `floor(λ / (10/3)) mod 12` (equivalent to movable-from-self, fixed-from-9th, dual-from-5th) |
| D10 Dashamsha | k = floor(d/3); odd: s + k; even: s + 8 + k |
| D12 Dwadashamsha | k = floor(d/2.5): s + k |
| D16 Shodashamsha | k = floor(d/1.875); movable: Aries + k; fixed: Leo + k; dual: Sagittarius + k |
| D20 Vimshamsha | k = floor(d/1.5); movable: Aries + k; fixed: Sagittarius + k; dual: Leo + k |
| D24 Chaturvimshamsha | k = floor(d/1.25); odd: Leo + k; even: Cancer + k |
| D27 Bhamsha | k = floor(d/(30/27)); fire: Aries+k; earth: Cancer+k; air: Libra+k; water: Capricorn+k |
| D30 Trimshamsha | odd: 0–5 Aries(Mars), 5–10 Aquarius(Saturn), 10–18 Sagittarius(Jupiter), 18–25 Gemini(Mercury), 25–30 Libra(Venus); even: 0–5 Taurus(Venus), 5–12 Virgo(Mercury), 12–20 Pisces(Jupiter), 20–25 Capricorn(Saturn), 25–30 Scorpio(Mars) |
| D40 | k = floor(d/0.75); odd: Aries + k; even: Libra + k |
| D45 | k = floor(d/(30/45)); movable: Aries + k; fixed: Leo + k; dual: Sagittarius + k |
| D60 Shashtiamsha | k = floor(d/0.5): s + k (deity names table optional) |

All sign arithmetic mod 12. Each varga gets its own fixture tests (start, middle, last
part of an odd and an even sign) and must match Jagannatha Hora / sweph-based reference
values. D-charts beyond D12 are **disabled** until their tests pass.

## 11. Vimshottari Dasha
Order & years: Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19,
Mercury 17 (total 120).

1. Moon's sidereal longitude → nakshatra n, lord L, fraction elapsed
   `f = (λ mod 13.3333…) / 13.3333…`.
2. Balance of first Mahadasha = `(1 − f) × years(L)`.
3. Birth-time Mahadasha start = birth − `f × years(L)` (the theoretical start).
4. Subsequent Mahadashas follow the order.
5. Antardasha of lord X within Mahadasha M: duration = `years(M) × years(X) / 120`,
   starting with M itself, then the order.
6. Pratyantardasha: same proportion recursively.
7. Year length = `settings.dashaYearDays` (default 365.25). Store convention with result.

Test: synthetic fixtures vs Jagannatha Hora (same ayanamsha, 365.25) — start dates within
1 day for Mahadasha/Antardasha.

## 12. Ashtakoot (spouse compatibility)
Varna 1, Vashya 2, Tara 3, Yoni 4, Graha Maitri 5, Gana 6, Bhakoot 7, Nadi 8 = 36.
Tables live in `src/compat/ashtakoot.data.ts` with source citation; implement only
after the tables are reviewed. Show each koota and known dosha exceptions separately.

## 13. Reference testing
- `tests/fixtures/charts/*.json`: ≥ 12 synthetic births (various years 1930–2030,
  latitudes 8°–35°N, both hemispheres, near sign/nakshatra boundaries, a retrograde
  Mercury, a combust Venus, a pre-1955 Indian date).
- Reference values generated once by `scripts/gen-reference.ts` using `sweph` (dev
  dependency, AGPL — fine for a private, unpublished tool; never bundled to the client).
- Tolerances: planets 0.01°, Moon 0.02°, Ascendant 0.02°, ayanamsha 0.001°.
