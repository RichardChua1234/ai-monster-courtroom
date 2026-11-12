import type { CourtSession } from '@shared/types';
import { PERSONAS } from '../../agents/personas';
import { SeverityBadge } from './PanelView';

export function DebateView({ session }: { session: CourtSession }) {
  if (!session.debate.length) return null;
  return (
    <section aria-labelledby="debate-heading" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      <h2 id="debate-heading" style={{ fontSize: 22, marginBottom: 6 }}>The cross-examination</h2>
      <p style={{ color: '#8b7fa8', fontSize: 13, marginBottom: 16 }}>
        {session.debate.length} round{session.debate.length === 1 ? '' : 's'}. The monsters only stop
        when what remains is taste, not evidence.
      </p>

      <div style={{ display: 'grid', gap: 16 }}>
        {session.debate.map((round) => (
          <article key={round.roundNumber} aria-label={`Round ${round.roundNumber}`} style={{
            border: '1px solid #33234a', borderRadius: 12, padding: 16, background: '#120b1c',
          }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <strong>Round {round.roundNumber}</strong>
              {round.consensus.reached && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#1b4332', color: '#69db7c' }}>
                  consensus
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8b7fa8' }}>
                {round.rebuttals.length} rebuttal{round.rebuttals.length === 1 ? '' : 's'}
              </span>
            </header>

            <ul style={{ listStyle: 'none', display: 'grid', gap: 8, marginBottom: 12 }}>
              {round.opening.map((a) => (
                <li key={a.monsterId} style={{ fontSize: 13.5, lineHeight: 1.55 }}>
                  <span aria-hidden="true">{PERSONAS[a.monsterId].emoji}</span>{' '}
                  <strong>{PERSONAS[a.monsterId].name}</strong>{' '}
                  <SeverityBadge severity={a.severity} />
                  <p style={{ marginTop: 3, color: '#cfc4e4' }}>{a.position}</p>
                </li>
              ))}
            </ul>

            {round.rebuttals.map((rb, i) => (
              <div key={`${rb.fromMonster}-${rb.targetClaimId}-${i}`} style={{
                borderLeft: '2px solid #4a2f7a', paddingLeft: 12, marginTop: 10,
              }}>
                <div style={{ fontSize: 12, color: '#a99cc0', marginBottom: 3 }}>
                  {PERSONAS[rb.fromMonster].name} → {PERSONAS[rb.toMonster].name}
                  <span style={{ marginLeft: 8, color: rb.strength === 'strong' ? '#ff5c7a' : rb.strength === 'moderate' ? '#ffa94d' : '#8b7fa8' }}>
                    {rb.strength}
                  </span>
                  <code style={{ marginLeft: 8, fontSize: 11, color: '#8b7fa8' }}>[{rb.targetClaimId}]</code>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>{rb.rebuttal}</p>
              </div>
            ))}

            {round.consensus.unresolved.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#ffa94d', marginBottom: 4 }}>Still unresolved</div>
                <ul style={{ paddingLeft: 18, fontSize: 13, color: '#cfc4e4' }}>
                  {round.consensus.unresolved.map((u, i) => <li key={i}>{u}</li>)}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
