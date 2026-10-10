import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { computeChart } from "@/engine/chart";
import { SIGNS } from "@/engine/constants";
import { partnerReport, type Factor, type Verdict } from "@/compat/partner";
import { describeTime, RELATIONSHIPS, toBirthInput, type Person } from "@/lib/people";
import { getStore } from "@/lib/store";

const VERDICT: Record<Verdict, { label: string; cls: string; bar: string }> = {
  favourable: { label: "Supportive", cls: "bg-ok-soft text-ok", bar: "bg-ok" },
  mixed: { label: "Mixed", cls: "bg-warn-soft text-warn", bar: "bg-warn" },
  challenging: { label: "Friction", cls: "bg-bad-soft text-bad", bar: "bg-bad" },
  indeterminate: { label: "Needs data", cls: "bg-surface-2 text-muted", bar: "bg-line" },
};

const BASIS: Record<Factor["basis"], string> = {
  classical: "Classical",
  "classical-by-analogy": "Classical concept, applied by analogy",
  "product-heuristic": "Product heuristic",
  numerology: "Numerology",
};

export default function PartnerPage(props: PageProps<"/partner">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Business compatibility</p>
        <h1 className="font-display text-4xl font-semibold">Partner Vibes</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Compare your chart with a business partner&apos;s. Each factor is shown separately with what it&apos;s based on, so you can see exactly where the support and friction come from.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <PartnerContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function PartnerContent({ searchParams }: { searchParams: PageProps<"/partner">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const store = await getStore();
  const people = await store.listPeople();
  const self = people.find((p) => p.relationship === "self");
  const aId = typeof sp.a === "string" ? sp.a : self?.id;
  const bId = typeof sp.b === "string" ? sp.b : people.find((p) => p.relationship === "business_partner" && p.id !== aId)?.id;
  const a = people.find((p) => p.id === aId) ?? null;
  const b = people.find((p) => p.id === bId) ?? null;

  if (people.length < 2) {
    return (
      <div className="card grid place-items-center gap-3 p-10 text-center">
        <p className="font-display text-2xl">Add two people first</p>
        <p className="max-w-md text-sm text-ink-soft">Add yourself and your business partner. Exact birth times give the most complete comparison, but a date and place are enough to start.</p>
        <div className="flex gap-2">
          {!self && <Link href="/people/new?rel=self" className="btn btn-gold">Add yourself</Link>}
          <Link href="/people/new?rel=business_partner" className="btn btn-ghost">Add a business partner</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form className="card grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end" method="get">
        <PersonSelect name="a" label="You" people={people} value={a?.id} />
        <PersonSelect name="b" label="Partner" people={people} value={b?.id} />
        <button className="btn btn-primary">Compare</button>
        <p className="text-xs text-muted sm:col-span-3">
          Partner not listed? <Link href="/people/new?rel=business_partner" className="font-semibold text-gold underline-offset-4 hover:underline">Add their birth details</Link>.
        </p>
      </form>

      {a && b && a.id !== b.id ? <Report a={a} b={b} /> : <p className="text-sm text-muted">Choose two different people.</p>}
    </div>
  );
}

function PersonSelect({ name, label, people, value }: { name: string; label: string; people: Person[]; value?: string }) {
  return (
    <div>
      <label className="label" htmlFor={`sel-${name}`}>{label}</label>
      <select id={`sel-${name}`} name={name} defaultValue={value} className="field">
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.display_name} — {RELATIONSHIPS[p.relationship]}
          </option>
        ))}
      </select>
    </div>
  );
}

function Report({ a, b }: { a: Person; b: Person }) {
  const ia = toBirthInput(a);
  const ib = toBirthInput(b);
  const missing = [!ia && a, !ib && b].filter(Boolean) as Person[];
  if (missing.length) {
    return (
      <div className="card p-5">
        <p className="font-semibold">Birth details incomplete</p>
        <ul className="mt-2 space-y-1 text-sm">
          {missing.map((p) => (
            <li key={p.id}>
              {p.display_name}: needs date and place —{" "}
              <Link href={`/people/${p.id}/edit`} className="font-semibold text-gold underline-offset-4 hover:underline">complete details</Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const now = new Date();
  const ca = computeChart(ia!, now);
  const cb = computeChart(ib!, now);
  const report = partnerReport(
    { name: a.display_name, birthDate: a.birth_date!, chart: ca },
    { name: b.display_name, birthDate: b.birth_date!, chart: cb },
    now,
  );
  const total = report.factors.length;

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="grid gap-6 bg-navy p-6 text-[#f6eedb] sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d9ac52]">Overall reading</p>
            <p className="mt-1 font-display text-3xl font-semibold">{report.overall.label}</p>
            <p className="mt-1 max-w-xl text-sm text-[#d8d2c2]">{report.overall.note}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {(["favourable", "mixed", "challenging", "indeterminate"] as Verdict[]).map((v) => (
              <div key={v} className="rounded-lg bg-white/5 px-3 py-2">
                <p className="tabular text-2xl font-semibold">{report.tally[v]}</p>
                <p className="text-[#c9c2b0]">{VERDICT[v].label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex h-2" aria-hidden>
          {(["favourable", "mixed", "challenging", "indeterminate"] as Verdict[]).map((v) => (
            <div key={v} className={VERDICT[v].bar} style={{ width: `${(report.tally[v] / total) * 100}%` }} />
          ))}
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {[{ p: a, c: ca }, { p: b, c: cb }].map(({ p, c }) => {
            const moon = c.chart.planets.find((x) => x.planet === "Moon")!;
            return (
              <div key={p.id} className="rounded-xl bg-surface-2 p-4 text-sm">
                <p className="font-semibold">{p.display_name}</p>
                <p className="text-ink-soft">
                  {p.birth_date} · {describeTime(p)}
                </p>
                <p className="mt-1">
                  Lagna {c.chart.ascendant ? SIGNS[c.chart.ascendant.sign] : "—"} · Moon {SIGNS[moon.sign]} ({moon.nakshatra}) · Dasha {c.current.md}/{c.current.ad}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <ol className="space-y-3">
        {report.factors.map((f) => (
          <li key={f.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-xl font-semibold">{f.title}</p>
                <p className="text-xs text-muted">{BASIS[f.basis]}</p>
              </div>
              <span className={`chip ${VERDICT[f.verdict].cls}`}>{VERDICT[f.verdict].label}</span>
            </div>
            <p className="mt-2 text-sm">{f.summary}</p>
            {f.evidence.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {f.evidence.map((e) => (
                  <li key={e} className="rounded-md border border-line px-2 py-0.5 text-xs text-ink-soft">{e}</li>
                ))}
              </ul>
            )}
            <details className="mt-2 text-xs text-muted">
              <summary className="cursor-pointer">How this is judged</summary>
              <p className="mt-1">{f.basisNote}</p>
            </details>
          </li>
        ))}
      </ol>

      <section className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">
        <p className="mb-1 font-semibold text-ink">Read this with care</p>
        <ul className="list-disc space-y-1 pl-5">
          {report.caveats.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Ruleset {report.ruleset}. Range births use the range start; check each person&apos;s sensitivity panel.</p>
      </section>
    </div>
  );
}
