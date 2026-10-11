import Link from "next/link";
import type { Planet } from "@/engine/constants";
import { clock, spanText, type DayMuhurta, type Quality } from "@/engine/muhurta";
import type { DayRating, DayScore } from "@/engine/panchang";
import { RELATIONSHIPS, type Person } from "@/lib/people";
import type { Section, Tone } from "@/reading/build";

const DOT: Record<Tone, string> = { good: "bg-ok", mixed: "bg-warn", care: "bg-bad", info: "bg-line" };
const TONE_LABEL: Record<Tone, string> = { good: "Supportive", mixed: "Mixed", care: "Needs care", info: "" };

export function PersonPicker({ people, person, path, extra }: { people: Person[]; person: Person | null; path: string; extra?: React.ReactNode }) {
  if (people.length === 0) return null;
  return (
    <form method="get" action={path} className="card flex flex-wrap items-end gap-3 p-4">
      <div className="min-w-56 flex-1">
        <label className="label" htmlFor="pick-person">Chart</label>
        <select id="pick-person" name="p" defaultValue={person?.id} className="field">
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name} — {RELATIONSHIPS[p.relationship]}
            </option>
          ))}
        </select>
      </div>
      {extra}
      <button className="btn btn-primary">Show</button>
    </form>
  );
}

export function NeedsDetails({ person }: { person: Person | null }) {
  return (
    <div className="card grid place-items-center gap-3 p-10 text-center">
      <p className="font-display text-2xl">{person ? `Birth details for ${person.display_name} are incomplete` : "Add birth details first"}</p>
      <Link href={person ? `/people/${person.id}/edit` : "/people/new"} className="btn btn-gold">{person ? "Complete details" : "Add birth details"}</Link>
    </div>
  );
}

export function SectionCard({ s }: { s: Section }) {
  return (
    <section id={s.id} className="card scroll-mt-6 p-5">
      <h2 className="font-display text-2xl font-semibold">{s.title}</h2>
      <p className="mt-1 text-sm font-medium">{s.summary}</p>
      <ul className="mt-3 space-y-2.5 text-sm">
        {s.points.map((pt, i) => (
          <li key={i} className="flex gap-3">
            <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[pt.tone]}`} aria-hidden />
            <span>
              {pt.tone !== "info" && <span className="sr-only">{TONE_LABEL[pt.tone]}: </span>}
              {pt.text}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Read from: {s.basis}.</p>
    </section>
  );
}

export function ToneLegend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
      {(["good", "mixed", "care"] as Tone[]).map((t) => (
        <span key={t} className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-full ${DOT[t]}`} aria-hidden /> {TONE_LABEL[t]}
        </span>
      ))}
    </p>
  );
}

export const RATING: Record<DayRating, { label: string; cls: string; bar: string }> = {
  very_good: { label: "Very favourable", cls: "bg-ok text-white", bar: "bg-ok" },
  good: { label: "Favourable", cls: "bg-ok-soft text-ok", bar: "bg-ok" },
  neutral: { label: "Ordinary", cls: "bg-surface-2 text-ink-soft", bar: "bg-line" },
  avoid: { label: "Avoid new starts", cls: "bg-bad-soft text-bad", bar: "bg-bad" },
};

export const fmtDay = (iso: string) => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export function DayRow({ d, open, muhurta }: { d: DayScore; open?: boolean; muhurta?: { m: DayMuhurta; tz: string } }) {
  const r = RATING[d.rating];
  return (
    <details className="rounded-xl border border-line" open={open}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
        <span className="flex items-center gap-3">
          <span className="tabular w-28 font-semibold">{fmtDay(d.date)}</span>
          <span className={`chip ${r.cls}`}>{r.label}</span>
        </span>
        <span className="text-xs text-ink-soft">
          {d.nakshatra}
          {d.nakshatraChanges ? "*" : ""} · {d.tithi} · <span className="tabular">score {d.score > 0 ? "+" : ""}{d.score}</span>
        </span>
      </summary>
      <ul className="space-y-1.5 border-t border-line px-4 py-3 text-sm">
        {d.factors.map((f) => (
          <li key={f.name} className="flex flex-wrap items-baseline gap-x-2">
            <span className={`tabular w-10 shrink-0 text-right font-semibold ${f.score > 0 ? "text-ok" : f.score < 0 ? "text-bad" : "text-muted"}`}>{f.score > 0 ? "+" : ""}{f.score}</span>
            <span className="font-medium">{f.name}:</span>
            <span>{f.value}.</span>
            <span className="text-ink-soft">{f.note}</span>
          </li>
        ))}
        {muhurta && <MuhurtaLine m={muhurta.m} tz={muhurta.tz} />}
        {d.nakshatraChanges && <li className="text-xs text-muted">* The Moon changes star during this day; the reading is for midday.</li>}
      </ul>
    </details>
  );
}

