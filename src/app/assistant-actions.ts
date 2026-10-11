"use server";

import { revalidatePath } from "next/cache";
import { aiConfigured, askAssistant, type AskResult } from "@/ai/ask";
import { buildAiContext } from "@/ai/context";
import { computeChart } from "@/engine/chart";
import { toBirthInput } from "@/lib/people";
import { loadReviewIndex } from "@/lib/library-store";
import { getStore } from "@/lib/store";
import { applyReviews } from "@/library/reviews";
import { evaluateForBirth } from "@/rules/evaluate";

export type AssistantState = { question: string; result: AskResult } | null;

export async function setAiAllowedAction(personId: string, allowed: boolean) {
  await (await getStore()).setAiAllowed(personId, allowed);
  revalidatePath("/assistant");
}

export async function askAssistantAction(_prev: AssistantState, fd: FormData): Promise<AssistantState> {
  const question = String(fd.get("question") ?? "").trim().slice(0, 1500);
  const personId = String(fd.get("person_id") ?? "");
  const fail = (message: string): AssistantState => ({ question, result: { ok: false, reason: "error", message } });

  if (question.length < 3) return fail("Type a question first.");
  if (!aiConfigured()) return fail("The AI Assistant is not set up: ANTHROPIC_API_KEY is missing on the server.");

  // getStore() enforces the signed-in owner; the consent flag is re-checked here on the server.
  const person = await (await getStore()).getPerson(personId);
  if (!person) return fail("Person not found.");
  if (!person.ai_allowed) return fail("AI is switched off for this person. Turn it on above first.");
  const input = toBirthInput(person);
  if (!input) return fail("Birth details are incomplete for this person.");

  const now = new Date();
  const chart = computeChart(input, now);
  // Rules the owner switched off in the Research Library never reach the model.
  const yogas = applyReviews(evaluateForBirth(input).results, await loadReviewIndex()).results;
  const ai = buildAiContext(chart, yogas, input.birthDate, now);
  return { question, result: await askAssistant(ai, question) };
}
