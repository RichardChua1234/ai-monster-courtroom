import { describe, it, expect } from 'vitest';
import { fallbackScorecard, fallbackVerdict, decisionFromScore, buildRecord } from '../src/agents/judge';
import type { MonsterFinding, DebateRound } from '../src/shared/types';

const mk = (monsterId: any, severities: any[], confidence = 90): MonsterFinding => ({
  monsterId, monsterName: monsterId, perspective: 'p',
  findings: severities.map((s: string, i: number) => ({
    id: `${monsterId}-${i}`, claim: `claim ${i}`, evidence: 'e',
    severity: s, category: 'c', requiresVerification: true,
  })),
  overallSeverity: severities[0] ?? 'low', confidence, model: 'm', generatedAt: 1,
});

describe('judge fallback', () => {
  // criterion: AC-4.2
  it('scores a clean panel higher than a damaging one', () => {
    const clean = fallbackScorecard([mk('cashula', ['low']), mk('zed', ['low'])]);
    const bad = fallbackScorecard([mk('cashula', ['critical', 'critical']), mk('zed', ['high'])]);
    expect(clean.overall).toBeGreaterThan(bad.overall);
  });

  // criterion: AC-4.2
  it('produces all four dimensions and an overall in 0..100', () => {
    const s = fallbackScorecard([mk('cashula', ['high']), mk('zed', ['low']), mk('frankenbyte', ['medium']), mk('ghost', ['critical'])]);
    for (const k of ['financialViability', 'technicalFeasibility', 'marketFit', 'riskProfile', 'overall'] as const) {
      expect(s[k]).toBeGreaterThanOrEqual(0);
      expect(s[k]).toBeLessThanOrEqual(100);
    }
  });

  // criterion: AC-4.1
  it('maps score bands onto the four decisions', () => {
    expect(decisionFromScore(85, 0)).toBe('proceed');
    expect(decisionFromScore(60, 0)).toBe('pivot');
    expect(decisionFromScore(45, 0)).toBe('pause');
    expect(decisionFromScore(20, 0)).toBe('abandon');
    expect(decisionFromScore(90, 3)).toBe('abandon'); // criticals override a good score
  });

  // criterion: NFR-2.1
  it('always returns a complete verdict shape without a model', () => {
    const panel = [mk('cashula', ['critical']), mk('zed', ['medium'])];
    const v = fallbackVerdict(panel, []);
    expect(v.deterministicFallback).toBe(true);
    expect(v.validationPlan).toHaveLength(7);
    expect(v.decisionRationale.length).toBeGreaterThan(20);
    expect(v.hiddenAssumptions.length).toBeGreaterThan(0);
    expect(v.prioritizedImprovements.length).toBeGreaterThan(0);
  });

  // criterion: NFR-2.1
  it('marks the verdict deterministic when the judge is unavailable', () => {
    expect(fallbackVerdict([mk('zed', ['low'])], []).deterministicFallback).toBe(true);
  });

  // criterion: AC-4.3
  it('cites real claim ids in the arguments', () => {
    const panel = [mk('cashula', ['critical']), mk('zed', ['high'])];
    const v = fallbackVerdict(panel, []);
    const ids = new Set(panel.flatMap((m) => m.findings.map((f) => f.id)));
    for (const a of [...v.argumentsFor, ...v.argumentsAgainst]) {
      expect(ids.has(a.sourceClaimId)).toBe(true);
    }
  });

  // criterion: AC-4.5
  it('builds the courtroom record from panel and debate', () => {
    const round: DebateRound = {
      roundNumber: 1,
      opening: [{ monsterId: 'zed', position: 'this hurts', claimIds: ['zed-0'], severity: 'high' }],
      rebuttals: [{ fromMonster: 'zed', toMonster: 'cashula', targetClaimId: 'cashula-0', rebuttal: 'x claims y but z', strength: 'strong' }],
      consensus: { reached: false, agreements: [], unresolved: ['pricing'] },
      completedAt: 1,
    };
    const record = buildRecord([mk('cashula', ['high']), mk('zed', ['low'])], [round]);
    expect(record).toContain('<PANEL>');
    expect(record).toContain('<DEBATE>');
    expect(record).toContain('zed → cashula');
  });
});


describe('judge fallback — verdict shape contract', () => {
  // criterion: 4.4
  it('separates arguments for from arguments against', () => {
    const panel = [mk('cashula', ['critical', 'low']), mk('zed', ['high', 'medium'])];
    const v = fallbackVerdict(panel, []);
    const forIds = new Set(v.argumentsFor.map((a) => a.sourceClaimId));
    const againstIds = new Set(v.argumentsAgainst.map((a) => a.sourceClaimId));
    // nothing may appear on both sides
    for (const id of forIds) expect(againstIds.has(id)).toBe(false);
    // the against list must not contain a low-severity claim
    for (const a of v.argumentsAgainst) expect(['critical', 'high']).toContain(a.severity);
  });

  // criterion: 4.6
  it('always lists unanswered questions', () => {
    const v = fallbackVerdict([mk('zed', ['critical'])], []);
    expect(v.unansweredQuestions.length).toBeGreaterThan(0);
    for (const q of v.unansweredQuestions) expect(q.length).toBeGreaterThan(5);
  });

  // criterion: 4.7
  it('always lists prioritised improvements with effort and impact', () => {
    const v = fallbackVerdict([mk('frankenbyte', ['critical'])], []);
    expect(v.prioritizedImprovements.length).toBeGreaterThan(0);
    for (const i of v.prioritizedImprovements) {
      expect(['low', 'medium', 'high']).toContain(i.effort);
      expect(['low', 'medium', 'high']).toContain(i.impact);
      expect(i.action.length).toBeGreaterThan(5);
    }
  });

  // criterion: 4.5
  it('pairs every hidden assumption with a risk and a test', () => {
    const v = fallbackVerdict([mk('ghost', ['high'])], []);
    expect(v.hiddenAssumptions.length).toBeGreaterThan(0);
    for (const a of v.hiddenAssumptions) {
      expect(a.assumption.length).toBeGreaterThan(5);
      expect(a.riskIfWrong.length).toBeGreaterThan(5);
      expect(a.howToTest.length).toBeGreaterThan(5);
    }
  });
});
