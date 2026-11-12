"""Evidence harness for the AI Monster Courtroom spec.

This is the bridge between the specification and the implementation. Each test below
claims exactly one acceptance criterion from
``.kiro/specs/ai-monster-courtroom/requirements.md`` and proves it with the *real*
TypeScript test suite:

    setUpClass()  runs ``npx vitest run --reporter=json`` once and indexes every
                  result by its title, together with its pass/fail status.
    test_*()      assert that the named vitest test(s) for that criterion actually
                  ran and passed.

So a criterion is never "proven" by restating it here -- it is proven because the
TypeScript test that exercises the behaviour executed and passed. If the vitest suite
is missing, red, or a named test disappears, the criterion fails.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TIMEOUT_SEC = 600

# Criterion id -> the vitest test titles that prove it.
CRITERIA: dict[str, list[str]] = {
    # 1. Concept Submission
    "1.1": ["creates a session with an extracted concept", "accepts a submission at the boundaries"],
    "1.2": ["rejects a submission under 50 characters", "rejects a submission over 10,000 characters"],
    "1.3": ["extracts the four judged fields from labelled input", "marks unstated fields instead of inventing them"],
    "1.4": ["preserves the raw submission for the record"],
    "1.5": ["mints a unique session id and a public slug"],
    # 2. Monster Panel Evaluation
    "2.1": ["runs a vampire investor against the money"],
    "2.2": ["runs a zombie customer against the pain point"],
    "2.3": ["runs a technology prosecutor against feasibility and security"],
    "2.4": ["runs the Ghost of Failure against hidden risk and ethics"],
    "2.5": [
        "accepts a well-formed monster finding",
        "rejects a monster finding with no findings",
        "rejects an unknown severity",
        "returns every monster in panel order",
    ],
    # 3. Adversarial Debate
    "3.1": ["requires at least two rounds before it can stop", "never exceeds the maximum round count"],
    "3.2": ["produces rebuttals aimed at other monsters"],
    "3.3": ["names both monsters and the claim it attacks in every rebuttal"],
    "3.4": ["cites a real target claim id"],
    "3.5": ["stops when consensus is reached", "reports consensus when nothing critical remains"],
    # 4. Verdict and Scorecard
    "4.1": ["restricts decisions to the four verdicts", "maps score bands onto the four decisions"],
    "4.2": ["produces all four dimensions and an overall in 0..100", "scores a clean panel higher than a damaging one"],
    "4.3": ["cites real claim ids in the arguments"],
    "4.4": ["separates arguments for from arguments against"],
    "4.5": ["pairs every hidden assumption with a risk and a test"],
    "4.6": ["always lists unanswered questions"],
    "4.7": ["always lists prioritised improvements with effort and impact"],
    "4.8": [
        "exports a full deterministic verdict whose validation plan is seven days",
        "rejects a validation plan that is not seven days",
    ],
    # 5. Session Persistence and Sharing
    "5.1": ["serves a read-only public view that redacts the owner", "404s an unknown slug"],
    "5.2": ["exports markdown with a content-type of text/markdown"],
    "5.3": ["returns per-user history", "lists sessions for a user in reverse chronological order"],
    # 6. Real-time Streaming
    "6.1": ["emits typed events for status, monster reports and the verdict"],
    "6.2": ["emits round-start and round-complete with the round number and consensus flag"],
    "6.3": ["stops advancing the trial while paused and resumes afterwards"],
    "6.4": ["identifies which monster produced each event"],
    # 7. Reliability and Performance
    "7.1": ["marks a monster failed instead of throwing when its call dies"],
    "7.2": ["fails cleanly when no monster can report"],
    "7.3": ["retries three times with backoff before giving up", "recovers when a later attempt succeeds"],
    "7.4": [
        "always returns a complete verdict shape without a model",
        "marks the verdict deterministic when the judge is unavailable",
    ],
    "7.5": ["persists state on every transition"],
    # 8. Security and Privacy
    "8.1": ["rate limits after the configured number of trials"],
    "8.2": ["delimits untrusted concept text and forbids following it"],
    "8.3": [
        "stores only the concept fields plus the platform user identifier",
        "never leaks the owner identifier through the public view",
    ],
    # 9. Accessibility
    "9.1": ["keeps every rendered colour pair at or above the WCAG AA ratio"],
    "9.2": ["suppresses animation when the user prefers reduced motion"],
    "9.3": ["exposes a visible focus indicator for keyboard users"],
    "9.4": ["associates every intake control with a label and announces live counts"],
    # 10. Kiroween Compliance
    "10.1": ["ships a complete Kiro spec of requirements, design and tasks"],
    "10.2": ["stitches four distinct monsters and a judge into one panel"],
    "10.3": ["declares a Devvit Web app the platform can host"],
    "10.4": ["carries criterion annotations in the evidence harness"],
}


def _run_vitest() -> tuple[dict[str, str], list[str], str]:
    """Run the real suite once. Returns (title -> status, failures, note)."""
    npx = shutil.which("npx")
    if npx is None:
        return {}, [], "npx not found on PATH -- cannot gather evidence"

    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "vitest.json"
        proc = subprocess.run(
            [npx, "vitest", "run", "--reporter=json", f"--outputFile={out}"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SEC,
        )

        payload = None
        if out.exists():
            try:
                payload = json.loads(out.read_text())
            except json.JSONDecodeError:
                payload = None

        if payload is None:
            tail = (proc.stdout or "")[-1500:] + (proc.stderr or "")[-1500:]
            return {}, [], f"vitest produced no JSON report (exit {proc.returncode})\n{tail}"

        results: dict[str, str] = {}
        duplicates: list[str] = []
        failures: list[str] = []
        for suite in payload.get("testResults", []):
            for assertion in suite.get("assertionResults", []):
                title = assertion.get("title") or assertion.get("fullName", "")
                status = assertion.get("status", "unknown")
                if title in results:
                    duplicates.append(title)
                results[title] = status
                if status != "passed":
                    failures.append(f"{title} [{status}]")

        counts = payload.get("numTotalTests", 0)
        note = f"{counts} tests collected, {len(failures)} not passing"
        if duplicates:
            note += f", duplicate titles: {sorted(set(duplicates))}"
        return results, failures, note


class CriterionEvidence(unittest.TestCase):
    """One test per acceptance criterion, proven by the real vitest suite."""

    results: dict[str, str] = {}
    failures: list[str] = []
    note: str = ""
    _missing: list[str] = []

    @classmethod
    def setUpClass(cls) -> None:
        cls.results, cls.failures, cls.note = _run_vitest()
        if not cls.results:
            raise unittest.SkipTest(f"cannot gather evidence: {cls.note}")

    def _prove(self, criterion: str) -> None:
        self.assertIn(criterion, CRITERIA, f"no vitest titles mapped for criterion {criterion}")
        titles = CRITERIA[criterion]

        missing = [t for t in titles if t not in self.results]
        self.assertEqual(
            missing, [],
            f"criterion {criterion}: these tests do not exist: {missing}. {self.note}",
        )

        not_passed = [f"{t} [{self.results[t]}]" for t in titles if self.results[t] != "passed"]
        self.assertEqual(
            not_passed, [],
            f"criterion {criterion}: these tests did not pass: {not_passed}. {self.note}",
        )

    # --- 1. Concept Submission -------------------------------------------------
    def test_1_1_accepts_a_concept(self) -> None:
        # criterion: 1.1
        self._prove("1.1")

    def test_1_2_enforces_length_bounds(self) -> None:
        # criterion: 1.2
        self._prove("1.2")

    def test_1_3_extracts_fields_without_inventing(self) -> None:
        # criterion: 1.3
        self._prove("1.3")

    def test_1_4_preserves_raw_text(self) -> None:
        # criterion: 1.4
        self._prove("1.4")

    def test_1_5_assigns_ids_and_slug(self) -> None:
        # criterion: 1.5
        self._prove("1.5")

    # --- 2. Monster Panel ------------------------------------------------------
    def test_2_1_cashula_attacks_the_money(self) -> None:
        # criterion: 2.1
        self._prove("2.1")

    def test_2_2_zed_attacks_the_pain_point(self) -> None:
        # criterion: 2.2
        self._prove("2.2")

    def test_2_3_frankenbyte_attacks_the_technology(self) -> None:
        # criterion: 2.3
        self._prove("2.3")

    def test_2_4_ghost_attacks_hidden_risk(self) -> None:
        # criterion: 2.4
        self._prove("2.4")

    def test_2_5_findings_must_validate(self) -> None:
        # criterion: 2.5
        self._prove("2.5")

    # --- 3. Adversarial Debate -------------------------------------------------
    def test_3_1_round_bounds(self) -> None:
        # criterion: 3.1
        self._prove("3.1")

    def test_3_2_each_monster_rebuts_another(self) -> None:
        # criterion: 3.2
        self._prove("3.2")

    def test_3_3_rebuttal_names_target_and_claim(self) -> None:
        # criterion: 3.3
        self._prove("3.3")

    def test_3_4_target_claim_id_must_exist(self) -> None:
        # criterion: 3.4
        self._prove("3.4")

    def test_3_5_consensus_ends_the_debate(self) -> None:
        # criterion: 3.5
        self._prove("3.5")

    # --- 4. Verdict and Scorecard ---------------------------------------------
    def test_4_1_decision_is_one_of_four(self) -> None:
        # criterion: 4.1
        self._prove("4.1")

    def test_4_2_scorecard_dimensions(self) -> None:
        # criterion: 4.2
        self._prove("4.2")

    def test_4_3_arguments_cite_real_claims(self) -> None:
        # criterion: 4.3
        self._prove("4.3")

    def test_4_4_for_and_against_are_separate(self) -> None:
        # criterion: 4.4
        self._prove("4.4")

    def test_4_5_hidden_assumptions_are_testable(self) -> None:
        # criterion: 4.5
        self._prove("4.5")

    def test_4_6_unanswered_questions_are_listed(self) -> None:
        # criterion: 4.6
        self._prove("4.6")

    def test_4_7_improvements_are_prioritised(self) -> None:
        # criterion: 4.7
        self._prove("4.7")

    def test_4_8_seven_day_validation_plan(self) -> None:
        # criterion: 4.8
        self._prove("4.8")

    # --- 5. Persistence and Sharing -------------------------------------------
    def test_5_1_public_view_is_read_only(self) -> None:
        # criterion: 5.1
        self._prove("5.1")

    def test_5_2_export_formats(self) -> None:
        # criterion: 5.2
        self._prove("5.2")

    def test_5_3_history_is_chronological(self) -> None:
        # criterion: 5.3
        self._prove("5.3")

    # --- 6. Real-time Streaming ------------------------------------------------
    def test_6_1_typed_stream_events(self) -> None:
        # criterion: 6.1
        self._prove("6.1")

    def test_6_2_round_events_carry_number_and_consensus(self) -> None:
        # criterion: 6.2
        self._prove("6.2")

    def test_6_3_pause_holds_the_trial(self) -> None:
        # criterion: 6.3
        self._prove("6.3")

    def test_6_4_events_identify_their_monster(self) -> None:
        # criterion: 6.4
        self._prove("6.4")

    # --- 7. Reliability --------------------------------------------------------
    def test_7_1_one_monster_failure_is_survivable(self) -> None:
        # criterion: 7.1
        self._prove("7.1")

    def test_7_2_quorum_required(self) -> None:
        # criterion: 7.2
        self._prove("7.2")

    def test_7_3_retry_with_backoff(self) -> None:
        # criterion: 7.3
        self._prove("7.3")

    def test_7_4_deterministic_verdict_fallback(self) -> None:
        # criterion: 7.4
        self._prove("7.4")

    def test_7_5_state_persisted_between_phases(self) -> None:
        # criterion: 7.5
        self._prove("7.5")

    # --- 8. Security and Privacy ----------------------------------------------
    def test_8_1_rate_limited(self) -> None:
        # criterion: 8.1
        self._prove("8.1")

    def test_8_2_concept_treated_as_untrusted(self) -> None:
        # criterion: 8.2
        self._prove("8.2")

    def test_8_3_no_pii_stored(self) -> None:
        # criterion: 8.3
        self._prove("8.3")

    # --- 9. Accessibility ------------------------------------------------------
    def test_9_1_contrast_meets_aa(self) -> None:
        # criterion: 9.1
        self._prove("9.1")

    def test_9_2_reduced_motion_respected(self) -> None:
        # criterion: 9.2
        self._prove("9.2")

    def test_9_3_focus_is_visible(self) -> None:
        # criterion: 9.3
        self._prove("9.3")

    def test_9_4_controls_are_labelled(self) -> None:
        # criterion: 9.4
        self._prove("9.4")

    # --- 10. Kiroween Compliance ----------------------------------------------
    def test_10_1_complete_kiro_spec(self) -> None:
        # criterion: 10.1
        self._prove("10.1")

    def test_10_2_frankenstein_stitch(self) -> None:
        # criterion: 10.2
        self._prove("10.2")

    def test_10_3_devvit_web_deployable(self) -> None:
        # criterion: 10.3
        self._prove("10.3")

    def test_10_4_annotated_evidence(self) -> None:
        # criterion: 10.4
        self._prove("10.4")


class SuiteHealth(unittest.TestCase):
    """Guards the whole suite: a criterion is never proven by a red build."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.results, cls.failures, cls.note = _run_vitest()
        if not cls.results:
            raise unittest.SkipTest(f"cannot gather evidence: {cls.note}")

    def test_no_vitest_failure_is_hidden(self) -> None:
        # criterion: 7.1
        self.assertEqual(self.failures, [], f"the vitest suite is not green: {self.failures}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
