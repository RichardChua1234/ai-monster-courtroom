/**
 * AI Monster Courtroom — core domain types.
 * Mirrors design.md § Data Models.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Decision = 'proceed' | 'pivot' | 'pause' | 'abandon';
export type SessionStatus =
  | 'intake'
  | 'panel'
  | 'debate'
  | 'verdict'
  | 'complete'
  | 'failed';

export type MonsterId = 'cashula' | 'zed' | 'frankenbyte' | 'ghost';
export type SpeakerId = MonsterId | 'judge' | 'system';

export interface Concept {
  raw: string;
  problem: string;
  solution: string;
  targetMarket: string;
  revenueModel: string;
  extractionConfidence: number;
  extractedAt: number;
}

export interface Finding {
  id: string;
  claim: string;
  evidence: string;
  severity: Severity;
  category: string;
  requiresVerification: boolean;
}

export interface MonsterFinding {
  monsterId: MonsterId;
  monsterName: string;
  perspective: string;
  findings: Finding[];
  overallSeverity: Severity;
  confidence: number;
  model: string;
  generatedAt: number;
  failed?: boolean;
  error?: string;
}

export interface MonsterArgument {
  monsterId: MonsterId;
  position: string;
  claimIds: string[];
  severity: Severity;
}

export interface Rebuttal {
  fromMonster: MonsterId;
  toMonster: MonsterId;
  targetClaimId: string;
  rebuttal: string;
  strength: 'strong' | 'moderate' | 'weak';
}

export interface DebateRound {
  roundNumber: number;
  opening: MonsterArgument[];
  rebuttals: Rebuttal[];
  consensus: {
    reached: boolean;
    agreements: string[];
    unresolved: string[];
  };
  completedAt: number;
}

export interface Argument {
  text: string;
  sourceClaimId: string;
  monster: MonsterId;
  severity: Severity;
}

export interface Assumption {
  assumption: string;
  riskIfWrong: string;
  howToTest: string;
}

export interface Improvement {
  action: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  rationale: string;
}

export interface ValidationDay {
  day: number;
  action: string;
  successCriteria: string;
  effort: string;
}

export interface Scorecard {
  financialViability: number;
  technicalFeasibility: number;
  marketFit: number;
  riskProfile: number;
  overall: number;
}

export interface Verdict {
  decision: Decision;
  decisionRationale: string;
  scorecard: Scorecard;
  argumentsFor: Argument[];
  argumentsAgainst: Argument[];
  hiddenAssumptions: Assumption[];
  unansweredQuestions: string[];
  prioritizedImprovements: Improvement[];
  validationPlan: ValidationDay[];
  generatedAt: number;
  deterministicFallback?: boolean;
}

export interface CourtSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  status: SessionStatus;
  concept: Concept | null;
  currentRound: number;
  maxRounds: number;
  panel: MonsterFinding[];
  debate: DebateRound[];
  verdict: Verdict | null;
  publicSlug: string;
  error: string | null;
  /** Set by the user to hold the trial between phases (AC-6.3). */
  paused: boolean;
}

export type StreamEvent =
  | { type: 'status'; status: SessionStatus }
  | { type: 'monster_started'; monsterId: MonsterId }
  | { type: 'finding'; monsterId: MonsterId; finding: Finding }
  | { type: 'monster_done'; monsterId: MonsterId; failed: boolean }
  | { type: 'round_start'; roundNumber: number }
  | { type: 'argument'; argument: MonsterArgument }
  | { type: 'rebuttal'; rebuttal: Rebuttal }
  | { type: 'round_complete'; roundNumber: number; consensus: boolean }
  | { type: 'verdict'; verdict: Verdict }
  | { type: 'error'; message: string };
