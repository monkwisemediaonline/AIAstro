import { Suspense } from "react";
import Link from "next/link";
import { startPracticeAction } from "@/app/remedy-actions";
import { PersonPicker } from "@/components/Guidance";
import { PLANETS } from "@/engine/constants";
import { formatDms } from "@/engine/math";
import { loadPersonContext } from "@/lib/person-context";
import { getRemedyStore, SetupNeeded } from "@/lib/remedy-store";
import { EXCLUDED, GROUP_TITLE, PLANET_DEITY, PLANET_MAHAVIDYA, PRACTICES, SADHANA_CATALOGUE, ishtaDevata, signName, type Practice } from "@/sadhana/catalogue";

export default function SadhanaPage(props: PageProps<"/sadhana">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Tantra and devotion · self-practice only</p>
        <h1 className="font-display text-4xl font-semibold">Sadhana</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Practices from the tantric and devotional traditions for wealth, protection and family, limited to what you do yourself and that harms no one. Plus the deity your chart points to.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/sadhana">["searchParams"] }) {
  const sp = await searchParams;
  const { people, person, data } = await loadPersonContext(sp.p);

  let canTrack = true;
  let started = new Set<string>();
  try {
    const list = await (await getRemedyStore()).listPractices();
    started = new Set(list.filter((x) => x.status === "active").map((x) => x.remedy_key ?? ""));
  } catch (e) {
    if (!(e instanceof SetupNeeded)) throw e;
    canTrack = false;
  }

  const ishta = data && !person?.is_minor ? ishtaDevata(data.chart.chart) : null;
  const groups = Object.keys(GROUP_TITLE) as Practice["group"][];

  return (
    <div className="space-y-8">
      {people.length > 1 && <PersonPicker people={people} person={person} path="/sadhana" />}

      <section className="card border-gold/40 bg-gold-soft/40 p-5 text-sm">
        <p className="font-semibold">Read this first</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-soft">
          <li>These are acts of devotion and discipline. Tradition says they steady the mind and invite grace; nobody can honestly promise they produce money, and no practice makes a person untouchable.</li>
          <li>Wealth that lasts for generations is built by a business that earns more than it spends, year after year, and by what you teach your children. Use these to keep yourself steady while you do that work.</li>
          <li>Start with one practice and keep it daily. One kept for a year is worth more than ten begun and dropped.</li>
        </ul>
      </section>

      {ishta && data && (
        <section className="card overflow-hidden">
          <div className="bg-navy p-5 text-[#f6eedb]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d9ac52]">Ishta Devata — the deity your chart points to</p>
            <p className="mt-1 font-display text-3xl font-semibold">{ishta.deity}</p>
            <p className="mt-1 text-sm text-[#d8d2c2]">Indicated by {ishta.indicator}, by the Jaimini karakamsha method.</p>
          </div>
          <div className="space-y-2 p-5 text-sm">
            <p className="font-semibold">How this was worked out</p>
            <ol className="list-decimal space-y-1 pl-5 text-ink-soft">
              <li>
                Your Atmakaraka (the planet furthest along in its sign) is <b className="text-ink">{ishta.atmakaraka}</b> at {formatDms(ishta.atmakarakaDegree)}.
              </li>
              <li>
                In the Navamsha it falls in <b className="text-ink">{signName(ishta.karakamsha)}</b> (the Karakamsha).
              </li>
              <li>
                The 12th from there is <b className="text-ink">{signName(ishta.twelfth)}</b>. {ishta.via === "occupant" ? `In the Navamsha it holds ${ishta.occupants.join(", ")}; ${ishta.indicator} is taken as the indicator.` : `No planet sits there in the Navamsha, so its lord ${ishta.indicator} is the indicator.`}
              </li>
              <li>
                {ishta.indicator} is traditionally associated with <b className="text-ink">{ishta.deity}</b>.
              </li>
            </ol>
            {(ishta.close || data.chart.input.timeKind !== "exact") && (
              <p className="rounded-lg bg-warn-soft px-3 py-2 text-warn">
                {ishta.close ? "Two planets are within one degree of each other for Atmakaraka. " : ""}
                {data.chart.input.timeKind !== "exact" ? "The birth time is not exact, and Navamsha positions can shift with it. " : ""}
                Treat this result as provisional.
              </p>
            )}
            <p className="text-xs text-muted">Attributions differ between texts and teachers. Many people simply continue with their family deity (kula devata), which tradition fully supports.</p>
          </div>
        </section>
      )}

      {!canTrack && (
        <div className="card border-warn/40 bg-warn-soft p-5 text-sm text-warn">
          <p className="font-semibold">Tracking is not set up yet</p>
          <p className="mt-1">You can read and do every practice below. To count japa and keep a streak here, run <code>supabase/migrations/20261011000000_remedies.sql</code> in Supabase → SQL Editor.</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g} className="space-y-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">{GROUP_TITLE[g].title}</h2>
            <p className="text-sm text-muted">{GROUP_TITLE[g].blurb}</p>
          </div>
          {PRACTICES.filter((x) => x.group === g).map((x) => (
            <article key={x.key} className="card p-5 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl font-semibold">{x.title}</h3>
                  {x.deity !== "—" && <p className="text-xs text-muted">{x.deity}</p>}
                  <p className="mt-2">{x.how}</p>
                  <p className="mt-1 text-ink-soft">When: {x.when}</p>
                  {x.note && <p className="mt-1 text-xs text-muted">{x.note}</p>}
                </div>
                {canTrack &&
                  (started.has(`sadhana:${x.key}`) ? (
                    <Link href="/remedies" className="chip bg-ok-soft text-ok">Tracking — open counter</Link>
                  ) : (
                    <form action={startPracticeAction} className="flex items-end gap-2">
                      <input type="hidden" name="person_id" value={person?.id ?? ""} />
                      <input type="hidden" name="remedy_key" value={`sadhana:${x.key}`} />
                      <input type="hidden" name="kind" value={x.kind} />
                      <input type="hidden" name="title" value={x.title} />
                      {x.kind === "mantra" && (
                        <div>
                          <label className="label" htmlFor={`t-${x.key}`}>Target count</label>
                          <input id={`t-${x.key}`} name="target_count" type="number" min="108" step="108" defaultValue={x.target ?? 10800} className="field tabular w-32" />
                        </div>
                      )}
                      <button className="btn btn-ghost">Start tracking</button>
                    </form>
                  ))}
              </div>
            </article>
          ))}
        </section>
      ))}

      <section className="card p-5">
        <h2 className="font-display text-2xl font-semibold">Planets, deities and Mahavidyas</h2>
        <p className="text-sm text-muted">A reference table. The Mahavidya column is for understanding only: those are initiation-based practices and are not offered here.</p>
        <div className="table-scroll mt-3">
          <table className="data">
            <thead>
              <tr><th>Planet</th><th>Deity (Jaimini)</th><th>Mahavidya</th></tr>
            </thead>
            <tbody>
              {PLANETS.map((pl) => (
                <tr key={pl}>
                  <td className="font-semibold">{pl}</td>
                  <td className="whitespace-normal">{PLANET_DEITY[pl]}</td>
                  <td>{PLANET_MAHAVIDYA[pl]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">
        <p className="mb-1 font-semibold text-ink">What this page will never include</p>
        <ul className="list-disc space-y-1 pl-5">
          {EXCLUDED.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Catalogue {SADHANA_CATALOGUE}. Mantras and attributions are the widely published forms; check wording and pronunciation with a teacher or a text you trust. Never leave a flame unattended; do not fast against medical advice.
        </p>
      </section>
    </div>
  );
}
