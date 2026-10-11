"use client";

import { useTransition } from "react";
import { deleteMetricAction, deleteRetroAction, setGoalStatusAction } from "@/app/business-actions";
import type { Goal } from "@/lib/business-store";

function Link({ label, run, danger, confirmText }: { label: string; run: () => Promise<void>; danger?: boolean; confirmText?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={`text-xs underline-offset-4 hover:underline ${danger ? "text-bad" : "font-semibold text-ink-soft"}`}
      onClick={() => {
        if (!confirmText || confirm(confirmText)) start(run);
      }}
    >
      {pending ? "…" : label}
    </button>
  );
}

export const DeleteMetric = ({ month }: { month: string }) => <Link label="Delete" danger confirmText="Delete this month's figures?" run={() => deleteMetricAction(month)} />;
export const DeleteRetro = ({ id }: { id: string }) => <Link label="Delete" danger confirmText="Delete this entry?" run={() => deleteRetroAction(id)} />;
export const GoalStatus = ({ id, to, label }: { id: string; to: Goal["status"]; label: string }) => <Link label={label} run={() => setGoalStatusAction(id, to)} />;
