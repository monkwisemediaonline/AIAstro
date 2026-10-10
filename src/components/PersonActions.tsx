"use client";

import { useTransition } from "react";
import { deletePersonAction, recalculateAction } from "@/app/actions";

export function RecalcButton({ personId }: { personId: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-ghost" disabled={pending} onClick={() => start(() => recalculateAction(personId))}>
      {pending ? "Calculating…" : "Recalculate"}
    </button>
  );
}

export function DeleteButton({ personId, name }: { personId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-ghost text-bad"
      disabled={pending}
      onClick={() => {
        if (confirm(`Permanently delete ${name} and all their charts? This cannot be undone.`)) start(() => deletePersonAction(personId));
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
