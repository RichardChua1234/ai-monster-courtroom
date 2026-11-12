# I built an AI courtroom where four monsters argue with each other

*Draft blog post for the Kiroween Hackathon 2026 Bonus Blog Prize. Publish on a
third-party platform (dev.to / Hashnode / Medium / your own site). The rules require the
post to mention the **Kiroween Hackathon 2026** by name.*

---

## The problem with asking an AI "is my idea good?"

It says yes. Nicely. With bullet points.

That is not useful, because the failure mode of most ideas is not that they are obviously
bad. It is that nobody priced them, nobody checked whether the customer actually has the
problem, nobody asked whether the thing can be built in the time available, and nobody
named the competitor who already owns the workflow.

So for **Kiroween Hackathon 2026** I built something that refuses to be agreeable.
**AI Monster Courtroom** puts a concept on trial before four adversarial AI monsters:

- 🧛 **Count Cashula**, the vampire investor — goes after the money: monetisation, unit
  economics, funding, pricing. If you never stated a price, that silence *is* his finding.
- 🧟 **Zed**, the zombie customer — asks whether anyone actually has this problem, or
  whether it is a nice-to-have people abandon at the first friction.
- ⚡ **Dr. Frankenbyte**, the technology prosecutor — feasibility, security, scalability.
- 👻 **The Ghost of Failure** — hidden risks, ethics, competitors, regulation, and the
  reason the last three projects like yours died.

They then **cross-examine each other** for at least two rounds. A Monster Judge delivers
the verdict: **Proceed, Pivot, Pause or Abandon**, with a scorecard, the strongest
arguments for and against, hidden assumptions, unanswered questions, prioritised
improvements, and a seven-day validation plan.

## Three decisions that made it work

**1. Different models per persona, not different prompts.**

Four instances of one model converge on one opinion. Routing each persona to a different
model family produces genuinely uncorrelated criticism — and that disagreement is the
product. Count Cashula runs on DeepSeek, Zed on Gemini, Dr. Frankenbyte on DeepSeek Chat,
the Ghost on a free Nemotron tier, and the judge on DeepSeek V4.1.

Early versions had all four monsters agreeing within one round. Giving each persona a
narrow, non-overlapping set of focus categories — and forcing every rebuttal to target a
*different* monster — made opposition structural rather than hoped for.

**2. The decision is deterministic; the model writes the prose.**

The verdict *decision* is derived from the scorecard and the number of critical findings.
The model cannot talk the system into a "proceed" the evidence does not support. That
single constraint turned it from a chatbot into a decision system.

**3. The courtroom always finishes.**

If the judge model is unavailable, a complete verdict is computed deterministically from
the panel findings and flagged as a fallback. If one monster dies, it is marked failed and
the rest continue. If fewer than two monsters report, the session fails loudly with a
quorum error rather than producing a confidently thin verdict that looks authoritative.

In an AI system, the interesting engineering is what happens when a model returns
garbage. The fallback is tested as hard as the primary path.

## Kiro, spec-first

I built this with Kiro using spec-driven development, and the discipline changed what I
shipped.

The project started as `.kiro/specs/ai-monster-courtroom/` — `requirements.md` with 47
numbered acceptance criteria across ten sections, then `design.md`, then `tasks.md`.
Nothing was written before it had a criterion number. Steering files documented the
product, tech and structure conventions; hooks re-ran verification when the spec or a task
changed.

Then I made every criterion provable. A Python harness runs the real TypeScript test suite
and asserts that the specific test mapped to each criterion exists and passed:

```text
criteria 47 | proven 47 | failed 0 | uncovered 0
```

If a test disappears or goes red, the criterion fails. There is no way to claim a
criterion without evidence behind it. "Done" stopped being a feeling and became a number.

## The bug that made the whole exercise worth it

The test suite caught a real accessibility bug in my own UI: white text on the primary
button gradient measured **4.23:1** contrast, under the WCAG AA minimum of **4.5:1**.

I would not have caught that by eye. The palette now lives in one file with every
foreground/background pair declared, and the test computes the actual WCAG ratio for each
pair. It also caught a verdict phase that never transitioned the session to `complete`,
stranding every client that drove the trial phase by phase — which is exactly what the
real UI does.

That is the argument for making requirements testable. Not rigour for its own sake —
rigour because it finds the things you would otherwise rationalise away.

## Try it

Live demo (no API key needed — it runs the real engine in your browser in a labelled
rehearsal mode): **https://richardchua1234.github.io/ai-monster-courtroom/**

Source: **https://github.com/RichardChua1234/ai-monster-courtroom**

Built with **Kiro** for the **Kiroween Hackathon 2026**, Frankenstein category — stitching
five agents across four model families into one adversarial debate.

---

*Written for the Kiroween Hackathon 2026.*
