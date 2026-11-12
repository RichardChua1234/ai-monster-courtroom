import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRehearsalFetch, rehearsalReport, REHEARSAL_MODEL } from '../src/agents/rehearsal';
import { personaIdentity, personaPrompt } from '../src/agents/personas';
import { app, useMemoryStore, setUserIdResolver } from '../src/server/index';

const thin = 'We want to build an app that helps people be more productive using artificial intelligence in their daily lives somehow.';

const rich = `Problem: engineers today spend 6 hours a week manually proving a spec is implemented.
Solution: a CLI that maps each acceptance criterion to a passing test using an API.
Target market: platform engineering teams at mid-size companies.
Revenue model: per seat subscription at $20 per month.
Competitors: manual review and existing coverage tools.
Security: tokens are encrypted and we never store source code.
Phase 1 is 4 weeks to MVP.`;

describe('rehearsal stand-in', () => {
  afterEach(() => vi.unstubAllGlobals());

  // criterion: 10.5
  it('is labelled as a stand-in rather than a model', async () => {
    const report = rehearsalReport('cashula', thin);
    expect(report.model).toBe(REHEARSAL_MODEL);
    expect(REHEARSAL_MODEL).toContain('rehearsal');
  });

  // criterion: 10.5
  it('finds more to object to in a thin concept than a complete one', () => {
    const thinReport = rehearsalReport('cashula', thin);
    const richReport = rehearsalReport('cashula', rich);
    const count = (r: ReturnType<typeof rehearsalReport>) =>
      r.findings.filter((f) => f.severity !== 'low').length;
    expect(count(thinReport)).toBeGreaterThan(count(richReport));
    expect(thinReport.overallSeverity).toBe('critical');
    expect(richReport.overallSeverity).not.toBe('critical');
  });

  // criterion: 10.5
  it('keeps every persona in its own lane', () => {
    const cashula = rehearsalReport('cashula', thin);
    const zed = rehearsalReport('zed', thin);
    expect(cashula.perspective).toMatch(/financial/i);
    expect(zed.perspective).toMatch(/customer/i);
    // the vampire objects about money, the zombie about the customer
    expect(cashula.findings.some((f) => /revenue model/i.test(f.claim))).toBe(true);
    expect(zed.findings.some((f) => /who this is for/i.test(f.claim))).toBe(true);
  });

  // criterion: 10.5
  it('refuses the judge role so the real fallback runs', async () => {
    const res = await createRehearsalFetch()('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'system', content: personaIdentity('judge') },
          { role: 'user', content: '<CONCEPT>x</CONCEPT>' },
        ],
      }),
    });
    expect(res.status).toBe(503);
  });

  // criterion: 10.5
  it('answers a monster prompt with a valid report', async () => {
    const res = await createRehearsalFetch()('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'system', content: personaIdentity('cashula') },
          { role: 'user', content: personaPrompt('cashula', thin) },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = JSON.parse(body.choices[0].message.content);
    expect(parsed.findings.length).toBeGreaterThan(0);
    expect(parsed.findings[0]).toHaveProperty('severity');
  });
});

describe('keyless end-to-end trial', () => {
  beforeEach(() => {
    useMemoryStore();
    setUserIdResolver(async () => 'rehearsal-judge');
    vi.stubGlobal('fetch', createRehearsalFetch());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setUserIdResolver(async () => 'anonymous');
  });

  // criterion: 10.5
  it('runs intake, panel, debate and verdict with no API key', async () => {
    const created = await app.request('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ concept: `${rich} ${thin}` }),
    });
    expect(created.status).toBe(200);
    const { session } = await created.json();

    const panel = await (await app.request(`/api/session/${session.id}/panel`, { method: 'POST' })).json();
    expect(panel.session.panel.filter((m: any) => !m.failed)).toHaveLength(4);
    expect(panel.session.status).toBe('panel');

    const debated = await (await app.request(`/api/session/${session.id}/debate`, { method: 'POST' })).json();
    expect(debated.session.debate.length).toBeGreaterThanOrEqual(2);
    expect(debated.session.debate[0].rebuttals.length).toBeGreaterThan(0);

    const verdicted = await (await app.request(`/api/session/${session.id}/verdict`, { method: 'POST' })).json();
    const v = verdicted.session.verdict;
    expect(v).toBeTruthy();
    expect(['proceed', 'pivot', 'pause', 'abandon']).toContain(v.decision);
    expect(v.validationPlan).toHaveLength(7);
    expect(verdicted.session.status).toBe('complete');
    // the judge was never rehearsed, so this is the real deterministic fallback
    expect(v.deterministicFallback).toBe(true);
  });
});
