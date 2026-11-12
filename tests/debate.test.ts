import { describe, it, expect } from 'vitest';
import { deterministicRound, shouldContinue, computeDisagreement, MIN_ROUNDS, MAX_ROUNDS } from '../src/server/debate';
import type { MonsterFinding, DebateRound } from '../src/shared/types';

const mk = (monsterId: any, severities: any[]): MonsterFinding => ({
  monsterId, monsterName: monsterId, perspective: 'p',
  findings: severities.map((s: string, i: number) => ({
    id: `${monsterId}-${i}`, claim: `claim ${i}`, evidence: 'e',
    severity: s, category: 'c', requiresVerification: false,
  })),
  overallSeverity: severities[0] ?? 'low', confidence: 90, model: 'm', generatedAt: 1,
});

const round = (n: number, reached: boolean, unresolved: string[], strong: number): DebateRound => ({
  roundNumber: n,
  opening: [], 
  rebuttals: Array.from({ length: strong }, (_, i) => ({
    fromMonster: 'zed' as const, toMonster: 'cashula' as const,
    targetClaimId: `c${i}`, rebuttal: 'x claims y but z', strength: 'strong' as const,
  })),
  consensus: { reached, agreements: [], unresolved },
  completedAt: 1,
});

describe('debate engine', () => {
  // criterion: AC-3.1
  it('requires at least two rounds before it can stop', () => {
    expect(shouldContinue([round(1, true, [], 0)])).toBe(true);
    expect(MIN_ROUNDS).toBe(2);
  });

  // criterion: AC-3.5
  it('stops when consensus is reached', () => {
    expect(shouldContinue([round(1, false, [], 0), round(2, true, [], 0)])).toBe(false);
  });

  // criterion: AC-3.1
  it('never exceeds the maximum round count', () => {
    const rounds = Array.from({ length: MAX_ROUNDS }, (_, i) => round(i + 1, false, ['a', 'b', 'c', 'd', 'e'], 3));
    expect(shouldContinue(rounds)).toBe(false);
  });

  // criterion: AC-3.3
  it('keeps debating while the court is genuinely split', () => {
    const split = [round(1, false, ['a', 'b', 'c', 'd', 'e'], 3), round(2, false, ['a', 'b', 'c', 'd'], 3)];
    expect(computeDisagreement(split[1])).toBeGreaterThan(0.35);
    expect(shouldContinue(split)).toBe(true);
  });

  // criterion: AC-3.2
  it('produces rebuttals aimed at other monsters', () => {
    const panel = [mk('cashula', ['critical']), mk('zed', ['high']), mk('frankenbyte', ['medium'])];
    const r = deterministicRound(panel, 1);
    expect(r.rebuttals.length).toBeGreaterThan(0);
    for (const rb of r.rebuttals) {
      expect(rb.fromMonster).not.toBe(rb.toMonster);
      expect(rb.rebuttal).toContain('claims');
    }
  });

  // criterion: 3.3
  it('names both monsters and the claim it attacks in every rebuttal', () => {
    const panel = [mk('cashula', ['critical']), mk('zed', ['high'])];
    const r = deterministicRound(panel, 1);
    for (const rb of r.rebuttals) {
      expect(rb.rebuttal).toMatch(/claims/i);
      expect(rb.rebuttal).toMatch(/but/i);
      expect(rb.targetClaimId).toBeTruthy();
      expect(rb.fromMonster).not.toBe(rb.toMonster);
    }
  });

  // criterion: AC-3.4
  it('cites a real target claim id', () => {
    const panel = [mk('cashula', ['critical']), mk('zed', ['high'])];
    const ids = new Set(panel.flatMap((m) => m.findings.map((f) => f.id)));
    for (const rb of deterministicRound(panel, 1).rebuttals) {
      expect(ids.has(rb.targetClaimId)).toBe(true);
    }
  });

  // criterion: AC-3.5
  it('reports consensus when nothing critical remains', () => {
    const r = deterministicRound([mk('cashula', ['low']), mk('zed', ['low'])], 1);
    expect(r.consensus.reached).toBe(true);
  });
});
