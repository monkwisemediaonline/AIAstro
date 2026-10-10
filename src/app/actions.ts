"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { computeChart } from "@/engine/chart";
import { PersonInput, toBirthInput } from "@/lib/people";
import { getStore } from "@/lib/store";
import { createSupabaseServer } from "@/lib/supabase/server";

export type FormState = { ok: false; message: string; fieldErrors?: Record<string, string> } | null;

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return typeof v === "string" ? v : null;
}

/** Save birth details from the intake panel, then (optionally) calculate and open the chart. */
export async function savePersonAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = PersonInput.safeParse({
    display_name: str(fd, "display_name") ?? "",
    relationship: str(fd, "relationship"),
    birth_date: str(fd, "birth_date") ?? "",
    time_kind: str(fd, "time_kind"),
    birth_time: str(fd, "birth_time"),
    range_from: str(fd, "range_from"),
    range_to: str(fd, "range_to"),
    confidence: str(fd, "confidence"),
    place_name: str(fd, "place_name"),
    lat: str(fd, "lat"),
    lon: str(fd, "lon"),
    iana_tz: str(fd, "iana_tz"),
    place_source: str(fd, "place_source"),
    data_source: str(fd, "data_source"),
    notes: str(fd, "notes"),
    is_minor: fd.get("is_minor") === "on",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  const store = await getStore();
  const id = str(fd, "id");
  let personId: string;
  try {
    const person = id ? await store.updatePerson(id, parsed.data) : await store.createPerson(parsed.data);
    personId = person.id;

    if (fd.get("intent") === "calculate") {
      const input = toBirthInput(person);
      if (!input) return { ok: false, message: "Birth details are incomplete — the checklist shows what is missing." };
      const result = computeChart(input);
      await store.saveChart(person.id, input, result);
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not save." };
  }

  revalidatePath("/", "layout");
  redirect(`/people/${personId}`);
}

export async function recalculateAction(personId: string) {
  const store = await getStore();
  const person = await store.getPerson(personId);
  if (!person) redirect("/");
  const input = toBirthInput(person);
  if (!input) redirect(`/people/${personId}/edit`);
  await store.saveChart(personId, input, computeChart(input));
  revalidatePath(`/people/${personId}`);
}

export async function deletePersonAction(personId: string) {
  const store = await getStore();
  await store.deletePerson(personId);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email")?.trim() ?? "";
  const password = str(fd, "password") ?? "";
  if (!email || !password) return { ok: false, message: "Enter email and password." };
  const sb = await createSupabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "Sign-in failed. Check your email and password." };
  redirect("/");
}

export async function signOutAction() {
  const sb = await createSupabaseServer();
  await sb.auth.signOut();
  redirect("/login");
}
