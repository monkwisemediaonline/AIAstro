import { Suspense } from "react";
import Link from "next/link";
import { NeedsDetails, PersonPicker, SectionCard, ToneLegend } from "@/components/Guidance";
import { loadPersonContext } from "@/lib/person-context";
import { READING_TEXT } from "@/reading/meanings";

export default function ReadingPage(props: PageProps<"/reading">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">In plain language · free, no AI</p>
        <h1 className="font-display text-4xl font-semibold">My Reading</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          What your calculated chart traditionally says, written out: your nature, wealth, business, family, the period you are in, and what to do now. Built by fixed rules on your own data, so it costs nothing and never leaves this portal.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Reading the chart…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/reading">["searchParams"] }) {
  const sp = await searchParams;
  const { people, person, data } = await loadPersonContext(sp.p);
  if (!person || !data) return <NeedsDetails person={person} />;
  const { reading } = data;

  return (
    <div className="space-y-6">
      {people.length > 1 && <PersonPicker people={people} person={person} path="/reading" />}

      <section className="card overflow-hidden">
        <div className="bg-navy p-5 text-[#f6eedb]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d9ac52]">{person.display_name}</p>
          <p className="mt-1 font-display text-2xl leading-snug">{reading.sections[0].summary}</p>
          <ul className="mt-3 space-y-1 text-sm text-[#d8d2c2]">
            {reading.sections.filter((s) => ["wealth", "business", "now"].includes(s.id)).map((s) => (
              <li key={s.id}>
                <b className="text-[#f6eedb]">{s.title}:</b> {s.summary}
              </li>
            ))}
          </ul>
        </div>
        <nav className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3" aria-label="Sections">
          {reading.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft hover:bg-surface-2">{s.title}</a>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <ToneLegend />
          <span className="flex flex-wrap gap-3 text-sm">
            <Link href={`/days?p=${person.id}`} className="font-semibold text-gold underline-offset-4 hover:underline">Favourable days →</Link>
            <Link href={`/ask?p=${person.id}`} className="font-semibold text-gold underline-offset-4 hover:underline">Ask a question →</Link>
          </span>
        </div>
      </section>

      {reading.limited && <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">{reading.limited}</p>}

      {reading.sections.map((s) => (
        <SectionCard key={s.id} s={s} />
      ))}

      <footer className="rounded-xl border border-dashed border-line p-4 text-xs text-muted">
        This reading states what the tradition associates with your placements. It is not a prediction and cannot promise wealth, health or any event. Meanings are general significations ({READING_TEXT}); the yoga rules behind them can be checked in the{" "}
        <Link href="/library" className="font-semibold text-gold underline-offset-4 hover:underline">Research Library</Link>. Decide money, health and legal matters on facts and professional advice.
      </footer>
    </div>
  );
}
