"use client";

import { useTransition } from "react";
import { deleteLkNoteAction } from "@/app/lalkitab-actions";

export function DeleteLkNote({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="text-xs text-bad underline-offset-4 hover:underline"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this note?")) start(() => deleteLkNoteAction(id));
      }}
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
