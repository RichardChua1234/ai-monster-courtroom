import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { app, useMemoryStore, setUserIdResolver, MAX_SESSIONS_PER_HOUR } from '../src/server/index';
import { heuristicExtract } from '../src/server/intake';

const good = 'Problem: devs cannot prove the spec is met. Solution: map each criterion to a test. Target market: engineering teams. Revenue model: per seat.';

describe('api', () => {
  beforeEach(() => {
    useMemoryStore();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
  });
  afterEach(() => { vi.unstubAllGlobals(); setUserIdResolver(async () => 'anonymous'); });

  // criterion: AC-1.2
  it('rejects a concept that is too short', async () => {
    const res = await app.request('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ concept: 'nope' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('too_short');
  });

  // criterion: AC-1.5
  it('creates a session with an extracted concept', async () => {
    const res = await app.request('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ concept: good }),
    });
    expect(res.status).toBe(200);
    const { session } = await res.json();
    expect(session.id).toMatch(/^court_/);
    expect(session.concept.problem).toContain('devs cannot prove');
    expect(session.status).toBe('intake');
  });

  // criterion: AC-5.1
  it('serves a read-only public view that redacts the owner', async () => {
    setUserIdResolver(async () => 'owner-42');
    const created = await app.request('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ concept: good }),
    });
    const { session } = await created.json();
    const res = await app.request(`/api/public/${session.publicSlug}`);
    expect(res.status).toBe(200);
    const { session: pub } = await res.json();
    expect(pub.userId).toBe('redacted');
    expect(pub.publicSlug).toBe(session.publicSlug);
  });

  // criterion: AC-5.1
  it('404s an unknown slug', async () => {
    const res = await app.request('/api/public/doesnotexistatall0000');
    expect(res.status).toBe(404);
  });

  // criterion: AC-5.2
  it('exports markdown with a content-type of text/markdown', async () => {
    const created = await app.request('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ concept: good }),
    });
    const { session } = await created.json();
    const res = await app.request(`/api/session/${session.id}/export?format=md`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/markdown');
    expect(await res.text()).toContain('# AI Monster Courtroom — Verdict');
  });

  // criterion: NFR-3.1
  it('rate limits after the configured number of trials', async () => {
    setUserIdResolver(async () => 'greedy');
    for (let i = 0; i < MAX_SESSIONS_PER_HOUR; i++) {
      const r = await app.request('/api/session', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ concept: good }),
      });
      expect(r.status).toBe(200);
    }
    const blocked = await app.request('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ concept: good }),
    });
    expect(blocked.status).toBe(429);
  });

  // criterion: NFR-2.1
  it('runs a full trial that degrades to a deterministic verdict when offline', async () => {
    const created = await app.request('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ concept: good }),
    });
    const { session } = await created.json();
    const panel = await (await app.request(`/api/session/${session.id}/panel`, { method: 'POST' })).json();
    expect(panel.session.status).toBe('failed');
  });

  // criterion: AC-5.8
  it('returns per-user history', async () => {
    setUserIdResolver(async () => 'hist-user');
    await app.request('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ concept: good }),
    });
    const res = await app.request('/api/user/history');
    const { sessions } = await res.json();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toMatch(/^court_/);
  });

  // criterion: AC-4.8
  it('exports a full deterministic verdict whose validation plan is seven days', async () => {
    const { fallbackVerdict } = await import('../src/agents/judge');
    const { toMarkdown } = await import('../src/server/export');
    const concept = heuristicExtract(good);
    const panel = [{
      monsterId: 'cashula' as const, monsterName: 'Count Cashula', perspective: 'finance',
      findings: [{ id: 'c1', claim: 'No pricing evidence.', evidence: 'silent', severity: 'high' as const, category: 'pricing', requiresVerification: true }],
      overallSeverity: 'high' as const, confidence: 80, model: 'm', generatedAt: 1,
    }];
    const session = {
      id: 'court_x', createdAt: 1, updatedAt: 1, userId: 'u', status: 'complete' as const,
      concept, currentRound: 0, maxRounds: 4, panel, debate: [],
      verdict: fallbackVerdict(panel, []), publicSlug: 'abc', error: null,
    };
    const md = toMarkdown(session);
    expect(md).toContain('Seven-Day Validation Plan');
    expect(md).toContain('Day 7');
    expect(md).toContain('Scorecard');
  });
});
