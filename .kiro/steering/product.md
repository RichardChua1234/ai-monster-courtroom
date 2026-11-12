# Product steering — AI Monster Courtroom

## What this is

A courtroom where an idea stands trial before four adversarial AI monsters and a judge.
The user submits a concept; the monsters argue from opposed perspectives; they
cross-examine each other; the judge hands down a structured verdict.

It is **not** a themed chatbot. The value is the adversarial structure: opposition is
manufactured deliberately, and the output is a decision artifact with a scorecard and a
seven-day validation plan the user can act on Monday morning.

## The five personas

| Persona | Emoji | Perspective | Model | Why this model |
|---|---|---|---|---|
| Count Cashula | 🧛 | financial viability | `deepseek/deepseek-v4-flash` | cheapest strong reasoning per token |
| Zed | 🧟 | customer pain and usability | `google/gemini-3.6-flash` | different vendor, different bias |
| Dr. Frankenbyte | ⚡ | technical feasibility, security | `deepseek/deepseek-chat` | deeper reasoning for systems claims |
| The Ghost of Failure | 👻 | hidden risk, ethics, competition | `nvidia/nemotron-3-ultra-550b:free` | free tier keeps the fourth voice affordable |
| The Monster Judge | ⚖️ | synthesis and verdict | `deepseek/deepseek-v4.1-flash` | low temperature, structured output |

**Why different models per persona:** four instances of one model converge. Routing each
persona to a different model family produces genuinely uncorrelated criticism — that
disagreement is the product.

## Verdict semantics

| Decision | Meaning | Score band |
|---|---|---|
| **proceed** | the core holds; fix the gaps and build | overall ≥ 70, no critical cluster |
| **pivot** | something real is here, but not in this shape | 50–69 |
| **pause** | too much is unproven; answer the questions first | 35–49 |
| **abandon** | the record does not support more time | < 35, or ≥ 3 critical findings |

Score dimensions are **health, not danger**: `riskProfile` of 100 means safe.

## Voice

The monsters are theatrical but their claims are not. Severity reflects damage to the
idea, not the volume of the insult. Every claim carries evidence quoted from the
submission. Where the submission is silent, that silence is itself the finding.
