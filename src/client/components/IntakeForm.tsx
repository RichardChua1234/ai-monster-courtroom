import { useState } from 'react';
import { useCourt } from '../store';
import { STATE } from '@shared/theme';

const SAMPLE = `Problem: Junior developers cannot tell whether their code actually meets the spec.
Solution: A tool that reads the spec and reports which acceptance criteria have no passing test.
Target market: Engineering teams using spec-driven development.
Revenue model: Per-seat subscription for teams over 10 engineers.`;

export function IntakeForm() {
  const { conceptText, setConceptText, runTrial, loading, error } = useCourt();
  const [touched, setTouched] = useState(false);

  const tooShort = conceptText.trim().length > 0 && conceptText.trim().length < 50;

  return (
    <section aria-labelledby="intake-heading" style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px' }}>
      <h1 id="intake-heading" style={{ fontSize: 30, lineHeight: 1.15, marginBottom: 8 }}>
        Put your idea on trial
      </h1>
      <p style={{ color: '#a99cc0', marginBottom: 24, lineHeight: 1.6 }}>
        Four monsters will cross-examine your concept. A judge will hand down a verdict —
        Proceed, Pivot, Pause, or Abandon — with a scorecard and a seven-day validation plan.
      </p>

      <label htmlFor="concept" style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#c8bde0' }}>
        Describe the concept (50–10,000 characters)
      </label>
      <textarea
        id="concept"
        value={conceptText}
        onChange={(e) => setConceptText(e.target.value)}
        onBlur={() => setTouched(true)}
        rows={10}
        placeholder="Problem, solution, who it is for, and how it makes money."
        aria-describedby="concept-help"
        aria-invalid={touched && tooShort}
        style={{
          width: '100%', padding: 14, borderRadius: 10, resize: 'vertical',
          background: '#150d22', color: '#e8e2f0', border: `1px solid ${tooShort ? '#ff5c7a' : '#33234a'}`,
          fontFamily: 'inherit', fontSize: 14, lineHeight: 1.55,
        }}
      />
      <div id="concept-help" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: '#8b7fa8' }}>
        <span>{tooShort ? 'At least 50 characters.' : 'Plain language beats polish.'}</span>
        <span aria-live="polite">{conceptText.trim().length} / 10000</span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => runTrial(conceptText)}
          disabled={loading || conceptText.trim().length < 50}
          style={{
            padding: '12px 26px', borderRadius: 10, border: 'none', cursor: loading ? 'wait' : 'pointer',
            background: loading ? '#4a2f7a' : `linear-gradient(135deg, ${STATE.accentDeep}, ${STATE.accent})`,
            color: '#fff', fontWeight: 700, fontSize: 15,
          }}
        >
          {loading ? 'The court is convening…' : 'Convene the court'}
        </button>
        <button
          type="button"
          onClick={() => setConceptText(SAMPLE)}
          style={{
            padding: '12px 20px', borderRadius: 10, cursor: 'pointer',
            background: 'transparent', color: '#c8bde0', border: '1px solid #33234a', fontSize: 14,
          }}
        >
          Use a sample
        </button>
      </div>

      {error && (
        <p role="alert" style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#2a0f1a', color: '#ff8fa3', border: '1px solid #5c1f2e' }}>
          {error}
        </p>
      )}
    </section>
  );
}
