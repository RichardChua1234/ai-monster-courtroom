# Kiroween 2026 — compliance checklist

Requirement-by-requirement status, with the artifact that satisfies it.

| Requirement | Status | Artifact / evidence |
|---|---|---|
| Built with **Kiro** | ✅ | `.kiro/specs/ai-monster-courtroom/` — requirements.md (46 criteria), design.md, tasks.md |
| Spec-driven development evident | ✅ | `.kiro/steering/` (product, tech, structure) + `.kiro/hooks/` (on-spec-change, on-task-complete) |
| Category: **Frankenstein** | ✅ | 5 agents stitched across 4 model families into one adversarial debate (`.kiro/steering/product.md`) |
| Working application | ✅ | `src/` (server + agents + React client), `devvit.json` for Devvit Web |
| Meaningful AI usage, not a wrapper | ✅ | Multi-agent adversarial debate, structured verdict synthesis, deterministic-verdict fallback |
| Tests pass | ✅ | `npx vitest run` — full suite green; `npx tsc --noEmit` clean |
| Requirements verified with evidence | ✅ | `python3 -m unittest discover -s tests -v` → `criteria 46 \| proven 46 \| failed 0 \| uncovered 0` |
| Criterion traceability | ✅ | `tests/test_evidence.py` maps every criterion to named vitest tests; fails if any test vanishes |
| Deployment target declared | ✅ | `devvit.json` — `devvit_web` client/server, capabilities `redis`, `scheduler`, `menu` |
| README + docs | ✅ | `README.md`, `SUBMISSION.md`, this file |
| Licence | ✅ | `LICENSE` (MIT) |
| Repo published | ⏳ needs GitHub auth | `github.com/RichardChua1234/ai-monster-courtroom` |
| Video demo | ⏳ | not recorded yet |
| Devpost submission | ⏳ user | upload repo URL + video, select Frankenstein |

## The 46 proven criteria

| Section | Criteria | Domain |
|---|---|---|
| 1 | 1.1–1.5 | concept submission, extraction, identity |
| 2 | 2.1–2.5 | the four monster perspectives + finding validation |
| 3 | 3.1–3.5 | adversarial debate, rebuttal targeting, consensus |
| 4 | 4.1–4.8 | verdict decision, scorecard, arguments, plan |
| 5 | 5.1–5.3 | public sharing, export formats, history |
| 6 | 6.1–6.4 | stream events, round events, pause |
| 7 | 7.1–7.5 | degradation, quorum, retry, deterministic fallback |
| 8 | 8.1–8.3 | rate limiting, prompt-injection defence, no PII |
| 9 | 9.1–9.4 | WCAG AA contrast, reduced motion, focus, labels |
| 10 | 10.1–10.4 | Kiro spec, Frankenstein stitch, Devvit Web, annotated evidence |

## Reproduce the verification

```bash
cd ai-monster-courtroom
npm install
npx tsc --noEmit                                   # strict types, zero errors
npx vitest run                                     # implementation suite
python3 -m unittest discover -s tests -v           # evidence harness
PYTHONPATH=../prove-it/src python3 -m proveit check \
  --spec .kiro/specs/ai-monster-courtroom --tests tests
```

Expected final line:

```text
criteria 46 | proven 46 | failed 0 | uncovered 0
```

## What is *not* yet done

- **GitHub push** — needs credentials; the agent cannot hold them.
- **Devvit deploy** — `npx devvit upload` requires the user's Reddit login.
- **Demo video** — not recorded.
- **Devpost form submission** — account action, user only.

Everything code-side is complete and verified.
