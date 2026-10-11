import type { YogaResult } from "@/rules/types";

export type ReviewStatus = "verified" | "disputed" | "disabled";
export type ItemKind = "yoga_rule" | "remedy";

export type Review = {
  item_kind: ItemKind;
  item_key: string;
  status: ReviewStatus;
  source_id: string | null;
  locator: string | null;
  note: string | null;
  reviewed_at: string;
};

export type LibSource = { id: string; title: string; author: string | null; edition: string | null; language: string | null; owned: boolean; notes: string | null };

/** What the rest of the app shows for an item: an unreviewed item is a draft. */
export type Verification = "unverified" | ReviewStatus;

export type ReviewInfo = { status: Verification; citation: string | null; note: string | null; sourceId: string | null; locator: string | null };

export type ReviewIndex = { get(kind: ItemKind, key: string): ReviewInfo; counts(kind: ItemKind, keys: string[]): Record<Verification, number> };

const DRAFT: ReviewInfo = { status: "unverified", citation: null, note: null, sourceId: null, locator: null };

/** Look-up over the owner's reviews. Pure, so it is easy to test. */
export function indexReviews(reviews: Review[], sources: LibSource[]): ReviewIndex {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const map = new Map<string, ReviewInfo>();
  for (const r of reviews) {
    const src = r.source_id ? byId.get(r.source_id) : undefined;
    const citation = [src ? [src.title, src.edition].filter(Boolean).join(", ") : null, r.locator].filter(Boolean).join(" · ") || null;
    map.set(`${r.item_kind}:${r.item_key}`, { status: r.status, citation, note: r.note, sourceId: src ? src.id : null, locator: r.locator });
  }
  const get = (kind: ItemKind, key: string) => map.get(`${kind}:${key}`) ?? DRAFT;
  return {
    get,
    counts(kind, keys) {
      const c: Record<Verification, number> = { unverified: 0, verified: 0, disputed: 0, disabled: 0 };
      for (const k of keys) c[get(kind, k).status]++;
      return c;
    },
  };
}

export const EMPTY_INDEX: ReviewIndex = indexReviews([], []);

/** Applies review status to yoga results and drops rules the owner has switched off. */
export function applyReviews(results: YogaResult[], index: ReviewIndex): { results: YogaResult[]; disabled: number } {
  const kept: YogaResult[] = [];
  let disabled = 0;
  for (const r of results) {
    const info = index.get("yoga_rule", r.ruleId);
    if (info.status === "disabled") {
      disabled++;
      continue;
    }
    kept.push({ ...r, verification: info.status, source: info.citation ?? r.source, reviewNote: info.note });
  }
  return { results: kept, disabled };
}

export const STATUS_LABEL: Record<Verification, string> = {
  unverified: "Draft — not yet checked",
  verified: "Verified against source",
  disputed: "Disputed",
  disabled: "Switched off",
};
