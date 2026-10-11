import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { SetupNeeded } from "./remedy-store";
import { createSupabaseServer } from "./supabase/server";
import { isLocalDevStore, supabaseEnv } from "./supabase/env";

export type Metric = {
  month: string; // YYYY-MM-01
  revenue_inr: number | null;
  gross_margin_pct: number | null;
  cash_inr: number | null;
  pipeline_inr: number | null;
  deals_won: number | null;
  team_size: number | null;
  note: string | null;
};
export type Goal = { id: string; title: string; house: number | null; target: string | null; deadline: string | null; status: "open" | "done" | "dropped" };
export type NewGoal = Omit<Goal, "id" | "status">;
export type Retro = { id: string; period_label: string; indication: string; outcome: string; match_rating: number; created_at: string };
export type NewRetro = Omit<Retro, "id" | "created_at">;

export interface BusinessStore {
  listMetrics(): Promise<Metric[]>; // oldest first
  upsertMetric(m: Metric): Promise<void>;
  deleteMetric(month: string): Promise<void>;
  listGoals(): Promise<Goal[]>;
  addGoal(g: NewGoal): Promise<void>;
  setGoalStatus(id: string, status: Goal["status"]): Promise<void>;
  listRetros(): Promise<Retro[]>;
  addRetro(r: NewRetro): Promise<void>;
  deleteRetro(id: string): Promise<void>;
}

type DevDb = { metrics: Metric[]; goals: Goal[]; retros: Retro[] };
const FILE = path.join(process.cwd(), "data", "dev-business.json");
async function read(): Promise<DevDb> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as DevDb;
  } catch {
    return { metrics: [], goals: [], retros: [] };
  }
}
async function write(db: DevDb) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(db, null, 2));
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getBusinessStore(): Promise<BusinessStore> {
  await connection();
  if (supabaseEnv()) {
    const sb = await createSupabaseServer();
    const check = (e: { message: string; code?: string } | null) => {
      if (!e) return;
      if (e.code === "PGRST205" || e.code === "42P01") throw new SetupNeeded();
      throw new Error(e.message);
    };
    const ownerId = async () => {
      const { data } = await sb.auth.getUser();
      if (!data.user) throw new Error("Not signed in");
      return data.user.id;
    };
    return {
      async listMetrics() {
        const { data, error } = await sb.from("business_metrics").select("month, revenue_inr, gross_margin_pct, cash_inr, pipeline_inr, deals_won, team_size, note").order("month");
        check(error);
        return ((data ?? []) as Metric[]).map((m) => ({ ...m, revenue_inr: num(m.revenue_inr), gross_margin_pct: num(m.gross_margin_pct), cash_inr: num(m.cash_inr), pipeline_inr: num(m.pipeline_inr) }));
      },
      async upsertMetric(m) {
        check((await sb.from("business_metrics").upsert({ ...m, owner_id: await ownerId(), updated_at: new Date().toISOString() }, { onConflict: "owner_id,month" })).error);
      },
      async deleteMetric(month) {
        check((await sb.from("business_metrics").delete().eq("month", month)).error);
      },
      async listGoals() {
        const { data, error } = await sb.from("business_goals").select("id, title, house, target, deadline, status").order("created_at");
        check(error);
        return (data ?? []) as Goal[];
      },
      async addGoal(g) {
        check((await sb.from("business_goals").insert(g)).error);
      },
      async setGoalStatus(id, status) {
        check((await sb.from("business_goals").update({ status }).eq("id", id)).error);
      },
      async listRetros() {
        const { data, error } = await sb.from("retrospectives").select("id, period_label, indication, outcome, match_rating, created_at").order("created_at", { ascending: false });
        check(error);
        return (data ?? []) as Retro[];
      },
      async addRetro(r) {
        check((await sb.from("retrospectives").insert(r)).error);
      },
      async deleteRetro(id) {
        check((await sb.from("retrospectives").delete().eq("id", id)).error);
      },
    };
  }
  if (isLocalDevStore()) {
    return {
      async listMetrics() {
        return (await read()).metrics.sort((a, b) => a.month.localeCompare(b.month));
      },
      async upsertMetric(m) {
        const db = await read();
        db.metrics = [...db.metrics.filter((x) => x.month !== m.month), m];
        await write(db);
      },
      async deleteMetric(month) {
        const db = await read();
        db.metrics = db.metrics.filter((x) => x.month !== month);
        await write(db);
      },
      async listGoals() {
        return (await read()).goals;
      },
      async addGoal(g) {
        const db = await read();
        db.goals.push({ ...g, id: randomUUID(), status: "open" });
        await write(db);
      },
      async setGoalStatus(id, status) {
        const db = await read();
        const g = db.goals.find((x) => x.id === id);
        if (g) g.status = status;
        await write(db);
      },
      async listRetros() {
        return (await read()).retros.sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      async addRetro(r) {
        const db = await read();
        db.retros.push({ ...r, id: randomUUID(), created_at: new Date().toISOString() });
        await write(db);
      },
      async deleteRetro(id) {
        const db = await read();
        db.retros = db.retros.filter((x) => x.id !== id);
        await write(db);
      },
    };
  }
  throw new Error("Supabase environment variables are missing.");
}