// ---------------------------------------------------------------- Muhurta (clock-time windows)

const Q: Record<Quality, string> = { good: "bg-ok-soft text-ok", neutral: "bg-surface-2 text-ink-soft", avoid: "bg-bad-soft text-bad" };

/** One line of clock-time guidance for a day, used inside the day rows. */
export function MuhurtaLine({ m, tz }: { m: DayMuhurta; tz: string }) {
  return (
    <li className="mt-1 border-t border-line pt-2 text-sm">
      <span className="font-medium">Best hours:</span>{" "}
      {m.bestWindows.length ? m.bestWindows.map((w) => `${spanText(w, tz)} (${w.label})`).join(" · ") : "no clear window"}
      <span className="text-ink-soft"> · Rahu Kaal {spanText(m.rahuKaal, tz)}</span>
    </li>
  );
}

export function MuhurtaCard({ m, tz, place, natalLord }: { m: DayMuhurta; tz: string; place: string; natalLord: Planet | null }) {
  const rows: { label: string; span: string; cls: string; note: string }[] = [
    { label: "Rahu Kaal", span: spanText(m.rahuKaal, tz), cls: Q.avoid, note: "Avoid starting new work, signing, or setting out." },
    { label: "Yamaganda", span: spanText(m.yamaganda, tz), cls: Q.avoid, note: "Avoided for beginnings." },
    { label: "Gulika Kaal", span: spanText(m.gulika, tz), cls: Q.neutral, note: "Whatever is begun here is said to repeat; avoid for anything you would not want to do twice." },
    { label: "Abhijit Muhurta", span: spanText(m.abhijit, tz), cls: m.abhijit.usable ? Q.good : Q.neutral, note: m.abhijit.usable ? "The midday window, good for almost any undertaking." : "Not used on Wednesdays." },
    { label: "Brahma Muhurta", span: spanText(m.brahmaMuhurta, tz), cls: Q.good, note: "Before sunrise: kept for japa, prayer and study." },
  ];
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">Today&apos;s hours — muhurta</h2>
        <span className="tabular text-xs text-muted">
          {place} · sunrise {clock(m.sunrise, tz)} · sunset {clock(m.sunset, tz)}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-ok-soft px-4 py-3 text-sm">
        <p className="font-semibold text-ok">Best windows today for important work</p>
        <p className="tabular mt-1">
          {m.bestWindows.length ? m.bestWindows.map((w) => `${spanText(w, tz)} (${w.label})`).join("  ·  ") : "No clear window today; keep to routine work."}
        </p>
        <p className="mt-1 text-xs text-ink-soft">Good Choghadiya with Rahu Kaal, Yamaganda and Gulika removed.</p>
      </div>

      <div className="table-scroll mt-4">
        <table className="data">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="font-semibold">{r.label}</td>
                <td className="tabular"><span className={`chip ${r.cls}`}>{r.span}</span></td>
                <td className="whitespace-normal text-ink-soft">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Choghadiya (daytime)</h3>
      <ol className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        {m.choghadiya.map((c) => (
          <li key={c.start} className="rounded-lg border border-line px-3 py-2 text-sm">
            <span className={`chip ${Q[c.quality]}`}>{c.name}</span>
            <span className="tabular ml-2">{spanText(c, tz)}</span>
            <p className="text-xs text-muted">{c.note}</p>
          </li>
        ))}
      </ol>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Planetary hours (hora), sunrise to sunset</h3>
      <ol className="mt-2 flex flex-wrap gap-1.5">
        {m.horas.map((h) => (
          <li key={h.start} className={`rounded-lg px-2.5 py-1 text-xs ${h.lord === natalLord ? "bg-gold text-[#1a1408]" : Q[h.quality]}`} title={h.lord === natalLord ? "Hour of your Lagna lord" : undefined}>
            <b>{h.lord}</b> <span className="tabular">{clock(h.start, tz)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted">
        Mercury, Jupiter, Venus and Moon hours are traditionally preferred for trade, agreements and meetings{natalLord ? `; the gold ones are the hours of your Lagna lord ${natalLord}` : ""}.
      </p>
    </section>
  );
}
