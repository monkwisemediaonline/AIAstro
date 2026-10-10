"use client";

import { useEffect, useRef, useState } from "react";

export type PlacePick = { name: string; lat: number; lon: number; tz: string; source: string };

type Result = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string;
  admin2?: string;
  country?: string;
  population?: number;
};

/**
 * Place search via the Open-Meteo geocoding API (GeoNames data, CC-BY 4.0).
 * Only the typed place name is sent — never names or birth dates.
 */
export function PlaceSearch({ value, onPick }: { value: PlacePick | null; onPick: (p: PlacePick) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef("");

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function search(next: string) {
    setQ(next);
    if (timer.current) clearTimeout(timer.current);
    const term = next.trim();
    latest.current = term;
    setError(null);
    if (term.length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(term)}&count=8&language=en&format=json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        const data = (await res.json()) as { results?: Result[] };
        if (latest.current !== term) return; // a newer search is in flight
        setResults(data.results ?? []);
        if (!data.results?.length) setError("No match. Try a nearby larger town, or enter coordinates manually.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  return (
    <div>
      <label className="label" htmlFor="place-q">{value ? "Change birthplace" : "Search birthplace"}</label>
      <input
        id="place-q"
        className="field"
        value={q}
        onChange={(e) => search(e.target.value)}
        placeholder="Type a city or town, e.g. Jaipur"
        autoComplete="off"
      />
      {loading && <p className="mt-2 text-xs text-muted">Searching…</p>}
      {error && <p className="mt-2 text-xs text-warn">{error}</p>}
      {results.length > 0 && (
        <ul className="mt-2 max-h-72 overflow-auto rounded-xl border border-line bg-surface" role="listbox">
          {results.map((r) => {
            const label = [r.name, r.admin2 !== r.name ? r.admin2 : null, r.admin1, r.country].filter(Boolean).join(", ");
            return (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left hover:bg-surface-2"
                  onClick={() => {
                    onPick({ name: label, lat: r.latitude, lon: r.longitude, tz: r.timezone, source: `geonames:${r.id}` });
                    latest.current = "";
                    setQ("");
                    setResults([]);
                  }}
                >
                  <span className="text-sm">
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-muted"> — {[r.admin1, r.country].filter(Boolean).join(", ")}</span>
                  </span>
                  <span className="tabular shrink-0 text-xs text-muted">
                    {r.latitude.toFixed(2)}, {r.longitude.toFixed(2)} · {r.timezone}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
