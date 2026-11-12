# AI Monster Courtroom - Tasks

## Legend
- `[ ]` not started · `[~]` in progress · `[x]` complete
- Each task ends with a **criterion annotation** so Prove It can verify coverage
- Tasks are ordered by dependency; T1–T3 can run in parallel

---

## Phase 1 — Foundation

### T1: Project scaffold
- [ ] `package.json` with Devvit Web + React + TypeScript + zod + vitest
- [ ] `devvit.json` with capabilities: redis, reddit_api, scheduler, devvit_web
- [ ] `tsconfig.json` strict mode
- [ ] `vite.config.ts`
- [ ] `.gitignore`, `LICENSE` (MIT)
- **Criterion:** AC-1.5

### T2: Core types & schemas
- [ ] `src/shared/types.ts` — CourtSession, Concept, MonsterFinding, DebateRound, Verdict
- [ ] `src/shared/schemas.ts` — zod schemas for LLM output validation
- [ ] Strict enum types for severity / decision / phase
- **Criterion:** AC-2.5, AC-4.1

### T3: Monster prompt library
- [ ] `src/agents/personas.ts` — 5 personas (cashula, zed, frankenbyte, ghost, judge)
- [ ] Perspective anchors, temperature, model bindings
- [ ] Prompt injection defense (delimited untrusted concept block)
- **Criterion:** AC-2.1, AC-2.2, AC-2.3, AC-2.4

---

## Phase 2 — Agent Layer

### T4: LLM client with retry
- [ ] `src/agents/client.ts` — OpenRouter call wrapper
- [ ] 30s timeout, 3 retries, exponential backoff
- [ ] JSON-mode enforcement + zod parse with repair pass
- **Criterion:** NFR-2.3

### T5: Monster agent runner
- [ ] `src/agents/monster.ts` — runs one monster against a concept
- [ ] Returns validated `MonsterFinding`
- [ ] Labels inferences with `requiresVerification: true`
- **Criterion:** AC-2.5

### T6: Panel execution (parallel)
- [ ] `src/server/panel.ts` — `Promise.allSettled` across 4 monsters
- [ ] Require ≥2 successes; mark failures explicitly
- **Criterion:** NFR-2.1

### T7: Judge agent
- [ ] `src/agents/judge.ts` — synthesize verdict
- [ ] Deterministic fallback scorecard when LLM unavailable
- **Criterion:** AC-4.1..AC-4.8, NFR-2.1

---

## Phase 3 — Orchestrator

### T8: State machine
- [ ] `src/server/orchestrator.ts` — intake → panel → debate → verdict → complete
- [ ] Persist state every transition; recover from Redis on crash
- **Criterion:** NFR-2.2

### T9: Debate engine
- [ ] `src/server/debate.ts` — 2–4 rounds
- [ ] Each monster emits ≤3 rebuttals referencing others' claim IDs
- [ ] Consensus detection → early exit
- **Criterion:** AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5

### T10: Concept extraction
- [ ] `src/server/intake.ts` — extract problem/solution/market/revenue
- [ ] Confidence gate; validation (50–10,000 chars)
- **Criterion:** AC-1.1, AC-1.2, AC-1.3, AC-1.4

---

## Phase 4 — API & Persistence

### T11: Redis data layer
- [ ] `src/server/redis.ts` — session CRUD, rounds list, user index, public slug
- [ ] TTL policy: 24h active / 90d complete
- [ ] Distributed lock for debate advance
- **Criterion:** AC-5.1, AC-5.8

### T12: API endpoints
- [ ] `POST /api/session`, `GET /api/session/:id`
- [ ] `POST /api/session/:id/debate`, `POST /api/session/:id/verdict`
- [ ] `GET /api/session/:id/export`, `GET /api/public/:slug`
- **Criterion:** AC-5.1, AC-5.2

### T13: WebSocket streaming
- [ ] `WS /api/stream/:id` — live debate events
- [ ] Event types: `monster_started`, `argument`, `rebuttal`, `round_complete`, `verdict`
- **Criterion:** AC-6.1, AC-6.2

