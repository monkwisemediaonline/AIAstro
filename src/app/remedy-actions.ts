"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRemedyStore, type PracticeStatus } from "@/lib/remedy-store";

const text = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const PracticeForm = z.object({
  person_id: z.string().uuid().nullable().catch(null),
  remedy_key: text(80),
  planet: text(20),
  kind: z.enum(["mantra", "seva", "daan", "puja", "vrat", "gemstone", "other"]),
  title: z.string().trim().min(1).max(200),
  target_count: z.coerce.number().int().positive().max(10_000_000).nullable().catch(null),
  notes: text(1000),
});

export async function startPracticeAction(fd: FormData) {
  const parsed = PracticeForm.safeParse({
    person_id: fd.get("person_id") || null,
    remedy_key: fd.get("remedy_key") ?? "",
    planet: fd.get("planet") ?? "",
    kind: fd.get("kind"),
    title: fd.get("title") ?? "",
    target_count: fd.get("target_count") || null,
    notes: fd.get("notes") ?? "",
  });
  if (!parsed.success) return;
  await (await getRemedyStore()).createPractice(parsed.data);
  revalidatePath("/remedies");
}

export async function logPracticeAction(practiceId: string, count: number, note?: string) {
  if (!Number.isInteger(count) || count < 0 || count > 1_000_000) return;
  await (await getRemedyStore()).logPractice(practiceId, count, note?.trim().slice(0, 500) || null);
  revalidatePath("/remedies");
}

export async function setPracticeStatusAction(practiceId: string, status: PracticeStatus) {
  await (await getRemedyStore()).setPracticeStatus(practiceId, status);
  revalidatePath("/remedies");
}

const DaanForm = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  item: z.string().trim().min(1).max(200),
  recipient: text(200),
  amount_inr: z.coerce.number().min(0).max(100_000_000),
  planet: text(20),
  note: text(500),
});

export async function addDaanAction(fd: FormData) {
  const parsed = DaanForm.safeParse({
    log_date: fd.get("log_date"),
    item: fd.get("item") ?? "",
    recipient: fd.get("recipient") ?? "",
    amount_inr: fd.get("amount_inr") || 0,
    planet: fd.get("planet") ?? "",
    note: fd.get("note") ?? "",
  });
  if (!parsed.success) return;
  await (await getRemedyStore()).addDaan(parsed.data);
  revalidatePath("/remedies");
}

export async function deleteDaanAction(id: string) {
  await (await getRemedyStore()).deleteDaan(id);
  revalidatePath("/remedies");
}

export async function setDaanCapAction(fd: FormData) {
  const raw = fd.get("cap");
  const cap = raw === "" || raw === null ? null : Number(raw);
  if (cap !== null && (!Number.isFinite(cap) || cap < 0)) return;
  await (await getRemedyStore()).setDaanCap(cap);
  revalidatePath("/remedies");
}
