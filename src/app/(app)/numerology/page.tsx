import { Suspense } from "react";
import { NumerologyLab } from "@/components/NumerologyLab";
import { getStore } from "@/lib/store";

export default function NumerologyPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Numbers</p>
        <h1 className="font-display text-4xl font-semibold">Numerology</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Name, birth-date and number numerology under three separate systems. Every letter value and every step of the arithmetic is shown.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Lab />
      </Suspense>
    </div>
  );
}

async function Lab() {
  const store = await getStore();
  const people = await store.listPeople();
  const ordered = [...people].sort((a, b) => Number(b.relationship === "self") - Number(a.relationship === "self"));
  return (
    <NumerologyLab
      people={ordered.map((p) => ({ id: p.id, name: p.display_name, birthDate: p.birth_date }))}
      currentYear={new Date().getFullYear()}
    />
  );
}
