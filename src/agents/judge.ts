/**
 * The Monster Judge.
 * Primary path: LLM synthesis with a strict schema.
 * Fallback path: a deterministic scorecard computed from monster findings,
 * so the courtroom always delivers a verdict (NFR-2.1).
 */
import type {
  MonsterFinding, DebateRound, Verdict, Severity, Scorecard,
} from '@shared/types';
import { VerdictOutputSchema } from '@shared/schemas';
import { PERSONAS } from './personas';
import { callJson } from './client';

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4, high: 3, medium: 2, low: 1,
};

const MONSTER_TO_DIMENSION = {
  cashula: 'financialViability',
  zed: 'marketFit',
  frankenbyte: 'technicalFeasibility',
  ghost: 'riskProfile',
} as const;

export function verdictSystemPrompt(): string {
  const p = PERSONAS.judge;
  return `${p.anchor}

You must answer with a single JSON object of this exact shape:
{
  "decision": "proceed" | "pivot" | "pause" | "abandon",
  "decisionRationale": "<2-4 sentences, evidence-bound>",
  "scorecard": {
    "financialViability": <0-100>,
    "technicalFeasibility": <0-100>,
    "marketFit": <0-100>,
    "riskProfile": <0-100>
  },
  "argumentsFor":     [{ "text": "...", "sourceClaimId": "...", "monster": "cashula|zed|frankenbyte|ghost", "severity": "..." }],
  "argumentsAgainst": [{ "text": "...", "sourceClaimId": "...", "monster": "...", "severity": "..." }],
  "hiddenAssumptions":[{ "assumption": "...", "riskIfWrong": "...", "howToTest": "..." }],
  "unansweredQuestions": ["..."],
  "prioritizedImprovements":[{ "action": "...", "effort": "low|medium|high", "impact": "low|medium|high", "rationale": "..." }],
  "validationPlan":[{ "day": 1, "action": "...", "successCriteria": "...", "effort": "..." }]
}
Rules:
- Up to 3 argumentsFor, up to 3 argumentsAgainst.
- 3 to 5 hiddenAssumptions, 3 to 5 unansweredQuestions.
- 3 to 5 prioritizedImprovements, ordered by impact then effort.
- validationPlan: exactly 7 entries, day 1..7.
- Every argument must cite a real sourceClaimId from the record.
- Calibrate: a critical unfixed risk caps riskProfile at 40.
- Score "riskProfile" as safety, not danger: higher = safer.`;
}

/** Deterministic scorecard — used when the judge LLM is unavailable. */
export function fallbackScorecard(panel: MonsterFinding[]): Scorecard {
  const usable = panel.filter((m) => !m.failed);
  const score = (monsterId: keyof typeof MONSTER_TO_DIMENSION): number => {
    const m = usable.find((x) => x.monsterId === monsterId);
    if (!m || m.findings.length === 0) return 50;
    const damage = m.findings.reduce((acc, f) => acc + SEVERITY_WEIGHT[f.severity], 0);
    const max = m.findings.length * SEVERITY_WEIGHT.critical;
    const health = 100 - Math.round((damage / max) * 100);
    // weight by the monster's own confidence
    return Math.max(0, Math.min(100, Math.round(health * (m.confidence / 100) + health * 0.15)));
  };

  const financialViability = score('cashula');
  const technicalFeasibility = score('frankenbyte');
  const marketFit = score('zed');
  const riskProfile = score('ghost');
  const overall = Math.round(
    (financialViability + technicalFeasibility + marketFit + riskProfile) / 4,
  );
  return { financialViability, technicalFeasibility, marketFit, riskProfile, overall };
}

export function decisionFromScore(overall: number, criticalCount: number): Verdict['decision'] {
  if (criticalCount >= 3 || overall < 35) return 'abandon';
  if (overall < 50) return 'pause';
  if (overall < 70) return 'pivot';
  return 'proceed';
}

