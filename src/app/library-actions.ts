"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLibraryStore } from "@/lib/library-store";
import type { ItemKind } from "@/library/reviews";

const text = (max: number) => z.string().trim().max(max).transform((v) => v || null);

function refresh() {
  // Review status is shown on these pages too.
  for (const p of ["/library", "/yoga", "/remedies", "/business"]) revalidatePath(p);
}

const SourceForm = z.object({
  title: z.string().trim().min(1).max(300),
  author: text(200),
  edition: text(300),
  language: text(60),
  owned: z.boolean(),
  notes: text(2000),
});

export async function addSourceAction(fd: FormData) {
  const parsed = SourceForm.safeParse({
    title: fd.get("title") ?? "",
    author: fd.get("author") ?? "",
    edition: fd.get("edition") ?? "",
    language: fd.get("language") ?? "",
    owned: fd.get("owned") === "on",
    notes: fd.get("notes") ?? "",
  });
  if (!parsed.success) return;
  await (await getLibraryStore()).addSource(parsed.data);
  refresh();
}

export async function deleteSourceAction(id: string) {
  await (await getLibraryStore()).deleteSource(id);
  refresh();
}

const ReviewForm = z.object({
  item_kind: z.enum(["yoga_rule", "remedy"]),
  item_key: z.string().min(1).max(80),
  status: z.enum(["verified", "disputed", "disabled", "unverified"]),
  source_id: z.union([z.string().uuid(), z.literal("").transform(() => null)]),
  locator: text(200),
  note: text(2000),
});

export async function saveReviewAction(fd: FormData) {
  const parsed = ReviewForm.safeParse({
    item_kind: fd.get("item_kind"),
    item_key: fd.get("item_key"),
    status: fd.get("status"),
    source_id: fd.get("source_id") ?? "",
    locator: fd.get("locator") ?? "",
    note: fd.get("note") ?? "",
  });
  if (!parsed.success) return;
  const store = await getLibraryStore();
  const { status, ...rest } = parsed.data;
  // Setting an item back to "draft" simply removes its review.
  if (status === "unverified") await store.clearReview(rest.item_kind as ItemKind, rest.item_key);
  else await store.saveReview({ ...rest, status });
  refresh();
}
