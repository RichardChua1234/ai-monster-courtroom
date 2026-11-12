import { useEffect } from 'react';
import { useCourt } from './store';
import { IntakeForm } from './components/IntakeForm';
import { PanelView } from './components/PanelView';
import { DebateView } from './components/DebateView';
import { VerdictCard } from './components/VerdictCard';

export function App() {
  const { session, stage, reset, loadPublic } = useCourt();

  // /v/<slug> renders a read-only public verdict (AC-5.1)
  useEffect(() => {
    const m = location.pathname.match(/^\/v\/([A-Za-z0-9]+)$/);
    if (m) void loadPublic(m[1]);
  }, [loadPublic]);

  const showIntake = !session || stage === 'intake';

  return (
    <main>
      <header style={{
        borderBottom: '1px solid #241734', padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <span aria-hidden="true" style={{ fontSize: 20 }}>⚖️</span>
        <strong style={{ letterSpacing: 0.3 }}>AI Monster Courtroom</strong>
        <span style={{ fontSize: 12, color: '#8b7fa8' }}>Frankenstein · Kiroween 2026</span>
        {!showIntake && (
          <button type="button" onClick={reset} style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
            background: 'transparent', color: '#c8bde0', border: '1px solid #33234a', fontSize: 13,
          }}>
            New trial
          </button>
        )}
      </header>

      {stage === 'panel' && session && session.status !== 'panel' && (
        <p aria-live="polite" style={{ textAlign: 'center', padding: 20, color: '#a99cc0' }}>
          The panel is still deliberating…
        </p>
      )}

      {showIntake ? <IntakeForm /> : (
        <>
          {session && <PanelView session={session} />}
          {session && <DebateView session={session} />}
          {session?.verdict && <VerdictCard session={session} />}
          {session?.status === 'failed' && (
            <p role="alert" style={{ maxWidth: 900, margin: '0 auto', padding: 20, color: '#ff8fa3' }}>
              The trial did not complete: {session.error ?? 'unknown error'}
            </p>
          )}
        </>
      )}
    </main>
  );
}
