import { Suspense } from "react";
import Link from "next/link";
import { computeChart, type ChartResult } from "@/engine/chart";
import type { Planet } from "@/engine/constants";
import { CANNOT_CONCLUDE, HOUSE_FOCUS } from "@/rules/actions";
import { evaluateForBirth } from "@/rules/evaluate";
import { STRENGTH_RUBRIC } from "@/rules/strength";
import type { Instance, YogaCategory, YogaResult, YogaStatus } from "@/rules/types";
import { describeTime, RELATIONSHIPS, toBirthInput, type Person } from "@/lib/people";
import { getStore } from "@/lib/store";

const STATUS: Record<YogaStatus, { label: string; cls: string }> = {
  detected: { label: "Present", cls: "bg-ok-soft text-ok" },
  partial: { label: "Partly formed", cls: "bg-warn-soft text-warn" },
  cancelled: { label: "Cancelled", cls: "bg-surface-2 text-ink-soft" },
  indeterminate: { label: "Can't tell yet", cls: "bg-gold-soft text-gold" },
  not_detected: { label: "Not present", cls: "bg-surface-2 text-muted" },
};

const SECTIONS: { key: YogaCategory; title: string; blurb: string }[] = [
  { key: "raja", title: "Raja Yogas", blurb: "Combinations traditionally linked with status, authority and rise in life." },
  { key: "dhana", title: "Dhana Yogas", blurb: "Combinations traditionally linked with earning and holding wealth." },
  { key: "mahapurusha", title: "Pancha Mahapurusha", blurb: "One of five planets strong in a kendra." },
  { key: "chandra", title: "Moon-based yogas", blurb: "Judged from the Moon, so most work even without a birth time." },
  { key: "other", title: "Other yogas", blurb: "Smaller or very common combinations." },
  { key: "caution", title: "Counter-indications", blurb: "Shown for balance. These are traditional cautions, not predictions." },
];

const ORDER: YogaStatus[] = ["detected", "partial", "indeterminate", "cancelled", "not_detected"];
const BAND = { strong: "bg-ok-soft text-ok", moderate: "bg-warn-soft text-warn", weak: "bg-surface-2 text-ink-soft" } as const;

const fmt = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: tz }).format(new Date(iso));

export default function YogaPage(props: PageProps<"/yoga">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Parashari rule engine</p>
        <h1 className="font-display text-4xl font-semibold">Raj Yoga &amp; Dhana Yoga</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Each yoga is checked by fixed rules against the calculated chart. You see the exact conditions, which were met, how strong the planets are, and when their periods run.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Checking rules…</p>}>
        <YogaContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function YogaContent({ searchParams }: { searchParams: PageProps<"/yoga">["searchParams"] }) {
  const sp = await searchParams;
  const store = await getStore();
  const people = await store.listPeople();
  if (people.length === 0) {
    return (
      <div className="card grid place-items-center gap-3 p-10 text-center">
        <p className="font-display text-2xl">Add birth details first</p>
        <Link href="/people/new" className="btn btn-gold">Add birth details</Link>
      </div>
    );
  }
  const person = people.find((p) => p.id === sp.p) ?? people.find((p) => p.relationship === "self") ?? people[0];
  const input = toBirthInput(person);

  return (
    <div className="space-y-6">
      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="yoga-person">Person</label>
          <select id="yoga-person" name="p" defaultValue={person.id} className="field">
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name} — {RELATIONSHIPS[p.relationship]}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary">Show</button>
      </form>

      {input ? (
        <Report person={person} now={new Date()} />
      ) : (
        <div className="card p-5 text-sm">
          <p className="font-semibold">Birth details incomplete for {person.display_name}</p>
          <p className="mt-1 text-ink-soft">
            A date and place are needed.{" "}
            <Link href={`/people/${person.id}/edit`} className="font-semibold text-gold underline-offset-4 hover:underline">Complete details</Link>
          </p>
        </div>
      )}
    </div>
  );
}

