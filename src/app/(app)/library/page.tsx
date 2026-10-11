import { Suspense } from "react";
import Link from "next/link";
import { addSourceAction, saveReviewAction } from "@/app/library-actions";
import { DeleteSource } from "@/components/LibraryWidgets";
import { PLANETS } from "@/engine/constants";
import { getLibraryStore } from "@/lib/library-store";
import { SetupNeeded } from "@/lib/remedy-store";
import { STATUS_LABEL, indexReviews, type ItemKind, type LibSource, type ReviewIndex, type Verification } from "@/library/reviews";
import { PLANET_REMEDY, starterRemedies } from "@/remedies/catalogue";
import { PARASHARI_RULES } from "@/rules/parashari";
import type { YogaCategory } from "@/rules/types";

const CHIP: Record<Verification, string> = {
  unverified: "bg-surface-2 text-ink-soft",
  verified: "bg-ok-soft text-ok",
  disputed: "bg-warn-soft text-warn",
  disabled: "bg-bad-soft text-bad",
};
const SHORT: Record<Verification, string> = { unverified: "Draft", verified: "Verified", disputed: "Disputed", disabled: "Switched off" };

const CATEGORY: Record<YogaCategory, string> = {
  raja: "Raja Yogas",
  dhana: "Dhana Yogas",
  mahapurusha: "Pancha Mahapurusha",
  chandra: "Moon-based yogas",
  other: "Other yogas",
  caution: "Counter-indications",
};

type Tab = "rules" | "remedies" | "sources";

/** Every reviewable remedy entry: the starter practices plus the gemstone, per planet. */
const REMEDY_ITEMS = PLANETS.map((planet) => ({
  planet,
  items: [
    ...starterRemedies(planet).map((r) => ({ key: r.key, title: r.title, detail: r.detail })),
    { key: `${planet}-gemstone`, title: `Gemstone: ${PLANET_REMEDY[planet].stone}`, detail: PLANET_REMEDY[planet].substitute ? `Commonly sold substitute: ${PLANET_REMEDY[planet].substitute}.` : "No common substitute listed." },
  ],
}));

