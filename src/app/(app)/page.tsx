import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { SIGNS } from "@/engine/constants";
import { describeTime, RELATIONSHIPS, toBirthInput } from "@/lib/people";
import { getStore } from "@/lib/store";

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Overview</p>
          <h1 className="font-display text-4xl font-semibold">Your charts</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            Add each person&apos;s birth details, check what can be calculated, then calculate. Uncertain times are kept as ranges, never guessed.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/partner" className="btn btn-ghost">Partner Vibes</Link>
          <Link href="/people/new" className="btn btn-gold">+ Add birth details</Link>
        </div>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <PeopleGrid />
      </Suspense>
    </div>
  );
}

async function PeopleGrid() {
  await connection();
  const store = await getStore();
  const people = await store.listPeople();

  if (people.length === 0) {
    return (
      <div className="card grid place-items-center gap-3 p-10 text-center">
        <p className="font-display text-2xl">No one added yet</p>
        <p className="max-w-md text-sm text-ink-soft">Start with yourself. You can add your wife, daughter and business partners next — each with exact, range, or unknown birth time.</p>
        <Link href="/people/new" className="btn btn-gold mt-2">Add your birth details</Link>
      </div>
    );
  }

  const charts = await Promise.all(people.map((p) => store.latestChart(p.id)));

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {people.map((p, i) => {
        const c = charts[i]?.payload;
        const ready = !!toBirthInput(p);
        const moon = c?.chart.planets.find((x) => x.planet === "Moon");
        const stale = charts[i] && p.updated_at > charts[i]!.created_at;
        return (
          <li key={p.id}>
            <Link href={`/people/${p.id}`} className="card block h-full p-5 transition hover:border-gold">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-2xl font-semibold leading-tight">{p.display_name}</p>
                  <p className="text-xs text-muted">{RELATIONSHIPS[p.relationship]}</p>
                </div>
                {c ? (
                  <span className={`chip ${stale ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"}`}>{stale ? "Recalculate" : "Calculated"}</span>
                ) : (
                  <span className={`chip ${ready ? "bg-gold-soft text-gold" : "bg-surface-2 text-muted"}`}>{ready ? "Ready" : "Details needed"}</span>
                )}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Born</dt>
                  <dd className="tabular">{p.birth_date ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Time</dt>
                  <dd className="tabular">{describeTime(p)}</dd>
                </div>
                {c && (
                  <>
                    <div>
                      <dt className="text-xs text-muted">Lagna · Moon</dt>
                      <dd>{c.chart.ascendant ? SIGNS[c.chart.ascendant.sign] : "—"} · {moon ? SIGNS[moon.sign] : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Dasha now</dt>
                      <dd>{c.current.md ?? "—"} / {c.current.ad ?? "—"}</dd>
                    </div>
                  </>
                )}
              </dl>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