function Report({ person, now }: { person: Person; now: Date }) {
  const input = toBirthInput(person)!;
  const chart = computeChart(input, now);
  const report = evaluateForBirth(input);
  const count = (cat: YogaCategory | null, st: YogaStatus) => report.results.filter((r) => (cat ? r.category === cat : true) && r.status === st).length;

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="bg-navy p-5 text-[#f6eedb]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d9ac52]">{person.display_name}</p>
          <p className="mt-1 text-sm text-[#d8d2c2]">
            {person.birth_date} · {describeTime(person)} · {report.results.length} rules checked
            {report.samples > 1 && ` at ${report.samples} points in time`}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
            <Tile n={count("raja", "detected")} label="Raja present" />
            <Tile n={count("dhana", "detected")} label="Dhana present" />
            <Tile n={count("mahapurusha", "detected")} label="Mahapurusha" />
            <Tile n={count(null, "partial")} label="Partly formed" />
            <Tile n={count(null, "indeterminate")} label="Can't tell yet" />
          </div>
        </div>
        {person.time_kind !== "exact" && (
          <p className="border-b border-line bg-warn-soft px-5 py-3 text-sm text-warn">
            {person.time_kind === "unknown"
              ? "Birth time unknown: every rule that needs the Lagna shows “Can't tell yet”. Moon-based rules are still checked."
              : "Birth time is a range: rules whose answer changes inside the window show “Can't tell yet”, with the times."}
          </p>
        )}
        <div className="px-5 py-3 text-xs text-ink-soft">
          <b>How to read this.</b> A yoga being present is a traditional indication, not a guarantee of results. All {report.results.length} rules are
          <b> drafts awaiting source verification</b> — check each against your own edition of the text before relying on it. Very common yogas and
          product groupings are labelled.
        </div>
      </section>

      {SECTIONS.map((sec) => {
        const items = report.results.filter((r) => r.category === sec.key).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
        if (!items.length) return null;
        const shown = items.filter((r) => r.status !== "not_detected");
        const absent = items.filter((r) => r.status === "not_detected");
        return (
          <section key={sec.key} className="space-y-3">
            <div>
              <h2 className="font-display text-2xl font-semibold">{sec.title}</h2>
              <p className="text-sm text-muted">{sec.blurb}</p>
            </div>
            {shown.map((r) => (
              <YogaCard key={r.ruleId} r={r} chart={chart} now={now} />
            ))}
            {shown.length === 0 && <p className="text-sm text-ink-soft">None present under these rules.</p>}
            {absent.length > 0 && (
              <details className="card">
                <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-ink-soft">Not present ({absent.length}) — see why</summary>
                <div className="space-y-3 border-t border-line p-3">
                  {absent.map((r) => (
                    <YogaCard key={r.ruleId} r={r} chart={chart} now={now} compact />
                  ))}
                </div>
              </details>
            )}
          </section>
        );
      })}

      <footer className="rounded-xl border border-dashed border-line p-4 text-xs text-muted">
        Ruleset {report.ruleset} · strength heuristic {STRENGTH_RUBRIC} · sidereal Lahiri, whole-sign houses, mean node · relations counted: conjunction (same sign),
        mutual aspect, exchange of signs · Rahu/Ketu cast no aspects in this ruleset.
      </footer>
    </div>
  );
}

function Tile({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <p className="tabular text-2xl font-semibold">{n}</p>
      <p className="text-xs text-[#c9c2b0]">{label}</p>
    </div>
  );
}

