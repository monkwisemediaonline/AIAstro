import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { createSupabaseServer } from "./supabase/server";
import { isLocalDevStore, supabaseEnv } from "./supabase/env";

/** Where the owner lives now. Used for sunrise-based timings such as Rahu Kaal. */
export type OwnerLocation = { name: string; lat: number; lon: number; tz: string };

const FILE = path.join(process.cwd(), "data", "dev-location.json");

/** Returns the saved location, null if none is saved, or "setup" if the table does not exist yet. */
export async function getOwnerLocation(): Promise<OwnerLocation | null | "setup"> {
  await connection();
  if (supabaseEnv()) {
    const sb = await createSupabaseServer();
    const { data, error } = await sb.from("owner_location").select("name, lat, lon, tz").maybeSingle();
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") return "setup";
      throw new Error(error.message);
    }
    return (data as OwnerLocation) ?? null;
  }
  if (isLocalDevStore()) {
    try {
      return JSON.parse(await readFile(FILE, "utf8")) as OwnerLocation;
    } catch {
      return null;
    }
  }
  throw new Error("Supabase environment variables are missing.");
}

export async function setOwnerLocation(loc: OwnerLocation): Promise<void> {
  await connection();
  if (supabaseEnv()) {
    const sb = await createSupabaseServer();
    const { data } = await sb.auth.getUser();
    if (!data.user) throw new Error("Not signed in");
    const { error } = await sb.from("owner_location").upsert({ owner_id: data.user.id, ...loc, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return;
  }
  if (isLocalDevStore()) {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(loc, null, 2));
    return;
  }
  throw new Error("Supabase environment variables are missing.");
}
