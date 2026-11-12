/**
 * Browser demo entry.
 *
 * This page runs the REAL product: the same Hono app, the same agents, the same React
 * UI as the Devvit build. Nothing is reimplemented for the demo -- the only difference
 * is the transport. Instead of `fetch` reaching a server, `setTransport` points the
 * client straight at the Hono router running in this page, and the in-memory store
 * stands in for Devvit Redis.
 *
 * Two modes:
 *   rehearsal -- no key, no spend. Monster replies come from a deterministic stand-in
 *                (src/agents/rehearsal.ts), which is NOT a language model. The judge
 *                role is left unanswered on purpose, so the real deterministic verdict
 *                fallback runs. This proves the pipeline end to end offline.
 *   live      -- real model calls to all five agents using your own OpenRouter key,
 *                held only in this tab's sessionStorage and sent only to OpenRouter.
 */
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../src/client/App';
import { setTransport } from '../src/client/api';
import { setApiKey } from '../src/agents/client';
import { createRehearsalFetch } from '../src/agents/rehearsal';
import { app, useMemoryStore, setUserIdResolver } from '../src/server/index';

// --- boot the real server inside this page -----------------------------------------
useMemoryStore();
void setUserIdResolver(async () => 'demo-visitor');
setTransport((path, init) => app.request(path, init));

const REAL_FETCH = globalThis.fetch.bind(globalThis);
const KEY_STORAGE = 'courtroom.openrouter.key';

type Mode = 'rehearsal' | 'live';

function DemoBar() {
  const [mode, setMode] = useState<Mode>('rehearsal');
  const [key, setKey] = useState('');

  // restore a key typed earlier in this tab (sessionStorage only -- never persisted)
  useEffect(() => {
    const saved = sessionStorage.getItem(KEY_STORAGE);
    if (saved) { setKey(saved); setMode('live'); }
  }, []);

  useEffect(() => {
    if (mode === 'rehearsal') {
      globalThis.fetch = createRehearsalFetch();
      setApiKey(null);
    } else {
      globalThis.fetch = REAL_FETCH;
      setApiKey(key.trim() || null);
    }
  }, [mode, key]);

  const onKey = (v: string) => {
    setKey(v);
    if (v.trim()) sessionStorage.setItem(KEY_STORAGE, v);
    else sessionStorage.removeItem(KEY_STORAGE);
  };

  return (
    <div style={{
      borderBottom: '1px solid #241734', background: '#120b1c',
      padding: '10px 20px', fontSize: 12.5, color: '#a99cc0',
      display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <span style={{ color: '#c084fc', fontWeight: 600 }}>LIVE DEMO</span>
      <span>same engine + same UI as the Devvit app, running in your browser</span>

      <label htmlFor="demo-mode" style={{ marginLeft: 'auto' }}>Monster replies:</label>
      <select
        id="demo-mode"
        value={mode}
        onChange={(e) => setMode(e.target.value as Mode)}
        style={{
          background: '#150d22', color: '#e8e2f0', border: '1px solid #33234a',
          borderRadius: 6, padding: '3px 8px', fontSize: 12.5,
        }}
      >
        <option value="rehearsal">Rehearsal (no key, no spend)</option>
        <option value="live">Live (your OpenRouter key)</option>
      </select>

      {mode === 'live' && (
        <>
          <label htmlFor="demo-key">OpenRouter key:</label>
          <input
            id="demo-key"
            type="password"
            value={key}
            onChange={(e) => onKey(e.target.value)}
            placeholder="sk-or-v1-..."
            autoComplete="off"
            style={{
              background: '#150d22', color: '#e8e2f0', border: '1px solid #33234a',
              borderRadius: 6, padding: '3px 8px', fontSize: 12.5, minWidth: 220,
            }}
          />
        </>
      )}

      <p aria-live="polite" style={{ flexBasis: '100%', color: '#8b7fa8', lineHeight: 1.5 }}>
        {mode === 'rehearsal'
          ? 'Rehearsal mode: a deterministic stand-in answers each monster (it is not a model). The judge is left unanswered so the real deterministic verdict fallback runs. Full pipeline, zero cost.'
          : 'Live mode: real calls to DeepSeek, Gemini and Nemotron via OpenRouter. Your key stays in this tab and is sent only to OpenRouter. Each trial costs a few cents.'}
      </p>
    </div>
  );
}

const el = document.getElementById('root');
if (!el) throw new Error('#root missing');

createRoot(el).render(
  <StrictMode>
    <DemoBar />
    <App />
    <footer style={{
      maxWidth: 900, margin: '0 auto', padding: '24px 20px 48px',
      color: '#8b7fa8', fontSize: 12, lineHeight: 1.6, borderTop: '1px solid #1a1028',
    }}>
      <p>
        Built with Kiro using spec-driven development · Kiroween 2026 · Frankenstein.{' '}
        <a href="https://github.com/RichardChua1234/ai-monster-courtroom">Source on GitHub</a> — 46 acceptance
        criteria, every one proven by a named passing test.
      </p>
    </footer>
  </StrictMode>,
);
