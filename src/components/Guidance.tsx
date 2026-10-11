import Link from "next/link";
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

export function DayRow({ d, open }: { d: DayScore; open?: boolean }) {
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
        {d.nakshatraChanges && <li className="text-xs text-muted">* The Moon changes star during this day; the reading is for midday.</li>}
      </ul>
    </details>
  );
}
