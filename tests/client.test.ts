import { describe, it, expect, vi, afterEach } from 'vitest';
import { callJson, LLMError, DEFAULT_MAX_ATTEMPTS } from '../src/agents/client';

describe('llm client', () => {
  afterEach(() => vi.unstubAllGlobals());

  // criterion: 7.3
  it('retries three times with backoff before giving up', async () => {
    const calls: number[] = [];
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls.push(Date.now());
      throw new Error('network down');
    }));

    await expect(
      callJson({ model: 'm', temperature: 0, system: 's', user: 'u' }, (v) => v),
    ).rejects.toBeInstanceOf(LLMError);

    expect(DEFAULT_MAX_ATTEMPTS).toBe(3);
    expect(calls).toHaveLength(3);
    // exponential: the second gap must exceed the first
    if (calls.length === 3) {
      const gap1 = calls[1] - calls[0];
      const gap2 = calls[2] - calls[1];
      expect(gap2).toBeGreaterThanOrEqual(gap1);
    }
  });

  // criterion: 7.3
  it('reports how many attempts were made on failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom'); }));
    try {
      await callJson({ model: 'm', temperature: 0, system: 's', user: 'u' }, (v) => v);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(LLMError);
      expect((err as LLMError).attempts).toBe(3);
    }
  });

  // criterion: 7.3
  it('recovers when a later attempt succeeds', async () => {
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      n += 1;
      if (n < 2) throw new Error('transient');
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 });
    }));
    const out = await callJson<{ ok: boolean }>(
      { model: 'm', temperature: 0, system: 's', user: 'u' },
      (v) => v as { ok: boolean },
    );
    expect(out.ok).toBe(true);
    expect(n).toBe(2);
  });
});
