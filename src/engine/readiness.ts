/** Pure readiness check for the intake panel. No astronomy imports, so it is cheap to ship to the browser. */
export type ReadinessInput = {
  birthDate?: string | null;
  timeKind?: "exact" | "range" | "unknown";
  birthTime?: string | null;
  rangeFrom?: string | null;
  rangeTo?: string | null;
  lat?: number | null;
  lon?: number | null;
  ianaTz?: string | null;
};

export type ReadinessItem = { key: string; label: string; status: "ready" | "partial" | "blocked"; note: string };

export function readiness(input: ReadinessInput) {
  const hasDate = !!input.birthDate;
  const hasPlace = Number.isFinite(input.lat) && Number.isFinite(input.lon) && !!input.ianaTz;
  const kind = input.timeKind ?? "unknown";
  const rangeOk =
    kind === "range" && !!input.rangeFrom && !!input.rangeTo && input.rangeTo > input.rangeFrom;
  const hasTime = kind === "exact" ? !!input.birthTime : rangeOk;
  const base = hasDate && hasPlace;

  const item = (key: string, label: string, ok: boolean, partial: boolean, note: string): ReadinessItem => ({
    key,
    label,
    status: !ok ? "blocked" : partial ? "partial" : "ready",
    note,
  });

  const items: ReadinessItem[] = [
    item("planets", "Planet signs, nakshatras, dignity", base, false, base ? "Ready" : "Needs date and place"),
    item(
      "moon",
      "Moon sign & nakshatra",
      base,
      kind === "unknown",
      !base ? "Needs date and place" : kind === "unknown" ? "May change during the day — shown with a warning" : "Ready",
    ),
    item(
      "ascendant",
      "Ascendant (Lagna) & 12 houses",
      base && hasTime,
      kind === "range",
      kind === "unknown"
        ? "Needs a birth time"
        : !hasTime
          ? "Enter the time"
          : !base
            ? "Needs date and place"
            : kind === "range"
              ? "Calculated at every 4 min in the range"
              : "Ready",
    ),
    item(
      "vargas",
      "Navamsha D9 · Dashamsha D10 · other vargas",
      base && hasTime,
      kind === "range",
      kind === "unknown"
        ? "Needs a birth time"
        : !hasTime
          ? "Enter the time"
          : !base
            ? "Needs date and place"
            : kind === "range"
              ? "Likely to change inside the range"
              : "Ready",
    ),
    item(
      "dasha",
      "Vimshottari Dasha dates",
      base,
      kind !== "exact",
      !base ? "Needs date and place" : kind === "exact" ? "Ready" : kind === "range" ? "Approximate (shifts by days)" : "Unreliable without time",
    ),
    item(
      "sensitivity",
      "Birth-time sensitivity panel",
      base && kind !== "exact",
      false,
      kind === "exact" ? "Not needed for exact time" : "Shows exactly what changes",
    ),
  ];

  const missing: string[] = [];
  if (!hasDate) missing.push("date of birth");
  if (!hasPlace) missing.push("birthplace (pick from search or enter coordinates + timezone)");
  if (kind === "exact" && !input.birthTime) missing.push("birth time");
  if (kind === "range" && !rangeOk) missing.push("a valid time range (end after start)");

  return { canCalculate: missing.length === 0, missing, items };
}
