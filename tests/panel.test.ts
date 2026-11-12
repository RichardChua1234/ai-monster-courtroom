import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Concept } from '../src/shared/types';

const concept: Concept = {
  raw: 'x'.repeat(80), problem: 'p', solution: 's', targetMarket: 'm',
  revenueModel: 'r', extractionConfidence: 100, extractedAt: 1,
};

describe('panel quorum', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  // criterion: NFR-2.1
  it('marks a monster failed instead of throwing when its call dies', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const { runPanel } = await import('../src/server/panel');
    const result = await runPanel(concept);
    expect(result.findings).toHaveLength(4);
    expect(result.succeeded).toHaveLength(0);
    expect(result.quorumMet).toBe(false);
    for (const f of result.findings) {
      expect(f.failed).toBe(true);
      expect(f.confidence).toBe(0);
    }
  });

  // criterion: AC-2.5
  it('returns every monster in panel order', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const { runPanel } = await import('../src/server/panel');
    const { findings } = await runPanel(concept);
    expect(findings.map((f) => f.monsterId)).toEqual(['cashula', 'zed', 'frankenbyte', 'ghost']);
  });
});
