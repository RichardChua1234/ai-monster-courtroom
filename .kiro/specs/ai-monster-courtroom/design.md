# AI Monster Courtroom - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AI MONSTER COURTROOM                             │
│                (Devvit Web — AWS Infrastructure)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  CLIENT (React + TypeScript, Devvit Web webview)              │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐ │ │
│  │  │ Concept Form │ │ Debate View  │ │ Verdict Scorecard      │ │ │
│  │  │ + Validation │ │ (WebSocket)  │ │ + 7-day plan           │ │ │
│  │  └──────────────┘ └──────────────┘ └────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ▲ │ fetch / WS                          │
│                              │ ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  SERVER (Devvit Node.js — managed on AWS)                      │ │
│  │                                                                 │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │ ORCHESTRATOR (state machine)                              │ │ │
│  │  │  intake → panel → debate(round N) → verdict → export      │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  │                                                                 │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐  │ │
│  │  │ Cashula  │ │ Zed      │ │ Frankenbyte  │ │ Ghost of     │  │ │
│  │  │ (finance)│ │ (customer)│ │ (technical) │ │ Failure      │  │ │
│  │  └──────────┘ └──────────┘ └──────────────┘ └──────────────┘  │ │
│  │                    │            │                               │ │
│  │                    ▼            ▼                               │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │ MONSTER JUDGE (synthesis + structured verdict)            │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ▲ │                                     │
│                              │ ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  DATA LAYER (Devvit Redis)                                     │ │
│  │  session:{id}  |  debate:{id}  |  verdict:{id}  |  user:{id}   │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Models

### Session
```typescript
interface CourtSession {
  id: string;                    // uuid
  createdAt: number;             // epoch ms
  userId: string;                // Devvit user id
  status: 'intake' | 'panel' | 'debate' | 'verdict' | 'complete' | 'failed';
  concept: Concept;
  currentRound: number;
  maxRounds: number;
  panel: MonsterFinding[];
  debate: DebateRound[];
  verdict: Verdict | null;
  publicSlug: string;            // for shareable link
  error: string | null;
}
```

### Concept
```typescript
interface Concept {
  raw: string;                   // original submission
  problem: string;               // extracted
  solution: string;              // extracted
  targetMarket: string;          // extracted
  revenueModel: string;          // extracted
  extractedAt: number;           // confidence gate timestamp
  extractionConfidence: number;  // 0-100
}
```

### MonsterFinding
```typescript
interface MonsterFinding {
  monsterId: 'cashula' | 'zed' | 'frankenbyte' | 'ghost';
  monsterName: string;
  perspective: string;
  findings: Finding[];
  overallSeverity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;            // 0-100
  generatedAt: number;
  model: string;                 // model used
}

interface Finding {
  id: string;
  claim: string;                 // the assertion
  evidence: string;              // what supports it
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;              // e.g. 'unit_economics', 'security'
  requiresVerification: boolean;
}
```

### DebateRound
```typescript
interface DebateRound {
  roundNumber: number;
  opening: MonsterArgument[];    // each monster's position this round
  rebuttals: Rebuttal[];         // cross-examination
  consensus: {
    reached: boolean;
    agreements: string[];
    unresolved: string[];
  };
  completedAt: number;
}

interface Rebuttal {
  fromMonster: string;
  toMonster: string;
  targetClaimId: string;
  rebuttal: string;              // "X claims Y, but Z because..."
  strength: 'strong' | 'moderate' | 'weak';
}
```

### Verdict
```typescript
interface Verdict {
  decision: 'proceed' | 'pivot' | 'pause' | 'abandon';
  decisionRationale: string;
  scorecard: {
    financialViability: number;  // 0-100
    technicalFeasibility: number;
    marketFit: number;
    riskProfile: number;
    overall: number;
  };
  argumentsFor: Argument[];      // top 3
  argumentsAgainst: Argument[];  // top 3
  hiddenAssumptions: Assumption[];
  unansweredQuestions: string[];
  prioritizedImprovements: Improvement[];
  validationPlan: ValidationDay[];
  generatedAt: number;
}
```

## Agent Design (The Frankenstein Stitching)

### Monster Personas
| Monster | Model | Temperature | Perspective Prompt Anchor |
|---------|-------|-------------|---------------------------|
| **Count Cashula** | `deepseek/deepseek-v4-flash` | 0.3 | "You are a vampire investor. You have seen a thousand startups die. You ask only about the money: unit economics, CAC, LTV, burn, runway." |
| **Zed** | `google/gemini-3.6-flash` | 0.5 | "You are a zombie customer. You are slow, confused, and easily distracted. If you cannot understand the value in 30 seconds, you shuffle away." |
| **Dr. Frankenbyte** | `deepseek/deepseek-chat` | 0.2 | "You are a technology prosecutor. You assume every system will fail. You probe for unhandled edge cases, security holes, scaling cliffs, and technical debt." |
| **Ghost of Failure** | `nvidia/nemotron-3-ultra-550b:free` | 0.6 | "You are the Ghost of Failure. You have watched this exact idea fail before, in another company, another country, another year. You remember why." |
| **Monster Judge** | `deepseek/deepseek-v4.1-flash` | 0.1 | "You are the Monster Judge. You weigh all arguments. You are not persuaded by enthusiasm, only by evidence. Your verdict is structured, not emotional." |

