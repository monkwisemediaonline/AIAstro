import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { createSupabaseServer } from "./supabase/server";
import { isLocalDevStore, supabaseEnv } from "./supabase/env";

export type PracticeKind = "mantra" | "seva" | "daan" | "puja" | "vrat" | "gemstone" | "other";
export type PracticeStatus = "active" | "paused" | "done" | "dropped";

export type Practice = {
  id: string;
  person_id: string | null;
  remedy_key: string | null;
  planet: string | null;
  kind: PracticeKind;
  title: string;
  target_count: number | null;
  started_on: string;
  status: PracticeStatus;
  notes: string | null;
  /** Derived from logs. */
  total_count: number;
  sessions: number;
  last_logged: string | null;
};

export type NewPractice = Pick<Practice, "person_id" | "remedy_key" | "planet" | "kind" | "title" | "target_count" | "notes">;

export type Daan = { id: string; log_date: string; item: string; recipient: string | null; amount_inr: number; planet: string | null; note: string | null };
export type NewDaan = Omit<Daan, "id">;

/** Thrown when the remedies tables have not been created in Supabase yet. */
export class SetupNeeded extends Error {
  constructor() {
    super("Remedy tables are not set up");
    this.name = "SetupNeeded";
  }
}

export interface RemedyStore {
  listPractices(): Promise<Practice[]>;
  createPractice(input: NewPractice): Promise<void>;
  setPracticeStatus(id: string, status: PracticeStatus): Promise<void>;
  logPractice(practiceId: string, count: number, note: string | null): Promise<void>;
  listDaan(sinceDate: string): Promise<Daan[]>;
  addDaan(input: NewDaan): Promise<void>;
  deleteDaan(id: string): Promise<void>;
  getDaanCap(): Promise<number | null>;
  setDaanCap(cap: number | null): Promise<void>;
}

const today = () => new Date().toISOString().slice(0, 10);

// ---------------- Supabase ----------------

async function supabaseRemedyStore(): Promise<RemedyStore> {
  const sb = await createSupabaseServer();
  const check = (e: { message: string; code?: string } | null) => {
    if (!e) return;
    if (e.code === "PGRST205" || e.code === "42P01") throw new SetupNeeded();
    throw new Error(e.message);
  };
  return {
    async listPractices() {
      const { data, error } = await sb.from("practices").select("*, practice_logs(count, log_date)").order("created_at");
      check(error);
      type Row = Omit<Practice, "total_count" | "sessions" | "last_logged"> & { practice_logs: { count: number; log_date: string }[] };
      return ((data ?? []) as Row[]).map(({ practice_logs, ...p }) => ({
        ...p,
        total_count: practice_logs.reduce((s, l) => s + l.count, 0),
        sessions: practice_logs.length,
        last_logged: practice_logs.map((l) => l.log_date).sort().at(-1) ?? null,
      }));
    },
    async createPractice(input) {
      check((await sb.from("practices").insert(input)).error);
    },
    async setPracticeStatus(id, status) {
      check((await sb.from("practices").update({ status }).eq("id", id)).error);
    },
    async logPractice(practiceId, count, note) {
      check((await sb.from("practice_logs").insert({ practice_id: practiceId, count, note })).error);
    },
    async listDaan(sinceDate) {
      const { data, error } = await sb.from("daan_logs").select("id, log_date, item, recipient, amount_inr, planet, note").gte("log_date", sinceDate).order("log_date", { ascending: false });
      check(error);
      return ((data ?? []) as Daan[]).map((d) => ({ ...d, amount_inr: Number(d.amount_inr) }));
    },
    async addDaan(input) {
      check((await sb.from("daan_logs").insert(input)).error);
    },
    async deleteDaan(id) {
      check((await sb.from("daan_logs").delete().eq("id", id)).error);
    },
    async getDaanCap() {
      const { data, error } = await sb.from("owner_settings").select("daan_monthly_cap_inr").maybeSingle();
      check(error);
      return data?.daan_monthly_cap_inr == null ? null : Number(data.daan_monthly_cap_inr);
    },
    async setDaanCap(cap) {
      const { data } = await sb.auth.getUser();
      if (!data.user) throw new Error("Not signed in");
      check((await sb.from("owner_settings").upsert({ owner_id: data.user.id, daan_monthly_cap_inr: cap, updated_at: new Date().toISOString() })).error);
    },
  };
}

// ---------------- Local dev (JSON file in data/, git-ignored) ----------------

type DevDb = {
  practices: Omit<Practice, "total_count" | "sessions" | "last_logged">[];
  logs: { practice_id: string; count: number; log_date: string; note: string | null }[];
  daan: Daan[];
  cap: number | null;
};
const FILE = path.join(process.cwd(), "data", "dev-remedies.json");

async function read(): Promise<DevDb> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as DevDb;
  } catch {
    return { practices: [], logs: [], daan: [], cap: null };
  }
}
async function write(db: DevDb) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(db, null, 2));
}

function localRemedyStore(): RemedyStore {
  return {
    async listPractices() {
      const db = await read();
      return db.practices.map((p) => {
        const logs = db.logs.filter((l) => l.practice_id === p.id);
        return { ...p, total_count: logs.reduce((s, l) => s + l.count, 0), sessions: logs.length, last_logged: logs.map((l) => l.log_date).sort().at(-1) ?? null };
      });
    },
    async createPractice(input) {
      const db = await read();
      db.practices.push({ ...input, id: randomUUID(), started_on: today(), status: "active" });
      await write(db);
    },
    async setPracticeStatus(id, status) {
      const db = await read();
      const p = db.practices.find((x) => x.id === id);
      if (p) p.status = status;
      await write(db);
    },
    async logPractice(practiceId, count, note) {
      const db = await read();
      db.logs.push({ practice_id: practiceId, count, note, log_date: today() });
      await write(db);
    },
    async listDaan(sinceDate) {
      return (await read()).daan.filter((d) => d.log_date >= sinceDate).sort((a, b) => b.log_date.localeCompare(a.log_date));
    },
    async addDaan(input) {
      const db = await read();
      db.daan.push({ ...input, id: randomUUID() });
      await write(db);
    },
    async deleteDaan(id) {
      const db = await read();
      db.daan = db.daan.filter((d) => d.id !== id);
      await write(db);
    },
    async getDaanCap() {
      return (await read()).cap;
    },
    async setDaanCap(cap) {
      const db = await read();
      db.cap = cap;
      await write(db);
    },
  };
}

export async function getRemedyStore(): Promise<RemedyStore> {
  await connection();
  if (supabaseEnv()) return supabaseRemedyStore();
  if (isLocalDevStore()) return localRemedyStore();
  throw new Error("Supabase environment variables are missing.");
}
