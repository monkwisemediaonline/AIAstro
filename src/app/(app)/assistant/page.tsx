import { Suspense } from "react";
import Link from "next/link";
import { DEFAULT_MODEL, aiConfigured } from "@/ai/ask";
import { FIELDS_NOT_SENT, FIELDS_SENT } from "@/ai/context";
import { AssistantChat, ConsentToggle } from "@/components/AssistantChat";
import { RELATIONSHIPS, toBirthInput } from "@/lib/people";
import { getStore } from "@/lib/store";

// Answers can take a while; allow the server action up to two minutes.
export const maxDuration = 120;

export default function AssistantPage(props: PageProps<"/assistant">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Explains, never calculates</p>
        <h1 className="font-display text-4xl font-semibold">AI Assistant</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Ask questions about a chart in plain language. The assistant only explains what the app has already calculated, cites the rule or planet behind each point, and every answer is checked against the chart before you see it.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/assistant">["searchParams"] }) {
  const sp = await searchParams;
  const store = await getStore();
  const people = await store.listPeople();
  if (!people.length) {
    return (
      <div className="card grid place-items-center gap-3 p-10 text-center">
        <p className="font-display text-2xl">Add birth details first</p>
        <Link href="/people/new" className="btn btn-gold">Add birth details</Link>
      </div>
    );
  }
  const person = people.find((p) => p.id === sp.p) ?? people.find((p) => p.relationship === "self") ?? people[0];
  const configured = aiConfigured();
  const complete = !!toBirthInput(person);
  const allowed = !!person.ai_allowed;

  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-gold-soft px-4 py-3 text-sm">
        <b>This page is optional and costs money per question.</b> The free pages —{" "}
        <Link href="/reading" className="font-semibold underline underline-offset-4">My Reading</Link>,{" "}
        <Link href="/ask" className="font-semibold underline underline-offset-4">Ask</Link> and{" "}
        <Link href="/days" className="font-semibold underline underline-offset-4">Favourable Days</Link> — answer from your chart with no AI service and no cost.
      </p>

      {!configured && (
        <div className="card border-warn/40 bg-warn-soft p-5 text-sm text-warn">
          <p className="font-semibold">One-time setup: add an Anthropic API key</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Create a key at console.anthropic.com → API Keys (this is a paid, pay-per-use service).</li>
            <li>In Vercel → your project → Settings → Environment Variables, add <code>ANTHROPIC_API_KEY</code> with that key, for Production.</li>
            <li>Redeploy. Do not put the key in the code or share it in chat.</li>
          </ol>
          <p className="mt-2">Optional: set <code>ANTHROPIC_MODEL</code> to choose a model (default <code>{DEFAULT_MODEL}</code>).</p>
        </div>
      )}

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="ai-person">Chart</label>
          <select id="ai-person" name="p" defaultValue={person.id} className="field">
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name} — {RELATIONSHIPS[p.relationship]}
                {p.ai_allowed ? " · AI on" : ""}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary">Select</button>
      </form>

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              AI is {allowed ? "on" : "off"} for {person.display_name}
            </h2>
            <p className="text-sm text-ink-soft">
              Off by default for every person. When on, each question sends the items on the left to Anthropic&apos;s API to generate the answer.
              {person.is_minor && " This profile is marked as a minor — consider leaving AI off."}
            </p>
          </div>
          <ConsentToggle personId={person.id} allowed={allowed} name={person.display_name} />
        </div>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Sent with each question</p>
            <ul className="list-disc space-y-0.5 pl-5 text-ink-soft">
              {FIELDS_SENT.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Never sent</p>
            <ul className="list-disc space-y-0.5 pl-5 text-ink-soft">
              {FIELDS_NOT_SENT.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Don&apos;t type names or birth details into the question box — whatever you type there is sent as written.</p>
          </div>
        </div>
      </section>

      {!complete && (
        <p className="card p-5 text-sm">
          Birth details for {person.display_name} are incomplete.{" "}
          <Link href={`/people/${person.id}/edit`} className="font-semibold text-gold underline-offset-4 hover:underline">Complete details</Link>
        </p>
      )}

      <AssistantChat key={person.id} personId={person.id} enabled={configured && allowed && complete} />

      <footer className="rounded-xl border border-dashed border-line p-4 text-xs text-muted">
        The assistant describes traditional interpretation. It cannot predict events and is not financial, medical or legal advice. If an answer fails the fact check twice it is withheld rather than shown.
      </footer>
    </div>
  );
}