### Agent Contract
Every monster agent must:
1. Receive: concept + prior round context (if any) + specific perspective instructions
2. Return: **strict JSON** matching the `MonsterFinding` schema
3. Never invent facts — label inferences explicitly with `requiresVerification: true`
4. Cite the concept text for every claim (evidence field)

### Orchestration State Machine
```
intake
  → validate concept (min length, extract fields)
  → panel: launch 4 monsters in parallel (Promise.allSettled)
  → if ≥2 monsters succeeded → debate
  → debate rounds 1..maxRounds:
      - each monster reads all prior findings
      - each monster emits ≤3 rebuttals
      - judge checks for consensus
      - if consensus → exit debate
  → verdict: judge synthesizes with structured output
  → persist + generate public slug
  → complete
```

### Failure Handling
- **Single monster fails**: continue with remaining (min 2 required)
- **All monsters fail**: session → `failed`, surface error
- **Judge fails**: fall back to deterministic scorecard from monster findings (no LLM)
- **Timeout**: 30s per agent call, 3 retries with backoff

## API Endpoints (Devvit Web `/api/`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/session` | Create session + submit concept |
| GET | `/api/session/:id` | Get session state |
| POST | `/api/session/:id/debate` | Advance debate round |
| POST | `/api/session/:id/verdict` | Generate verdict |
| GET | `/api/session/:id/export` | Export (md/json/pdf) |
| GET | `/api/public/:slug` | Read-only public view |
| GET | `/api/user/history` | User's past sessions |
| WS | `/api/stream/:id` | Real-time debate stream |

## Redis Schema

```
session:{id}              HASH   → serialized CourtSession
session:{id}:rounds       LIST   → serialized DebateRound (RPUSH)
user:{userId}:sessions    ZSET   → session ids scored by createdAt
public:{slug}             STRING → session id (lookup)
session:{id}:lock         STRING → distributed lock (SET NX EX 60)
```

TTL policy:
- Active sessions: 24 hours
- Completed sessions: 90 days
- Public slugs: 90 days

## Frontend Components

```
<App>
  <ConceptForm />          — intake, validation, field extraction preview
  <MonsterPanel />         — 4 monster cards, live status
  <DebateViewer />         — round-by-round, streaming arguments
    <MonsterBubble />      — monster's argument with severity badge
    <RebuttalThread />     — cross-examination lines
  <VerdictCard />          — decision + scorecard + medal-style visual
    <ScoreGauge />         — 4 dials (financial/technical/market/risk)
    <ArgumentsList />      — for/against columns
    <AssumptionsList />    — hidden assumptions with risk
    <ImprovementsTable />  — effort × impact matrix
    <ValidationPlan />     — 7-day day-by-day cards
  <ExportBar />            — md/json/pdf/share
</App>
```

## Kiro Integration Points

### Spec-Driven Development Flow
1. **requirements.md** (this project) — the *what*
2. **design.md** — the *how* (this file)
3. **tasks.md** — the *steps*
4. Use Kiro's agentic execution to implement each task
5. Use **Prove It** to verify each requirement has a passing test

### Kiro Steering Files (`.kiro/steering/`)
- `product.md` — product vision, monster personas, verdict semantics
- `tech.md` — TypeScript strict, Devvit Web constraints (30s timeout, no fs), Redis-only persistence
- `structure.md` — folder conventions, agent module layout

### Kiro Hooks (`.kiro/hooks/`)
- `on-spec-change.json` — re-run Prove It when requirements change
- `on-task-complete.json` — run tests + update acceptance criteria status

## Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Agent output schema | vitest + zod | 100% of agents |
| Orchestrator state machine | vitest | All transitions |
| Scorecard determinism | vitest | Same input → same score |
| API endpoints | vitest + supertest | All routes |
| E2E (full trial) | Playwright | Happy path + 2 failure paths |

**Criterion annotations** (Prove It contract):
```typescript
// criterion: AC-2.1
test('cashula evaluates unit economics', () => { ... })
```

## Security Considerations

- Concept content never sent to third parties other than the LLM provider (OpenRouter)
- No PII extraction — monsters evaluate the *idea*, not the person
- Rate limiting: 5 sessions/hour/user
- Prompt injection defense: concept text is delimited and monsters are instructed to treat it as untrusted data
- Public slugs are random 22-char base58, non-enumerable