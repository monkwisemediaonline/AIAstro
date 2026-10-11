import type { Planet } from "@/engine/constants";
import type { Ctx, RelationType } from "./context";
import type { Strength } from "./strength";

export type YogaStatus = "detected" | "partial" | "not_detected" | "cancelled" | "indeterminate";
export type YogaCategory = "raja" | "dhana" | "mahapurusha" | "chandra" | "other" | "caution";

export type Condition = { text: string; met: boolean };

/** One concrete occurrence of a yoga in the chart (e.g. one pair of lords). */
export type Instance = {
  title: string;
  planets: Planet[];
  houses: number[];
  relation?: RelationType;
  facts: string[];
  strength?: Strength;
};

export type Evaluation = {
  status: Exclude<YogaStatus, "indeterminate">;
  /** The rule's conditions with ✓/✗, so "why not" is always answerable. */
  conditions: Condition[];
  instances: Instance[];
  /** Things that weaken, cancel or qualify the result. */
  notes?: string[];
};

export type RuleDef = {
  id: string;
  name: string;
  category: YogaCategory;
  /** Plain statement of the rule as implemented. */
  definition: string;
  /** Candidate source to verify against the owner's edition. */
  source: string;
  /** Traditional themes. */
  themes: string;
  needsAscendant: boolean;
  /** Flag for very common yogas, shown so they are not over-weighted. */
  common?: boolean;
  /** Not a named classical yoga — a product grouping of classical indications. */
  productIndicator?: boolean;
  evaluate(ctx: Ctx): Evaluation;
};

export type YogaResult = {
  ruleId: string;
  name: string;
  category: YogaCategory;
  definition: string;
  source: string;
  themes: string;
  /** Draft until the owner reviews the rule in the Research Library. */
  verification: "unverified" | "verified" | "disputed";
  /** The owner's note from the Library review, if any. */
  reviewNote?: string | null;
  common: boolean;
  productIndicator: boolean;
  status: YogaStatus;
  conditions: Condition[];
  instances: Instance[];
  notes: string[];
};
