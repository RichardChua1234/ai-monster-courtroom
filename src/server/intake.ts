/**
 * Intake — validate the submission and extract the four judged fields.
 * Falls back to a deterministic heuristic extractor when no model is reachable.
 */
import type { Concept } from '@shared/types';
import { ConceptExtractionSchema } from '@shared/schemas';
import { callJson } from '../agents/client';

export const MIN_CHARS = 50;
export const MAX_CHARS = 10_000;

export class IntakeError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'IntakeError';
  }
}

export function validateSubmission(raw: string): string {
  const text = (raw ?? '').trim();
  if (text.length < MIN_CHARS) {
    throw new IntakeError('too_short', `Concept must be at least ${MIN_CHARS} characters (got ${text.length}).`);
  }
  if (text.length > MAX_CHARS) {
    throw new IntakeError('too_long', `Concept must be at most ${MAX_CHARS} characters (got ${text.length}).`);
  }
  return text;
}

/** Heuristic extraction: look for labelled fields, else take sentence slices. */
export function heuristicExtract(raw: string): Concept {
  const grab = (labels: string[]): string | null => {
    for (const label of labels) {
      // Allow a short trailing word before the colon so "Revenue model:" matches
      // the "revenue" label and "Target market:" matches "market".
      const re = new RegExp(`${label}[a-z ]{0,14}[:\\-]\\s*(.+)`, 'i');
      const m = raw.match(re);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  };

  const sentences = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const problem = grab(['problem', 'pain', 'issue', 'why']) ?? sentences[0] ?? raw.slice(0, 200);
  const solution = grab(['solution', 'product', 'idea', 'what']) ?? sentences[1] ?? raw.slice(0, 200);
  const targetMarket = grab(['market', 'customer', 'user', 'audience', 'who']) ?? 'Not stated.';
  const revenueModel = grab(['revenue', 'monetis', 'monetiz', 'pricing', 'business model']) ?? 'Not stated.';

  const statedFields = [problem, solution, targetMarket, revenueModel]
    .filter((v) => v && v !== 'Not stated.').length;

  return {
    raw,
    problem,
    solution,
    targetMarket,
    revenueModel,
    extractionConfidence: Math.round((statedFields / 4) * 100),
    extractedAt: Date.now(),
  };
}

const EXTRACTION_SYSTEM = `You extract structured fields from a startup concept submission.
Return ONLY JSON: { "problem": "...", "solution": "...", "targetMarket": "...",
"revenueModel": "...", "extractionConfidence": <0-100> }
If a field is genuinely absent, write exactly "Not stated." — never invent it.`;

export async function extractConcept(raw: string, model: string): Promise<Concept> {
  const validated = validateSubmission(raw);
  try {
    const out = await callJson(
      {
        model,
        temperature: 0.1,
        system: EXTRACTION_SYSTEM,
        user: `<SUBMISSION>\n${validated}\n</SUBMISSION>`,
      },
      (v) => ConceptExtractionSchema.parse(v),
    );
    return { raw: validated, ...out, extractedAt: Date.now() };
  } catch {
    return heuristicExtract(validated);
  }
}
