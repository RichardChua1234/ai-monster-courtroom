import type { CourtSession, Severity } from '@shared/types';
import { PERSONAS } from '../../agents/personas';

const SEV_COLOR: Record<Severity, string> = {
  critical: '#ff5c7a', high: '#ffa94d', medium: '#ffd43b', low: '#69db7c',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: 999,
      color: '#0a0510', background: SEV_COLOR[severity],
    }}>
      {severity}
    </span>
  );
}

export function PanelView({ session }: { session: CourtSession }) {
  if (!session.panel.length) return null;
  return (
    <section aria-labelledby="panel-heading" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      <h2 id="panel-heading" style={{ fontSize: 22, marginBottom: 16 }}>The panel reports</h2>
      <div style={{ display: 'grid', gap: 14 }}>
        {session.panel.map((m) => {
          const persona = PERSONAS[m.monsterId];
          return (
            <article key={m.monsterId} style={{
              border: '1px solid #33234a', borderRadius: 12, padding: 16, background: '#120b1c',
            }}>
              <header style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <span aria-hidden="true" style={{ fontSize: 22 }}>{persona.emoji}</span>
                <strong style={{ fontSize: 16 }}>{m.monsterName}</strong>
                <span style={{ color: '#8b7fa8', fontSize: 13 }}>{persona.title}</span>
                {!m.failed && <SeverityBadge severity={m.overallSeverity} />}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8b7fa8' }}>
                  {m.failed ? 'no report' : `confidence ${m.confidence}/100`}
                </span>
              </header>
              {m.failed ? (
                <p style={{ color: '#ff8fa3', fontSize: 13 }}>
                  This monster did not report. The court proceeded without it.
                </p>
              ) : (
                <ul style={{ listStyle: 'none', display: 'grid', gap: 10 }}>
                  {m.findings.map((f) => (
                    <li key={f.id} style={{ borderLeft: `3px solid ${SEV_COLOR[f.severity]}`, paddingLeft: 12 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <SeverityBadge severity={f.severity} />
                        <code style={{ fontSize: 11, color: '#a99cc0' }}>{f.category}</code>
                        {f.requiresVerification && (
                          <span style={{ fontSize: 11, color: '#ffd43b' }}>needs verification</span>
                        )}
                      </div>
                      <p style={{ marginTop: 4, lineHeight: 1.5 }}>{f.claim}</p>
                      <p style={{ marginTop: 4, fontSize: 12.5, color: '#8b7fa8', fontStyle: 'italic' }}>
                        Evidence: {f.evidence}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
