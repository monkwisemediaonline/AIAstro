"use client";

import { useTransition } from "react";
import { deleteSourceAction } from "@/app/library-actions";

export function DeleteSource({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-bad underline-offset-4 hover:underline"
      onClick={() => {
        if (confirm(`Remove "${title}" from the library? Reviews that cite it keep their status but lose the citation.`)) start(() => deleteSourceAction(id));
      }}
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
