import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="grid min-h-dvh place-items-center bg-navy px-4">
      <div className="w-full max-w-sm">
        <p className="text-center font-display text-4xl font-semibold text-[#f6eedb]">Jyotish Desk</p>
        <p className="mt-1 text-center text-[11px] uppercase tracking-[0.2em] text-[#d9ac52]">Private · Owner only</p>
        <div className="card mt-8 p-6">
          <Suspense fallback={<LoginForm notOwner={false} />}>
            <WithError searchParams={props.searchParams} />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-[#8f8670]">No public sign-up. Accounts are created by the owner in Supabase.</p>
      </div>
    </main>
  );
}

async function WithError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  return <LoginForm notOwner={sp.error === "not_owner"} />;
}
