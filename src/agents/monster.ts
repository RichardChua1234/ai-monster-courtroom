/**
 * One monster, one concept, one structured finding set.
 */
import type { MonsterFinding, MonsterId, Concept } from '@shared/types';
import { MonsterFindingSchema } from '@shared/schemas';
import { PERSONAS, personaPrompt } from './personas';
import { callJson } from './client';

const MONSTER_SYSTEM_SUFFIX = `
You must answer with a single JSON object of this exact shape:
{
  "perspective": "<one line: what you evaluated>",
  "findings": [
    {
      "id": "<kebab-case-slug>",
      "claim": "<your assertion, one or two sentences>",
      "evidence": "<quote or paraphrase from the CONCEPT that supports it>",
      "severity": "critical" | "high" | "medium" | "low",
      "category": "<short category slug>",
      "requiresVerification": true | false
    }
  ],
  "overallSeverity": "critical" | "high" | "medium" | "low",
  "confidence": <0-100 integer>
}
Rules:
- 3 to 6 findings. No padding, no repeating yourself.
- If the concept does not state something you need, that IS a finding
  ("the model is silent on X"), with requiresVerification: true.
- Never invent numbers that are not in the concept. If you estimate, say "estimate".
- Severity reflects damage to the idea, not tone.`;

export function conceptText(concept: Concept): string {
  return [
    `Problem: ${concept.problem}`,
    `Solution: ${concept.solution}`,
    `Target market: ${concept.targetMarket}`,
    `Revenue model: ${concept.revenueModel}`,
    '',
    `Original submission:\n${concept.raw}`,
  ].join('\n');
}

/** Shape of what the model returns (no identity fields). */
interface MonsterModelOutput {
  perspective: string;
  findings: MonsterFinding['findings'];
  overallSeverity: MonsterFinding['overallSeverity'];
  confidence: number;
}

/**
 * Run one monster. Never throws: a failure returns a finding marked failed
 * so the panel can degrade gracefully (NFR-2.1).
 */
export async function runMonster(
  monsterId: MonsterId,
  concept: Concept,
  priorContext = '',
): Promise<MonsterFinding> {
  const persona = PERSONAS[monsterId];
  const started = Date.now();

  try {
    const out = await callJson<MonsterModelOutput>(
      {
        model: persona.model,
        temperature: persona.temperature,
        system: `${persona.anchor}\n${MONSTER_SYSTEM_SUFFIX}`,
        user: personaPrompt(monsterId, conceptText(concept), priorContext),
      },
      (raw) => MonsterFindingSchema.omit({ monsterId: true, monsterName: true }).parse(raw),
    );

    return {
      monsterId,
      monsterName: persona.name,
      perspective: out.perspective,
      findings: out.findings.map((f, i) => ({ ...f, id: f.id || `${monsterId}-${i + 1}` })),
      overallSeverity: out.overallSeverity,
      confidence: Math.round(out.confidence),
      model: persona.model,
      generatedAt: started,
    };
  } catch (err) {
    return {
      monsterId,
      monsterName: persona.name,
      perspective: persona.perspective,
      findings: [],
      overallSeverity: 'high',
      confidence: 0,
      model: persona.model,
      generatedAt: started,
      failed: true,
      error: String(err),
    };
  }
}
