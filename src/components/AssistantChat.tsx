"use client";

import { useActionState, useState, useTransition } from "react";
import { askAssistantAction, setAiAllowedAction, type AssistantState } from "@/app/assistant-actions";

const SUGGESTIONS = [
  "Do I have Raj Yoga, and how strong is it?",
  "What does my chart traditionally say about business and wealth?",
  "Which periods in the next few years are linked to career and income?",
  "Which planet is traditionally first to support, and how?",
  "Mera Dhana Yoga kaisa hai aur kab active hoga?",
];

export function ConsentToggle({ personId, allowed, name }: { personId: string; allowed: boolean; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} className={`btn ${allowed ? "btn-ghost" : "btn-gold"}`} onClick={() => start(() => setAiAllowedAction(personId, !allowed))}>
      {pending ? "Saving…" : allowed ? `Turn AI off for ${name}` : `Turn AI on for ${name}`}
    </button>
  );
}

/** Labels for reference IDs so the answer reads naturally while staying traceable. */
function refLabel(ref: string): string {
  if (ref.startsWith("planet:")) return `${ref.slice(7)} (birth chart)`;
  if (ref.startsWith("transit:")) return `${ref.slice(8)} transit`;
  if (ref.startsWith("remedy:")) return ref.slice(7).replace("-", " · ");
  if (ref === "dasha:MD") return "Mahadasha";
  if (ref === "dasha:AD") return "Antardasha";
  if (ref === "dasha:PD") return "Pratyantardasha";
  if (ref.startsWith("dasha:next")) return `Upcoming period ${ref.slice(10)}`;
  if (ref === "numerology") return "Numerology";
  return ref;
}

export function AssistantChat({ personId, enabled }: { personId: string; enabled: boolean }) {
  const [state, action, pending] = useActionState<AssistantState, FormData>(askAssistantAction, null);
  const [question, setQuestion] = useState("");
  const r = state?.result;

  return (
    <div className="space-y-4">
      <form action={action} className="card space-y-3 p-5">
        <input type="hidden" name="person_id" value={personId} />
        <label className="label" htmlFor="ai-q">Your question</label>
        <textarea id="ai-q" name="question" rows={3} className="field" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask in English, Hindi or Hinglish" disabled={!enabled} maxLength={1500} />
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" disabled={!enabled} onClick={() => setQuestion(s)} className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft hover:bg-surface-2 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" disabled={!enabled || pending || question.trim().length < 3}>
            {pending ? "Thinking… (can take up to a minute)" : "Ask"}
          </button>
          <span className="text-xs text-muted">Each question is a paid API call. Questions and answers are not saved.</span>
        </div>
      </form>

      {state && r && !r.ok && (
        <div className="card border-warn/40 bg-warn-soft p-5 text-sm text-warn" role="alert">
          <p className="font-semibold">{r.reason === "invalid" ? "Answer withheld" : r.reason === "refused" ? "No answer" : "Could not answer"}</p>
          <p className="mt-1">{r.message}</p>
          {r.issues && r.issues.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs">
              {r.issues.map((i) => (
                <li key={i.detail}>{i.detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {state && r && r.ok && (
        <article className="card space-y-5 p-5 text-sm">
          <p className="text-xs text-muted">You asked: {state.question}</p>
          <p className="font-display text-xl leading-snug">{r.answer.conclusion}</p>

          <Section title="Evidence from your chart">
            <ul className="space-y-1.5">
              {r.answer.evidence.map((e, i) => (
                <li key={i} className="flex flex-wrap gap-2">
                  <span className="chip bg-surface-2 text-ink-soft">{refLabel(e.ref)}</span>
                  <span className="min-w-0 flex-1">{e.note}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Traditional interpretation">
            <p className="whitespace-pre-wrap">{r.answer.interpretation}</p>
          </Section>

          {r.answer.timing.length > 0 && (
            <Section title="Timing">
              <ul className="space-y-1.5">
                {r.answer.timing.map((t, i) => (
                  <li key={i} className="flex flex-wrap gap-2">
                    <span className="chip bg-gold-soft text-ink">{refLabel(t.ref)}</span>
                    <span className="min-w-0 flex-1">{t.note}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {r.answer.practical_actions.length > 0 && (
            <Section title="Practical actions (sensible regardless of astrology)">
              <ul className="list-disc space-y-1 pl-5">
                {r.answer.practical_actions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Section>
          )}

          {r.answer.traditional_remedies.length > 0 && (
            <Section title="Traditional remedies (optional practices)">
              <ul className="space-y-1.5">
                {r.answer.traditional_remedies.map((t, i) => (
                  <li key={i} className="flex flex-wrap gap-2">
                    <span className="chip bg-surface-2 text-ink-soft">{refLabel(t.ref)}</span>
                    <span className="min-w-0 flex-1">{t.note}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Section title="Uncertain">
              <ul className="list-disc space-y-1 pl-5 text-ink-soft">
                {r.answer.uncertainty.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </Section>
            <Section title="Cannot be concluded">
              <ul className="list-disc space-y-1 pl-5 text-ink-soft">
                {r.answer.cannot_conclude.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </Section>
          </div>

          <p className="border-t border-line pt-3 text-xs text-muted">
            Every reference above was checked against your calculated chart before display{r.attempts > 1 ? " (second attempt, after the first failed a check)" : ""}. Model {r.model} · {r.usage.input.toLocaleString()} input
            {r.usage.cacheRead ? ` + ${r.usage.cacheRead.toLocaleString()} cached` : ""} / {r.usage.output.toLocaleString()} output tokens.
          </p>
        </article>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</h3>
      {children}
    </section>
  );
}
