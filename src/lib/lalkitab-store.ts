import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { SetupNeeded } from "./remedy-store";
import { createSupabaseServer } from "./supabase/server";
import { isLocalDevStore, supabaseEnv } from "./supabase/env";

export type LkNote = {
  id: string;
  planet: string;
  house: number;
  reading: string;
  upay: string | null;
  source: string;
  locator: string | null;
  confidence: "high" | "medium" | "low";
  safety_checked: boolean;
  created_at: string;
};
export type NewLkNote = Omit<LkNote, "id" | "created_at">;

export interface LkStore {
  listNotes(): Promise<LkNote[]>;
  addNote(input: NewLkNote): Promise<void>;
  deleteNote(id: string): Promise<void>;
}

const FILE = path.join(process.cwd(), "data", "dev-lalkitab.json");
async function read(): Promise<LkNote[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as LkNote[];
  } catch {
    return [];
  }
}
async function write(rows: LkNote[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(rows, null, 2));
}

export async function getLkStore(): Promise<LkStore> {
  await connection();
  if (supabaseEnv()) {
    const sb = await createSupabaseServer();
    const check = (e: { message: string; code?: string } | null) => {
      if (!e) return;
      if (e.code === "PGRST205" || e.code === "42P01") throw new SetupNeeded();
      throw new Error(e.message);
    };
    return {
      async listNotes() {
        const { data, error } = await sb.from("lk_notes").select("id, planet, house, reading, upay, source, locator, confidence, safety_checked, created_at").order("created_at");
        check(error);
        return (data ?? []) as LkNote[];
      },
      async addNote(input) {
        check((await sb.from("lk_notes").insert(input)).error);
      },
      async deleteNote(id) {
        check((await sb.from("lk_notes").delete().eq("id", id)).error);
      },
    };
  }
  if (isLocalDevStore()) {
    return {
      listNotes: read,
      async addNote(input) {
        await write([...(await read()), { ...input, id: randomUUID(), created_at: new Date().toISOString() }]);
      },
      async deleteNote(id) {
        await write((await read()).filter((n) => n.id !== id));
      },
    };
  }
  throw new Error("Supabase environment variables are missing.");
}