/** Deterministic verdict — full shape, no LLM. */
export function fallbackVerdict(panel: MonsterFinding[], debate: DebateRound[]): Verdict {
  const usable = panel.filter((m) => !m.failed);
  const allFindings = usable.flatMap((m) => m.findings.map((f) => ({ f, m })));
  const scorecard = fallbackScorecard(panel);
  const criticalCount = allFindings.filter(({ f }) => f.severity === 'critical').length;

  const against = allFindings
    .filter(({ f }) => f.severity === 'critical' || f.severity === 'high')
    .sort((a, b) => SEVERITY_WEIGHT[b.f.severity] - SEVERITY_WEIGHT[a.f.severity])
    .slice(0, 3)
    .map(({ f, m }) => ({
      text: f.claim, sourceClaimId: f.id, monster: m.monsterId, severity: f.severity,
    }));

  const forIdeas = allFindings
    .filter(({ f }) => f.severity === 'low' || f.severity === 'medium')
    .slice(0, 3)
    .map(({ f, m }) => ({
      text: f.claim, sourceClaimId: f.id, monster: m.monsterId, severity: f.severity,
    }));

  const assumptions = allFindings
    .filter(({ f }) => f.requiresVerification)
    .slice(0, 5)
    .map(({ f }) => ({
      assumption: f.claim,
      riskIfWrong: `If wrong, ${f.category} becomes a larger problem than modelled.`,
      howToTest: `Ask 5 target users about ${f.category} directly.`,
    }));

  const questions = allFindings
    .filter(({ f }) => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 5)
    .map(({ f }) => `Does the concept actually hold up on: ${f.claim}`);

  const improvements = allFindings
    .filter(({ f }) => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 5)
    .map(({ f }) => ({
      action: `Resolve before building further: ${f.claim}`,
      effort: f.severity === 'critical' ? 'high' as const : 'medium' as const,
      impact: 'high' as const,
      rationale: `Flagged ${f.severity} by ${f.category}.`,
    }));

  const debateUnresolved = debate.flatMap((r) => r.consensus.unresolved).slice(0, 7);
  const validationPlan = Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    return {
      day,
      action: debateUnresolved[i] ?? `Validate the ${['problem', 'willingness to pay', 'technical spike', 'competitive gap', 'unit economics', 'environment', 'compliance'][i]}`,
      successCriteria: 'A specific number or quote from a real person that confirms or kills this assumption.',
      effort: 'half day',
    };
  });

  return {
    decision: decisionFromScore(scorecard.overall, criticalCount),
    decisionRationale:
      `Deterministic verdict from ${usable.length}/${panel.length} monster reports. ` +
      `Overall ${scorecard.overall}/100 with ${criticalCount} critical finding(s). ` +
      `Judge model was unavailable, so this verdict is computed, not synthesized.`,
    scorecard,
    argumentsFor: forIdeas,
    argumentsAgainst: against,
    hiddenAssumptions: assumptions.length ? assumptions : [{
      assumption: 'The concept as described is complete enough to judge.',
      riskIfWrong: 'The verdict may address the wrong problem.',
      howToTest: 'Re-read the submission with a hostile reader.',
    }],
    unansweredQuestions: questions.length ? questions : [
      'Who exactly has this problem, and how do they solve it today?',
    ],
    prioritizedImprovements: improvements.length ? improvements : [{
      action: 'Write down the one number that would prove this works.',
      effort: 'low' as const, impact: 'high' as const,
      rationale: 'No high-severity findings were produced, so define your own success metric.',
    }],
    validationPlan,
    generatedAt: Date.now(),
    deterministicFallback: true,
  };
}

/** Primary path: ask the judge. Falls back deterministically on any failure. */
export async function runJudge(
  conceptText: string,
  panel: MonsterFinding[],
  debate: DebateRound[],
): Promise<Verdict> {
  const record = buildRecord(panel, debate);
  try {
    const out = await callJson<Omit<Verdict, 'generatedAt'>>(
      {
        model: PERSONAS.judge.model,
        temperature: PERSONAS.judge.temperature,
        system: verdictSystemPrompt(),
        user: `${personaHeader(conceptText)}\n\n${record}`,
      },
      (raw) => VerdictOutputSchema.parse(raw) as Omit<Verdict, 'generatedAt'>,
    );
    const overall = Math.round(
      (out.scorecard.financialViability +
        out.scorecard.technicalFeasibility +
        out.scorecard.marketFit +
        out.scorecard.riskProfile) / 4,
    );
    return { ...out, scorecard: { ...out.scorecard, overall }, generatedAt: Date.now() };
  } catch {
    return fallbackVerdict(panel, debate);
  }
}

function personaHeader(conceptText: string): string {
  return '<CONCEPT>\n' + conceptText + '\n</CONCEPT>';
}

export function buildRecord(panel: MonsterFinding[], debate: DebateRound[]): string {
  const parts: string[] = ['<PANEL>'];
  for (const m of panel) {
    if (m.failed) {
      parts.push(`${m.monsterName}: FAILED TO REPORT (${m.error ?? 'unknown'})`);
      continue;
    }
    parts.push(`${m.monsterName} (${m.perspective}) — severity ${m.overallSeverity}, confidence ${m.confidence}`);
    for (const f of m.findings) {
      parts.push(`  [${f.id}] ${f.severity.toUpperCase()} ${f.category}: ${f.claim} | evidence: ${f.evidence}`);
    }
  }
  parts.push('</PANEL>', '<DEBATE>');
  for (const r of debate) {
    parts.push(`Round ${r.roundNumber}${r.consensus.reached ? ' (consensus reached)' : ''}`);
    for (const a of r.opening) parts.push(`  ${a.monsterId}: ${a.position}`);
    for (const rb of r.rebuttals) parts.push(`  ${rb.fromMonster} → ${rb.toMonster} on [${rb.targetClaimId}]: ${rb.rebuttal}`);
    if (r.consensus.agreements.length) parts.push(`  agreed: ${r.consensus.agreements.join('; ')}`);
  }
  parts.push('</DEBATE>');
  return parts.join('\n');
}