function YogaCard({ r, chart, now, compact }: { r: YogaResult; chart: ChartResult; now: Date; compact?: boolean }) {
  const st = STATUS[r.status];
  const supportable = (r.status === "detected" || r.status === "partial") && r.category !== "caution";
  return (
    <article className={compact ? "rounded-xl border border-line p-4" : "card p-5"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className={`font-display font-semibold ${compact ? "text-lg" : "text-xl"}`}>{r.name}</h3>
          <p className="text-xs text-muted">
            {r.ruleId} · {r.themes}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {r.common && <span className="chip bg-surface-2 text-ink-soft">Very common</span>}
          {r.productIndicator && <span className="chip bg-surface-2 text-ink-soft">Product indicator</span>}
          <span className={`chip ${st.cls}`}>{st.label}</span>
        </div>
      </div>

      {r.conditions.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {r.conditions.map((c) => (
            <li key={c.text} className="flex gap-2">
              <span className={c.met ? "text-ok" : "text-bad"} aria-hidden>{c.met ? "✓" : "✗"}</span>
              <span>
                <span className="sr-only">{c.met ? "Met: " : "Not met: "}</span>
                {c.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      {r.notes.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-soft">
          {r.notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      )}

      {r.instances.map((inst) => (
        <InstanceBlock key={inst.title} inst={inst} />
      ))}

      {supportable && <SupportPanel r={r} chart={chart} now={now} />}

      <details className="mt-3 text-xs text-muted">
        <summary className="cursor-pointer">Rule and source</summary>
        <p className="mt-1">{r.definition}</p>
        <p className="mt-1">Source to verify: {r.source}</p>
      </details>
    </article>
  );
}

function InstanceBlock({ inst }: { inst: Instance }) {
  return (
    <div className="mt-3 rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{inst.title}</p>
        {inst.strength && (
          <span className={`chip ${BAND[inst.strength.band]}`}>
            {inst.strength.band} · {inst.strength.score > 0 ? "+" : ""}
            {inst.strength.score}
          </span>
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {inst.facts.map((f) => (
          <li key={f} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-ink-soft">{f}</li>
        ))}
      </ul>
      {inst.strength && inst.strength.components.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-muted">Strength breakdown (product heuristic, not a classical measure)</summary>
          <table className="data mt-1">
            <tbody>
              {inst.strength.components.map((c) => (
                <tr key={c.label}>
                  <td className="whitespace-normal">{c.label}</td>
                  <td className={`tabular text-right font-semibold ${c.score > 0 ? "text-ok" : "text-bad"}`}>
                    {c.score > 0 ? "+" : ""}
                    {c.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

function SupportPanel({ r, chart, now }: { r: YogaResult; chart: ChartResult; now: Date }) {
  const tz = chart.input.ianaTz;
  const planets = [...new Set(r.instances.flatMap((i) => i.planets))] as Planet[];
  const houses = [...new Set(r.instances.flatMap((i) => i.houses))].sort((a, b) => a - b);
  const nowIso = now.toISOString();
  const horizon = new Date(now.getTime() + 15 * 365.25 * 86_400_000).toISOString();

  const mds = chart.dasha.mahadashas.filter((m) => planets.includes(m.lord) && m.end > nowIso && m.start < horizon);
  const ads = chart.dasha.mahadashas
    .flatMap((m) => (m.children ?? []).map((a) => ({ md: m.lord, ...a })))
    .filter((a) => planets.includes(a.lord) && a.end > nowIso && a.start < horizon)
    .slice(0, 6);

  return (
    <details className="mt-3 rounded-xl border border-gold/40 bg-gold-soft/40">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold">
        {r.status === "partial" ? "What is missing, and how to support it" : "When it is emphasised, and how to support it"}
      </summary>
      <div className="space-y-4 border-t border-gold/30 p-4 text-sm">
        {r.status === "partial" && (
          <div>
            <p className="font-semibold">What is missing</p>
            <ul className="mt-1 list-disc pl-5 text-ink-soft">
              {r.conditions.filter((c) => !c.met).map((c) => (
                <li key={c.text}>{c.text}</li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted">Planet positions at birth do not change. A partly formed yoga is read as a weaker indication, not something to complete.</p>
          </div>
        )}

        {planets.length > 0 && (
          <div>
            <p className="font-semibold">1 · Timing — periods of {planets.join(", ")}</p>
            {chart.availability.dasha !== "exact" && <p className="text-xs text-warn">Birth time is uncertain, so these dates are {chart.availability.dasha}.</p>}
            {mds.length + ads.length === 0 ? (
              <p className="text-ink-soft">No Mahadasha or Antardasha of these planets in the next 15 years.</p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-ink-soft">
                {mds.map((m) => (
                  <li key={m.start} className="tabular">
                    <b className="text-ink">{m.lord} Mahadasha</b> {fmt(m.start, tz)} → {fmt(m.end, tz)}
                    {m.start <= nowIso && <span className="chip ml-2 bg-gold text-[#1a1408]">Now</span>}
                  </li>
                ))}
                {ads.map((a) => (
                  <li key={a.start} className="tabular">
                    {a.md} / <b className="text-ink">{a.lord}</b> Antardasha {fmt(a.start, tz)} → {fmt(a.end, tz)}
                    {a.start <= nowIso && <span className="chip ml-2 bg-gold text-[#1a1408]">Now</span>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-muted">Traditionally a yoga is felt most in the periods of the planets forming it.</p>
          </div>
        )}

        {houses.length > 0 && (
          <div>
            <p className="font-semibold">2 · Practical actions — sensible regardless of astrology</p>
            <ul className="mt-1 space-y-1.5">
              {houses.map((h) => (
                <li key={h}>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">House {h} · {HOUSE_FOCUS[h].area}</span>
                  <ul className="list-disc pl-5 text-ink-soft">
                    {HOUSE_FOCUS[h].actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="font-semibold">3 · Traditional remedies</p>
          <p className="text-ink-soft">
            The sourced remedy catalogue (mantra, daan, puja, gemstone reasoning) is the next module. Nothing is suggested here until each remedy has a source, cost and safety notes.
          </p>
        </div>

        <div>
          <p className="font-semibold">What this cannot tell you</p>
          <ul className="mt-1 list-disc pl-5 text-ink-soft">
            {CANNOT_CONCLUDE.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
