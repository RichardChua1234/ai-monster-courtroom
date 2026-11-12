import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { heuristicExtract } from '../src/server/intake';
import { newSession } from '../src/server/orchestrator';
import { app, useMemoryStore, setUserIdResolver } from '../src/server/index';

const concept = heuristicExtract(
  'Problem: devs cannot prove the spec is met. Solution: map each criterion to a test. Target market: engineering teams. Revenue model: per seat.',
);

describe('privacy', () => {
  beforeEach(() => {
    useMemoryStore();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
  });
  afterEach(() => { vi.unstubAllGlobals(); setUserIdResolver(async () => 'anonymous'); });

  // criterion: 8.3
  it('stores only the concept fields plus the platform user identifier', () => {
    const allowed = new Set([
      'raw', 'problem', 'solution', 'targetMarket', 'revenueModel',
      'extractionConfidence', 'extractedAt',
    ]);
    for (const key of Object.keys(concept)) expect(allowed.has(key)).toBe(true);
    // no email, phone or name captured by the extractor
    const serialized = JSON.stringify(concept).toLowerCase();
    for (const pii of ['email', 'phone', 'linkedin', 'address']) {
      expect(serialized).not.toContain(pii);
    }
  });

  // criterion: 8.3
  it('keeps the session record free of personal fields', () => {
    const session = newSession('platform-user-9');
    expect(session.userId).toBe('platform-user-9');
    const keys = Object.keys(session);
    for (const pii of ['email', 'name', 'phone', 'address', 'ipAddress']) {
      expect(keys).not.toContain(pii);
    }
  });

  // criterion: 8.3
  it('never leaks the owner identifier through the public view', async () => {
    setUserIdResolver(async () => 'owner-secret-77');
    const created = await app.request('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        concept: 'Problem: devs cannot prove the spec is met. Solution: map each criterion to a test. Target market: engineering teams. Revenue model: per seat.',
      }),
    });
    const { session } = await created.json();
    const res = await app.request(`/api/public/${session.publicSlug}`);
    const body = await res.text();
    expect(body).not.toContain('owner-secret-77');
    expect(JSON.parse(body).session.userId).toBe('redacted');
  });
});
