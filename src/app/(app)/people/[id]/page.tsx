import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChartView } from "@/components/ChartView";
import { IntakePanel } from "@/components/IntakePanel";
import { DeleteButton, RecalcButton } from "@/components/PersonActions";
import { CONFIDENCE, describeTime, RELATIONSHIPS } from "@/lib/people";
import { getStore } from "@/lib/store";

export default function PersonPage(props: PageProps<"/people/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading chart…</p>}>
      <PersonContent params={props.params} />
    </Suspense>
  );
}

async function PersonContent({ params }: { params: PageProps<"/people/[id]">["params"] }) {
  const { id } = await params;
  const store = await getStore();
  const person = await store.getPerson(id);
  if (!person) notFound();
  const stored = await store.latestChart(id);
  const stale = stored && person.updated_at > stored.created_at;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{RELATIONSHIPS[person.relationship]}</p>
          <h1 className="font-display text-4xl font-semibold">{person.display_name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {person.birth_date ?? "Date not set"} · {describeTime(person)} · {person.place_name ?? "Place not set"}
            <span className="ml-2 chip bg-surface-2 text-ink-soft">{CONFIDENCE[person.confidence]}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/people/${id}/edit`} className="btn btn-ghost">Edit details</Link>
          {stored && <RecalcButton personId={id} />}
          <Link href={`/partner?a=${id}`} className="btn btn-ghost">Partner Vibes</Link>
          <DeleteButton personId={id} name={person.display_name} />
        </div>
      </header>

      {stale && (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">Details changed after this chart was calculated. Recalculate to update.</p>
      )}

      {stored ? (
        <ChartView result={stored.payload} />
      ) : (
        <>
          <p className="rounded-xl bg-gold-soft px-4 py-3 text-sm">
            <b>Not calculated yet.</b> Complete the details below and press <b>Confirm details &amp; calculate</b>.
          </p>
          <IntakePanel person={person} />
        </>
      )}
    </div>
  );
}
