# AI Monster Courtroom — Requirements

**Project:** AI Monster Courtroom
**Hackathon:** Kiroween 2026 · Category: Frankenstein
**Summary:** An interactive AI decision system that puts a concept on trial before four
adversarial AI monsters. Each monster argues from one perspective, they cross-examine
each other, and a judge delivers a structured verdict with a scorecard and a seven-day
validation plan.

---

## 1. Concept Submission

**Acceptance criteria:**

1.1. WHEN a user submits a concept THEN THE SYSTEM SHALL accept free text pasted from a pitch, notes, or a URL.

1.2. WHEN a user submits a concept THEN THE SYSTEM SHALL reject any submission shorter than 50 characters or longer than 10000 characters, with a typed error code.

1.3. WHEN a submission is accepted THEN THE SYSTEM SHALL extract the problem, solution, target market, and revenue model, and SHALL mark any field that is genuinely absent as "Not stated." rather than inventing one.

1.4. WHEN a submission is accepted THEN THE SYSTEM SHALL preserve the original text verbatim on the concept record.

1.5. WHEN a trial is created THEN THE SYSTEM SHALL assign a unique session identifier and a non-enumerable public slug.

---

## 2. Monster Panel Evaluation

**Acceptance criteria:**

2.1. WHEN the panel convenes THEN THE SYSTEM SHALL run Count Cashula, a vampire investor, against the financial model, monetisation, unit economics, and funding needs.

2.2. WHEN the panel convenes THEN THE SYSTEM SHALL run Zed, a zombie customer, against pain-point validity, usability, and willingness to pay.

2.3. WHEN the panel convenes THEN THE SYSTEM SHALL run Dr. Frankenbyte, a technology prosecutor, against feasibility, security, scalability, and technical risk.

2.4. WHEN the panel convenes THEN THE SYSTEM SHALL run the Ghost of Failure against hidden risks, ethics, competitors, and regulatory exposure.

2.5. WHEN a monster reports THEN THE SYSTEM SHALL require every finding to carry a claim, supporting evidence, a severity in the set critical, high, medium, low, a category, and a requiresVerification flag, and SHALL reject a report that does not validate.

---

## 3. Adversarial Debate

**Acceptance criteria:**

3.1. WHEN the panel has reported THEN THE SYSTEM SHALL run at least two and at most four debate rounds.

3.2. WHEN a debate round runs THEN THE SYSTEM SHALL have each reporting monster issue at most three rebuttals, each aimed at a different monster.

3.3. WHEN a monster rebuts THEN THE SYSTEM SHALL require the rebuttal to name the target monster and the claim it attacks.

3.4. WHEN a rebuttal is recorded THEN THE SYSTEM SHALL require its target claim identifier to exist in the record.

3.5. WHEN the remaining disagreement is no longer evidentiary THEN THE SYSTEM SHALL mark consensus reached and stop debating early.

---

## 4. Verdict and Scorecard

**Acceptance criteria:**

4.1. WHEN the debate ends THEN THE SYSTEM SHALL emit exactly one decision from the set proceed, pivot, pause, abandon.

4.2. WHEN the verdict is produced THEN THE SYSTEM SHALL score financial viability, technical feasibility, market fit, and risk profile each from 0 to 100, with an overall mean.

4.3. WHEN the verdict is produced THEN THE SYSTEM SHALL cite up to three strongest arguments for and up to three against, each referencing a real claim identifier.

4.4. WHEN the verdict is produced THEN THE SYSTEM SHALL list the arguments against the idea separately from those supporting it.

4.5. WHEN the verdict is produced THEN THE SYSTEM SHALL list hidden assumptions together with the risk if wrong and a way to test each.

4.6. WHEN the verdict is produced THEN THE SYSTEM SHALL list unanswered questions the user must research.

4.7. WHEN the verdict is produced THEN THE SYSTEM SHALL list prioritised improvements.

4.8. WHEN the verdict is produced THEN THE SYSTEM SHALL include a seven-day validation plan with day-by-day actions and success criteria.

---

## 5. Session Persistence and Sharing

**Acceptance criteria:**

5.1. WHEN a public link is opened THEN THE SYSTEM SHALL serve a read-only session view that redacts the owning user identifier.

5.2. WHEN an export is requested THEN THE SYSTEM SHALL return the verdict as markdown, JSON, or a share card.

5.3. WHEN a user requests their history THEN THE SYSTEM SHALL return that user's sessions in reverse chronological order.

---

## 6. Real-time Streaming

**Acceptance criteria:**

6.1. WHILE a trial runs THEN THE SYSTEM SHALL emit typed stream events for status changes, monster reports, arguments, rebuttals, and the verdict.

6.2. WHILE a trial runs THEN THE SYSTEM SHALL emit a round-start and a round-complete event carrying the round number and the consensus flag.

6.3. WHEN a user pauses a trial THEN THE SYSTEM SHALL stop advancing the trial until resumed.

6.4. WHEN a stream event is emitted THEN THE SYSTEM SHALL identify which monster produced it.

---

## 7. Reliability and Performance

**Acceptance criteria:**

7.1. IF a monster call fails THEN THE SYSTEM SHALL mark that monster failed and continue with the remaining monsters.

7.2. IF fewer than two monsters report THEN THE SYSTEM SHALL fail the session with a quorum error instead of guessing.

7.3. WHEN a model call fails THEN THE SYSTEM SHALL retry up to three times with exponential backoff before giving up.

7.4. IF the judge model is unavailable THEN THE SYSTEM SHALL still emit a complete verdict computed deterministically from the panel findings.

7.5. WHEN session state changes THEN THE SYSTEM SHALL persist it before the next phase begins.

---

## 8. Security and Privacy

**Acceptance criteria:**

8.1. WHEN a user exceeds five trials in an hour THEN THE SYSTEM SHALL refuse further trials for that user.

8.2. WHEN untrusted concept text is sent to a model THEN THE SYSTEM SHALL delimit it and instruct the model to treat it as evidence rather than instruction.

8.3. WHEN a concept is stored THEN THE SYSTEM SHALL store no personally identifying information beyond the platform user identifier.

---

## 9. Accessibility

**Acceptance criteria:**

9.1. WHEN the interface renders THEN THE SYSTEM SHALL meet WCAG 2.1 AA contrast.

9.2. WHEN a user prefers reduced motion THEN THE SYSTEM SHALL suppress animation.

9.3. WHEN a user navigates by keyboard THEN THE SYSTEM SHALL expose a visible focus indicator on every control.

9.4. WHEN the interface renders THEN THE SYSTEM SHALL label every form control and live region for assistive technology.

---

## 10. Kiroween Compliance

**Acceptance criteria:**

10.1. WHEN the project is reviewed THEN THE SYSTEM SHALL show a complete Kiro spec of requirements, design, and tasks under the `.kiro/specs/` directory.

10.2. WHEN the project is reviewed THEN THE SYSTEM SHALL show at least two distinct AI agents collaborating adversarially inside one application.

10.3. WHEN the project is reviewed THEN THE SYSTEM SHALL be deployable to the Reddit Developer Platform as a Devvit Web app.

10.4. WHEN the project is reviewed THEN THE SYSTEM SHALL provide a passing test suite whose acceptance criteria are verified by criterion annotations.
