// Generates reference values with Swiss Ephemeris (sweph, AGPL) for SYNTHETIC births only.
// sweph is NOT a project dependency. Install it in a separate folder and point SWEPH_DIR at it:
//   SWEPH_DIR=/path/to/folder-with-node_modules node scripts/gen-reference.mjs
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const dir = process.env.SWEPH_DIR;
if (!dir) throw new Error("Set SWEPH_DIR to a folder where `npm i sweph` was run");
const require = createRequire(path.join(dir, "package.json"));
const swe = require("sweph");
const C = swe.constants;

// Synthetic instants (UTC) and places. Chosen to cover decades, latitudes, and edge cases.
const births = [
  { id: "syn-01", utc: "1930-03-15T06:20:00Z", lat: 28.61, lon: 77.21 },
  { id: "syn-02", utc: "1944-07-02T21:05:00Z", lat: 19.08, lon: 72.88 },
  { id: "syn-03", utc: "1955-11-23T02:40:00Z", lat: 13.08, lon: 80.27 },
  { id: "syn-04", utc: "1968-01-09T12:00:00Z", lat: 22.57, lon: 88.36 },
  { id: "syn-05", utc: "1979-05-30T17:45:00Z", lat: 51.51, lon: -0.13 },
  { id: "syn-06", utc: "1987-09-12T03:10:00Z", lat: 40.71, lon: -74.01 },
  { id: "syn-07", utc: "1993-12-31T23:59:00Z", lat: 30.9, lon: 75.85 },
  { id: "syn-08", utc: "2001-04-18T08:30:00Z", lat: -33.87, lon: 151.21 },
  { id: "syn-09", utc: "2008-08-08T08:08:00Z", lat: 25.59, lon: 85.14 },
  { id: "syn-10", utc: "2016-02-29T14:15:00Z", lat: 8.52, lon: 76.94 },
  { id: "syn-11", utc: "2023-10-05T19:50:00Z", lat: 34.08, lon: 74.8 },
  { id: "syn-12", utc: "2030-06-21T00:00:00Z", lat: 26.91, lon: 75.79 },
];

const bodies = {
  Sun: C.SE_SUN,
  Moon: C.SE_MOON,
  Mars: C.SE_MARS,
  Mercury: C.SE_MERCURY,
  Jupiter: C.SE_JUPITER,
  Venus: C.SE_VENUS,
  Saturn: C.SE_SATURN,
  Rahu: C.SE_MEAN_NODE,
};

swe.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);
const flags = C.SEFLG_MOSEPH | C.SEFLG_SIDEREAL | C.SEFLG_SPEED;

const out = births.map((b) => {
  const d = new Date(b.utc);
  const jd = swe.utc_to_jd(
    d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(),
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), C.SE_GREG_CAL,
  ).data[1];
  const planets = {};
  for (const [name, ipl] of Object.entries(bodies)) {
    const r = swe.calc_ut(jd, ipl, flags);
    planets[name] = { lon: r.data[0], speed: r.data[3] };
  }
  planets.Ketu = { lon: (planets.Rahu.lon + 180) % 360, speed: planets.Rahu.speed };
  const houses = swe.houses_ex2(jd, C.SEFLG_SIDEREAL, b.lat, b.lon, "W");
  return {
    ...b,
    jdUt: jd,
    ayanamshaMean: swe.get_ayanamsa_ex_ut(jd, C.SEFLG_MOSEPH | C.SEFLG_NONUT).data,
    ascendant: houses.data.points[0],
    planets,
  };
});

const target = path.join(import.meta.dirname, "..", "tests", "fixtures", "reference-charts.json");
mkdirSync(path.dirname(target), { recursive: true });
writeFileSync(
  target,
  JSON.stringify({ generator: `sweph ${swe.version()} (Moshier), SE_SIDM_LAHIRI, mean node`, births: out }, null, 2),
);
console.log(`wrote ${out.length} reference charts to ${target}`);
