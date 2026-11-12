/**
 * Devvit Web server — API surface for the courtroom.
 * Every route is thin: validate input, call the orchestrator, return state.
 */
import { Hono } from 'hono';
import type { CourtSession } from '@shared/types';
import { RedisStore, MemoryStore, type Store } from './store';
import { newSession, runPanelPhase, runDebatePhase, runVerdictPhase, pauseTrial, resumeTrial } from './orchestrator';
import { extractConcept, validateSubmission, IntakeError } from './intake';
import { toMarkdown, toShareCard } from './export';
import { PERSONAS } from '../agents/personas';

export const app = new Hono();

export const MAX_SESSIONS_PER_HOUR = 5;

/** Injected at boot: Devvit supplies redis; tests supply a MemoryStore. */
let store: Store = new MemoryStore();
export function setStore(s: Store): void { store = s; }
export function getStore(): Store { return store; }
export function useMemoryStore(): void { store = new MemoryStore(); }

let getUserId: (c: any) => Promise<string> = async () => 'anonymous';
export function setUserIdResolver(fn: (c: any) => Promise<string>): void { getUserId = fn; }

/** POST /api/session — create a session and start the trial. AC-1.x */
app.post('/api/session', async (c) => {
  const userId = await getUserId(c);
  let body: { concept?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  let validated: string;
  try {
    validated = validateSubmission(body.concept ?? '');
  } catch (err) {
    if (err instanceof IntakeError) return c.json({ error: err.code, message: err.message }, 400);
    throw err;
  }

  const count = await store.incrementRate(userId);
  if (count > MAX_SESSIONS_PER_HOUR) {
    return c.json({ error: 'rate_limited', message: `At most ${MAX_SESSIONS_PER_HOUR} trials per hour.` }, 429);
  }

  const session = newSession(userId);
  session.concept = await extractConcept(validated, PERSONAS.cashula.model);
  session.updatedAt = Date.now();
  await store.save(session);
  return c.json({ session });
});

/** POST /api/session/:id/panel AC-2.x */
app.post('/api/session/:id/panel', async (c) => {
  const session = await store.get(c.req.param('id'));
  if (!session) return c.json({ error: 'not_found' }, 404);
  await runPanelPhase(store, session);
  return c.json({ session });
});

/** POST /api/session/:id/debate AC-3.x */
app.post('/api/session/:id/debate', async (c) => {
  const session = await store.get(c.req.param('id'));
  if (!session) return c.json({ error: 'not_found' }, 404);
  await runDebatePhase(store, session);
  return c.json({ session });
});

/** POST /api/session/:id/verdict AC-4.x */
app.post('/api/session/:id/verdict', async (c) => {
  const session = await store.get(c.req.param('id'));
  if (!session) return c.json({ error: 'not_found' }, 404);
  await runVerdictPhase(store, session);
  return c.json({ session });
});

/** POST /api/session/:id/pause AC-6.3 */
app.post('/api/session/:id/pause', async (c) => {
  const session = await store.get(c.req.param('id'));
  if (!session) return c.json({ error: 'not_found' }, 404);
  await pauseTrial(store, session);
  return c.json({ session });
});

/** POST /api/session/:id/resume AC-6.3 */
app.post('/api/session/:id/resume', async (c) => {
  const session = await store.get(c.req.param('id'));
  if (!session) return c.json({ error: 'not_found' }, 404);
  await resumeTrial(store, session);
  return c.json({ session });
});

/** GET /api/session/:id */
app.get('/api/session/:id', async (c) => {
  const session = await store.get(c.req.param('id'));
  if (!session) return c.json({ error: 'not_found' }, 404);
  return c.json({ session });
});

/** GET /api/public/:slug — read-only. AC-5.1 */
app.get('/api/public/:slug', async (c) => {
  const session = await store.bySlug(c.req.param('slug'));
  if (!session) return c.json({ error: 'not_found' }, 404);
  return c.json({ session: redact(session) });
});

/** GET /api/session/:id/export?format=md|json AC-5.2 */
app.get('/api/session/:id/export', async (c) => {
  const session = await store.get(c.req.param('id'));
  if (!session) return c.json({ error: 'not_found' }, 404);
  const format = c.req.query('format') ?? 'md';
  if (format === 'json') return c.json({ session });
  if (format === 'card') return c.json(toShareCard(session));
  return c.text(toMarkdown(session), 200, { 'content-type': 'text/markdown; charset=utf-8' });
});

/** GET /api/user/history AC-5.8 */
app.get('/api/user/history', async (c) => {
  const userId = await getUserId(c);
  const sessions = await store.listByUser(userId);
  return c.json({ sessions: sessions.map((s) => ({
    id: s.id, status: s.status, createdAt: s.createdAt,
    decision: s.verdict?.decision ?? null,
    overall: s.verdict?.scorecard.overall ?? null,
    problem: s.concept?.problem?.slice(0, 120) ?? null,
  })) });
});

app.get('/api/health', (c) => c.json({ ok: true, monsters: Object.keys(PERSONAS) }));

/** Public view must not leak the owner id or raw error text. */
function redact(s: CourtSession): CourtSession {
  return { ...s, userId: 'redacted', error: s.error ? 'trial did not complete' : null };
}

export default app;
