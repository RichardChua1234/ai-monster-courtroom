# Tech steering — AI Monster Courtroom

## Stack

- **Runtime:** Devvit Web (Reddit Developer Platform) — the hackathon requires it
- **Client:** React 18 + TypeScript (strict), Vite
- **Server:** Hono on Devvit's managed Node
- **State:** Devvit Redis in production, in-memory `MemoryStore` in tests
- **Validation:** zod at every model boundary
- **Tests:** vitest for the implementation, Python `unittest` as the evidence harness

## Hard constraints (Devvit Web)

| Constraint | Consequence for the design |
|---|---|
| Serverless endpoints, 30s max request | a full trial cannot run inside one request — it is phase-by-phase |
| No `fs`, no native packages | persistence is Redis only; no local caching of concepts |
| No streaming responses | live progress uses the stream-event surface, not chunked HTTP |
| No external requests from the client | every model call is made server-side |
| `localStorage` clears on app update | anything that must survive a deploy lives in Redis |

## Non-negotiables

1. **Model output is untrusted input.** Every model response is parsed by zod; a failed
   parse is a failed agent, not a warning.
2. **The decision is deterministic.** The verdict *decision* is derived from the scorecard
   and critical count. The model writes the prose; it does not get a veto.
3. **The courtroom always finishes.** If the judge model is unavailable, a deterministic
   verdict is computed from panel findings. A user never sees an empty verdict.
4. **Quorum or failure.** Fewer than two reporting monsters fails the session loudly
   rather than producing a thin verdict that looks authoritative.
5. **No PII.** The concept is the subject; the person is not.

## Layout

```
src/shared/    types, zod schemas, contrast-checked theme
src/agents/    personas, llm client, monster runner, judge
src/server/    intake, panel, debate, orchestrator, store, export, api
src/client/    React ui: intake, panel, debate, verdict
tests/         vitest specs + test_evidence.py (the criterion harness)
```

Dependencies point one way: `client -> shared`, `server -> agents -> shared`.
`shared` imports nothing from the app.
