import { SAMPLE_MINUTES, snapshot, type BirthInput, type ChartSnapshot } from "@/engine/chart";
import { addMinutes, localToUtc, minutesBetween } from "@/engine/time";
import { makeCtx } from "./context";
import { PARASHARI_RULES, PARASHARI_RULESET } from "./parashari";
import type { RuleDef, YogaResult, YogaStatus } from "./types";

function base(rule: RuleDef): Omit<YogaResult, "status" | "conditions" | "instances" | "notes"> {
  return {
    ruleId: rule.id,
    name: rule.name,
    category: rule.category,
    definition: rule.definition,
    source: rule.source,
    themes: rule.themes,
    verification: "unverified",
    common: rule.common ?? false,
    productIndicator: rule.productIndicator ?? false,
  };
}

/** Evaluate every rule against one snapshot. */
export function evaluateSnapshot(snap: ChartSnapshot, rules: RuleDef[] = PARASHARI_RULES): YogaResult[] {
  const ctx = makeCtx(snap);
  return rules.map((rule) => {
    if (rule.needsAscendant && !ctx.hasAsc) {
      return {
        ...base(rule),
        status: "indeterminate" as const,
        conditions: [],
        instances: [],
        notes: ["Needs the Ascendant, which needs a birth time."],
      };
    }
    const e = rule.evaluate(ctx);
    return { ...base(rule), status: e.status, conditions: e.conditions, instances: e.instances, notes: e.notes ?? [] };
  });
}

export type YogaReport = {
  ruleset: string;
  timeKind: BirthInput["timeKind"];
  samples: number;
  results: YogaResult[];
};

/**
 * Evaluate for a birth record. Range and unknown times are evaluated at several instants;
 * a rule whose status is not the same at all of them is reported as indeterminate.
 */
export function evaluateForBirth(input: BirthInput): YogaReport {
  const withAngles = input.timeKind !== "unknown";
  let times: string[];
  if (input.timeKind === "exact") times = [input.birthTime!];
  else if (input.timeKind === "range") {
    const span = minutesBetween(input.rangeFrom!, input.rangeTo!);
    times = [];
    for (let m = 0; m < span; m += SAMPLE_MINUTES) times.push(addMinutes(input.rangeFrom!, m));
    times.push(input.rangeTo!);
  } else times = ["12:00", "00:00", "06:00", "18:00", "23:59"];

  const perSample = times.map((t) => ({
    t,
    results: evaluateSnapshot(snapshot(localToUtc(input.birthDate, t, input.ianaTz).utc, input.lat, input.lon, withAngles)),
  }));

  const results = perSample[0].results.map((first, i) => {
    if (perSample.length === 1 || first.status === "indeterminate") return first;
    const spans: { status: YogaStatus; from: string; to: string }[] = [];
    for (const s of [...perSample].sort((a, b) => a.t.localeCompare(b.t))) {
      const st = s.results[i].status;
      const last = spans.at(-1);
      if (last && last.status === st) last.to = s.t;
      else spans.push({ status: st, from: s.t, to: s.t });
    }
    if (new Set(spans.map((s) => s.status)).size === 1) return first;
    const label = (s: YogaStatus) => s.replace("_", " ");
    return {
      ...first,
      status: "indeterminate" as const,
      notes: [
        `Changes with birth time: ${spans.map((s) => `${label(s.status)} ${s.from === s.to ? `at ${s.from}` : `${s.from}–${s.to}`}`).join("; ")}.`,
        ...first.notes,
      ],
    };
  });

  return { ruleset: PARASHARI_RULESET, timeKind: input.timeKind, samples: times.length, results };
}
