/**
 * Orchestrator — the state machine that drives a trial.
 * intake → panel → debate → verdict → complete
 * NFR-2.2: state is persisted on every transition, so a crash resumes.
 */
import type { CourtSession, StreamEvent, MonsterId } from '@shared/types';
import { PERSONAS } from '../agents/personas';
import { runPanel } from './panel';
import { runDebateRound, shouldContinue, MAX_ROUNDS } from './debate';
import { runJudge } from '../agents/judge';
import { conceptText } from '../agents/monster';
import { randomId, publicSlug } from './ids';
import type { Store } from './store';

export type Emit = (event: StreamEvent) => void;

export function newSession(userId: string, maxRounds = MAX_ROUNDS): CourtSession {
  const now = Date.now();
  return {
    id: randomId('court'),
    createdAt: now,
    updatedAt: now,
    userId,
    status: 'intake',
    concept: null,
    currentRound: 0,
    maxRounds,
    panel: [],
    debate: [],
    verdict: null,
    publicSlug: publicSlug(),
    error: null,
    paused: false,
  };
}

async function transition(
  store: Store, session: CourtSession, status: CourtSession['status'], emit?: Emit,
): Promise<void> {
  session.status = status;
  session.updatedAt = Date.now();
  await store.save(session);
  emit?.({ type: 'status', status });
}

/** Phase 1 — the panel takes the stand. */
export async function runPanelPhase(
  store: Store, session: CourtSession, emit?: Emit,
): Promise<boolean> {
  if (!session.concept) throw new Error('panel phase requires a concept');
  await transition(store, session, 'panel', emit);

  const result = await runPanel(session.concept, (e) => {
    emit?.({ type: 'monster_started', monsterId: e.monsterId });
    if (e.type === 'monster_done') {
      emit?.({ type: 'monster_done', monsterId: e.monsterId, failed: Boolean(e.failed) });
    }
  });

  session.panel = result.findings;
  for (const f of result.findings) {
    for (const finding of f.findings) {
      emit?.({ type: 'finding', monsterId: f.monsterId, finding });
    }
  }
  session.updatedAt = Date.now();

  if (!result.quorumMet) {
    session.error = `Quorum not met: only ${result.succeeded.length} of 4 monsters reported.`;
    await transition(store, session, 'failed', emit);
    emit?.({ type: 'error', message: session.error });
    return false;
  }
  await store.save(session);
  return true;
}

/** Phase 2 — structured adversarial debate. AC-3.1..AC-3.5 */
export async function runDebatePhase(
  store: Store, session: CourtSession, emit?: Emit,
): Promise<void> {
  if (!session.concept) throw new Error('debate phase requires a concept');
  await transition(store, session, 'debate', emit);

  const concept = conceptText(session.concept);
  const debateModel = PERSONAS.cashula.model;

  while (
    shouldContinue(session.debate) &&
    session.debate.length < session.maxRounds &&
    !session.paused
  ) {
    const roundNumber = session.debate.length + 1;
    emit?.({ type: 'round_start', roundNumber });

    const round = await runDebateRound(concept, session.panel, session.debate, debateModel);
    session.debate.push(round);
    session.currentRound = roundNumber;
    session.updatedAt = Date.now();
    await store.save(session);

    for (const a of round.opening) emit?.({ type: 'argument', argument: a });
    for (const r of round.rebuttals) emit?.({ type: 'rebuttal', rebuttal: r });
    emit?.({ type: 'round_complete', roundNumber, consensus: round.consensus.reached });
  }
}

/** Phase 3 — the judge delivers the verdict. */
export async function runVerdictPhase(
  store: Store, session: CourtSession, emit?: Emit,
): Promise<void> {
  if (!session.concept) throw new Error('verdict phase requires a concept');
  await transition(store, session, 'verdict', emit);

  const verdict = await runJudge(conceptText(session.concept), session.panel, session.debate);
  session.verdict = verdict;
  session.updatedAt = Date.now();
  await store.save(session);
  emit?.({ type: 'verdict', verdict });

  // The trial is finished the moment a verdict exists -- whether it was reached by
  // runTrial or by a client driving the phases itself. Leaving the status behind
  // stranded every phase-by-phase caller in 'verdict' forever.
  await transition(store, session, 'complete', emit);
}

/** Full trial, start to finish. */
export async function runTrial(
  store: Store, session: CourtSession, emit?: Emit,
): Promise<CourtSession> {
  const locked = await store.lock(session.id);
  if (!locked) throw new Error('trial already running for this session');
  try {
    const ok = await runPanelPhase(store, session, emit);
    if (!ok) return session;
    await runDebatePhase(store, session, emit);
    await runVerdictPhase(store, session, emit); // transitions to 'complete'
    return session;
  } catch (err) {
    session.error = String(err);
    await transition(store, session, 'failed', emit);
    emit?.({ type: 'error', message: session.error });
    return session;
  } finally {
    await store.unlock(session.id);
  }
}

export const MONSTER_IDS: MonsterId[] = ['cashula', 'zed', 'frankenbyte', 'ghost'];

/** Hold the trial between rounds (AC-6.3). */
export async function pauseTrial(store: Store, session: CourtSession): Promise<void> {
  session.paused = true;
  session.updatedAt = Date.now();
  await store.save(session);
}

/** Release a held trial; the debate loop resumes on the next call. */
export async function resumeTrial(store: Store, session: CourtSession): Promise<void> {
  session.paused = false;
  session.updatedAt = Date.now();
  await store.save(session);
}
