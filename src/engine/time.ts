import { DateTime } from "luxon";

export type LocalToUtc = {
  utc: Date;
  offsetMinutes: number;
  /** Local time fell in a DST gap and was shifted by the timezone rules. */
  nonexistent: boolean;
  /** Local time occurred twice (DST fall-back); the earlier offset was used. */
  ambiguous: boolean;
  tzdbVersion: string | null;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidZone(zone: string): boolean {
  return DateTime.local().setZone(zone).isValid;
}

/** Convert a civil local date + time in an IANA zone to UTC, using the rules valid on that date. */
export function localToUtc(date: string, time: string, zone: string): LocalToUtc {
  if (!DATE_RE.test(date)) throw new Error(`Invalid date "${date}" (expected YYYY-MM-DD)`);
  if (!TIME_RE.test(time)) throw new Error(`Invalid time "${time}" (expected HH:MM)`);
  if (!isValidZone(zone)) throw new Error(`Unknown timezone "${zone}"`);
  const hhmm = time.slice(0, 5);
  const dt = DateTime.fromISO(`${date}T${time.length === 5 ? `${time}:00` : time}`, { zone });
  if (!dt.isValid) throw new Error(`Invalid local date/time: ${dt.invalidExplanation ?? "unknown reason"}`);
  const nonexistent = dt.toFormat("yyyy-MM-dd'T'HH:mm") !== `${date}T${hhmm}`;
  const offsets = typeof dt.getPossibleOffsets === "function" ? dt.getPossibleOffsets() : [dt];
  return {
    utc: dt.toUTC().toJSDate(),
    offsetMinutes: dt.offset,
    nonexistent,
    ambiguous: offsets.length > 1,
    tzdbVersion: typeof process !== "undefined" ? (process.versions?.tz ?? null) : null,
  };
}

/** Minutes between two HH:MM strings on the same day (to > from). */
export function minutesBetween(from: string, to: string): number {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  return th * 60 + tm - (fh * 60 + fm);
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}
