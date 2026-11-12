# Structure steering — AI Monster Courtroom

## Where things go

| Concern | File | Rule |
|---|---|---|
| Domain types | `src/shared/types.ts` | no imports from other app layers |
| Model contracts | `src/shared/schemas.ts` | one zod schema per model output |
| Colours | `src/shared/theme.ts` | every rendered pair is listed in `PAIRS` and contrast-tested |
| Persona definitions | `src/agents/personas.ts` | persona text, model, temperature and focus categories together |
| Model calls | `src/agents/client.ts` | the only place that talks to a provider |
| One monster | `src/agents/monster.ts` | never throws; a failure returns a failed finding |
| The verdict | `src/agents/judge.ts` | LLM path plus a deterministic fallback that must stay in sync |
| Persistence | `src/server/store.ts` | one `Store` interface, Redis and memory implementations |
| Phases | `src/server/orchestrator.ts` | the state machine; one function per phase |
| HTTP | `src/server/index.ts` | thin routes only; no business logic |

## Conventions

- **Never throw from an agent.** Return a marked-failed result so the panel can degrade.
- **Every model output goes through zod.** `callJson(opts, parseFn)` is the only door.
- **Deterministic fallbacks are first-class.** If a fallback exists, it is tested as
  hard as the primary path.
- **One criterion per behaviour.** Every spec criterion maps to at least one named test;
  `tests/test_evidence.py` asserts that mapping and fails if a named test disappears.
- **Criterion annotations live inside the test function body**, formatted
  `# criterion: <section>.<n>` — the evidence runner rejects an annotation that sits
  outside a function.
- **Names:** `runX` for a phase or agent entry point, `shouldX` for a predicate,
  `toX` for a transform, `fallbackX` for a deterministic substitute.
