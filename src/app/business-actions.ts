"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getBusinessStore, type Goal } from "@/lib/business-store";

const optNum = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().min(min).max(max).nullable());
const optText = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const MetricForm = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  revenue_inr: optNum(0, 1e12),
  gross_margin_pct: optNum(-100, 100),
  cash_inr: optNum(-1e12, 1e12),
  pipeline_inr: optNum(0, 1e12),
  deals_won: optNum(0, 1e6),
  team_size: optNum(0, 1e6),
  note: optText(1000),
});

export async function saveMetricAction(fd: FormData) {
  const parsed = MetricForm.safeParse(Object.fromEntries(["month", "revenue_inr", "gross_margin_pct", "cash_inr", "pipeline_inr", "deals_won", "team_size", "note"].map((k) => [k, fd.get(k) ?? ""])));
  if (!parsed.success) return;
  await (await getBusinessStore()).upsertMetric({ ...parsed.data, month: `${parsed.data.month}-01` });
  revalidatePath("/business");
}

export async function deleteMetricAction(month: string) {
  await (await getBusinessStore()).deleteMetric(month);
  revalidatePath("/business");
}

const GoalForm = z.object({
  title: z.string().trim().min(1).max(200),
  house: optNum(1, 12),
  target: optText(300),
  deadline: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("").transform(() => null)]),
});

export async function addGoalAction(fd: FormData) {
  const parsed = GoalForm.safeParse({ title: fd.get("title") ?? "", house: fd.get("house") ?? "", target: fd.get("target") ?? "", deadline: fd.get("deadline") ?? "" });
  if (!parsed.success) return;
  await (await getBusinessStore()).addGoal(parsed.data);
  revalidatePath("/business");
}

export async function setGoalStatusAction(id: string, status: Goal["status"]) {
  await (await getBusinessStore()).setGoalStatus(id, status);
  revalidatePath("/business");
}

const RetroForm = z.object({
  period_label: z.string().trim().min(1).max(120),
  indication: z.string().trim().min(1).max(1000),
  outcome: z.string().trim().min(1).max(2000),
  match_rating: z.coerce.number().int().min(1).max(5),
});

export async function addRetroAction(fd: FormData) {
  const parsed = RetroForm.safeParse({ period_label: fd.get("period_label") ?? "", indication: fd.get("indication") ?? "", outcome: fd.get("outcome") ?? "", match_rating: fd.get("match_rating") });
  if (!parsed.success) return;
  await (await getBusinessStore()).addRetro(parsed.data);
  revalidatePath("/business");
}

export async function deleteRetroAction(id: string) {
  await (await getBusinessStore()).deleteRetro(id);
  revalidatePath("/business");
}
