import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { EMPTY_INDEX, indexReviews, type ItemKind, type LibSource, type Review, type ReviewIndex } from "@/library/reviews";
import { SetupNeeded } from "./remedy-store";
import { createSupabaseServer } from "./supabase/server";
import { isLocalDevStore, supabaseEnv } from "./supabase/env";

export type NewSource = Omit<LibSource, "id">;
export type NewReview = Omit<Review, "reviewed_at">;

export interface LibraryStore {
  listSources(): Promise<LibSource[]>;
  addSource(s: NewSource): Promise<void>;
  deleteSource(id: string): Promise<void>;
  listReviews(): Promise<Review[]>;
  saveReview(r: NewReview): Promise<void>;
  clearReview(kind: ItemKind, key: string): Promise<void>;
}

type DevDb = { sources: LibSource[]; reviews: Review[] };
const FILE = path.join(process.cwd(), "data", "dev-library.json");
async function read(): Promise<DevDb> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as DevDb;
  } catch {
    return { sources: [], reviews: [] };
  }
}
async function write(db: DevDb) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(db, null, 2));
}

export async function getLibraryStore(): Promise<LibraryStore> {
  await connection();
  if (supabaseEnv()) {
    const sb = await createSupabaseServer();
    const check = (e: { message: string; code?: string } | null) => {
      if (!e) return;
      if (e.code === "PGRST205" || e.code === "42P01") throw new SetupNeeded();
      throw new Error(e.message);
    };
    return {
      async listSources() {
        const { data, error } = await sb.from("lib_sources").select("id, title, author, edition, language, owned, notes").order("created_at");
        check(error);
        return (data ?? []) as LibSource[];
      },
      async addSource(s) {
        check((await sb.from("lib_sources").insert(s)).error);
      },
      async deleteSource(id) {
        check((await sb.from("lib_sources").delete().eq("id", id)).error);
      },
      async listReviews() {
        const { data, error } = await sb.from("lib_reviews").select("item_kind, item_key, status, source_id, locator, note, reviewed_at");
        check(error);
        return (data ?? []) as Review[];
      },
      async saveReview(r) {
        const { data } = await sb.auth.getUser();
        if (!data.user) throw new Error("Not signed in");
        check((await sb.from("lib_reviews").upsert({ ...r, owner_id: data.user.id, reviewed_at: new Date().toISOString() }, { onConflict: "owner_id,item_kind,item_key" })).error);
      },
      async clearReview(kind, key) {
        check((await sb.from("lib_reviews").delete().eq("item_kind", kind).eq("item_key", key)).error);
      },
    };
  }
  if (isLocalDevStore()) {
    return {
      async listSources() {
        return (await read()).sources;
      },
      async addSource(s) {
        const db = await read();
        db.sources.push({ ...s, id: randomUUID() });
        await write(db);
      },
      async deleteSource(id) {
        const db = await read();
        db.sources = db.sources.filter((x) => x.id !== id);
        db.reviews = db.reviews.map((r) => (r.source_id === id ? { ...r, source_id: null } : r));
        await write(db);
      },
      async listReviews() {
        return (await read()).reviews;
      },
      async saveReview(r) {
        const db = await read();
        db.reviews = [...db.reviews.filter((x) => !(x.item_kind === r.item_kind && x.item_key === r.item_key)), { ...r, reviewed_at: new Date().toISOString() }];
        await write(db);
      },
      async clearReview(kind, key) {
        const db = await read();
        db.reviews = db.reviews.filter((x) => !(x.item_kind === kind && x.item_key === key));
        await write(db);
      },
    };
  }
  throw new Error("Supabase environment variables are missing.");
}

/** Review look-up for other pages. Falls back to "everything is a draft" when the Library is not set up. */
export async function loadReviewIndex(): Promise<ReviewIndex> {
  try {
    const store = await getLibraryStore();
    const [reviews, sources] = await Promise.all([store.listReviews(), store.listSources()]);
    return indexReviews(reviews, sources);
  } catch (e) {
    if (e instanceof SetupNeeded) return EMPTY_INDEX;
    throw e;
  }
}
