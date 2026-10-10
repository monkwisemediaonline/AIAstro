import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CHART_SCHEMA_VERSION, type BirthInput, type ChartResult } from "@/engine/chart";
import { ENGINE_NAME, ENGINE_VERSION } from "@/engine/astro";
import { normalisePerson, type Person, type PersonInput } from "./people";
import { createSupabaseServer } from "./supabase/server";
import { isLocalDevStore, supabaseEnv } from "./supabase/env";

export type StoredChart = { id: string; person_id: string; input_hash: string; payload: ChartResult; created_at: string };

export interface Store {
  mode: "supabase" | "local-dev";
  listPeople(): Promise<Person[]>;
  getPerson(id: string): Promise<Person | null>;
  createPerson(input: PersonInput): Promise<Person>;
  updatePerson(id: string, input: PersonInput): Promise<Person>;
  deletePerson(id: string): Promise<void>;
  latestChart(personId: string): Promise<StoredChart | null>;
  saveChart(personId: string, input: BirthInput, result: ChartResult): Promise<StoredChart>;
}

export function chartInputHash(input: BirthInput): string {
  const canonical = JSON.stringify({ input, schema: CHART_SCHEMA_VERSION, engine: ENGINE_NAME, v: ENGINE_VERSION });
  return createHash("sha256").update(canonical).digest("hex");
}

// ---------------- Supabase ----------------

async function supabaseStore(): Promise<Store> {
  const sb = await createSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: owner } = await sb.from("app_owner").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  if (!owner) redirect("/login?error=not_owner");

  const fail = (e: { message: string } | null) => {
    if (e) throw new Error(e.message);
  };

  return {
    mode: "supabase",
    async listPeople() {
      const { data, error } = await sb.from("people").select("*").order("created_at");
      fail(error);
      return (data as Person[]).map(normalisePerson);
    },
    async getPerson(id) {
      const { data, error } = await sb.from("people").select("*").eq("id", id).maybeSingle();
      fail(error);
      return data ? normalisePerson(data as Person) : null;
    },
    async createPerson(input) {
      const { data, error } = await sb.from("people").insert(input).select("*").single();
      fail(error);
      return normalisePerson(data as Person);
    },
    async updatePerson(id, input) {
      const { data, error } = await sb.from("people").update(input).eq("id", id).select("*").single();
      fail(error);
      return normalisePerson(data as Person);
    },
    async deletePerson(id) {
      const { error } = await sb.from("people").delete().eq("id", id);
      fail(error);
    },
    async latestChart(personId) {
      const { data, error } = await sb
        .from("chart_results")
        .select("id, person_id, input_hash, payload, created_at")
        .eq("person_id", personId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      fail(error);
      return (data as StoredChart) ?? null;
    },
    async saveChart(personId, input, result) {
      const row = {
        person_id: personId,
        input_hash: chartInputHash(input),
        schema_version: result.schemaVersion,
        engine: result.settings.engine,
        engine_version: result.settings.engineVersion,
        settings: result.settings,
        payload: result,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await sb
        .from("chart_results")
        .upsert(row, { onConflict: "person_id,input_hash" })
        .select("id, person_id, input_hash, payload, created_at")
        .single();
      fail(error);
      await sb.from("people").update({ status: "confirmed" }).eq("id", personId);
      return data as StoredChart;
    },
  };
}

// ---------------- Local dev (JSON file in data/, git-ignored) ----------------

type DevDb = { people: Person[]; charts: StoredChart[] };
const DEV_FILE = path.join(process.cwd(), "data", "dev-store.json");

async function readDev(): Promise<DevDb> {
  try {
    return JSON.parse(await readFile(DEV_FILE, "utf8")) as DevDb;
  } catch {
    return { people: [], charts: [] };
  }
}
async function writeDev(db: DevDb) {
  await mkdir(path.dirname(DEV_FILE), { recursive: true });
  await writeFile(DEV_FILE, JSON.stringify(db, null, 2));
}

function localDevStore(): Store {
  return {
    mode: "local-dev",
    async listPeople() {
      return (await readDev()).people;
    },
    async getPerson(id) {
      return (await readDev()).people.find((p) => p.id === id) ?? null;
    },
    async createPerson(input) {
      const db = await readDev();
      const now = new Date().toISOString();
      const p: Person = { ...input, id: randomUUID(), status: "draft", created_at: now, updated_at: now };
      db.people.push(p);
      await writeDev(db);
      return p;
    },
    async updatePerson(id, input) {
      const db = await readDev();
      const i = db.people.findIndex((p) => p.id === id);
      if (i < 0) throw new Error("Person not found");
      db.people[i] = { ...db.people[i], ...input, updated_at: new Date().toISOString() };
      await writeDev(db);
      return db.people[i];
    },
    async deletePerson(id) {
      const db = await readDev();
      db.people = db.people.filter((p) => p.id !== id);
      db.charts = db.charts.filter((c) => c.person_id !== id);
      await writeDev(db);
    },
    async latestChart(personId) {
      const list = (await readDev()).charts.filter((c) => c.person_id === personId);
      return list.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
    },
    async saveChart(personId, input, result) {
      const db = await readDev();
      const hash = chartInputHash(input);
      db.charts = db.charts.filter((c) => !(c.person_id === personId && c.input_hash === hash));
      const row: StoredChart = { id: randomUUID(), person_id: personId, input_hash: hash, payload: result, created_at: new Date().toISOString() };
      db.charts.push(row);
      const p = db.people.find((x) => x.id === personId);
      if (p) p.status = "confirmed";
      await writeDev(db);
      return row;
    },
  };
}

/** Returns the data store for the signed-in owner. Redirects to /login otherwise. */
export async function getStore(): Promise<Store> {
  // Private data is always read at request time, never baked into a prerendered shell.
  await connection();
  if (supabaseEnv()) return supabaseStore();
  if (isLocalDevStore()) return localDevStore();
  throw new Error("Supabase environment variables are missing.");
}
