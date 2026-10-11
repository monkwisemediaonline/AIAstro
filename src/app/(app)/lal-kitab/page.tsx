import { Suspense } from "react";
import Link from "next/link";
import { addLkNoteAction } from "@/app/lalkitab-actions";
import { DeleteLkNote } from "@/components/LkWidgets";
import { NorthIndianChart } from "@/components/NorthIndianChart";
import { computeChart } from "@/engine/chart";
import { PLANETS, type Planet } from "@/engine/constants";
import { LAL_KITAB_MODULE, UPAY_SAFETY, lalKitabTeva } from "@/lalkitab/chart";
import { getLkStore, type LkNote } from "@/lib/lalkitab-store";
import { RELATIONSHIPS, toBirthInput, type Person } from "@/lib/people";
import { SetupNeeded } from "@/lib/remedy-store";
import { getStore } from "@/lib/store";

const CONF = { high: "bg-ok-soft text-ok", medium: "bg-surface-2 text-ink-soft", low: "bg-warn-soft text-warn" } as const;

export default function LalKitabPage(props: PageProps<"/lal-kitab">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Separate tradition</p>
        <h1 className="font-display text-4xl font-semibold">Lal Kitab</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Lal Kitab reads planets by house alone and has its own remedies (upay). It is kept apart from the Parashari pages; nothing here is mixed with those rules.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/lal-kitab">["searchParams"] }) {
  const sp = await searchParams;
  const store = await getStore();
  const people = await store.listPeople();
  const person = people.find((p) => p.id === sp.p) ?? people.find((p) => p.relationship === "self") ?? people[0] ?? null;

  let notes: LkNote[] | null = null;
  try {
    notes = await (await getLkStore()).listNotes();
  } catch (e) {
    if (!(e instanceof SetupNeeded)) throw e;
  }

  return (
    <div className="space-y-6">
      <section className="card border-gold/40 bg-gold-soft/40 p-5 text-sm">
        <p className="font-semibold">How this page works</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-soft">
          <li>The app calculates your Lal Kitab chart (teva): which house each planet sits in.</li>
          <li>
            It contains <b>no built-in readings or upay</b>. Published tables disagree with each other and none here has been checked against an edition, so the readings are the ones <b>you enter from your own book</b>, each with its source and page.
          </li>
          <li>A note is stored once per planet-and-house, so it shows up for every chart with that placement.</li>
        </ul>
      </section>

      {people.length > 0 && (
        <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-56 flex-1">
            <label className="label" htmlFor="lk-person">Chart</label>
            <select id="lk-person" name="p" defaultValue={person?.id} className="field">
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

      {notes === null && (
        <div className="card border-warn/40 bg-warn-soft p-5 text-sm text-warn">
          <p className="font-semibold">One-time setup needed to save notes</p>
          <p className="mt-1">
            In Supabase → SQL Editor, run <code>supabase/migrations/20261012000000_lal_kitab.sql</code> from the repository, then reload. The chart below works without it.
          </p>
        </div>
      )}

      {person ? <Teva person={person} notes={notes} /> : <p className="text-sm text-muted">Add birth details to see a Lal Kitab chart.</p>}

      {notes !== null && <Library notes={notes} />}

      <footer className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">
        <p className="mb-1 font-semibold text-ink">Before acting on any upay</p>
        <ul className="list-disc space-y-1 pl-5">
          {UPAY_SAFETY.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Module {LAL_KITAB_MODULE} · house = whole-sign house from the Lagna · Varshphal (annual chart), debts (rin) and sleeping-planet rules are not calculated until their tables are entered from a source.
        </p>
      </footer>
    </div>
  );
}

function Teva({ person, notes }: { person: Person; notes: LkNote[] | null }) {
  const input = toBirthInput(person);
  if (!input) {
    return (
      <p className="card p-5 text-sm">
        Birth details for {person.display_name} are incomplete.{" "}
        <Link href={`/people/${person.id}/edit`} className="font-semibold text-gold underline-offset-4 hover:underline">Complete details</Link>
      </p>
    );
  }
  const chart = computeChart(input);
  const lagnaChanges = chart.sensitivity?.some((r) => r.item === "Ascendant (Lagna) sign" && !r.stable) ?? false;
  const teva = lagnaChanges ? null : lalKitabTeva(chart.chart);
  if (!teva) {
    return (
      <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
        {lagnaChanges
          ? "The Lagna changes inside the birth-time range, so the houses are not settled."
          : "Lal Kitab needs the Lagna, which needs a birth time."}{" "}
        Add or confirm the birth time to see the teva.
      </p>
    );
  }
  const retro = new Map(chart.chart.planets.map((p) => [p.planet, p.retrograde]));
  const forSlot = (planet: Planet, house: number) => (notes ?? []).filter((n) => n.planet === planet && n.house === house);

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="card p-5">
        <h2 className="font-display text-2xl font-semibold">Teva</h2>
        <div className="mt-3">
          <NorthIndianChart
            firstSign={0}
            placements={teva.placements.map((p) => ({ planet: p.planet, sign: p.house - 1, retrograde: retro.get(p.planet) }))}
            title="Lal Kitab teva · numbers are houses 1–12"
          />
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Empty houses: <span className="tabular font-semibold text-ink">{teva.emptyHouses.join(", ") || "none"}</span>
        </p>
        {chart.input.timeKind === "range" && <p className="mt-2 text-xs text-warn">Birth time is a range; the Lagna sign is the same across it, so these houses hold.</p>}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Planet by house</h2>
        {PLANETS.map((planet) => {
          const house = teva.placements.find((p) => p.planet === planet)!.house;
          const list = forSlot(planet, house);
          return (
            <details key={planet} className="card" open={list.length > 0}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                <span className="font-display text-xl font-semibold">
                  {planet} <span className="font-sans text-sm font-normal text-muted">in house {house}</span>
                </span>
                <span className={`chip ${list.length ? "bg-ok-soft text-ok" : "bg-surface-2 text-muted"}`}>{list.length ? `${list.length} note${list.length > 1 ? "s" : ""}` : "No note yet"}</span>
              </summary>
              <div className="space-y-3 border-t border-line p-5 text-sm">
                {list.map((n) => (
                  <NoteView key={n.id} n={n} />
                ))}
                {notes !== null && <NoteForm planet={planet} house={house} />}
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}

function NoteView({ n }: { n: LkNote }) {
  return (
    <article className="rounded-xl border border-line p-3">
      <p className="whitespace-pre-wrap">{n.reading}</p>
      {n.upay && (
        <div className="mt-2 rounded-lg bg-surface-2 p-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Upay <span className={`chip ml-1 normal-case ${n.safety_checked ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>{n.safety_checked ? "Safety checked by you" : "Not yet safety-checked"}</span>
          </p>
          <p className="mt-1 whitespace-pre-wrap">{n.upay}</p>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {n.source}
          {n.locator ? ` · ${n.locator}` : ""} <span className={`chip ml-1 ${CONF[n.confidence]}`}>{n.confidence} confidence</span>
        </span>
        <DeleteLkNote id={n.id} />
      </div>
    </article>
  );
}

function NoteForm({ planet, house }: { planet: Planet; house: number }) {
  const id = `${planet}-${house}`;
  return (
    <form action={addLkNoteAction} className="grid gap-3 rounded-xl border border-dashed border-line p-3">
      <input type="hidden" name="planet" value={planet} />
      <input type="hidden" name="house" value={house} />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Add a note from your book — {planet} in house {house}</p>
      <div>
        <label className="label" htmlFor={`r-${id}`}>Reading (your own summary)</label>
        <textarea id={`r-${id}`} name="reading" required rows={2} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`u-${id}`}>Upay, if the book gives one (optional)</label>
        <textarea id={`u-${id}`} name="upay" rows={2} className="field" />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_150px]">
        <div>
          <label className="label" htmlFor={`s-${id}`}>Source (book, edition, translator)</label>
          <input id={`s-${id}`} name="source" required className="field" />
        </div>
        <div>
          <label className="label" htmlFor={`l-${id}`}>Page / section</label>
          <input id={`l-${id}`} name="locator" className="field" />
        </div>
        <div>
          <label className="label" htmlFor={`c-${id}`}>Confidence</label>
          <select id={`c-${id}`} name="confidence" defaultValue="medium" className="field">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="safety_checked" className="mt-0.5 size-4 accent-[var(--gold)]" />
        I have checked that this upay is safe, lawful and harms no person or animal.
      </label>
      <div>
        <button className="btn btn-primary">Save note</button>
      </div>
    </form>
  );
}

function Library({ notes }: { notes: LkNote[] }) {
  const count = (planet: Planet, house: number) => notes.filter((n) => n.planet === planet && n.house === house).length;
  const filled = new Set(notes.map((n) => `${n.planet}-${n.house}`)).size;
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">Your Lal Kitab library</h2>
        <span className="text-sm text-ink-soft">
          <b className="tabular text-ink">{filled}</b> of 108 planet-house combinations have a note
        </span>
      </div>
      <div className="table-scroll mt-3">
        <table className="data">
          <thead>
            <tr>
              <th>Planet</th>
              {Array.from({ length: 12 }, (_, i) => (
                <th key={i} className="text-center">H{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLANETS.map((planet) => (
              <tr key={planet}>
                <td className="font-semibold">{planet}</td>
                {Array.from({ length: 12 }, (_, i) => {
                  const c = count(planet, i + 1);
                  return (
                    <td key={i} className="text-center">
                      <span className={`tabular inline-grid size-6 place-items-center rounded-md text-xs ${c ? "bg-gold-soft font-semibold text-ink" : "text-muted opacity-50"}`}>{c || "·"}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">Notes are added from a chart above, for the placements that chart has. Other combinations fill in as you add more people.</p>
    </section>
  );
}
