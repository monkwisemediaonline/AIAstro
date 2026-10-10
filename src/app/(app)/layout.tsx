import { Suspense } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { getStore } from "@/lib/store";
import { supabaseEnv } from "@/lib/supabase/env";
import { signOutAction } from "@/app/actions";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const hosted = !!supabaseEnv();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-20 bg-navy px-4 py-3 lg:h-dvh lg:overflow-y-auto lg:px-4 lg:py-6">
        <div className="flex items-center justify-between gap-3 lg:block">
          <Link href="/" className="block px-3">
            <span className="font-display text-2xl font-semibold text-[#f6eedb]">Jyotish Desk</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-[#d9ac52]">Private · Owner only</span>
          </Link>
          {hosted && (
            <form action={signOutAction} className="lg:hidden">
              <button className="text-xs text-[#c9c2b0] underline">Sign out</button>
            </form>
          )}
        </div>
        <div className="mt-3 lg:mt-8">
          <Suspense fallback={<NavSkeleton />}>
            <NavWithPeople />
          </Suspense>
        </div>
        {hosted && (
          <form action={signOutAction} className="mt-8 hidden px-3 lg:block">
            <button className="text-xs text-[#c9c2b0] underline-offset-4 hover:underline">Sign out</button>
          </form>
        )}
        {!hosted && (
          <p className="mt-8 hidden rounded-lg border border-[#d9ac52]/30 px-3 py-2 text-[11px] leading-snug text-[#d9ac52] lg:block">
            Local dev mode — data saved to <code>data/dev-store.json</code>. Connect Supabase to go live.
          </p>
        )}
      </aside>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}

function NavSkeleton() {
  return (
    <div className="space-y-2 px-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-8 rounded-lg bg-white/5" />
      ))}
    </div>
  );
}

async function NavWithPeople() {
  const store = await getStore();
  const people = await store.listPeople();
  return <Nav people={people.map((p) => ({ id: p.id, name: p.display_name }))} />;
}