### T14: Rate limiting
- [ ] 5 sessions/hour/user via Redis counter
- **Criterion:** NFR-3.1

---

## Phase 5 — Frontend

### T15: Concept form
- [ ] Intake UI + validation + extraction preview
- [ ] Keyboard navigable, WCAG AA contrast
- **Criterion:** AC-1.1, NFR-4.1, NFR-4.4

### T16: Monster panel view
- [ ] 4 monster cards with live status
- [ ] Severity badges, confidence meters
- **Criterion:** AC-2.5

### T17: Debate viewer
- [ ] Round-by-round streaming
- [ ] Monster bubbles, rebuttal threads, consensus panel
- [ ] Pause/resume controls
- **Criterion:** AC-6.2, AC-6.3, AC-6.4

### T18: Verdict card
- [ ] Decision banner (Proceed/Pivot/Pause/Abandon)
- [ ] 4-dial scorecard, for/against columns
- [ ] Hidden assumptions, unanswered questions
- [ ] Effort×impact improvement matrix
- [ ] 7-day validation plan cards
- **Criterion:** AC-4.1..AC-4.8

### T19: Export & share
- [ ] Markdown, JSON, PDF export
- [ ] Public read-only slug view
- [ ] OG image generation for share card
- **Criterion:** AC-5.1, AC-5.2, AC-5.9

### T20: Accessibility pass
- [ ] Reduced motion, high contrast, focus rings
- **Criterion:** NFR-4.1, NFR-4.2, NFR-4.3, NFR-4.4

---

## Phase 6 — Verification (Prove It)

### T21: Criterion annotations
- [ ] Add `// criterion: AC-x.y` to every test
- [ ] Run `python3 -m proveit check --spec .kiro/specs/ai-monster-courtroom --tests tests`
- [ ] Drive `uncovered` to 0
- **Criterion:** HC-2

### T22: Test suite
- [ ] Unit: agents, schemas, scorecard determinism
- [ ] Integration: orchestrator state machine, API routes
- [ ] E2E: full trial (happy path + 2 failure paths)
- **Criterion:** HC-2

### T23: Failure-path evidence
- [ ] Record: single monster fails, all monsters fail, judge fallback
- [ ] Assert graceful degradation outputs
- **Criterion:** NFR-2.1

---

## Phase 7 — Kiroween Submission

### T24: Kiro steering files
- [ ] `.kiro/steering/product.md`, `tech.md`, `structure.md`
- **Criterion:** HC-2

### T25: Kiro hooks
- [ ] `.kiro/hooks/on-spec-change.json` — re-run Prove It
- [ ] `.kiro/hooks/on-task-complete.json` — run tests
- **Criterion:** HC-2

### T26: README + docs
- [ ] Architecture diagram, monster personas, verdict semantics
- [ ] Kiro development narrative (spec → design → tasks → code)
- **Criterion:** HC-4

### T27: Demo video (≤3 min)
- [ ] Script: problem → monsters → debate → verdict → 7-day plan
- [ ] Show Kiro specs + Prove It output on screen
- **Criterion:** HC-4

### T28: GitHub + DevPost
- [ ] Public repo `RichardChua1234/ai-monster-courtroom` with full history
- [ ] DevPost submission before deadline
- **Criterion:** HC-4

---

## Dependency Graph

```
T1 → T2 → T4 → T5 → T6 → T8 → T9 → T12 → T17 → T18 → T19
                     T3 ↗        T7 ↗   T11 ↗  T13 ↗
T10 ────────────────────────────────────────↗
T14, T15, T16, T20 ────────────────────────↗
T21, T22, T23 ← all of the above
T24, T25, T26 ← T21
T27, T28 ← T26
```

## Definition of Done
1. All acceptance criteria have a passing annotated test (Prove It: 0 uncovered)
2. `npm run build` succeeds with zero TS errors
3. Full trial runs end-to-end in the Devvit playtest environment
4. Failure paths verified and recorded
5. Repo public with Kiro spec history visible
6. DevPost submission accepted before deadline