import { useState } from 'react';
import type { CourtSession, Decision } from '@shared/types';
import { PERSONAS } from '../../agents/personas';
import { SeverityBadge } from './PanelView';
import { api } from '../api';

const DECISION_STYLE: Record<Decision, { bg: string; fg: string; label: string; blurb: string }> = {
  proceed: { bg: '#1b4332', fg: '#69db7c', label: 'PROCEED', blurb: 'The core holds. Fix the gaps and build.' },
  pivot:   { bg: '#4a3a10', fg: '#ffd43b', label: 'PIVOT',   blurb: 'Something real is here, but not this shape of it.' },
  pause:   { bg: '#4a2a10', fg: '#ffa94d', label: 'PAUSE',   blurb: 'Too much is unproven. Answer the open questions first.' },
  abandon: { bg: '#4a0f1c', fg: '#ff8fa3', label: 'ABANDON', blurb: 'The record does not support spending more time.' },
};

function Gauge({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? '#69db7c' : value >= 50 ? '#ffd43b' : value >= 35 ? '#ffa94d' : '#ff5c7a';
  return (
    <div style={{ minWidth: 120, flex: '1 1 120px' }}>
      <div style={{ fontSize: 11, color: '#8b7fa8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color }}>{value}</span>
        <span style={{ fontSize: 12, color: '#8b7fa8' }}>/100</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: '#241734', marginTop: 4 }}>
        <div style={{ height: '100%', width: `${value}%`, borderRadius: 2, background: color }} />
      </div>
    </div>
  );
}

export function VerdictCard({ session }: { session: CourtSession }) {
  const [copied, setCopied] = useState(false);
  const v = session.verdict;
  if (!v) return null;
  const d = DECISION_STYLE[v.decision];

  const copyMarkdown = async () => {
    try {
      const md = await api.exportMarkdown(session.id);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <section aria-labelledby="verdict-heading" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 64px' }}>
      <h2 id="verdict-heading" style={{ fontSize: 22, marginBottom: 16 }}>The verdict</h2>

      <div style={{ border: `1px solid ${d.fg}`, borderRadius: 14, padding: 24, background: d.bg, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span aria-hidden="true" style={{ fontSize: 34 }}>⚖️</span>
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 1, color: d.fg }}>{d.label}</div>
            <div style={{ color: '#e8e2f0', fontSize: 14, marginTop: 2 }}>{d.blurb}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#c8bde0', textTransform: 'uppercase' }}>Overall</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: d.fg }}>{v.scorecard.overall}</div>
          </div>
        </div>
        <p style={{ marginTop: 14, lineHeight: 1.6, fontSize: 14 }}>{v.decisionRationale}</p>
        {v.deterministicFallback && (
          <p style={{ marginTop: 8, fontSize: 12, color: '#ffd43b' }}>
            Computed deterministically — the judge model was unavailable.
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 28 }}>
        <Gauge label="Financial" value={v.scorecard.financialViability} />
        <Gauge label="Technical" value={v.scorecard.technicalFeasibility} />
        <Gauge label="Market fit" value={v.scorecard.marketFit} />
        <Gauge label="Risk profile" value={v.scorecard.riskProfile} />
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div>
          <h3 style={{ fontSize: 15, color: '#69db7c', marginBottom: 8 }}>Arguments for</h3>
          <ul style={{ paddingLeft: 18, display: 'grid', gap: 8, fontSize: 13.5, lineHeight: 1.5 }}>
            {v.argumentsFor.map((a, i) => (
              <li key={i}>{a.text} <span style={{ color: '#8b7fa8' }}>({PERSONAS[a.monster].name})</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 style={{ fontSize: 15, color: '#ff8fa3', marginBottom: 8 }}>Arguments against</h3>
          <ul style={{ paddingLeft: 18, display: 'grid', gap: 8, fontSize: 13.5, lineHeight: 1.5 }}>
            {v.argumentsAgainst.map((a, i) => (
              <li key={i}>
                <SeverityBadge severity={a.severity} />{' '}
                {a.text} <span style={{ color: '#8b7fa8' }}>({PERSONAS[a.monster].name})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 style={{ fontSize: 16, margin: '28px 0 10px' }}>Hidden assumptions</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {v.hiddenAssumptions.map((a, i) => (
          <div key={i} style={{ border: '1px solid #33234a', borderRadius: 10, padding: 12, background: '#120b1c' }}>
            <strong style={{ fontSize: 14 }}>{a.assumption}</strong>
            <p style={{ fontSize: 13, color: '#ffb3c0', marginTop: 4 }}>If wrong: {a.riskIfWrong}</p>
            <p style={{ fontSize: 13, color: '#8b7fa8', marginTop: 2 }}>Test it: {a.howToTest}</p>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 16, margin: '28px 0 10px' }}>Unanswered questions</h3>
      <ul style={{ paddingLeft: 18, display: 'grid', gap: 6, fontSize: 13.5, lineHeight: 1.5 }}>
        {v.unansweredQuestions.map((q, i) => <li key={i}>{q}</li>)}
      </ul>

      <h3 style={{ fontSize: 16, margin: '28px 0 10px' }}>Prioritized improvements</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#8b7fa8' }}>
              <th style={{ padding: '6px 8px' }}>Action</th>
              <th style={{ padding: '6px 8px' }}>Effort</th>
              <th style={{ padding: '6px 8px' }}>Impact</th>
            </tr>
          </thead>
          <tbody>
            {v.prioritizedImprovements.map((imp, i) => (
              <tr key={i} style={{ borderTop: '1px solid #241734' }}>
                <td style={{ padding: '8px' }}>{imp.action}<div style={{ fontSize: 12, color: '#8b7fa8' }}>{imp.rationale}</div></td>
                <td style={{ padding: '8px', color: imp.effort === 'high' ? '#ff8fa3' : '#c8bde0' }}>{imp.effort}</td>
                <td style={{ padding: '8px', color: imp.impact === 'high' ? '#69db7c' : '#c8bde0' }}>{imp.impact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: 16, margin: '28px 0 10px' }}>Seven-day validation plan</h3>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {v.validationPlan.map((day) => (
          <div key={day.day} style={{ border: '1px solid #33234a', borderRadius: 10, padding: 12, background: '#120b1c' }}>
            <div style={{ fontSize: 12, color: '#8b7fa8' }}>DAY {day.day}</div>
            <p style={{ fontSize: 13.5, marginTop: 4, lineHeight: 1.5 }}>{day.action}</p>
            <p style={{ fontSize: 12, color: '#69db7c', marginTop: 6 }}>✓ {day.successCriteria}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
        <button type="button" onClick={copyMarkdown} style={btn}>
          {copied ? 'Copied ✓' : 'Copy verdict as Markdown'}
        </button>
        <a href={`/api/session/${session.id}/export?format=md`} download={`verdict-${session.id}.md`} style={{ ...btn, textDecoration: 'none' }}>
          Download .md
        </a>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(`${location.origin}/v/${session.publicSlug}`)}
          style={btn}
        >
          Copy share link
        </button>
      </div>
    </section>
  );
}

const btn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 9, border: '1px solid #4a2f7a',
  background: '#1b1030', color: '#e8e2f0', cursor: 'pointer', fontSize: 13.5,
};
