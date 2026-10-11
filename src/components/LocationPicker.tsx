"use client";

import { useState, useTransition } from "react";
import { setLocationAction } from "@/app/location-actions";
import { PlaceSearch, type PlacePick } from "./PlaceSearch";

/** Lets the owner set the city they live in now, for sunrise-based timings. */
export function LocationPicker({ current, canSave }: { current: string; canSave: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const pick = (p: PlacePick) =>
    start(async () => {
      await setLocationAction({ name: p.name, lat: p.lat, lon: p.lon, tz: p.tz });
      setOpen(false);
    });

  if (!canSave) return null;
  return (
    <div>
      <button type="button" className="text-sm font-semibold text-gold underline-offset-4 hover:underline" onClick={() => setOpen((o) => !o)}>
        {open ? "Cancel" : `Change city (now: ${current})`}
      </button>
      {open && (
        <div className="mt-3 max-w-xl rounded-xl border border-dashed border-line p-3">
          <PlaceSearch value={null} onPick={pick} />
          {pending && <p className="mt-2 text-xs text-muted">Saving…</p>}
        </div>
      )}
    </div>
  );
}
