import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryStore } from '../src/server/store';
import { newSession, runPanelPhase, runDebatePhase, pauseTrial, resumeTrial } from '../src/server/orchestrator';
import { heuristicExtract } from '../src/server/intake';
import type { StreamEvent } from '../src/shared/types';

const concept = heuristicExtract(
  'Problem: devs cannot prove the spec is met. Solution: map each criterion to a test. Target market: engineering teams. Revenue model: per seat.',
);

const collecting = () => {
  const events: StreamEvent[] = [];
  return { events, emit: (e: StreamEvent) => events.push(e) };
};

describe('stream events', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); })));
  afterEach(() => vi.unstubAllGlobals());

  // criterion: 6.1
  it('emits typed events for status, monster reports and the verdict', async () => {
    const { events, emit } = collecting();
    const store = new MemoryStore();
    const session = newSession('u');
    session.concept = concept;
    await runPanelPhase(store, session, emit);

    const types = new Set(events.map((e) => e.type));
    expect(types.has('status')).toBe(true);
    expect(types.has('monster_started')).toBe(true);
    expect(types.has('monster_done')).toBe(true);
  });

  // criterion: 6.4
  it('identifies which monster produced each event', async () => {
    const { events, emit } = collecting();
    const store = new MemoryStore();
    const session = newSession('u');
    session.concept = concept;
    await runPanelPhase(store, session, emit);

    const monsterEvents = events.filter((e) => e.type === 'monster_started' || e.type === 'monster_done');
    expect(monsterEvents.length).toBeGreaterThan(0);
    for (const e of monsterEvents) {
      expect(['cashula', 'zed', 'frankenbyte', 'ghost']).toContain((e as any).monsterId);
    }
  });

  // criterion: 6.2
  it('emits round-start and round-complete with the round number and consensus flag', async () => {
    const { events, emit } = collecting();
    const store = new MemoryStore();
    const session = newSession('u');
    session.concept = concept;
    session.panel = [{
      monsterId: 'cashula', monsterName: 'Count Cashula', perspective: 'finance',
      findings: [{ id: 'c1', claim: 'no pricing evidence', evidence: 'silent', severity: 'high', category: 'pricing', requiresVerification: true }],
      overallSeverity: 'high', confidence: 80, model: 'm', generatedAt: 1,
    }];

    await runDebatePhase(store, session, emit);

    const starts = events.filter((e) => e.type === 'round_start');
    const completes = events.filter((e) => e.type === 'round_complete');
    expect(starts.length).toBeGreaterThanOrEqual(2);
    expect(completes.length).toBe(starts.length);
    expect((starts[0] as any).roundNumber).toBe(1);
    expect(typeof (completes[0] as any).consensus).toBe('boolean');
  });

  // criterion: 6.3
  it('stops advancing the trial while paused and resumes afterwards', async () => {
    const { events, emit } = collecting();
    const store = new MemoryStore();
    const session = newSession('u');
    session.concept = concept;
    session.panel = [{
      monsterId: 'zed', monsterName: 'Zed', perspective: 'customer',
      findings: [{ id: 'z1', claim: 'no real pain', evidence: 'weak', severity: 'critical', category: 'pain_validity', requiresVerification: true }],
      overallSeverity: 'critical', confidence: 70, model: 'm', generatedAt: 1,
    }];

    await pauseTrial(store, session);
    expect(session.paused).toBe(true);
    await runDebatePhase(store, session, emit);
    expect(events.filter((e) => e.type === 'round_start')).toHaveLength(0);
    expect(session.debate).toHaveLength(0);

    await resumeTrial(store, session);
    expect(session.paused).toBe(false);
    await runDebatePhase(store, session, emit);
    expect(events.filter((e) => e.type === 'round_start').length).toBeGreaterThanOrEqual(2);
    expect(session.debate.length).toBeGreaterThanOrEqual(2);
  });

  // criterion: 6.3
  it('persists the paused flag so a reload keeps the trial held', async () => {
    const store = new MemoryStore();
    const session = newSession('u');
    await store.save(session);
    await pauseTrial(store, session);
    const reloaded = await store.get(session.id);
    expect(reloaded!.paused).toBe(true);
  });
});
