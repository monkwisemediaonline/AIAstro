import { z } from "zod";
import type { BirthInput } from "@/engine/chart";

export const RELATIONSHIPS = {
  self: "Self",
  spouse: "Wife / Husband",
  daughter: "Daughter",
  son: "Son",
  parent: "Parent",
  sibling: "Sibling",
  business_partner: "Business partner",
  other: "Other",
} as const;
export type Relationship = keyof typeof RELATIONSHIPS;

export const CONFIDENCE = {
  certificate: "Birth certificate / hospital record",
  exact: "Exact (reliable memory)",
  family_reported: "Family-reported",
  approximate: "Approximate",
  unknown: "Unknown",
} as const;

export type Person = {
  id: string;
  display_name: string;
  relationship: Relationship;
  birth_date: string | null;
  time_kind: "exact" | "range" | "unknown";
  birth_time: string | null;
  range_from: string | null;
  range_to: string | null;
  confidence: keyof typeof CONFIDENCE;
  place_name: string | null;
  lat: number | null;
  lon: number | null;
  iana_tz: string | null;
  place_source: string | null;
  data_source: string | null;
  notes: string | null;
  is_minor: boolean;
  /** Per-person opt-in for the AI Assistant. Off unless the owner turns it on. */
  ai_allowed?: boolean;
  status: "draft" | "confirmed";
  created_at: string;
  updated_at: string;
};

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Use HH:MM (24-hour)")
  .transform((s) => s.slice(0, 5));
const optionalTime = z.union([hhmm, z.literal("").transform(() => null), z.null()]).optional().transform((v) => v ?? null);
const optionalText = (max: number) =>
  z.string().max(max).optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null));
const optionalNumber = (min: number, max: number) =>
  z.union([z.coerce.number().min(min).max(max), z.literal("").transform(() => null), z.null()]).optional().transform((v) => v ?? null);

export const PersonInput = z
  .object({
    display_name: z.string().trim().min(1, "Name is required").max(120),
    relationship: z.enum(Object.keys(RELATIONSHIPS) as [Relationship, ...Relationship[]]),
    birth_date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"), z.literal("").transform(() => null)]).nullable(),
    time_kind: z.enum(["exact", "range", "unknown"]),
    birth_time: optionalTime,
    range_from: optionalTime,
    range_to: optionalTime,
    confidence: z.enum(Object.keys(CONFIDENCE) as [keyof typeof CONFIDENCE, ...(keyof typeof CONFIDENCE)[]]),
    place_name: optionalText(200),
    lat: optionalNumber(-90, 90),
    lon: optionalNumber(-180, 180),
    iana_tz: optionalText(64),
    place_source: optionalText(120),
    data_source: optionalText(200),
    notes: optionalText(2000),
    is_minor: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.time_kind === "exact" && !v.birth_time) ctx.addIssue({ code: "custom", path: ["birth_time"], message: "Enter the birth time or choose another option" });
    if (v.time_kind === "range") {
      if (!v.range_from || !v.range_to) ctx.addIssue({ code: "custom", path: ["range_from"], message: "Enter both ends of the range" });
      else if (v.range_to <= v.range_from) ctx.addIssue({ code: "custom", path: ["range_to"], message: "Range end must be after start" });
    }
    if (v.birth_date && v.birth_date > new Date().toISOString().slice(0, 10)) ctx.addIssue({ code: "custom", path: ["birth_date"], message: "Date is in the future" });
  })
  .transform((v) => ({
    ...v,
    birth_time: v.time_kind === "exact" ? v.birth_time : null,
    range_from: v.time_kind === "range" ? v.range_from : null,
    range_to: v.time_kind === "range" ? v.range_to : null,
  }));
export type PersonInput = z.output<typeof PersonInput>;

const t5 = (s: string | null) => (s ? s.slice(0, 5) : null);

/** Normalise DB rows (Postgres returns HH:MM:SS). */
export function normalisePerson(row: Person): Person {
  return { ...row, birth_time: t5(row.birth_time), range_from: t5(row.range_from), range_to: t5(row.range_to) };
}

/** Returns a BirthInput if the person has enough data to calculate, else null. */
export function toBirthInput(p: Person): BirthInput | null {
  if (!p.birth_date || p.lat === null || p.lon === null || !p.iana_tz) return null;
  if (p.time_kind === "exact" && !p.birth_time) return null;
  if (p.time_kind === "range" && (!p.range_from || !p.range_to)) return null;
  return {
    birthDate: p.birth_date,
    timeKind: p.time_kind,
    birthTime: p.birth_time,
    rangeFrom: p.range_from,
    rangeTo: p.range_to,
    lat: p.lat,
    lon: p.lon,
    ianaTz: p.iana_tz,
  };
}

export function describeTime(p: Pick<Person, "time_kind" | "birth_time" | "range_from" | "range_to">) {
  if (p.time_kind === "exact") return p.birth_time ?? "—";
  if (p.time_kind === "range") return `${p.range_from}–${p.range_to} (range)`;
  return "Unknown";
}
