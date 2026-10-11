import { Suspense } from "react";
import Link from "next/link";
import { addDaanAction, setDaanCapAction, startPracticeAction } from "@/app/remedy-actions";
import { DeleteDaan, DoneToday, JapaCounter, PracticeStatusButton } from "@/components/RemedyWidgets";
import { computeChart } from "@/engine/chart";
import { PLANETS } from "@/engine/constants";
import { RELATIONSHIPS, toBirthInput, type Person } from "@/lib/people";
import { getRemedyStore, SetupNeeded, type Daan, type Practice } from "@/lib/remedy-store";
import { getStore } from "@/lib/store";
import { ATTRIBUTION, GENERAL_SAFETY, PLANET_REMEDY, REMEDY_CATALOGUE, SAFETY_TEXT, starterRemedies } from "@/remedies/catalogue";
import { assessPlanets, GEMSTONE_RULES, GEMSTONE_WARNINGS, type PlanetAssessment, type StoneRole } from "@/remedies/gemstones";
import { makeCtx } from "@/rules/context";

const ROLE: Record<StoneRole, { label: string; cls: string }> = {
  considered: { label: "Benefic for this Lagna", cls: "bg-ok-soft text-ok" },
  mixed: { label: "Mixed lordship", cls: "bg-warn-soft text-warn" },
  neutral: { label: "Neutral", cls: "bg-surface-2 text-ink-soft" },
  avoided: { label: "Dusthana lord", cls: "bg-bad-soft text-bad" },
  not_assessed: { label: "Not assessed", cls: "bg-surface-2 text-muted" },
};
const STONE: Record<StoneRole, string> = {
  considered: "Commonly considered",
  mixed: "Practitioner judgement",
  neutral: "Schools differ",
  avoided: "Usually avoided",
  not_assessed: "Not assessed",
};
const ROLE_ORDER: StoneRole[] = ["considered", "mixed", "neutral", "avoided", "not_assessed"];

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function RemediesPage(props: PageProps<"/remedies">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Traditional practices</p>
        <h1 className="font-display text-4xl font-semibold">Remedies &amp; Rituals</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          What tradition associates with each planet in the chart, ordered free-first, plus your own japa counter and daan log. A record of practice, not a prescription.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/remedies">["searchParams"] }) {
  const sp = await searchParams;
  const store = await getStore();
  const people = await store.listPeople();
  const person = people.find((p) => p.id === sp.p) ?? people.find((p) => p.relationship === "self") ?? people[0] ?? null;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  let tracking: { practices: Practice[]; daan: Daan[]; cap: number | null } | null = null;
  try {
    const rs = await getRemedyStore();
    const [practices, daan, cap] = await Promise.all([rs.listPractices(), rs.listDaan(monthStart), rs.getDaanCap()]);
    tracking = { practices, daan, cap };
  } catch (e) {
    if (!(e instanceof SetupNeeded)) throw e;
  }

  return (
    <div className="space-y-8">
      {people.length > 0 && (
        <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-56 flex-1">
            <label className="label" htmlFor="rem-person">Chart</label>
            <select id="rem-person" name="p" defaultValue={person?.id} className="field">
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

      {!tracking && (
        <div className="card border-warn/40 bg-warn-soft p-5 text-sm text-warn">
          <p className="font-semibold">One-time setup needed for tracking</p>
          <p className="mt-1">
            The japa counter and daan log need four new tables. In Supabase → SQL Editor, run the file <code>supabase/migrations/20261011000000_remedies.sql</code> from the repository, then reload this page.
            The planet associations below work without it.
          </p>
        </div>
      )}

      {tracking && <PracticesSection practices={tracking.practices} people={people} today={today} />}
      {tracking && <DaanSection daan={tracking.daan} cap={tracking.cap} today={today} />}

      {person ? <PlanetSection person={person} now={now} canTrack={!!tracking} /> : <p className="text-sm text-muted">Add birth details to see what applies to a chart.</p>}

      <footer className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">
        <p className="mb-1 font-semibold text-ink">Please read</p>
        <ul className="list-disc space-y-1 pl-5">
          {GENERAL_SAFETY.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Catalogue {REMEDY_CATALOGUE} · {GEMSTONE_RULES} · every entry is marked “{ATTRIBUTION}” until you check it against a source you trust.
        </p>
      </footer>
    </div>
  );
}

// ------------------------------------------------------------ My practices

function PracticesSection({ practices, people, today }: { practices: Practice[]; people: Person[]; today: string }) {
  const active = practices.filter((p) => p.status === "active");
  const other = practices.filter((p) => p.status !== "active");
  const who = (id: string | null) => people.find((p) => p.id === id)?.display_name;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-semibold">My practices</h2>
      {active.length === 0 && <p className="card p-5 text-sm text-ink-soft">Nothing started yet. Pick a practice from a planet below and press “Start tracking”.</p>}
      {active.map((p) => {
        const pct = p.target_count ? Math.min(100, Math.round((p.total_count / p.target_count) * 100)) : null;
        return (
          <article key={p.id} className="card space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-xs text-muted">
                  {[p.planet, who(p.person_id), `since ${p.started_on}`, p.last_logged ? `last ${p.last_logged}` : "not logged yet"].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex gap-3">
                <PracticeStatusButton practiceId={p.id} to="done" label="Mark complete" />
                <PracticeStatusButton practiceId={p.id} to="dropped" label="Stop" />
              </div>
            </div>
            {p.kind === "mantra" ? (
              <>
                <div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="tabular font-semibold">{p.total_count.toLocaleString("en-IN")}{p.target_count ? ` / ${p.target_count.toLocaleString("en-IN")}` : ""} repetitions</span>
                    <span className="text-xs text-muted">{p.sessions} session{p.sessions === 1 ? "" : "s"}{pct !== null ? ` · ${pct}%` : ""}</span>
                  </div>
                  {pct !== null && (
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <JapaCounter practiceId={p.id} />
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <DoneToday practiceId={p.id} doneToday={p.last_logged === today} />
                <span className="text-sm text-ink-soft">Done on {p.sessions} day{p.sessions === 1 ? "" : "s"}</span>
              </div>
            )}
            {p.notes && <p className="text-xs text-muted">{p.notes}</p>}
          </article>
        );
      })}
      {other.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-ink-soft">Completed or stopped ({other.length})</summary>
          <ul className="divide-y divide-line border-t border-line text-sm">
            {other.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
                <span>
                  {p.title} <span className="text-xs text-muted">· {p.status} · {p.kind === "mantra" ? `${p.total_count.toLocaleString("en-IN")} repetitions` : `${p.sessions} days`}</span>
                </span>
                <PracticeStatusButton practiceId={p.id} to="active" label="Resume" />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

// ------------------------------------------------------------ Daan

function DaanSection({ daan, cap, today }: { daan: Daan[]; cap: number | null; today: string }) {
  const total = daan.reduce((s, d) => s + d.amount_inr, 0);
  const pct = cap ? Math.min(100, Math.round((total / cap) * 100)) : null;
  const over = cap !== null && total > cap;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-semibold">Daan log — this month</h2>
      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="tabular font-display text-3xl font-semibold">{inr(total)}</p>
            <p className={`text-sm ${over ? "font-semibold text-bad" : "text-ink-soft"}`}>
              {cap === null ? "No monthly cap set" : over ? `Over your cap of ${inr(cap)} by ${inr(total - cap)}` : `of your ${inr(cap)} monthly cap`}
            </p>
          </div>
          <form action={setDaanCapAction} className="flex items-end gap-2">
            <div>
              <label className="label" htmlFor="daan-cap">Monthly cap (₹)</label>
              <input id="daan-cap" name="cap" type="number" min="0" step="100" defaultValue={cap ?? ""} className="field tabular w-36" placeholder="e.g. 2000" />
            </div>
            <button className="btn btn-ghost">Save cap</button>
          </form>
        </div>
        {pct !== null && (
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className={`h-full rounded-full ${over ? "bg-bad" : "bg-gold"}`} style={{ width: `${pct}%` }} />
          </div>
        )}

        <form action={addDaanAction} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[150px_1fr_1fr_130px_130px_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="daan-date">Date</label>
            <input id="daan-date" name="log_date" type="date" defaultValue={today} required className="field tabular" />
          </div>
          <div>
            <label className="label" htmlFor="daan-item">What was given</label>
            <input id="daan-item" name="item" required className="field" placeholder="e.g. Chana dal 2 kg" />
          </div>
          <div>
            <label className="label" htmlFor="daan-to">To whom (optional)</label>
            <input id="daan-to" name="recipient" className="field" placeholder="Temple, person, charity" />
          </div>
          <div>
            <label className="label" htmlFor="daan-amt">Value (₹)</label>
            <input id="daan-amt" name="amount_inr" type="number" min="0" step="1" defaultValue="0" className="field tabular" />
          </div>
          <div>
            <label className="label" htmlFor="daan-planet">Planet</label>
            <select id="daan-planet" name="planet" className="field" defaultValue="">
              <option value="">—</option>
              {PLANETS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary">Add</button>
        </form>

        {daan.length > 0 && (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr><th>Date</th><th>Given</th><th>To</th><th>Planet</th><th className="text-right">Value</th><th /></tr>
              </thead>
              <tbody>
                {daan.map((d) => (
                  <tr key={d.id}>
                    <td className="tabular">{d.log_date}</td>
                    <td className="whitespace-normal">{d.item}</td>
                    <td className="whitespace-normal text-ink-soft">{d.recipient ?? "—"}</td>
                    <td className="text-ink-soft">{d.planet ?? "—"}</td>
                    <td className="tabular text-right">{inr(d.amount_inr)}</td>
                    <td className="text-right"><DeleteDaan id={d.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------ Planets in the chart

function PlanetSection({ person, now, canTrack }: { person: Person; now: Date; canTrack: boolean }) {
  const input = toBirthInput(person);
  if (!input) {
    return (
      <p className="card p-5 text-sm">
        Birth details for {person.display_name} are incomplete.{" "}
        <Link href={`/people/${person.id}/edit`} className="font-semibold text-gold underline-offset-4 hover:underline">Complete details</Link>
      </p>
    );
  }
  const chart = computeChart(input, now);
  const lagnaChanges = chart.sensitivity?.some((r) => r.item === "Ascendant (Lagna) sign" && !r.stable) ?? false;
  const ctx = makeCtx(lagnaChanges ? { ...chart.chart, ascendant: null, houses: null } : chart.chart);
  const rows = assessPlanets(ctx).sort((a, b) => Number(b.weakBenefic) - Number(a.weakBenefic) || ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-2xl font-semibold">Planets in {person.display_name}&apos;s chart</h2>
        <p className="text-sm text-muted">
          Ordered by how the lordship method reads each planet for this Lagna. Free practices come first; the gemstone is always last, with its reasoning.
        </p>
      </div>
      {!ctx.hasAsc && (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          {lagnaChanges ? "The Lagna changes inside the birth-time range" : "Birth time unknown"}, so planets cannot be judged by house lordship. The general associations are still listed.
        </p>
      )}
      {rows.map((a) => (
        <PlanetCard key={a.planet} a={a} describe={ctx.describe(a.planet)} personId={person.id} canTrack={canTrack} />
      ))}
      <div className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">
        <p className="mb-1 font-semibold text-ink">About gemstones</p>
        <ul className="list-disc space-y-1 pl-5">
          {GEMSTONE_WARNINGS.map((w) => (
            <li key={w}>{w}</li>
          ))}
          <li>{SAFETY_TEXT.metal_on_skin}</li>
        </ul>
      </div>
    </section>
  );
}

function PlanetCard({ a, describe, personId, canTrack }: { a: PlanetAssessment; describe: string; personId: string; canTrack: boolean }) {
  const info = PLANET_REMEDY[a.planet];
  return (
    <details className="card" open={a.weakBenefic}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-4">
        <div>
          <p className="font-display text-xl font-semibold">{a.planet}</p>
          <p className="text-xs text-muted">{describe}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {a.weakBenefic && <span className="chip bg-gold text-[#1a1408]">Traditionally first to support</span>}
          <span className={`chip ${ROLE[a.role].cls}`}>{ROLE[a.role].label}</span>
        </div>
      </summary>
      <div className="space-y-4 border-t border-line p-5 text-sm">
        <ul className="list-disc space-y-0.5 pl-5 text-ink-soft">
          {a.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        <ol className="space-y-3">
          {starterRemedies(a.planet).map((r, i) => (
            <li key={r.key} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {i + 1}. {r.title} <span className="chip ml-1 bg-surface-2 text-ink-soft">{r.cost === "free" ? "Free" : "Low cost"}</span>
                  </p>
                  <p className="text-ink-soft">{r.detail}</p>
                  {r.safety.map((s) => (
                    <p key={s} className="text-xs text-muted">{SAFETY_TEXT[s]}</p>
                  ))}
                </div>
                {canTrack && r.kind !== "daan" && (
                  <form action={startPracticeAction} className="flex items-end gap-2">
                    <input type="hidden" name="person_id" value={personId} />
                    <input type="hidden" name="remedy_key" value={r.key} />
                    <input type="hidden" name="planet" value={a.planet} />
                    <input type="hidden" name="kind" value={r.kind} />
                    <input type="hidden" name="title" value={r.kind === "mantra" ? info.mantra : `${a.planet}: ${r.detail}`} />
                    {r.kind === "mantra" && (
                      <div>
                        <label className="label" htmlFor={`t-${r.key}`}>Target count</label>
                        <input id={`t-${r.key}`} name="target_count" type="number" min="1" step="1" defaultValue={10800} className="field tabular w-28" />
                      </div>
                    )}
                    <button className="btn btn-ghost">Start tracking</button>
                  </form>
                )}
              </div>
            </li>
          ))}
          <li className="rounded-xl border border-line p-3">
            <p className="font-semibold">
              {starterRemedies(a.planet).length + 1}. Gemstone: {a.stone}{" "}
              <span className={`chip ml-1 ${ROLE[a.role].cls}`}>{STONE[a.role]}</span> <span className="chip bg-surface-2 text-ink-soft">High cost</span>
            </p>
            <p className="text-ink-soft">
              {a.role === "avoided"
                ? "By this method the stone is not recommended; the practices above are the traditional route."
                : a.role === "considered"
                  ? "By this method the stone is one a practitioner would commonly consider. It is never required."
                  : "No clear answer from lordship alone."}
              {a.substitute ? ` Commonly sold substitute: ${a.substitute}.` : ""}
            </p>
            {a.cautions.map((c) => (
              <p key={c} className="text-xs text-warn">{c}</p>
            ))}
          </li>
        </ol>
        <p className="text-xs text-muted">{ATTRIBUTION}</p>
      </div>
    </details>
  );
}
