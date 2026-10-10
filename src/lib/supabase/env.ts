/** Supabase settings. Accepts the newer publishable key or the legacy anon key. */
export function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Local file store for development before Supabase is connected.
 * Never active in production builds.
 */
export function isLocalDevStore(): boolean {
  return !supabaseEnv() && process.env.NODE_ENV !== "production";
}
