"use client";

import { useState, useTransition } from "react";
import { deleteDaanAction, logPracticeAction, setPracticeStatusAction } from "@/app/remedy-actions";
import type { PracticeStatus } from "@/lib/remedy-store";

/** Tap counter for japa. Counts stay in the browser until "Save session" is pressed. */
export function JapaCounter({ practiceId }: { practiceId: string }) {
  const [count, setCount] = useState(0);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setCount((c) => c + 1)} className="btn btn-primary min-w-28 text-lg" aria-label="Add one repetition">
        <span className="tabular">{count}</span>
        <span className="text-xs font-normal opacity-80">tap +1</span>
      </button>
      <button type="button" onClick={() => setCount((c) => c + 108)} className="btn btn-ghost">+108 (one mala)</button>
      <button type="button" onClick={() => setCount(0)} className="btn btn-ghost" disabled={count === 0}>Reset</button>
      <button
        type="button"
        className="btn btn-gold"
        disabled={count === 0 || pending}
        onClick={() =>
          start(async () => {
            await logPracticeAction(practiceId, count);
            setCount(0);
          })
        }
      >
        {pending ? "Saving…" : "Save session"}
      </button>
    </div>
  );
}

/** For practices without a count (service, conduct): mark today as done. */
export function DoneToday({ practiceId, doneToday }: { practiceId: string; doneToday: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn btn-gold" disabled={pending || doneToday} onClick={() => start(() => logPracticeAction(practiceId, 1))}>
      {doneToday ? "Done today ✓" : pending ? "Saving…" : "Mark done today"}
    </button>
  );
}

export function PracticeStatusButton({ practiceId, to, label }: { practiceId: string; to: PracticeStatus; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="text-xs font-semibold text-ink-soft underline-offset-4 hover:underline" disabled={pending} onClick={() => start(() => setPracticeStatusAction(practiceId, to))}>
      {pending ? "…" : label}
    </button>
  );
}

export function DeleteDaan({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="text-xs text-bad underline-offset-4 hover:underline"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this entry?")) start(() => deleteDaanAction(id));
      }}
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
