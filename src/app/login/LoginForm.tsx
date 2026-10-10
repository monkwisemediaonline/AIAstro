"use client";

import { useActionState } from "react";
import { signInAction, type FormState } from "@/app/actions";

export function LoginForm({ notOwner }: { notOwner: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, null);
  return (
    <form action={action} className="space-y-4">
      {notOwner && (
        <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">This account is not the portal owner.</p>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {state && !state.ok && <p className="text-sm text-bad" role="alert">{state.message}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
