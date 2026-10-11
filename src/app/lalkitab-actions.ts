"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PLANETS } from "@/engine/constants";
import { getLkStore } from "@/lib/lalkitab-store";

const NoteForm = z.object({
  planet: z.enum(PLANETS),
  house: z.coerce.number().int().min(1).max(12),
  reading: z.string().trim().min(1).max(4000),
  upay: z.string().trim().max(4000).transform((v) => v || null),
  source: z.string().trim().min(1).max(300),
  locator: z.string().trim().max(120).transform((v) => v || null),
  confidence: z.enum(["high", "medium", "low"]),
  safety_checked: z.boolean(),
});

export async function addLkNoteAction(fd: FormData) {
  const parsed = NoteForm.safeParse({
    planet: fd.get("planet"),
    house: fd.get("house"),
    reading: fd.get("reading") ?? "",
    upay: fd.get("upay") ?? "",
    source: fd.get("source") ?? "",
    locator: fd.get("locator") ?? "",
    confidence: fd.get("confidence") ?? "medium",
    safety_checked: fd.get("safety_checked") === "on",
  });
  if (!parsed.success) return;
  await (await getLkStore()).addNote(parsed.data);
  revalidatePath("/lal-kitab");
}

export async function deleteLkNoteAction(id: string) {
  await (await getLkStore()).deleteNote(id);
  revalidatePath("/lal-kitab");
}
