import { describe, expect, it } from "vitest";
import { computeChart } from "@/engine/chart";
import { buildAiContext } from "@/ai/context";
import { applyReviews, indexReviews, type LibSource, type Review } from "@/library/reviews";
import { evaluateForBirth } from "@/rules/evaluate";
import { PARASHARI_RULES } from "@/rules/parashari";

const input = { birthDate: "1990-06-15", timeKind: "exact" as const, birthTime: "10:20", lat: 28.6139, lon: 77.209, ianaTz: "Asia/Kolkata" };
const results = evaluateForBirth(input).results;

const sources: LibSource[] = [{ id: "s1", title: "Test Text", author: null, edition: "Test ed. 2000", language: "English", owned: true, notes: null }];
const review = (key: string, status: Review["status"], extra: Partial<Review> = {}): Review => ({ item_kind: "yoga_rule", item_key: key, status, source_id: null, locator: null, note: null, reviewed_at: "2026-10-11T00:00:00Z", ...extra });

describe("review index", () => {
  it("treats anything without a review as a draft", () => {
    const idx = indexReviews([], []);
    expect(idx.get("yoga_rule", "PAR-RY-001").status).toBe("unverified");
    expect(idx.counts("yoga_rule", PARASHARI_RULES.map((r) => r.id)).unverified).toBe(PARASHARI_RULES.length);
  });

  it("builds a citation from the source and locator", () => {
    const idx = indexReviews([review("PAR-RY-001", "verified", { source_id: "s1", locator: "Ch. 41, v. 28" })], sources);
    expect(idx.get("yoga_rule", "PAR-RY-001")).toMatchObject({ status: "verified", citation: "Test Text, Test ed. 2000 · Ch. 41, v. 28", sourceId: "s1" });
  });

  it("keeps the status but drops the citation when the source was removed", () => {
    const idx = indexReviews([review("PAR-RY-001", "verified", { source_id: "gone" })], sources);
    expect(idx.get("yoga_rule", "PAR-RY-001")).toMatchObject({ status: "verified", citation: null, sourceId: null });
  });

  it("keeps yoga rules and remedies apart even with the same key", () => {
    const idx = indexReviews([{ ...review("Sun-mantra", "disabled"), item_kind: "remedy" }], []);
    expect(idx.get("remedy", "Sun-mantra").status).toBe("disabled");
    expect(idx.get("yoga_rule", "Sun-mantra").status).toBe("unverified");
  });

  it("counts by status", () => {
    const idx = indexReviews([review("PAR-RY-001", "verified"), review("PAR-RY-002", "disputed"), review("PAR-RY-003", "disabled")], []);
    const c = idx.counts("yoga_rule", PARASHARI_RULES.map((r) => r.id));
    expect(c).toMatchObject({ verified: 1, disputed: 1, disabled: 1, unverified: PARASHARI_RULES.length - 3 });
  });
});

describe("applying reviews to yoga results", () => {
  it("removes switched-off rules, marks the rest, and replaces the source with the citation", () => {
    const idx = indexReviews(
      [review("PAR-RY-001", "verified", { source_id: "s1", locator: "p. 10" }), review("PAR-RY-002", "disputed", { note: "My edition differs" }), review("PAR-GK-001", "disabled")],
      sources,
    );
    const out = applyReviews(results, idx);
    expect(out.disabled).toBe(1);
    expect(out.results).toHaveLength(results.length - 1);
    expect(out.results.some((r) => r.ruleId === "PAR-GK-001")).toBe(false);
    const ry1 = out.results.find((r) => r.ruleId === "PAR-RY-001")!;
    expect(ry1.verification).toBe("verified");
    expect(ry1.source).toBe("Test Text, Test ed. 2000 · p. 10");
    const ry2 = out.results.find((r) => r.ruleId === "PAR-RY-002")!;
    expect(ry2.verification).toBe("disputed");
    expect(ry2.reviewNote).toBe("My edition differs");
    expect(out.results.find((r) => r.ruleId === "PAR-RY-003")!.verification).toBe("unverified");
  });

  it("does not change detection results, only labels", () => {
    const out = applyReviews(results, indexReviews([review("PAR-RY-001", "verified")], []));
    for (const r of out.results) expect(r.status).toBe(results.find((x) => x.ruleId === r.ruleId)!.status);
  });
});

describe("switched-off rules never reach the AI", () => {
  it("the context omits them and the validator would reject a citation of one", () => {
    const now = new Date("2026-10-11T00:00:00Z");
    const chart = computeChart(input, now);
    const present = results.find((r) => r.status !== "not_detected")!;
    const kept = applyReviews(results, indexReviews([review(present.ruleId, "disabled")], [])).results;
    const ai = buildAiContext(chart, kept, input.birthDate, now);
    expect(JSON.stringify(ai.context)).not.toContain(`"${present.ruleId}"`);
    expect(ai.refs.has(present.ruleId)).toBe(false);
    expect(ai.context.yogas.every((y) => ["unverified", "verified", "disputed"].includes(y.source_status))).toBe(true);
  });
});
