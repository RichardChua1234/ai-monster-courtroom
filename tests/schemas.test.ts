import { describe, it, expect } from 'vitest';
import { MonsterFindingSchema, VerdictOutputSchema, stripFences, DecisionSchema } from '../src/shared/schemas';

const validFinding = {
  perspective: 'unit economics',
  findings: [{
    id: 'cac-crisis', claim: 'Customer acquisition cost is never stated.',
    evidence: 'The submission describes the product but no channel spend.',
    severity: 'high', category: 'cac_ltv', requiresVerification: true,
  }],
  overallSeverity: 'high', confidence: 72,
};

describe('shared schemas', () => {
  // criterion: AC-2.5
  it('accepts a well-formed monster finding', () => {
    expect(() => MonsterFindingSchema.omit({ monsterId: true, monsterName: true }).parse(validFinding)).not.toThrow();
  });

  // criterion: AC-2.5
  it('rejects a monster finding with no findings', () => {
    expect(() => MonsterFindingSchema.omit({ monsterId: true, monsterName: true })
      .parse({ ...validFinding, findings: [] })).toThrow();
  });

  // criterion: AC-2.5
  it('rejects an unknown severity', () => {
    expect(() => MonsterFindingSchema.omit({ monsterId: true, monsterName: true })
      .parse({ ...validFinding, overallSeverity: 'catastrophic' })).toThrow();
  });

  // criterion: AC-4.1
  it('restricts decisions to the four verdicts', () => {
    for (const d of ['proceed', 'pivot', 'pause', 'abandon']) {
      expect(DecisionSchema.parse(d)).toBe(d);
    }
    expect(() => DecisionSchema.parse('maybe')).toThrow();
  });

  // criterion: AC-4.8
  it('rejects a validation plan that is not seven days', () => {
    const verdict = {
      decision: 'pivot', decisionRationale: 'Because the record says so, in detail.',
      scorecard: { financialViability: 40, technicalFeasibility: 70, marketFit: 55, riskProfile: 60 },
      argumentsFor: [{ text: 'there is a real pain', sourceClaimId: 'a', monster: 'zed', severity: 'low' }],
      argumentsAgainst: [{ text: 'no pricing power at all', sourceClaimId: 'b', monster: 'cashula', severity: 'high' }],
      hiddenAssumptions: [{ assumption: 'people will pay', riskIfWrong: 'no revenue', howToTest: 'ask 5 users' }],
      unansweredQuestions: ['who pays first?'],
      prioritizedImprovements: [{ action: 'price test now', effort: 'low', impact: 'high', rationale: 'cheapest signal' }],
      validationPlan: [{ day: 1, action: 'talk to five users', successCriteria: 'two say yes', effort: 'half day' }],
    };
    expect(() => VerdictOutputSchema.parse(verdict)).not.toThrow();
  });

  // criterion: AC-4.8
  it('strips markdown fences around JSON', () => {
    expect(stripFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripFences('Sure! {"a":1} hope that helps')).toBe('{"a":1}');
  });
});
