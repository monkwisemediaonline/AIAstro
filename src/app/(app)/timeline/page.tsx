import { Suspense } from "react";
import Link from "next/link";
import { computeChart, type ChartResult } from "@/engine/chart";
import { DASHA_YEARS, SIGNS, type Planet } from "@/engine/constants";
import type { DashaPeriod } from "@/engine/dasha";
import { formatDms } from "@/engine/math";
import { saturnPhases, signStays, transitsAt } from "@/engine/transits";
import { evaluateForBirth } from "@/rules/evaluate";
import { describeTime, RELATIONSHIPS, toBirthInput, type Person } from "@/lib/people";
import { getStore } from "@/lib/store";

const YEAR = 365.25 * 86_400_000;

const COLOR: Record<Planet, string> = {
  Sun: "#d98a2b",
  Moon: "#9fb4c9",
  Mars: "#c0503f",
  Mercury: "#4f9a6b",
  Jupiter: "#d4b23f",
  Venus: "#c98fb5",
  Saturn: "#55627d",
  Rahu: "#7a6a8f",
  Ketu: "#96806a",
};

export default function TimelinePage(props: PageProps<"/timeline">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Timing</p>
        <h1 className="font-display text-4xl font-semibold">Dasha &amp; Transits</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Which planetary periods are running, what comes next, and where the planets are now relative to the birth chart. Traditional timing, not event prediction.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Calculating…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/timeline">["searchParams"] }) {
  const sp = await searchParams;
  const store = await getStore();
  const people = await store.listPeople();
  if (!people.length) {
    return (
      <div className="card grid place-items-center gap-3 p-10 text-center">
        <p className="font-display text-2xl">Add birth details first</p>
        <Link href="/people/new" className="btn btn-gold">Add birth details</Link>
      </div>
    );
  }
  const person = people.find((p) => p.id === sp.p) ?? people.find((p) => p.relationship === "self") ?? people[0];
  const now = new Date();
  const picked = typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? new Date(`${sp.d}T12:00:00Z`) : null;
  const at = picked && !Number.isNaN(picked.getTime()) ? picked : now;

  return (
    <div className="space-y-6">
      <form method="get" className="card grid gap-3 p-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="tl-person">Person</label>
          <select id="tl-person" name="p" defaultValue={person.id} className="field">
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name} — {RELATIONSHIPS[p.relationship]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tl-date">Look at date</label>
          <input id="tl-date" name="d" type="date" defaultValue={at.toISOString().slice(0, 10)} className="field tabular" />
        </div>
        <button className="btn btn-primary">Show</button>
      </form>
      {toBirthInput(person) ? (
        <Report person={person} now={now} at={at} isToday={!picked} />
      ) : (
        <p className="card p-5 text-sm">
          Birth details for {person.display_name} are incomplete.{" "}
          <Link href={`/people/${person.id}/edit`} className="font-semibold text-gold underline-offset-4 hover:underline">Complete details</Link>
        </p>
      )}
    </div>
  );
}

