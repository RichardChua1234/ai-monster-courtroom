import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryStore } from '../src/server/store';
import { newSession, runTrial } from '../src/server/orchestrator';
import { heuristicExtract } from '../src/server/intake';

describe('orchestrator', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  // criterion: AC-1.5
  it('mints a unique session id and a public slug', () => {
    const a = newSession('u1');
    const b = newSession('u1');
    expect(a.id).not.toBe(b.id);
    expect(a.publicSlug).toHaveLength(22);
    expect(a.publicSlug).not.toBe(b.publicSlug);
  });

  // criterion: NFR-2.1
  it('fails cleanly when no monster can report', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const store = new MemoryStore();
    const session = newSession('u1');
    session.concept = heuristicExtract('Problem: a. Solution: b. Target market: c. Revenue model: d. '.padEnd(80, 'x'));
    const done = await runTrial(store, session);
    expect(done.status).toBe('failed');
    expect(done.error).toContain('Quorum');
  });

  // criterion: NFR-2.2
  it('persists state on every transition', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const store = new MemoryStore();
    const session = newSession('u1');
    session.concept = heuristicExtract('Problem: a. Solution: b. Target market: c. Revenue model: d. '.padEnd(80, 'x'));
    await runTrial(store, session);
    const reloaded = await store.get(session.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.status).toBe('failed');
  });

  // criterion: AC-5.8
  it('lists sessions for a user in reverse chronological order', async () => {
    const store = new MemoryStore();
    const older = newSession('u9');
    older.createdAt = 1000;
    const newer = newSession('u9');
    newer.createdAt = 2000;
    await store.save(older);
    await store.save(newer);
    const list = await store.listByUser('u9');
    expect(list.map((s) => s.id)).toEqual([newer.id, older.id]);
  });
});
