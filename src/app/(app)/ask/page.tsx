import { Suspense } from "react";
import Link from "next/link";
import { DayRow, NeedsDetails, SectionCard, ToneLegend } from "@/components/Guidance";
import { scoreDays } from "@/engine/panchang";
import { loadPersonContext } from "@/lib/person-context";
import { RELATIONSHIPS } from "@/lib/people";
import { answerQuestion } from "@/reading/build";

const SUGGESTIONS = [
  "How will my business do, and what should I focus on?",
  "Do I have wealth yoga in my chart?",
  "Which time is favourable for me?",
  "Mera business kab badhega?",
  "What does my chart say about marriage?",
  "How do I deal with competitors and obstacles?",
  "Which remedies suit me?",
];

export default function AskPage(props: PageProps<"/ask">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Free · works offline from your chart · no AI</p>
        <h1 className="font-display text-4xl font-semibold">Ask</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Type a question in English or Hinglish. The portal recognises what it is about and answers from your calculated reading and timing. It is rule-based, so it answers by topic rather than holding a conversation.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Looking at the chart…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/ask">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 300) : "";
  const { people, person, now, data } = await loadPersonContext(sp.p);
  if (!person || !data) return <NeedsDetails person={person} />;

  const answer = q ? answerQuestion(data.reading, q) : null;
  const todayLocal = new Intl.DateTimeFormat("en-CA", { timeZone: data.tz }).format(now);
  const days = answer?.timing ? scoreDays(todayLocal, 30, data.tz, data.natal) : [];
  const best = days.slice(1).filter((d) => d.rating === "very_good" || d.rating === "good").sort((a, b) => b.score - a.score || a.date.localeCompare(b.date)).slice(0, 5).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <form method="get" className="card space-y-3 p-5">
        {people.length > 1 && (
          <div className="max-w-sm">
            <label className="label" htmlFor="ask-person">About whose chart?</label>
            <select id="ask-person" name="p" defaultValue={person.id} className="field">
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name} — {RELATIONSHIPS[p.relationship]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor="ask-q">Your question</label>
          <input id="ask-q" name="q" defaultValue={q} className="field" placeholder="e.g. Mera business kab badhega?" autoComplete="off" maxLength={300} />
        </div>
        <button className="btn btn-primary">Ask</button>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SUGGESTIONS.map((s) => (
            <Link key={s} href={`/ask?p=${person.id}&q=${encodeURIComponent(s)}`} className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft hover:bg-surface-2">
              {s}
            </Link>
          ))}
        </div>
      </form>

      {answer && (
        <>
          <section className="card overflow-hidden">
            <div className="bg-navy p-5 text-[#f6eedb]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d9ac52]">You asked</p>
              <p className="mt-1 font-display text-2xl leading-snug">{q}</p>
            </div>
            <div className="space-y-2 p-5 text-sm">
              <p>
                {answer.matched ? "I read this as a question about" : "I could not tell the topic from the words used, so here is the general picture:"} <b>{answer.topics.join(", ").toLowerCase()}</b>.
              </p>
              <ul className="space-y-1">
                {answer.sections.map((s) => (
                  <li key={s.id}>
                    <b>{s.title}:</b> {s.summary}
                  </li>
                ))}
              </ul>
              <ToneLegend />
            </div>
          </section>

          {answer.sections.map((s) => (
            <SectionCard key={s.id} s={s} />
          ))}

          {answer.timing && (
            <section className="card p-5">
              <h2 className="font-display text-2xl font-semibold">Favourable days in the next month</h2>
              <p className="text-sm text-muted">For the day-level “when”. The period you are in (above) is the larger “when”.</p>
              <div className="mt-3 space-y-2">
                {best.length ? best.map((d) => <DayRow key={d.date} d={d} />) : <p className="text-sm text-ink-soft">No clearly favourable day in the next 30 days.</p>}
              </div>
              <Link href={`/days?p=${person.id}`} className="mt-3 inline-block text-sm font-semibold text-gold underline-offset-4 hover:underline">All days and the years ahead →</Link>
            </section>
          )}

          <p className="rounded-xl border border-dashed border-line p-4 text-xs text-muted">
            These are traditional indications from your chart, not predictions. For the full picture see <Link href={`/reading?p=${person.id}`} className="font-semibold text-gold underline-offset-4 hover:underline">My Reading</Link>; for practices see{" "}
            <Link href={`/sadhana?p=${person.id}`} className="font-semibold text-gold underline-offset-4 hover:underline">Sadhana</Link>.
          </p>
        </>
      )}
    </div>
  );
}