function Report({ person, now, at, isToday }: { person: Person; now: Date; at: Date; isToday: boolean }) {
  const input = toBirthInput(person)!;
  const chart = computeChart(input, at);
  const tz = chart.input.ianaTz;
  const fmt = (iso: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: tz }).format(new Date(iso));
  const fmtMonth = (iso: string) => new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: tz }).format(new Date(iso));
  const atIso = at.toISOString();

  const md = chart.dasha.mahadashas.find((m) => m.start <= atIso && atIso < m.end) ?? null;
  const ad = md?.children?.find((a) => a.start <= atIso && atIso < a.end) ?? null;
  const pd = ad?.children?.find((x) => x.start <= atIso && atIso < x.end) ?? null;
  const upcoming = chart.dasha.mahadashas
    .flatMap((m) => (m.children ?? []).map((a) => ({ md: m.lord, ...a })))
    .filter((a) => a.start > atIso)
    .slice(0, 6);

  const yogas = evaluateForBirth(input).results.filter((r) => r.status === "detected" && r.category !== "caution");
  const yogasOf = (lord: Planet) => yogas.filter((y) => y.instances.some((i) => i.planets.includes(lord))).map((y) => y.name);

  const moon = chart.chart.planets.find((p) => p.planet === "Moon")!;
  const moonUncertain = chart.sensitivity?.some((r) => r.item === "Moon sign (Rashi)" && !r.stable) ?? false;
  const lagnaUncertain = chart.sensitivity?.some((r) => r.item === "Ascendant (Lagna) sign" && !r.stable) ?? false;
  const lagna = chart.chart.ascendant && !lagnaUncertain ? chart.chart.ascendant.sign : null;
  const transits = transitsAt(at, moon.sign, lagna);

  const phases = saturnPhases(moon.sign, new Date(at.getTime() - 8 * YEAR), new Date(at.getTime() + 30 * YEAR));
  const stays = [
    { planet: "Jupiter" as Planet, list: signStays("Jupiter", at, new Date(at.getTime() + 4 * YEAR), 5) },
    { planet: "Saturn" as Planet, list: signStays("Saturn", at, new Date(at.getTime() + 8 * YEAR), 10) },
    { planet: "Rahu" as Planet, list: signStays("Rahu", at, new Date(at.getTime() + 4 * YEAR), 10) },
  ];
  const house = (sign: number, from: number) => ((sign - from + 12) % 12) + 1;

  return (
    <div className="space-y-6">
      {chart.availability.dasha !== "exact" && (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          Birth time is {person.time_kind === "unknown" ? "unknown" : "a range"} ({describeTime(person)}), so Dasha dates are {chart.availability.dasha}
          {person.time_kind === "unknown" ? " — they can be off by months or more" : " — they can shift by days"}.
          {moonUncertain && " The Moon may also have changed sign that day, which would change the transit houses."}
        </p>
      )}

      {/* Now */}
      <section className="grid gap-4 md:grid-cols-3">
        {([
          ["Mahadasha", md, "The main period"],
          ["Antardasha", ad, "Sub-period within it"],
          ["Pratyantardasha", pd, "Sub-sub-period"],
        ] as const).map(([label, p, hint]) => (
          <PeriodCard key={label} label={label} hint={hint} period={p} at={at} fmt={fmt} natal={p ? chart.chart.planets.find((x) => x.planet === p.lord)! : null} yogas={p ? yogasOf(p.lord) : []} />
        ))}
      </section>

      {/* Life timeline */}
      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold">Mahadasha timeline</h2>
          <span className="text-xs text-muted">Vimshottari · 120-year cycle · year = {chart.dasha.yearDays} days</span>
        </div>
        <LifeBar chart={chart} at={at} />
        <div className="table-scroll mt-4">
          <table className="data">
            <thead>
              <tr><th>Mahadasha</th><th>From</th><th>To</th><th>Age</th><th>Detected yogas of this planet</th></tr>
            </thead>
            <tbody>
              {chart.dasha.mahadashas.map((m) => {
                const active = m === md;
                const birth = new Date(chart.chart.utc).getTime();
                const a0 = Math.max(0, (new Date(m.start).getTime() - birth) / YEAR);
                const a1 = (new Date(m.end).getTime() - birth) / YEAR;
                return (
                  <tr key={m.start} className={active ? "font-semibold" : ""}>
                    <td>
                      <span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: COLOR[m.lord] }} />
                      {m.lord} <span className="text-xs font-normal text-muted">{DASHA_YEARS[m.lord]} yrs</span>
                      {active && <span className="chip ml-2 bg-gold text-[#1a1408]">{isToday ? "Now" : "On this date"}</span>}
                    </td>
                    <td className="tabular text-ink-soft">{fmt(m.start)}</td>
                    <td className="tabular text-ink-soft">{fmt(m.end)}</td>
                    <td className="tabular text-ink-soft">{a0.toFixed(0)}–{a1.toFixed(0)}</td>
                    <td className="whitespace-normal text-xs font-normal text-ink-soft">{yogasOf(m.lord).join(", ") || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Upcoming */}
      <section className="card p-5">
        <h2 className="font-display text-2xl font-semibold">Next sub-period changes</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {upcoming.map((a) => (
            <li key={a.start} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: COLOR[a.lord] }} />
                {a.md} / <b>{a.lord}</b>
                {yogasOf(a.lord).length > 0 && <span className="ml-2 text-xs text-muted">{yogasOf(a.lord).join(", ")}</span>}
              </span>
              <span className="tabular text-ink-soft">{fmt(a.start)} → {fmt(a.end)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Transits */}
      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold">Transits {isToday ? "today" : `on ${fmt(atIso)}`}</h2>
          <span className="text-xs text-muted">
            Natal Moon in {SIGNS[moon.sign]}
            {lagna !== null ? ` · Lagna ${SIGNS[lagna]}` : " · Lagna not available"}
          </span>
        </div>
        <div className="table-scroll mt-3">
          <table className="data">
            <thead>
              <tr><th>Planet</th><th>Now in</th><th>Degree</th><th>Nakshatra</th><th>From Moon</th>{lagna !== null && <th>From Lagna</th>}<th>Gochara (from Moon)</th></tr>
            </thead>
            <tbody>
              {transits.map((t) => (
                <tr key={t.planet}>
                  <td className="font-semibold">
                    {t.planet}
                    {t.retrograde && t.planet !== "Rahu" && t.planet !== "Ketu" && <span className="chip ml-2 bg-surface-2 text-ink-soft">Retro</span>}
                  </td>
                  <td>{SIGNS[t.sign]}</td>
                  <td className="tabular">{formatDms(t.degInSign)}</td>
                  <td>{t.nakshatra}</td>
                  <td className="tabular">{t.fromMoon}</td>
                  {lagna !== null && <td className="tabular">{t.fromLagna}</td>}
                  <td>
                    <span className={`chip ${t.favourable ? "bg-ok-soft text-ok" : "bg-surface-2 text-ink-soft"}`}>{t.favourable ? "Favourable house" : "Not a favourable house"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          Gochara uses the classical favourable houses counted from the natal Moon. Obstruction points (vedha) and Ashtakavarga are not applied, so treat this as a first reading.
        </p>
      </section>

      {/* Saturn */}
      <section className="card p-5">
        <h2 className="font-display text-2xl font-semibold">Saturn and the Moon — Sade Sati &amp; Dhaiya</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Sade Sati is Saturn&apos;s roughly 7½-year passage through the 12th, 1st and 2nd signs from the natal Moon. Dhaiya is its 2½ years in the 4th or 8th. Traditionally read as a demanding, disciplining time, not a verdict.
        </p>
        <div className="table-scroll mt-3">
          <table className="data">
            <thead>
              <tr><th>Phase</th><th>Saturn in</th><th>From</th><th>To</th><th /></tr>
            </thead>
            <tbody>
              {phases.map((p) => {
                const active = p.start <= atIso && atIso < p.end;
                return (
                  <tr key={p.start} className={active ? "font-semibold" : ""}>
                    <td>
                      <span className={`chip mr-2 ${p.kind === "sade_sati" ? "bg-warn-soft text-warn" : "bg-surface-2 text-ink-soft"}`}>{p.kind === "sade_sati" ? "Sade Sati" : "Dhaiya"}</span>
                      {p.phase}
                    </td>
                    <td>{SIGNS[p.sign]}</td>
                    <td className="tabular text-ink-soft">{fmt(p.start)}</td>
                    <td className="tabular text-ink-soft">{fmt(p.end)}</td>
                    <td>{active && <span className="chip bg-gold text-[#1a1408]">{isToday ? "Now" : "On this date"}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Short repeated rows are Saturn stepping back into a sign while retrograde. The first and last rows may be cut off by the 38-year window shown.</p>
      </section>

      {/* Slow planets ahead */}
      <section className="grid gap-4 lg:grid-cols-3">
        {stays.map(({ planet, list }) => (
          <div key={planet} className="card p-5">
            <h2 className="font-display text-xl font-semibold">{planet === "Rahu" ? "Rahu (Ketu opposite)" : planet} ahead</h2>
            <ul className="mt-2 divide-y divide-line text-sm">
              {list.map((s) => {
                const hm = house(s.sign, moon.sign);
                return (
                  <li key={s.start} className="py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{SIGNS[s.sign]}</span>
                      <span className="tabular text-xs text-ink-soft">
                        {s.startsBeforeWindow ? "now" : fmtMonth(s.start)} → {s.endsAfterWindow ? "…" : fmtMonth(s.end)}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {hm} from Moon{lagna !== null ? ` · ${house(s.sign, lagna)} from Lagna` : ""}
                      {planet === "Rahu" ? ` · Ketu in ${SIGNS[(s.sign + 6) % 12]}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <footer className="rounded-xl border border-dashed border-line p-4 text-xs text-muted">
        Sidereal Lahiri · mean node · positions at {isToday ? now.toISOString().slice(0, 16).replace("T", " ") : `${atIso.slice(0, 10)} 12:00`} UTC · sign-change times found to about a minute. Dasha and transits describe traditional emphasis. They do not say what will happen, and they are not a basis for financial, medical or legal decisions.
      </footer>
    </div>
  );
}

function PeriodCard({
  label,
  hint,
  period,
  at,
  fmt,
  natal,
  yogas,
}: {
  label: string;
  hint: string;
  period: DashaPeriod | null;
  at: Date;
  fmt: (iso: string) => string;
  natal: ChartResult["chart"]["planets"][number] | null;
  yogas: string[];
}) {
  if (!period || !natal) return <div className="card p-5 text-sm text-muted">{label}: not available</div>;
  const s = new Date(period.start).getTime();
  const e = new Date(period.end).getTime();
  const pct = Math.max(0, Math.min(100, ((at.getTime() - s) / (e - s)) * 100));
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 flex items-center gap-2 font-display text-3xl font-semibold">
        <span className="inline-block size-3 rounded-full" style={{ background: COLOR[period.lord] }} />
        {period.lord}
      </p>
      <p className="text-xs text-muted">{hint}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
      <p className="tabular mt-1 text-xs text-ink-soft">
        {fmt(period.start)} → {fmt(period.end)} · {pct.toFixed(0)}% through
      </p>
      <p className="mt-3 text-sm">
        Natal {period.lord}: {SIGNS[natal.sign]}
        {natal.house ? `, house ${natal.house}` : ""} · {natal.dignity}
        {natal.rules?.length ? ` · rules ${natal.rules.join(" & ")}` : ""}
      </p>
      {yogas.length > 0 && <p className="mt-1 text-xs text-ink-soft">In detected yogas: {yogas.join(", ")}</p>}
    </div>
  );
}

function LifeBar({ chart, at }: { chart: ChartResult; at: Date }) {
  const birth = new Date(chart.chart.utc).getTime();
  const end = birth + 100 * YEAR;
  const span = end - birth;
  const segs = chart.dasha.mahadashas
    .map((m) => ({ lord: m.lord, s: Math.max(birth, new Date(m.start).getTime()), e: Math.min(end, new Date(m.end).getTime()) }))
    .filter((x) => x.e > x.s);
  const marker = ((at.getTime() - birth) / span) * 100;
  return (
    <div className="mt-4">
      <div className="relative">
        <div className="flex h-9 overflow-hidden rounded-lg" role="img" aria-label="Mahadasha periods from birth to age 100">
          {segs.map((x) => (
            <div key={x.s} className="grid place-items-center overflow-hidden text-[11px] font-semibold text-white" style={{ width: `${((x.e - x.s) / span) * 100}%`, background: COLOR[x.lord] }} title={x.lord}>
              {(x.e - x.s) / span > 0.06 ? x.lord : ""}
            </div>
          ))}
        </div>
        {marker >= 0 && marker <= 100 && <div className="absolute -top-1 h-11 w-0.5 bg-ink" style={{ left: `${marker}%` }} aria-hidden />}
      </div>
      <div className="tabular mt-1 flex justify-between text-[11px] text-muted">
        {[0, 20, 40, 60, 80, 100].map((a) => (
          <span key={a}>age {a}</span>
        ))}
      </div>
    </div>
  );
}
