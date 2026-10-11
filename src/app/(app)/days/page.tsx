import { Suspense } from "react";
import { wealthIndicators } from "@/business/indicators";
import { DayRow, NeedsDetails, PersonPicker, RATING, fmtDay } from "@/components/Guidance";
import { SIGNS } from "@/engine/constants";
import { DAY_RULES, scoreDays } from "@/engine/panchang";
import { GOCHARA_GOOD, signStays } from "@/engine/transits";
import { loadPersonContext } from "@/lib/person-context";
import { TRANSIT_FROM_MOON } from "@/reading/meanings";

const YEAR = 365.25 * 86_400_000;

export default function DaysPage(props: PageProps<"/days">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Timing · free, no AI</p>
        <h1 className="font-display text-4xl font-semibold">Favourable Days</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Each day is rated for you personally from five traditional factors: Moon strength, star strength, tithi, weekday and number. Open a day to see exactly why it got its rating.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Calculating the next 45 days…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/days">["searchParams"] }) {
  const sp = await searchParams;
  const { people, person, now, data } = await loadPersonContext(sp.p);
  if (!person || !data) return <NeedsDetails person={person} />;
  const { natal, tz, chart, yogas, reading } = data;

  const todayLocal = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now); // YYYY-MM-DD
  const days = scoreDays(todayLocal, 45, tz, natal);
  const today = days[0];
  const best = [...days.slice(1)].filter((d) => d.rating === "very_good" || d.rating === "good").sort((a, b) => b.score - a.score || a.date.localeCompare(b.date)).slice(0, 8).sort((a, b) => a.date.localeCompare(b.date));
  const avoid = days.slice(1).filter((d) => d.rating === "avoid").slice(0, 8);
  const tally = { very_good: 0, good: 0, neutral: 0, avoid: 0 };
  for (const d of days) tally[d.rating]++;

  const moonSign = natal.moonSign;
  const house = (sign: number) => ((sign - moonSign + 12) % 12) + 1;
  const fmtMonth = (iso: string) => new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: tz }).format(new Date(iso));
  const slow = (["Jupiter", "Saturn"] as const).map((planet) => ({
    planet,
    stays: signStays(planet, now, new Date(now.getTime() + (planet === "Jupiter" ? 4 : 7) * YEAR), planet === "Jupiter" ? 5 : 10).map((s) => ({ ...s, h: house(s.sign), good: GOCHARA_GOOD[planet].includes(house(s.sign)) })),
  }));
  const windows = wealthIndicators(chart, yogas, now, reading.lagnaSettled).windows.slice(0, 8);

  return (
    <div className="space-y-6">
      {people.length > 1 && <PersonPicker people={people} person={person} path="/days" />}

      {chart.input.timeKind === "unknown" && (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">Birth time is unknown, so the birth star may be off by one and the Lagna-lord factor is skipped. Treat the ratings as approximate.</p>
      )}

      <section className="card overflow-hidden">
        <div className="grid gap-4 bg-navy p-5 text-[#f6eedb] sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d9ac52]">Today · {fmtDay(today.date)}</p>
            <p className="mt-1 font-display text-3xl font-semibold">{RATING[today.rating].label}</p>
            <p className="mt-1 text-sm text-[#d8d2c2]">
              {today.weekday} · {today.tithi} · Moon in {SIGNS[today.moonSign]}, {today.nakshatra} · score {today.score > 0 ? "+" : ""}
              {today.score}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {(["very_good", "good", "neutral", "avoid"] as const).map((k) => (
              <div key={k} className="rounded-lg bg-white/5 px-3 py-2">
                <p className="tabular text-2xl font-semibold">{tally[k]}</p>
                <p className="text-[#c9c2b0]">{RATING[k].label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4">
          <DayRow d={today} open />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display text-2xl font-semibold">Best days ahead</h2>
          <p className="text-sm text-muted">For launches, signing, important meetings, asking for money, starting a practice.</p>
          <div className="mt-3 space-y-2">
            {best.length ? best.map((d) => <DayRow key={d.date} d={d} />) : <p className="text-sm text-ink-soft">No clearly favourable day in the next 45 days under these rules.</p>}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="font-display text-2xl font-semibold">Days to keep light</h2>
          <p className="text-sm text-muted">Fine for routine work. Tradition avoids beginnings and big commitments on these.</p>
          <div className="mt-3 space-y-2">
            {avoid.length ? avoid.map((d) => <DayRow key={d.date} d={d} />) : <p className="text-sm text-ink-soft">None in the next 45 days.</p>}
          </div>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-display text-2xl font-semibold">All 45 days</h2>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full" aria-hidden>
          {days.map((d) => (
            <div key={d.date} className={`flex-1 ${RATING[d.rating].bar} ${d.rating === "good" ? "opacity-50" : ""}`} title={`${fmtDay(d.date)}: ${RATING[d.rating].label}`} />
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {days.map((d) => (
            <DayRow key={d.date} d={d} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">The bigger picture — years, not days</h2>
          <p className="text-sm text-muted">Daily ratings are fine-tuning. The larger tides are the slow planets and your Dasha.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {slow.map(({ planet, stays }) => (
            <div key={planet} className="card p-5">
              <h3 className="font-display text-xl font-semibold">{planet} from your Moon</h3>
              <ul className="mt-2 divide-y divide-line text-sm">
                {stays.map((s) => (
                  <li key={s.start} className="py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span>
                        <b>{SIGNS[s.sign]}</b> <span className={`chip ml-1 ${s.good ? "bg-ok-soft text-ok" : "bg-surface-2 text-ink-soft"}`}>{s.good ? "Favourable" : "Testing"}</span>
                      </span>
                      <span className="tabular text-xs text-ink-soft">{s.startsBeforeWindow ? "now" : fmtMonth(s.start)} → {s.endsAfterWindow ? "…" : fmtMonth(s.end)}</span>
                    </div>
                    <p className="text-xs text-muted">House {s.h}: {TRANSIT_FROM_MOON[s.h]}.</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="card p-5">
            <h3 className="font-display text-xl font-semibold">Money and career periods</h3>
            {windows.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">None found under these rules{reading.lagnaSettled ? "" : " (needs a settled Lagna)"}.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line text-sm">
                {windows.map((w) => (
                  <li key={w.start} className="py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <b>{w.md} / {w.ad}{w.current ? " · now" : ""}</b>
                      <span className="tabular text-xs text-ink-soft">{fmtMonth(w.start)} → {fmtMonth(w.end)}</span>
                    </div>
                    <p className="text-xs text-muted">{w.reasons.join(" · ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <footer className="rounded-xl border border-dashed border-line p-4 text-xs text-muted">
        Method ({DAY_RULES}): Chandra Bala +2 / 0 / −2 (8th from Moon −3 and always “avoid”), Tara Bala +2 / 0 / −2, tithi +1 Purna, −1 Rikta, −2 Amavasya, weekday ±1 by friendship with your Lagna lord and ±0.5 for trade days, day number ±1 against your Mulank. Total ≥ 4 very favourable, ≥ 1.5 favourable, below −1.5 avoid.
        Positions are for midday in your birth timezone. Rahu Kaal, Yoga, Karana and Lagna-based muhurta are not included. A good day does not rescue a bad decision; a hard day does not ruin a good one.
      </footer>
    </div>
  );
}