export default function LibraryPage(props: PageProps<"/library">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Sources and review</p>
        <h1 className="font-display text-4xl font-semibold">Research Library</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Every rule and remedy in this portal starts as a draft. Check each against a text you trust, record where you found it, and mark it verified, disputed, or switched off. The other pages follow what you set here.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/library">["searchParams"] }) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "remedies" || sp.tab === "sources" ? sp.tab : "rules";

  let sources: LibSource[];
  let index: ReviewIndex;
  try {
    const store = await getLibraryStore();
    const [s, r] = await Promise.all([store.listSources(), store.listReviews()]);
    sources = s;
    index = indexReviews(r, s);
  } catch (e) {
    if (!(e instanceof SetupNeeded)) throw e;
    return (
      <div className="card border-warn/40 bg-warn-soft p-5 text-sm text-warn">
        <p className="font-semibold">One-time setup needed</p>
        <p className="mt-1">
          In Supabase → SQL Editor, run <code>supabase/migrations/20261014000000_library.sql</code> from the repository, then reload. Until then every rule and remedy stays marked as a draft.
        </p>
      </div>
    );
  }

  const ruleCounts = index.counts("yoga_rule", PARASHARI_RULES.map((r) => r.id));
  const remedyKeys = REMEDY_ITEMS.flatMap((p) => p.items.map((i) => i.key));
  const remedyCounts = index.counts("remedy", remedyKeys);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Progress label="Yoga rules" counts={ruleCounts} total={PARASHARI_RULES.length} />
        <Progress label="Remedy entries" counts={remedyCounts} total={remedyKeys.length} />
        <div className="card p-4">
          <p className="text-xs text-muted">Source books</p>
          <p className="tabular mt-1 font-display text-3xl font-semibold">{sources.length}</p>
          <p className="text-xs text-ink-soft">{sources.length ? "Cite these when you verify an item." : "Add your books first, then cite them in reviews."}</p>
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Library sections">
        {([
          ["rules", `Yoga rules (${PARASHARI_RULES.length})`],
          ["remedies", `Remedies (${remedyKeys.length})`],
          ["sources", `Source books (${sources.length})`],
        ] as const).map(([k, label]) => (
          <Link key={k} href={`/library?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === k ? "border-gold text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {label}
          </Link>
        ))}
      </nav>

      {tab === "sources" && <Sources sources={sources} />}
      {tab === "rules" && <Rules index={index} sources={sources} />}
      {tab === "remedies" && <Remedies index={index} sources={sources} />}

      <footer className="rounded-xl border border-dashed border-line p-4 text-xs text-muted">
        <b className="text-ink-soft">What each status does.</b> Draft: shown everywhere with a “draft” label. Verified: shown with your citation. Disputed: still shown, flagged as disputed with your note. Switched off: hidden from the Yoga, Business, Remedies and AI pages.
        Store citations and your own summaries here, not copied passages from copyrighted translations.
      </footer>
    </div>
  );
}

function Progress({ label, counts, total }: { label: string; counts: Record<Verification, number>; total: number }) {
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">
        <span className="tabular">{counts.verified}</span>
        <span className="font-sans text-sm font-normal text-ink-soft"> of {total} verified</span>
      </p>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="bg-ok" style={{ width: pct(counts.verified) }} />
        <div className="bg-warn" style={{ width: pct(counts.disputed) }} />
        <div className="bg-bad" style={{ width: pct(counts.disabled) }} />
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        {counts.unverified} draft · {counts.disputed} disputed · {counts.disabled} switched off
      </p>
    </div>
  );
}

function ReviewForm({ kind, itemKey, index, sources }: { kind: ItemKind; itemKey: string; index: ReviewIndex; sources: LibSource[] }) {
  const info = index.get(kind, itemKey);
  const id = `${kind}-${itemKey}`;
  return (
    <form action={saveReviewAction} className="grid gap-3 rounded-xl border border-dashed border-line p-3 sm:grid-cols-[190px_1fr_180px]">
      <input type="hidden" name="item_kind" value={kind} />
      <input type="hidden" name="item_key" value={itemKey} />
      <div>
        <label className="label" htmlFor={`st-${id}`}>Your verdict</label>
        <select id={`st-${id}`} name="status" defaultValue={info.status} className="field">
          {(["unverified", "verified", "disputed", "disabled"] as const).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`src-${id}`}>Source book</label>
        <select id={`src-${id}`} name="source_id" defaultValue={info.sourceId ?? ""} className="field">
          <option value="">{sources.length ? "— choose —" : "Add a source book first"}</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
              {s.edition ? ` (${s.edition})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`loc-${id}`}>Chapter / verse / page</label>
        <input id={`loc-${id}`} name="locator" className="field" placeholder="e.g. Ch. 41, v. 28" defaultValue={info.locator ?? ""} />
      </div>
      <div className="sm:col-span-3">
        <label className="label" htmlFor={`n-${id}`}>Your note (how the text differs, why disputed, etc.)</label>
        <textarea id={`n-${id}`} name="note" rows={2} className="field" defaultValue={info.note ?? ""} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <button className="btn btn-primary">Save review</button>
        {info.citation && <span className="text-xs text-ink-soft">Currently cited: {info.citation}</span>}
      </div>
    </form>
  );
}

function Rules({ index, sources }: { index: ReviewIndex; sources: LibSource[] }) {
  const cats = Object.keys(CATEGORY) as YogaCategory[];
  return (
    <div className="space-y-6">
      {cats.map((cat) => {
        const rules = PARASHARI_RULES.filter((r) => r.category === cat);
        if (!rules.length) return null;
        return (
          <section key={cat} className="space-y-2">
            <h2 className="font-display text-2xl font-semibold">{CATEGORY[cat]}</h2>
            {rules.map((r) => {
              const info = index.get("yoga_rule", r.id);
              return (
                <details key={r.id} className="card">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                    <span>
                      <span className="font-semibold">{r.name}</span> <span className="tabular text-xs text-muted">{r.id}</span>
                    </span>
                    <span className={`chip ${CHIP[info.status]}`}>{SHORT[info.status]}</span>
                  </summary>
                  <div className="space-y-3 border-t border-line p-5 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">The rule as the app applies it</p>
                      <p className="mt-1">{r.definition}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Where to look</p>
                      <p className="mt-1 text-ink-soft">{r.source}</p>
                    </div>
                    {r.productIndicator && <p className="text-xs text-warn">This is a product grouping of classical indications, not a named yoga. “Verified” here means you agree with the grouping.</p>}
                    <ReviewForm kind="yoga_rule" itemKey={r.id} index={index} sources={sources} />
                  </div>
                </details>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function Remedies({ index, sources }: { index: ReviewIndex; sources: LibSource[] }) {
  return (
    <div className="space-y-6">
      {REMEDY_ITEMS.map(({ planet, items }) => (
        <section key={planet} className="space-y-2">
          <h2 className="font-display text-2xl font-semibold">{planet}</h2>
          {items.map((it) => {
            const info = index.get("remedy", it.key);
            return (
              <details key={it.key} className="card">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                  <span className="font-semibold">{it.title}</span>
                  <span className={`chip ${CHIP[info.status]}`}>{SHORT[info.status]}</span>
                </summary>
                <div className="space-y-3 border-t border-line p-5 text-sm">
                  <p className="text-ink-soft">{it.detail}</p>
                  <ReviewForm kind="remedy" itemKey={it.key} index={index} sources={sources} />
                </div>
              </details>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function Sources({ sources }: { sources: LibSource[] }) {
  return (
    <div className="space-y-4">
      {sources.length > 0 && (
        <ul className="space-y-2">
          {sources.map((s) => (
            <li key={s.id} className="card flex flex-wrap items-start justify-between gap-2 p-4 text-sm">
              <div>
                <p className="font-semibold">
                  {s.title} {!s.owned && <span className="chip ml-1 bg-surface-2 text-ink-soft">Not owned</span>}
                </p>
                <p className="text-xs text-ink-soft">{[s.author, s.edition, s.language].filter(Boolean).join(" · ") || "No details"}</p>
                {s.notes && <p className="mt-1 text-xs text-muted">{s.notes}</p>}
              </div>
              <DeleteSource id={s.id} title={s.title} />
            </li>
          ))}
        </ul>
      )}
      <form action={addSourceAction} className="card grid gap-3 p-5 sm:grid-cols-2">
        <p className="text-sm font-semibold sm:col-span-2">Add a source book</p>
        <div>
          <label className="label" htmlFor="src-title">Title</label>
          <input id="src-title" name="title" required className="field" placeholder="e.g. Brihat Parashara Hora Shastra" />
        </div>
        <div>
          <label className="label" htmlFor="src-author">Author / tradition</label>
          <input id="src-author" name="author" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="src-edition">Edition (translator, publisher, year)</label>
          <input id="src-edition" name="edition" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="src-lang">Language</label>
          <input id="src-lang" name="language" className="field" placeholder="English, Hindi, Sanskrit…" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="src-notes">Notes</label>
          <textarea id="src-notes" name="notes" rows={2} className="field" />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft sm:col-span-2">
          <input type="checkbox" name="owned" defaultChecked className="size-4 accent-[var(--gold)]" /> I own or have access to this edition
        </label>
        <div className="sm:col-span-2">
          <button className="btn btn-primary">Add book</button>
        </div>
      </form>
    </div>
  );
}
