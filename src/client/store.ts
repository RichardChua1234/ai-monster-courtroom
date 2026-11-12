import { create } from 'zustand';
import type { CourtSession } from '@shared/types';
import { api } from './api';

export type Stage = 'intake' | 'panel' | 'debate' | 'verdict' | 'done';

interface CourtState {
  stage: Stage;
  loading: boolean;
  error: string | null;
  session: CourtSession | null;
  conceptText: string;
  setConceptText: (t: string) => void;
  runTrial: (concept: string) => Promise<void>;
  reset: () => void;
  loadPublic: (slug: string) => Promise<void>;
}

/** Drives the trial phase by phase so the UI can render each in turn. */
export const useCourt = create<CourtState>((set) => ({
  stage: 'intake',
  loading: false,
  error: null,
  session: null,
  conceptText: '',
  setConceptText: (t) => set({ conceptText: t }),

  async runTrial(concept: string) {
    set({ loading: true, error: null, stage: 'intake' });
    try {
      const created = await api.create(concept);
      set({ session: created.session, stage: 'panel' });

      const panel = await api.panel(created.session.id);
      set({ session: panel.session, stage: 'debate' });

      const debate = await api.debate(created.session.id);
      set({ session: debate.session, stage: 'verdict' });

      const verdict = await api.verdict(created.session.id);
      set({ session: verdict.session, stage: 'done', loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  async loadPublic(slug: string) {
    set({ loading: true, error: null });
    try {
      const { session } = await api.publicView(slug);
      set({ session, stage: 'done', loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  reset: () => set({ stage: 'intake', session: null, error: null, loading: false, conceptText: '' }),
}));
