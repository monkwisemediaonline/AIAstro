import { Suspense } from "react";
import Link from "next/link";
import { addGoalAction, addRetroAction, saveMetricAction } from "@/app/business-actions";
import { wealthIndicators, type WealthIndicators } from "@/business/indicators";
import { DeleteMetric, DeleteRetro, GoalStatus } from "@/components/BusinessWidgets";
import { MonthBars } from "@/components/MonthBars";
import { computeChart } from "@/engine/chart";
import { SIGNS } from "@/engine/constants";
import { transitsAt } from "@/engine/transits";
import { getBusinessStore, type Goal, type Metric, type Retro } from "@/lib/business-store";
import { RELATIONSHIPS, toBirthInput, type Person } from "@/lib/people";
import { SetupNeeded } from "@/lib/remedy-store";
import { loadReviewIndex } from "@/lib/library-store";
import { getStore } from "@/lib/store";
import { applyReviews, type ReviewIndex } from "@/library/reviews";
import { HOUSE_FOCUS } from "@/rules/actions";
import { DIGNITY_PHRASE } from "@/rules/context";
import { evaluateForBirth } from "@/rules/evaluate";

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0, notation: Math.abs(n) >= 1e7 ? "compact" : "standard" }).format(n);
const monthLabel = (m: string) => new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}T00:00:00Z`));

export default function BusinessPage(props: PageProps<"/business">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Two views, side by side</p>
        <h1 className="font-display text-4xl font-semibold">Business &amp; Wealth</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          What the chart traditionally indicates about wealth and career, next to the numbers your business actually produces. The second half is the one that builds wealth.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/business">["searchParams"] }) {
  const sp = await searchParams;
  const store = await getStore();
  const people = await store.listPeople();
  const person = people.find((p) => p.id === sp.p) ?? people.find((p) => p.relationship === "self") ?? people[0] ?? null;
  const now = new Date();
  const reviews = await loadReviewIndex();

  let tracker: { metrics: Metric[]; goals: Goal[]; retros: Retro[] } | null = null;
  try {
    const bs = await getBusinessStore();
    const [metrics, goals, retros] = await Promise.all([bs.listMetrics(), bs.listGoals(), bs.listRetros()]);
    tracker = { metrics, goals, retros };
  } catch (e) {
    if (!(e instanceof SetupNeeded)) throw e;
  }

  return (
    <div className="space-y-8">
      {people.length > 1 && (
        <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-56 flex-1">
            <label className="label" htmlFor="biz-person">Chart</label>
            <select id="biz-person" name="p" defaultValue={person?.id} className="field">
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name} — {RELATIONSHIPS[p.relationship]}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary">Show</button>
        </form>
      )}

      {person && toBirthInput(person) ? (
        <Traditional person={person} now={now} reviews={reviews} />
      ) : (
        <p className="card p-5 text-sm">
          {person ? `Birth details for ${person.display_name} are incomplete. ` : "Add birth details to see the chart indicators. "}
          <Link href={person ? `/people/${person.id}/edit` : "/people/new"} className="font-semibold text-gold underline-offset-4 hover:underline">Add details</Link>
        </p>
      )}

      {tracker ? (
        <>
          <Tracker metrics={tracker.metrics} today={now.toISOString().slice(0, 7)} />
          <Goals goals={tracker.goals} />
          <Retrospective retros={tracker.retros} />
        </>
      ) : (
        <div className="card border-warn/40 bg-warn-soft p-5 text-sm text-warn">
          <p className="font-semibold">One-time setup needed for the business tracker</p>
          <p className="mt-1">
            In Supabase → SQL Editor, run <code>supabase/migrations/20261013000000_business.sql</code> from the repository, then reload. The chart indicators above work without it.
          </p>
        </div>
      )}

      <footer className="rounded-xl border border-dashed border-line p-4 text-xs text-muted">
        The chart section describes traditional emphasis, not outcomes. It is not a reason to invest, borrow, quit a job or take on risk. Decide those on the numbers in your tracker and on professional advice.
      </footer>
    </div>
  );
}

// ------------------------------------------------------------ Traditional indicators

function Traditional({ person, now, reviews }: { person: Person; now: Date; reviews: ReviewIndex }) {
  const input = toBirthInput(person)!;
  const chart = computeChart(input, now);
  const lagnaSettled = !!chart.chart.ascendant && !(chart.sensitivity?.some((r) => r.item === "Ascendant (Lagna) sign" && !r.stable) ?? false);
  const w: WealthIndicators = wealthIndicators(chart, applyReviews(evaluateForBirth(input).results, reviews).results, now, lagnaSettled);
  const tz = chart.input.ianaTz;
  const fmt = (iso: string) => new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: tz }).format(new Date(iso));
  const moon = chart.chart.planets.find((p) => p.planet === "Moon")!;
  const tr = transitsAt(now, moon.sign, lagnaSettled ? chart.chart.ascendant!.sign : null).filter((t) => t.planet === "Jupiter" || t.planet === "Saturn");

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">What the chart traditionally indicates</h2>
        <p className="text-sm text-muted">{person.display_name} · Parashari, whole-sign houses · rule status follows your Research Library</p>
      </div>

      {!lagnaSettled && (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">The Lagna is not settled for this birth time, so house-based indicators are not shown. Moon-based yogas and periods still are.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Yogas present</p>
          <p className="mt-2 text-sm"><b className="tabular text-2xl font-semibold">{w.yogas.raja.length}</b> Raja / Mahapurusha</p>
          <p className="text-xs text-ink-soft">{w.yogas.raja.map((y) => y.name).join(" · ") || "None under these rules"}</p>
          <p className="mt-3 text-sm"><b className="tabular text-2xl font-semibold">{w.yogas.dhana.length}</b> Dhana</p>
          <p className="text-xs text-ink-soft">{w.yogas.dhana.map((y) => y.name).join(" · ") || "None under these rules"}</p>
          {w.yogas.cautions.length > 0 && <p className="mt-3 text-xs text-warn">Counter-indications: {w.yogas.cautions.map((y) => y.name).join(" · ")}</p>}
          {w.yogas.undecided > 0 && <p className="mt-1 text-xs text-muted">{w.yogas.undecided} rules undecided because of birth time.</p>}
          <Link href={`/yoga?p=${person.id}`} className="mt-3 inline-block text-sm font-semibold text-gold underline-offset-4 hover:underline">See conditions and strength →</Link>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Running now</p>
          <p className="mt-2 font-display text-2xl font-semibold">{w.now.md ?? "—"} / {w.now.ad ?? "—"}</p>
          <p className="text-sm text-ink-soft">
            {w.now.md && w.now.mdRules.length ? `${w.now.md} rules the ${w.now.mdRules.join(" & ")}. ` : ""}
            {w.now.ad && w.now.adRules.length ? `${w.now.ad} rules the ${w.now.adRules.join(" & ")}.` : ""}
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {tr.map((t) => (
              <li key={t.planet}>
                Transit {t.planet} in {SIGNS[t.sign]}: {t.fromMoon} from Moon{t.fromLagna ? `, ${t.fromLagna} from Lagna` : ""}
              </li>
            ))}
          </ul>
          <Link href={`/timeline?p=${person.id}`} className="mt-3 inline-block text-sm font-semibold text-gold underline-offset-4 hover:underline">Full Dasha &amp; transits →</Link>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Career (10th house)</p>
          {w.career ? (
            <>
              <p className="mt-2 font-display text-2xl font-semibold">10th lord: {w.career.tenthLord}</p>
              <p className="text-sm text-ink-soft">
                In Dashamsha (D10): {SIGNS[w.career.tenthLordD10Sign]}, {DIGNITY_PHRASE[w.career.tenthLordD10Dignity]}. D10 Lagna: {SIGNS[w.career.d10Lagna]}.
              </p>
              {chart.input.timeKind !== "exact" && <p className="mt-2 text-xs text-warn">D10 changes every few minutes of birth time; treat it as provisional.</p>}
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">Needs a settled Lagna.</p>
          )}
        </div>
      </div>

      {w.houses && (
        <div className="card p-5">
          <h3 className="font-display text-xl font-semibold">Wealth and career houses</h3>
          <div className="table-scroll mt-2">
            <table className="data">
              <thead>
                <tr><th>House</th><th>Area</th><th>Sign</th><th>Lord</th><th>Lord sits in</th><th>Lord&apos;s state</th><th>Planets here</th></tr>
              </thead>
              <tbody>
                {w.houses.map((h) => (
                  <tr key={h.house}>
                    <td className="tabular font-semibold">{h.house}</td>
                    <td className="whitespace-normal text-ink-soft">{h.area}</td>
                    <td>{SIGNS[h.sign]}</td>
                    <td className="font-semibold">{h.lord}</td>
                    <td className="tabular">house {h.lordHouse}</td>
                    <td>
                      <span className={`chip ${["exalted", "own", "moolatrikona"].includes(h.lordDignity) ? "bg-ok-soft text-ok" : h.lordDignity === "debilitated" ? "bg-bad-soft text-bad" : "bg-surface-2 text-ink-soft"}`}>{DIGNITY_PHRASE[h.lordDignity]}</span>
                      {h.lordCombust && <span className="chip ml-1 bg-warn-soft text-warn">combust</span>}
                    </td>
                    <td className="text-ink-soft">{h.occupants.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-display text-xl font-semibold">Periods traditionally linked to money and career — next 10 years</h3>
        <p className="text-sm text-muted">Sub-periods whose planet rules the 2nd, 10th or 11th, or forms a detected Raja or Dhana yoga. Emphasis, not a forecast.</p>
        {w.windows.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">None found under these rules{lagnaSettled ? "" : " (house lordship needs a settled Lagna)"}.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {w.windows.map((x) => (
              <li key={x.start} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
                <span>
                  <b>{x.md} / {x.ad}</b>
                  {x.current && <span className="chip ml-2 bg-gold text-[#1a1408]">Now</span>}
                  <span className="ml-2 text-xs text-ink-soft">{x.reasons.join(" · ")}</span>
                </span>
                <span className="tabular text-ink-soft">{fmt(x.start)} → {fmt(x.end)}</span>
              </li>
            ))}
          </ul>
        )}
        {chart.availability.dasha !== "exact" && <p className="mt-2 text-xs text-warn">Birth time is uncertain, so these dates are {chart.availability.dasha}.</p>}
        <p className="mt-2 text-xs text-muted">Log what actually happens in each period in the retrospective below, to see whether these signals track your reality.</p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------ Execution tracker

function Tracker({ metrics, today }: { metrics: Metric[]; today: string }) {
  const recent = metrics.slice(-12);
  const last = metrics.at(-1) ?? null;
  const prev = metrics.at(-2) ?? null;
  const growth = last?.revenue_inr != null && prev?.revenue_inr ? ((last.revenue_inr - prev.revenue_inr) / prev.revenue_inr) * 100 : null;
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">What the business is actually doing</h2>
        <p className="text-sm text-muted">Enter one row per month. These are the numbers that decide the outcome.</p>
      </div>

      {last && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={`Revenue · ${monthLabel(last.month)}`} value={last.revenue_inr != null ? inr(last.revenue_inr) : "—"} sub={growth !== null ? `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}% vs previous month` : undefined} />
          <Stat label="Gross margin" value={last.gross_margin_pct != null ? `${last.gross_margin_pct}%` : "—"} />
          <Stat label="Cash in bank" value={last.cash_inr != null ? inr(last.cash_inr) : "—"} />
          <Stat label="Pipeline" value={last.pipeline_inr != null ? inr(last.pipeline_inr) : "—"} sub={last.deals_won != null ? `${last.deals_won} deals won` : undefined} />
        </div>
      )}

      {recent.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <MonthBars title="Revenue by month" points={recent.map((m) => ({ month: m.month, value: m.revenue_inr }))} format={inr} />
          <MonthBars title="Cash in bank by month" points={recent.map((m) => ({ month: m.month, value: m.cash_inr }))} format={inr} />
        </div>
      )}

      <form action={saveMetricAction} className="card grid gap-3 p-5 sm:grid-cols-4">
        <p className="text-sm font-semibold sm:col-span-4">Add or update a month</p>
        <Field label="Month" name="month" type="month" defaultValue={today} required />
        <Field label="Revenue (₹)" name="revenue_inr" type="number" step="1" min="0" />
        <Field label="Gross margin (%)" name="gross_margin_pct" type="number" step="0.1" min="-100" max="100" />
        <Field label="Cash in bank (₹)" name="cash_inr" type="number" step="1" />
        <Field label="Pipeline value (₹)" name="pipeline_inr" type="number" step="1" min="0" />
        <Field label="Deals won" name="deals_won" type="number" step="1" min="0" />
        <Field label="Team size" name="team_size" type="number" step="1" min="0" />
        <Field label="Note" name="note" />
        <div className="sm:col-span-4">
          <button className="btn btn-primary">Save month</button>
          <span className="ml-3 text-xs text-muted">Saving the same month again replaces it.</span>
        </div>
      </form>

      {metrics.length > 0 && (
        <div className="card p-5">
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr><th>Month</th><th className="text-right">Revenue</th><th className="text-right">Margin</th><th className="text-right">Cash</th><th className="text-right">Pipeline</th><th className="text-right">Deals</th><th className="text-right">Team</th><th>Note</th><th /></tr>
              </thead>
              <tbody>
                {[...metrics].reverse().map((m) => (
                  <tr key={m.month}>
                    <td className="font-semibold">{monthLabel(m.month)}</td>
                    <td className="tabular text-right">{m.revenue_inr != null ? inr(m.revenue_inr) : "—"}</td>
                    <td className="tabular text-right">{m.gross_margin_pct != null ? `${m.gross_margin_pct}%` : "—"}</td>
                    <td className="tabular text-right">{m.cash_inr != null ? inr(m.cash_inr) : "—"}</td>
                    <td className="tabular text-right">{m.pipeline_inr != null ? inr(m.pipeline_inr) : "—"}</td>
                    <td className="tabular text-right">{m.deals_won ?? "—"}</td>
                    <td className="tabular text-right">{m.team_size ?? "—"}</td>
                    <td className="whitespace-normal text-xs text-ink-soft">{m.note ?? ""}</td>
                    <td className="text-right"><DeleteMetric month={m.month} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="tabular mt-1 font-display text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={`f-${name}`}>{label}</label>
      <input id={`f-${name}`} name={name} className="field tabular" {...rest} />
    </div>
  );
}

// ------------------------------------------------------------ Goals

function Goals({ goals }: { goals: Goal[] }) {
  const open = goals.filter((g) => g.status === "open");
  const closed = goals.filter((g) => g.status !== "open");
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-semibold">Goals</h2>
      <div className="card p-5">
        {open.length === 0 && <p className="text-sm text-ink-soft">No open goals. Add one concrete, dated goal below.</p>}
        <ul className="divide-y divide-line">
          {open.map((g) => (
            <li key={g.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
              <div>
                <p className="font-semibold">{g.title}</p>
                <p className="text-xs text-ink-soft">
                  {[g.target, g.deadline ? `by ${g.deadline}` : null, g.house ? `House ${g.house}: ${HOUSE_FOCUS[g.house].area}` : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex gap-3">
                <GoalStatus id={g.id} to="done" label="Done" />
                <GoalStatus id={g.id} to="dropped" label="Drop" />
              </div>
            </li>
          ))}
        </ul>
        <form action={addGoalAction} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_150px_190px_auto] sm:items-end">
          <Field label="Goal" name="title" required placeholder="e.g. Reach ₹10L monthly revenue" />
          <Field label="Measure (optional)" name="target" placeholder="How you will know" />
          <Field label="Deadline" name="deadline" type="date" />
          <div>
            <label className="label" htmlFor="goal-house">Area (optional)</label>
            <select id="goal-house" name="house" defaultValue="" className="field">
              <option value="">—</option>
              {[2, 3, 5, 7, 9, 10, 11].map((h) => (
                <option key={h} value={h}>{h} · {HOUSE_FOCUS[h].area.split(",")[0]}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary">Add</button>
        </form>
        {closed.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-ink-soft">Done or dropped ({closed.length})</summary>
            <ul className="mt-2 space-y-1">
              {closed.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2">
                  <span className={g.status === "done" ? "" : "text-muted line-through"}>{g.title} <span className="text-xs text-muted">· {g.status}</span></span>
                  <GoalStatus id={g.id} to="open" label="Reopen" />
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------ Retrospective

function Retrospective({ retros }: { retros: Retro[] }) {
  const avg = retros.length ? retros.reduce((s, r) => s + r.match_rating, 0) / retros.length : null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-2xl font-semibold">Retrospective log</h2>
        <p className="text-sm text-muted">After a period ends, record what was indicated and what actually happened. Log the misses as well as the hits — that is the whole point.</p>
      </div>
      <div className="card p-5">
        {avg !== null && (
          <p className="mb-4 text-sm">
            Across <b>{retros.length}</b> entr{retros.length === 1 ? "y" : "ies"}, the indications matched reality <b className="tabular">{avg.toFixed(1)} / 5</b> on your own rating.
            {retros.length < 8 && <span className="text-muted"> Too few entries to conclude anything yet.</span>}
          </p>
        )}
        <form action={addRetroAction} className="grid gap-3 sm:grid-cols-2">
          <Field label="Period" name="period_label" required placeholder="e.g. Saturn/Jupiter, Jan 2026 – Aug 2028" />
          <div>
            <label className="label" htmlFor="retro-rating">How well did it match? (1 = not at all, 5 = closely)</label>
            <select id="retro-rating" name="match_rating" defaultValue="3" className="field">
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="retro-ind">What was indicated</label>
            <textarea id="retro-ind" name="indication" required rows={2} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="retro-out">What actually happened</label>
            <textarea id="retro-out" name="outcome" required rows={2} className="field" />
          </div>
          <div className="sm:col-span-2">
            <button className="btn btn-primary">Add entry</button>
          </div>
        </form>
        {retros.length > 0 && (
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {retros.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{r.period_label}</p>
                  <span className="flex items-center gap-3">
                    <span className="chip bg-surface-2 text-ink-soft tabular">match {r.match_rating}/5</span>
                    <DeleteRetro id={r.id} />
                  </span>
                </div>
                <p className="mt-1 text-ink-soft"><b className="text-ink">Indicated:</b> {r.indication}</p>
                <p className="text-ink-soft"><b className="text-ink">Happened:</b> {r.outcome}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
