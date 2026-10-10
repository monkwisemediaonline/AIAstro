import { Suspense } from "react";
import { notFound } from "next/navigation";
import { IntakePanel } from "@/components/IntakePanel";
import { getStore } from "@/lib/store";

export default function EditPersonPage(props: PageProps<"/people/[id]/edit">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Birth details</p>
        <h1 className="font-display text-4xl font-semibold">Edit details</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">Changing date, time or place creates a new calculation; earlier results stay stored with their settings.</p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <EditForm params={props.params} />
      </Suspense>
    </div>
  );
}

async function EditForm({ params }: { params: PageProps<"/people/[id]/edit">["params"] }) {
  const { id } = await params;
  const store = await getStore();
  const person = await store.getPerson(id);
  if (!person) notFound();
  return <IntakePanel person={person} />;
}
