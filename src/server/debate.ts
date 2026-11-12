/**
 * Debate engine — AC-3.1 .. AC-3.5
 * Each round: monsters state a position, then cross-examine up to 3 claims.
 * A deterministic consensus detector decides whether another round is needed.
 */
import type { MonsterFinding, DebateRound, Rebuttal, MonsterArgument } from '@shared/types';
import { DebateRoundOutputSchema } from '@shared/schemas';
import { PANEL_ORDER, PERSONAS } from '../agents/personas';
import { callJson } from '../agents/client';
import { buildRecord } from '../agents/judge';

export const MIN_ROUNDS = 2;
export const MAX_ROUNDS = 4;
const MAX_REBUTTALS_PER_MONSTER = 3;

const DEBATE_SYSTEM = `You are participating in a structured adversarial debate about a concept.
Return ONLY JSON:
{
  "opening":   [{ "monsterId": "...", "position": "...", "claimIds": ["..."], "severity": "..." }],
  "rebuttals": [{ "fromMonster": "...", "toMonster": "...", "targetClaimId": "...", "rebuttal": "...", "strength": "strong|moderate|weak" }],
  "consensus": { "reached": true|false, "agreements": ["..."], "unresolved": ["..."] }
}
Rules:
- One opening statement per monster that has findings.
- Each monster issues at most 3 rebuttals, each aimed at a DIFFERENT monster's claim.
- Format every rebuttal as "X claims Y, but Z because ..." and cite the targetClaimId.
- Set consensus.reached true only when the remaining disagreement is a matter of taste, not evidence.`;

/** Deterministic disagreement score: how contested is the record? */
export function computeDisagreement(round: DebateRound): number {
  const unresolved = round.consensus.unresolved.length;
  const strong = round.rebuttals.filter((r) => r.strength === 'strong').length;
  const total = round.rebuttals.length || 1;
  const ratio = strong / total;
  return Math.min(1, (unresolved / 6) * 0.6 + ratio * 0.4);
}

export function shouldContinue(rounds: DebateRound[]): boolean {
  if (rounds.length < MIN_ROUNDS) return true;
  if (rounds.length >= MAX_ROUNDS) return false;
  const last = rounds[rounds.length - 1];
  if (last.consensus.reached) return false;
  // keep going while the court is still genuinely split
  return computeDisagreement(last) > 0.35;
}

/** Deterministic round when no model is reachable — the debate still happens. */
export function deterministicRound(panel: MonsterFinding[], roundNumber: number): DebateRound {
  const usable = panel.filter((m) => !m.failed);
  const opening: MonsterArgument[] = usable.map((m) => ({
    monsterId: m.monsterId,
    position: m.findings[0]
      ? m.findings[0].claim
      : `No findings recorded from ${m.monsterName}.`,
    claimIds: m.findings.slice(0, 2).map((f) => f.id),
    severity: m.overallSeverity,
  }));

  const rebuttals: Rebuttal[] = [];
  for (let i = 0; i < usable.length; i++) {
    const from = usable[i];
    const to = usable[(i + 1) % usable.length];
    if (from.monsterId === to.monsterId) continue;
    const target = to.findings.find((f) => f.severity === 'critical' || f.severity === 'high')
      ?? to.findings[0];
    if (!target) continue;
    rebuttals.push({
      fromMonster: from.monsterId,
      toMonster: to.monsterId,
      targetClaimId: target.id,
      rebuttal:
        `${PERSONAS[from.monsterId].name} notes that ${PERSONAS[to.monsterId].name} claims ` +
        `"${target.claim}", but that finding was not weighed against ${from.perspective}, ` +
        `which the record leaves open.`,
      strength: 'moderate',
    });
  }

  const unresolved = usable
    .flatMap((m) => m.findings.filter((f) => f.severity === 'critical').map((f) => f.claim))
    .slice(0, 6);

  return {
    roundNumber,
    opening,
    rebuttals,
    consensus: { reached: unresolved.length === 0, agreements: [], unresolved },
    completedAt: Date.now(),
  };
}

export async function runDebateRound(
  conceptText: string,
  panel: MonsterFinding[],
  rounds: DebateRound[],
  model: string,
): Promise<DebateRound> {
  const roundNumber = rounds.length + 1;
  const record = buildRecord(panel, rounds);
  const instruction =
    `This is debate round ${roundNumber}. ` +
    `Address only claims that are still contested. ` +
    (roundNumber > 1 ? `Previous rounds: ${rounds.length}. Push for closure.` : 'Open the debate.');

  try {
    const out = await callJson(
      {
        model,
        temperature: 0.4,
        system: DEBATE_SYSTEM,
        user: `${instruction}\n\n${record}`,
      },
      (raw) => DebateRoundOutputSchema.parse(raw),
    );
    const allowed = new Set(panel.filter((m) => !m.failed).map((m) => m.monsterId));
    const rebuttals = out.rebuttals
      .filter((r) => allowed.has(r.fromMonster) && allowed.has(r.toMonster))
      .slice(0, allowed.size * MAX_REBUTTALS_PER_MONSTER);
    return { roundNumber, opening: out.opening, rebuttals, consensus: out.consensus, completedAt: Date.now() };
  } catch {
    return deterministicRound(panel, roundNumber);
  }
}
