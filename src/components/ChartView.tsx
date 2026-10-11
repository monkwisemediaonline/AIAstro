import type { ChartResult } from "@/engine/chart";
import { SIGNS } from "@/engine/constants";
import { formatDms } from "@/engine/math";
import { formatOffset } from "@/engine/time";
import { NorthIndianChart } from "./NorthIndianChart";

const DIGNITY_STYLE: Record<string, string> = {
  exalted: "bg-ok-soft text-ok",
  moolatrikona: "bg-ok-soft text-ok",
  own: "bg-ok-soft text-ok",
  friend: "bg-surface-2 text-ink-soft",
  neutral: "bg-surface-2 text-muted",
  enemy: "bg-warn-soft text-warn",
  debilitated: "bg-bad-soft text-bad",
};

const fmtDate = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: tz }).format(new Date(iso));

export function ChartView({ result }: { result: ChartResult }) {
  const { chart, input, availability } = result;
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const tz = input.ianaTz;

  return (
    <div className="space-y-6">
      {input.warnings.length > 0 && (
        <div className="card border-warn/40 bg-warn-soft p-4">
          <ul className="space-y-1 text-sm text-warn">
            {input.warnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display text-2xl font-semibold">{chart.ascendant ? "Rashi chart (D1)" : "Moon chart (Chandra Lagna)"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {chart.ascendant ? (
              <>
                <NorthIndianChart firstSign={chart.ascendant.sign} placements={chart.planets} title={`D1 · Lagna ${SIGNS[chart.ascendant.sign]}`} />
                <NorthIndianChart
                  firstSign={chart.ascendant.vargas.D9!}
                  placements={chart.planets.map((p) => ({ planet: p.planet, sign: p.vargas.D9!, retrograde: p.retrograde }))}
                  title={`D9 Navamsha · Lagna ${SIGNS[chart.ascendant.vargas.D9!]}`}
                />
              </>
            ) : (
              <NorthIndianChart firstSign={moon.sign} placements={chart.planets} title={`Moon as Lagna · ${SIGNS[moon.sign]} (birth time unknown)`} />
            )}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-2xl font-semibold">Key points</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <Fact k="Lagna (Ascendant)" v={chart.ascendant ? `${SIGNS[chart.ascendant.sign]} ${formatDms(chart.ascendant.degInSign)}` : "Needs birth time"} sub={chart.ascendant ? `${chart.ascendant.nakshatra} pada ${chart.ascendant.pada} · lord ${chart.ascendant.lord}` : undefined} />
            <Fact k="Moon sign (Rashi)" v={SIGNS[moon.sign]} sub={`${moon.nakshatra} pada ${moon.pada}`} />
            <Fact k="Current Mahadasha" v={result.current.md ?? "—"} sub={result.current.mdEnd ? `until ${fmtDate(result.current.mdEnd, tz)}` : undefined} />
            <Fact k="Current Antardasha" v={result.current.ad ?? "—"} sub={result.current.adEnd ? `until ${fmtDate(result.current.adEnd, tz)}` : undefined} />
            <Fact k="Birth nakshatra lord" v={result.dasha.startingLord} sub={`${result.dasha.balanceYears.toFixed(2)} yrs balance at birth`} />
            <Fact
              k="Dasha reliability"
              v={availability.dasha === "exact" ? "Exact" : availability.dasha === "approximate" ? "Approximate" : "Unreliable"}
              sub={availability.dasha === "exact" ? "From exact birth time" : "Birth time uncertain"}
            />
          </dl>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-display text-2xl font-semibold">Planets</h2>
        <div className="table-scroll mt-3">
          <table className="data">
            <thead>
              <tr>
                <th>Planet</th>
                <th>Sign</th>
                <th>Degree</th>
                <th>Nakshatra</th>
                <th>Dignity</th>
                {availability.houses && <th>House</th>}
                {availability.houses && <th>Rules</th>}
                {availability.houses && <th>Aspects</th>}
                {availability.vargas && <th>D9</th>}
                {availability.vargas && <th>D10</th>}
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {chart.planets.map((p) => (
                <tr key={p.planet}>
                  <td className="font-semibold">{p.planet}</td>
                  <td>{SIGNS[p.sign]}</td>
                  <td className="tabular">{formatDms(p.degInSign)}</td>
                  <td>
                    {p.nakshatra} <span className="text-muted">{p.pada}</span>
                    <span className="ml-1 text-xs text-muted">({p.nakshatraLord})</span>
                  </td>
                  <td>
                    <span className={`chip ${DIGNITY_STYLE[p.dignity]}`}>{p.dignity}</span>
                  </td>
                  {availability.houses && <td className="tabular">{p.house}</td>}
                  {availability.houses && <td className="tabular text-ink-soft">{p.rules?.join(", ") || "—"}</td>}
                  {availability.houses && <td className="tabular text-ink-soft">{p.aspectsHouses?.join(", ") || "—"}</td>}
                  {availability.vargas && <td>{SIGNS[p.vargas.D9!]}</td>}
                  {availability.vargas && <td>{SIGNS[p.vargas.D10!]}</td>}
                  <td className="space-x-1">
                    {p.retrograde && p.planet !== "Rahu" && p.planet !== "Ketu" && <span className="chip bg-surface-2 text-ink-soft">Retro</span>}
                    {p.combust && <span className="chip bg-warn-soft text-warn">Combust</span>}
                    {p.nearBoundary && <span className="chip bg-bad-soft text-bad">Near boundary</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {result.sensitivity && <SensitivityPanel result={result} />}

      <DashaPanel result={result} />

      <SettingsFooter result={result} />
    </div>
  );
}

function Fact({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="mt-0.5 text-base font-semibold">{v}</dd>
      {sub && <dd className="text-xs text-ink-soft">{sub}</dd>}
    </div>
  );
}

function SensitivityPanel({ result }: { result: ChartResult }) {
  const rows = result.sensitivity!;
  const changing = rows.filter((r) => !r.stable);
  const stable = rows.filter((r) => r.stable);
  const window = result.input.range ? `${result.input.range.from}–${result.input.range.to}` : "the whole day (00:00–23:59)";
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">Birth-time sensitivity</h2>
        <span className="text-xs text-muted">
          Sampled {result.input.range ? "every 4 min" : "5 times"} across {window}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        <b className="text-bad">{changing.length} items change</b> inside the window and <b className="text-ok">{stable.length} stay the same</b>. Treat changing items as undecided until the time is confirmed.
      </p>
      <div className="table-scroll mt-4">
        <table className="data">
          <thead>
            <tr>
              <th>Item</th>
              <th>Status</th>
              <th>Values across the window</th>
            </tr>
          </thead>
          <tbody>
            {[...changing, ...stable].map((r) => (
              <tr key={r.item}>
                <td className="font-medium">{r.item}</td>
                <td>{r.stable ? <span className="chip bg-ok-soft text-ok">Stable</span> : <span className="chip bg-bad-soft text-bad">Changes</span>}</td>
                <td className="whitespace-normal">
                  <div className="flex flex-wrap gap-1.5">
                    {r.values.map((v, i) => (
                      <span key={i} className="rounded-md border border-line px-2 py-0.5 text-xs">
                        <b>{v.value}</b>
                        {!r.stable && <span className="tabular text-muted"> {v.from === v.to ? v.from : `${v.from}–${v.to}`}</span>}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DashaPanel({ result }: { result: ChartResult }) {
  const tz = result.input.ianaTz;
  const now = result.computedAt;
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">Vimshottari Dasha</h2>
        <span className="text-xs text-muted">Year = {result.dasha.yearDays} days · {result.availability.dasha} dates</span>
      </div>
      <ol className="mt-4 space-y-2">
        {result.dasha.mahadashas.map((md) => {
          const active = md.start <= now && now < md.end;
          return (
            <li key={md.start}>
              <details open={active} className={`rounded-xl border ${active ? "border-gold bg-gold-soft/50" : "border-line"}`}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <span className="font-semibold">
                    {md.lord} Mahadasha {active && <span className="chip ml-2 bg-gold text-[#1a1408]">Now</span>}
                  </span>
                  <span className="tabular text-sm text-ink-soft">
                    {fmtDate(md.start, tz)} → {fmtDate(md.end, tz)}
                  </span>
                </summary>
                <div className="table-scroll border-t border-line px-2 pb-2">
                  <table className="data">
                    <tbody>
                      {md.children?.map((ad) => {
                        const on = ad.start <= now && now < ad.end;
                        return (
                          <tr key={ad.start} className={on ? "font-semibold" : ""}>
                            <td>
                              {md.lord} / {ad.lord} {on && <span className="chip ml-1 bg-gold text-[#1a1408]">Now</span>}
                            </td>
                            <td className="tabular text-ink-soft">{fmtDate(ad.start, tz)}</td>
                            <td className="tabular text-ink-soft">{fmtDate(ad.end, tz)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function SettingsFooter({ result }: { result: ChartResult }) {
  const s = result.settings;
  const i = result.input;
  const time = i.localTime ?? (i.range ? `${i.range.from}–${i.range.to} (range)` : "unknown (noon used)");
  return (
    <footer className="rounded-xl border border-dashed border-line p-4 text-xs text-muted">
      <p className="mb-1 font-semibold uppercase tracking-wider text-ink-soft">Calculation settings</p>
      <p className="tabular leading-relaxed">
        {i.localDate} {time} · {i.ianaTz} ({formatOffset(i.utcOffsetMinutes)}) · {i.lat.toFixed(4)}, {i.lon.toFixed(4)} · UTC {result.chart.utc.replace("T", " ").slice(0, 16)}
        <br />
        Sidereal zodiac · Lahiri ayanamsha {formatDms(result.chart.ayanamsha)} · {s.node} node · {s.houseSystem.replace("_", "-")} houses · engine {s.engine} {s.engineVersion} · tzdb {s.tzdbVersion ?? "n/a"} · schema {result.schemaVersion} · computed {result.computedAt.slice(0, 16).replace("T", " ")} UTC
      </p>
    </footer>
  );
}
