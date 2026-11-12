# Kiroween 2026 — compliance checklist

Requirement-by-requirement status, with the artifact that satisfies it.

| Requirement | Status | Artifact / evidence |
|---|---|---|
| Built with **Kiro** | ✅ | `.kiro/specs/ai-monster-courtroom/` — requirements.md (46 criteria), design.md, tasks.md |
| Spec-driven development evident | ✅ | `.kiro/steering/` (product, tech, structure) + `.kiro/hooks/` (on-spec-change, on-task-complete) |
| Category: **Frankenstein** | ✅ | 5 agents stitched across 4 model families into one adversarial debate (`.kiro/steering/product.md`) |
| Working application | ✅ | `src/` (server + agents + React client), `devvit.json` for Devvit Web |
| **Demo judges can test** (rules: "Access must be provided to an Entrant's working Project") | ✅ | **<https://richardchua1234.github.io/ai-monster-courtroom/>** — real engine in the browser, no key needed |
| Meaningful AI usage, not a wrapper | ✅ | Multi-agent adversarial debate, structured verdict synthesis, deterministic-verdict fallback |
| Tests pass | ✅ | `npx vitest run` — 84 tests, 15 files, green; `npx tsc --noEmit` clean |
| Demo verified in a real browser | ✅ | headless Chrome via CDP: intake → 4 monsters → debate → verdict, **no page or console errors** |
| Requirements verified with evidence | ✅ | `python3 -m unittest discover -s tests -v` → `criteria 47 \| proven 47 \| failed 0 \| uncovered 0` |
| Criterion traceability | ✅ | `tests/test_evidence.py` maps every criterion to named vitest tests; fails if any test vanishes |
| Deployment target declared | ✅ | `devvit.json` — `devvit_web` client/server, capabilities `redis`, `scheduler`, `menu` |
| README + docs | ✅ | `README.md`, `SUBMISSION.md`, this file |
| Licence | ✅ | `LICENSE` (MIT) |
| Repo published | ⏳ needs GitHub auth | `github.com/RichardChua1234/ai-monster-courtroom` |
| Video demo | ⏳ upload is user-only | recorded: `ai-monster-courtroom-demo.mp4` (~2:23, narrated, under the 3-min cap) |
| Devpost submission | ⏳ user | upload repo URL + video, select Frankenstein |

## The 47 proven criteria

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
| 10 | 10.1–10.5 | Kiro spec, Frankenstein stitch, Devvit Web, annotated evidence, keyless rehearsal mode |

## Reproduce the verification

```bash
cd ai-monster-courtroom
npm install
npx tsc --noEmit                                   # strict types, zero errors
npx vitest run                                     # 84 tests, 15 files
npm run build:demo                                 # rebuild the hosted demo into docs/
python3 -m unittest discover -s tests -v           # evidence harness
PYTHONPATH=../prove-it/src python3 -m proveit check \
  --spec .kiro/specs/ai-monster-courtroom --tests tests
```

Expected final line:

```text
criteria 47 | proven 47 | failed 0 | uncovered 0
```

## What is *not* yet done

- **GitHub push** — needs credentials; the agent cannot hold them.
- **Devvit deploy** — `npx devvit upload` requires the user's Reddit login.
- **YouTube upload** — the video is recorded and public-URL-ready, but uploading needs
  the user's Google account. Required by the rules: under 3 minutes, uploaded to YouTube,
  made public.
- **Devpost form submission** — account action, user only.

Everything code-side is complete and verified.
