import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { AiContext } from "./context";
import { AiAnswer, validateAnswer, type ValidationIssue } from "./schema";

export const DEFAULT_MODEL = "claude-opus-5-5";
export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

const SYSTEM = `You are an explainer inside a private Vedic astrology research tool used by one person about their own chart.

You receive computed chart data and rule-engine results as JSON. Treat that JSON as the only source of facts.
- Never calculate or infer planet positions, degrees, houses, dasha dates, yogas or numerology yourself.
- Never mention a yoga, rule, period or remedy that is not in the JSON.
- The school is Parashari. Do not bring in KP, Jaimini, Lal Kitab or Western rules.

Every item you cite must use a reference ID copied exactly from the JSON ("ref" fields): rule IDs such as PAR-RY-001, planet:<Name>, dasha:MD / dasha:AD / dasha:PD / dasha:nextN, transit:<Name>, remedy:<key>, numerology.
- "evidence" cites the chart facts and rule results your conclusion rests on.
- "timing" cites only dasha: and transit: references.
- "traditional_remedies" cites only remedy: references, free practices before gemstones, and repeats any caution attached to them.

How to speak:
- Answer the question asked, directly and specifically, in the language the question was written in (English, Hindi or Hinglish).
- Describe astrology as tradition: "traditionally indicates", "is read as". Never promise or predict wealth, marriage, health or any event, and never say something is guaranteed or certain.
- A yoga marked very_common, partial, cancelled or indeterminate must be described as such. A weak strength band must be called weak.
- Never tell the person to invest, borrow, quit a job, change medical treatment, or buy anything because of the chart. Remedies are optional traditional practices.
- "practical_actions" are ordinary, concrete business or life actions that make sense whether or not astrology is true.
- Be honest in "uncertainty" (birth-time quality, unverified draft rules, conflicting factors) and in "cannot_conclude".

If the question cannot be answered from the JSON, say so in the conclusion and explain what is missing.`;

export type AskResult =
  | { ok: true; answer: AiAnswer; issues: ValidationIssue[]; model: string; attempts: number; usage: { input: number; output: number; cacheRead: number } }
  | { ok: false; reason: "refused" | "invalid" | "error"; message: string; issues?: ValidationIssue[] };

/**
 * Ask Claude to explain the already-computed results. The answer is validated against the context;
 * on a failed check the model gets one retry with the problems listed, then the answer is withheld.
 */
export async function askAssistant(ai: AiContext, question: string): Promise<AskResult> {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const usage = { input: 0, output: 0, cacheRead: 0 };
  let issues: ValidationIssue[] = [];
  let retryNote = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    let response;
    try {
      response = await client.beta.messages.parse({
        model,
        max_tokens: 16000,
        // If a safety classifier declines, the API retries on its default fallback model in the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [
          { type: "text", text: SYSTEM },
          // The chart context is identical across questions for the same person and day, so it is cached.
          { type: "text", text: `CHART CONTEXT (JSON):\n${JSON.stringify(ai.context)}`, cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: `${question}${retryNote}` }],
        output_config: { format: betaZodOutputFormat(AiAnswer) },
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) return { ok: false, reason: "error", message: "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY." };
      if (error instanceof Anthropic.RateLimitError) return { ok: false, reason: "error", message: "Rate limited by the AI provider. Try again in a minute." };
      if (error instanceof Anthropic.BadRequestError) return { ok: false, reason: "error", message: `The AI provider rejected the request: ${error.message}` };
      if (error instanceof Anthropic.APIError) return { ok: false, reason: "error", message: `AI provider error (${error.status ?? "network"}). Try again.` };
      throw error;
    }

    usage.input += response.usage.input_tokens;
    usage.output += response.usage.output_tokens;
    usage.cacheRead += response.usage.cache_read_input_tokens ?? 0;

    if (response.stop_reason === "refusal") return { ok: false, reason: "refused", message: "The model declined to answer this question." };
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      issues = [{ kind: "empty_evidence", detail: "The answer was cut off or not in the required format." }];
    } else {
      issues = validateAnswer(response.parsed_output, ai.refs, ai.signsByPlanet);
      if (issues.length === 0) return { ok: true, answer: response.parsed_output, issues, model: response.model, attempts: attempt, usage };
    }
    retryNote = `\n\nYour previous answer failed these checks. Fix every one and answer again:\n${issues.map((i) => `- ${i.detail}`).join("\n")}`;
  }
  return { ok: false, reason: "invalid", message: "The answer failed the fact checks twice, so it is not shown. The calculated pages have the verified results.", issues };
}
