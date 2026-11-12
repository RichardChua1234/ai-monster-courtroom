/**
 * The panel — run every monster concurrently and require a quorum.
 * AC-2.5, NFR-2.1
 */
import type { Concept, MonsterFinding, MonsterId } from '@shared/types';
import { PANEL_ORDER } from '../agents/personas';
import { runMonster } from '../agents/monster';

export const QUORUM = 2;

export interface PanelResult {
  findings: MonsterFinding[];
  succeeded: MonsterId[];
  failed: MonsterId[];
  quorumMet: boolean;
}

export async function runPanel(
  concept: Concept,
  onEvent?: (e: { type: 'monster_started' | 'monster_done'; monsterId: MonsterId; failed?: boolean }) => void,
): Promise<PanelResult> {
  const settled = await Promise.allSettled(
    PANEL_ORDER.map(async (id) => {
      onEvent?.({ type: 'monster_started', monsterId: id });
      const finding = await runMonster(id, concept);
      onEvent?.({ type: 'monster_done', monsterId: id, failed: Boolean(finding.failed) });
      return finding;
    }),
  );

  const findings: MonsterFinding[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    return {
      monsterId: PANEL_ORDER[i],
      monsterName: PANEL_ORDER[i],
      perspective: 'unavailable',
      findings: [],
      overallSeverity: 'high' as const,
      confidence: 0,
      model: 'n/a',
      generatedAt: Date.now(),
      failed: true,
      error: String(s.reason),
    };
  });

  const succeeded = findings.filter((f) => !f.failed).map((f) => f.monsterId);
  const failed = findings.filter((f) => f.failed).map((f) => f.monsterId);

  return { findings, succeeded, failed, quorumMet: succeeded.length >= QUORUM };
}
