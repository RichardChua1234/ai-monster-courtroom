/**
 * zod schemas — the contract every monster must satisfy.
 * LLM output is parsed with these; a failed parse triggers one repair pass.
 */
import { z } from 'zod';

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export const DecisionSchema = z.enum(['proceed', 'pivot', 'pause', 'abandon']);
export const MonsterIdSchema = z.enum(['cashula', 'zed', 'frankenbyte', 'ghost']);

export const FindingSchema = z.object({
  id: z.string().min(1),
  claim: z.string().min(5),
  evidence: z.string().min(1),
  severity: SeveritySchema,
  category: z.string().min(1),
  requiresVerification: z.boolean(),
});

export const MonsterFindingSchema = z.object({
  monsterId: MonsterIdSchema,
  monsterName: z.string().min(1),
  perspective: z.string().min(1),
  findings: z.array(FindingSchema).min(1).max(8),
  overallSeverity: SeveritySchema,
  confidence: z.number().min(0).max(100),
});

/** What the model is allowed to return (no derived fields). */
export const MonsterOutputSchema = MonsterFindingSchema.omit({
  monsterId: true,
  monsterName: true,
}).extend({
  perspective: z.string().min(1),
});

export const RebuttalSchema = z.object({
  fromMonster: MonsterIdSchema,
  toMonster: MonsterIdSchema,
  targetClaimId: z.string().min(1),
  rebuttal: z.string().min(10),
  strength: z.enum(['strong', 'moderate', 'weak']),
});

export const DebateRoundOutputSchema = z.object({
  opening: z.array(z.object({
    monsterId: MonsterIdSchema,
    position: z.string().min(10),
    claimIds: z.array(z.string()),
    severity: SeveritySchema,
  })).min(2).max(4),
  rebuttals: z.array(RebuttalSchema).min(1).max(12),
  consensus: z.object({
    reached: z.boolean(),
    agreements: z.array(z.string()),
    unresolved: z.array(z.string()),
  }),
});

export const VerdictOutputSchema = z.object({
  decision: DecisionSchema,
  decisionRationale: z.string().min(20),
  scorecard: z.object({
    financialViability: z.number().min(0).max(100),
    technicalFeasibility: z.number().min(0).max(100),
    marketFit: z.number().min(0).max(100),
    riskProfile: z.number().min(0).max(100),
  }),
  argumentsFor: z.array(z.object({
    text: z.string().min(10),
    sourceClaimId: z.string(),
    monster: MonsterIdSchema,
    severity: SeveritySchema,
  })).min(1).max(5),
  argumentsAgainst: z.array(z.object({
    text: z.string().min(10),
    sourceClaimId: z.string(),
    monster: MonsterIdSchema,
    severity: SeveritySchema,
  })).min(1).max(5),
  hiddenAssumptions: z.array(z.object({
    assumption: z.string().min(5),
    riskIfWrong: z.string().min(5),
    howToTest: z.string().min(5),
  })).min(1).max(8),
  unansweredQuestions: z.array(z.string().min(5)).min(1).max(10),
  prioritizedImprovements: z.array(z.object({
    action: z.string().min(5),
    effort: z.enum(['low', 'medium', 'high']),
    impact: z.enum(['low', 'medium', 'high']),
    rationale: z.string().min(5),
  })).min(1).max(10),
  validationPlan: z.array(z.object({
    day: z.number().int().min(1).max(7),
    action: z.string().min(5),
    successCriteria: z.string().min(5),
    effort: z.string().min(1),
  })).min(1).max(7),
});

export const ConceptExtractionSchema = z.object({
  problem: z.string().min(1),
  solution: z.string().min(1),
  targetMarket: z.string().min(1),
  revenueModel: z.string().min(1),
  extractionConfidence: z.number().min(0).max(100),
});

export type ConceptExtraction = z.infer<typeof ConceptExtractionSchema>;

/** Strip markdown fences a model may wrap JSON in. */
export function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}
