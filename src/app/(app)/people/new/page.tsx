import { Suspense } from "react";
import { IntakePanel } from "@/components/IntakePanel";
import { RELATIONSHIPS } from "@/lib/people";

export default function NewPersonPage(props: PageProps<"/people/new">) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Birth details</p>
        <h1 className="font-display text-4xl font-semibold">Add a person</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Fill in what you know. The &ldquo;Before calculation&rdquo; checklist shows what can be calculated with these details; calculation unlocks once the essentials are in.
        </p>
      </header>
      <Suspense fallback={<IntakePanel />}>
        <WithRelationship searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function WithRelationship({ searchParams }: { searchParams: PageProps<"/people/new">["searchParams"] }) {
  const sp = await searchParams;
  const rel = typeof sp.rel === "string" && sp.rel in RELATIONSHIPS ? (sp.rel as keyof typeof RELATIONSHIPS) : "self";
  return <IntakePanel defaultRelationship={rel} />;
}
