"use client";

import { useActionState, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { savePersonAction, type FormState } from "@/app/actions";
import { readiness } from "@/engine/readiness";
import { CONFIDENCE, RELATIONSHIPS, type Person } from "@/lib/people";
import { PlaceSearch, type PlacePick } from "./PlaceSearch";

type Props = { person?: Person | null; defaultRelationship?: keyof typeof RELATIONSHIPS };

const STATUS_STYLE = {
  ready: { dot: "bg-ok", text: "text-ok", label: "Ready" },
  partial: { dot: "bg-warn", text: "text-warn", label: "With caveats" },
  blocked: { dot: "bg-line", text: "text-muted", label: "Not yet" },
} as const;

export function IntakePanel({ person, defaultRelationship = "self" }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePersonAction, null);
  const [name, setName] = useState(person?.display_name ?? "");
  const [relationship, setRelationship] = useState<string>(person?.relationship ?? defaultRelationship);
  const [birthDate, setBirthDate] = useState(person?.birth_date ?? "");
  const [timeKind, setTimeKind] = useState<"exact" | "range" | "unknown">(person?.time_kind ?? "exact");
  const [birthTime, setBirthTime] = useState(person?.birth_time ?? "");
  const [rangeFrom, setRangeFrom] = useState(person?.range_from ?? "");
  const [rangeTo, setRangeTo] = useState(person?.range_to ?? "");
  const [confidence, setConfidence] = useState<string>(person?.confidence ?? "family_reported");
  const [place, setPlace] = useState<PlacePick | null>(
    person?.lat != null && person?.lon != null && person?.iana_tz
      ? { name: person.place_name ?? "", lat: person.lat, lon: person.lon, tz: person.iana_tz, source: person.place_source ?? "manual" }
      : null,
  );
  const [manual, setManual] = useState(false);
  const errors = state?.fieldErrors ?? {};

  const ready = readiness({
    birthDate,
    timeKind,
    birthTime,
    rangeFrom,
    rangeTo,
    lat: place?.lat ?? null,
    lon: place?.lon ?? null,
    ianaTz: place?.tz ?? null,
  });

  const utcPreview = useMemo(() => {
    if (!birthDate || !place?.tz) return null;
    const t = timeKind === "exact" ? birthTime : timeKind === "range" ? rangeFrom : "12:00";
    if (!t) return null;
    const dt = DateTime.fromISO(`${birthDate}T${t}`, { zone: place.tz });
    if (!dt.isValid) return null;
    const off = dt.toFormat("ZZ");
    const end =
      timeKind === "range" && rangeTo ? DateTime.fromISO(`${birthDate}T${rangeTo}`, { zone: place.tz }).toUTC().toFormat("HH:mm") : null;
    return { offset: off, utc: dt.toUTC().toFormat("yyyy-LL-dd HH:mm"), end };
  }, [birthDate, birthTime, rangeFrom, rangeTo, timeKind, place]);

  const rangeMinutes =
    timeKind === "range" && rangeFrom && rangeTo
      ? Number(rangeTo.slice(0, 2)) * 60 + Number(rangeTo.slice(3, 5)) - (Number(rangeFrom.slice(0, 2)) * 60 + Number(rangeFrom.slice(3, 5)))
      : 0;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {person && <input type="hidden" name="id" value={person.id} />}
      <input type="hidden" name="place_name" value={place?.name ?? ""} />
      <input type="hidden" name="lat" value={place?.lat ?? ""} />
      <input type="hidden" name="lon" value={place?.lon ?? ""} />
      <input type="hidden" name="iana_tz" value={place?.tz ?? ""} />
      <input type="hidden" name="place_source" value={place?.source ?? ""} />

      <div className="space-y-6">
        {/* 1. Person */}
        <section className="card p-5 sm:p-6">
          <Step n={1} title="Who is this chart for?" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="display_name">Name</label>
              <input id="display_name" name="display_name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="off" />
              <FieldError msg={errors.display_name} />
            </div>
            <div>
              <label className="label" htmlFor="relationship">Relationship to you</label>
              <select id="relationship" name="relationship" className="field" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                {Object.entries(RELATIONSHIPS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          {(relationship === "daughter" || relationship === "son") && (
            <label className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" name="is_minor" defaultChecked={person?.is_minor ?? true} className="size-4 accent-[var(--gold)]" />
              Minor — keep extra private (excluded from AI by default)
            </label>
          )}
        </section>

        {/* 2. Date & time */}
        <section className="card p-5 sm:p-6">
          <Step n={2} title="Date and time of birth" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="birth_date">Date of birth</label>
              <input id="birth_date" name="birth_date" type="date" className="field tabular" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              <FieldError msg={errors.birth_date} />
            </div>
            <div>
              <label className="label" htmlFor="confidence">How reliable is the time?</label>
              <select id="confidence" name="confidence" className="field" value={confidence} onChange={(e) => setConfidence(e.target.value)}>
                {Object.entries(CONFIDENCE).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="label">Birth time</legend>
            <input type="hidden" name="time_kind" value={timeKind} />
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {([
                ["exact", "Exact time", "e.g. 06:10"],
                ["range", "A range", "e.g. 09:15–09:45"],
                ["unknown", "Don't know", "Planets only"],
              ] as const).map(([k, t, s]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={timeKind === k}
                  onClick={() => {
                    setTimeKind(k);
                    if (k === "unknown") setConfidence("unknown");
                    else if (k === "range" && confidence !== "approximate") setConfidence("approximate");
                  }}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${timeKind === k ? "border-gold bg-gold-soft" : "border-line bg-surface hover:bg-surface-2"}`}
                >
                  <span className="block text-sm font-semibold">{t}</span>
                  <span className="block text-xs text-muted">{s}</span>
                </button>
              ))}
            </div>

            {timeKind === "exact" && (
              <div className="mt-4 max-w-[220px]">
                <label className="label" htmlFor="birth_time">Local time (24h)</label>
                <input id="birth_time" name="birth_time" type="time" className="field tabular" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
                <FieldError msg={errors.birth_time} />
              </div>
            )}

            {timeKind === "range" && (
              <div className="mt-4">
                <div className="grid max-w-[460px] grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="range_from">Earliest</label>
                    <input id="range_from" name="range_from" type="time" className="field tabular" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="range_to">Latest</label>
                    <input id="range_to" name="range_to" type="time" className="field tabular" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
                  </div>
                </div>
                <FieldError msg={errors.range_from ?? errors.range_to} />
                {rangeMinutes > 0 && (
                  <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-soft">
                    The system will calculate <b>{Math.ceil(rangeMinutes / 4) + 1} charts</b> (every 4 minutes) across this {rangeMinutes}-minute window and show which results stay the same and which change.
                    It will <b>not</b> pick the midpoint.
                  </p>
                )}
              </div>
            )}

            {timeKind === "unknown" && (
              <p className="mt-4 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
                Without a time, the Ascendant, houses and divisional charts can&apos;t be calculated. You&apos;ll get planet signs, nakshatras and a Moon chart, plus a warning if the Moon changes nakshatra that day. Add the time later and recalculate.
              </p>
            )}
          </fieldset>

          <div className="mt-5">
            <label className="label" htmlFor="data_source">Where does this time come from? (optional)</label>
            <input id="data_source" name="data_source" className="field" defaultValue={person?.data_source ?? ""} placeholder="Birth certificate, mother, hospital record…" />
          </div>
        </section>

        {/* 3. Place */}
        <section className="card p-5 sm:p-6">
          <Step n={3} title="Place of birth" />
          <p className="mt-1 text-sm text-muted">Coordinates and the historical timezone of the place are needed to convert local time to UTC.</p>
          <div className="mt-4">
            <PlaceSearch value={place} onPick={setPlace} />
          </div>
          {place && (
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl bg-surface-2 p-4 text-sm sm:grid-cols-4">
              <Info k="Place" v={place.name || "—"} wide />
              <Info k="Latitude" v={place.lat.toFixed(4)} />
              <Info k="Longitude" v={place.lon.toFixed(4)} />
              <Info k="Timezone" v={place.tz} />
              {utcPreview && <Info k="Offset on that date" v={`UTC${utcPreview.offset}`} />}
              {utcPreview && <Info k="In UTC" v={utcPreview.end ? `${utcPreview.utc} → ${utcPreview.end}` : utcPreview.utc} wide />}
            </dl>
          )}
          <button type="button" className="mt-3 text-sm font-semibold text-gold underline-offset-4 hover:underline" onClick={() => setManual((m) => !m)}>
            {manual ? "Hide manual entry" : "Enter coordinates manually"}
          </button>
          {manual && <ManualPlace place={place} onChange={setPlace} />}
        </section>

        <section className="card p-5 sm:p-6">
          <label className="label" htmlFor="notes">Notes (optional)</label>
          <textarea id="notes" name="notes" rows={3} className="field" defaultValue={person?.notes ?? ""} placeholder="Anything to remember about this record" />
        </section>
      </div>

      {/* Readiness rail */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="card overflow-hidden">
          <div className="bg-navy px-5 py-4 text-[#f6eedb]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d9ac52]">Before calculation</p>
            <p className="mt-1 font-display text-2xl leading-tight">{ready.canCalculate ? "Ready to calculate" : "Details needed"}</p>
          </div>
          <ul className="divide-y divide-line">
            {ready.items.map((i) => {
              const s = STATUS_STYLE[i.status];
              return (
                <li key={i.key} className="flex gap-3 px-5 py-3">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${s.dot}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{i.label}</p>
                    <p className={`text-xs ${s.text}`}>{i.note}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {!ready.canCalculate && ready.missing.length > 0 && (
            <div className="border-t border-line bg-surface-2 px-5 py-3 text-xs text-ink-soft">
              Missing: {ready.missing.join(", ")}.
            </div>
          )}
          <div className="space-y-2 border-t border-line p-5">
            {state && !state.ok && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{state.message}</p>}
            <button type="submit" name="intent" value="calculate" className="btn btn-gold w-full" disabled={!ready.canCalculate || !name.trim() || pending}>
              {pending ? "Calculating…" : person?.status === "confirmed" ? "Save & recalculate" : "Confirm details & calculate"}
            </button>
            <button type="submit" name="intent" value="save" className="btn btn-ghost w-full" disabled={!name.trim() || pending}>
              Save as draft
            </button>
            <p className="pt-1 text-center text-xs text-muted">Sidereal · Lahiri · whole-sign houses · mean node</p>
          </div>
        </div>
      </aside>
    </form>
  );
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-3 font-display text-2xl font-semibold">
      <span className="grid size-7 place-items-center rounded-full bg-navy font-sans text-xs font-bold text-[#f6eedb]">{n}</span>
      {title}
    </h2>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs font-medium text-bad">{msg}</p> : null;
}

function Info({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="tabular font-medium break-words">{v}</dd>
    </div>
  );
}

function ManualPlace({ place, onChange }: { place: PlacePick | null; onChange: (p: PlacePick) => void }) {
  const [lat, setLat] = useState(place?.lat?.toString() ?? "");
  const [lon, setLon] = useState(place?.lon?.toString() ?? "");
  const [tz, setTz] = useState(place?.tz ?? "Asia/Kolkata");
  const [label, setLabel] = useState(place?.name ?? "");
  const valid = Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lon)) && DateTime.local().setZone(tz).isValid;
  return (
    <div className="mt-3 grid gap-3 rounded-xl border border-dashed border-line p-4 sm:grid-cols-4">
      <div className="sm:col-span-4">
        <label className="label" htmlFor="m-label">Place label</label>
        <input id="m-label" className="field" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="m-lat">Latitude (N +)</label>
        <input id="m-lat" className="field tabular" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="m-lon">Longitude (E +)</label>
        <input id="m-lon" className="field tabular" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="m-tz">IANA timezone</label>
        <input id="m-tz" className="field" value={tz} onChange={(e) => setTz(e.target.value)} placeholder="Asia/Kolkata" />
      </div>
      <button
        type="button"
        className="btn btn-ghost sm:col-span-4"
        disabled={!valid}
        onClick={() => onChange({ name: label, lat: parseFloat(lat), lon: parseFloat(lon), tz, source: "manual" })}
      >
        Use these coordinates
      </button>
    </div>
  );
}
