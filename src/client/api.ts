import type { CourtSession } from '@shared/types';

/**
 * Transport seam. The Devvit app talks to the server over HTTP; the browser demo
 * points the same client at the same Hono app running in the page. Nothing else
 * about the API layer changes -- see demo/main.tsx.
 */
type Transport = (path: string, init?: RequestInit) => Promise<Response>;
let transport: Transport | null = null;

export function setTransport(next: Transport | null): void {
  transport = next;
}

async function raw(path: string, init?: RequestInit): Promise<Response> {
  if (transport) return transport(path, init);
  return fetch(path, init);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await raw(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).message ?? (body as any).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  create: (concept: string) =>
    req<{ session: CourtSession }>('/api/session', {
      method: 'POST',
      body: JSON.stringify({ concept }),
    }),
  panel: (id: string) => req<{ session: CourtSession }>(`/api/session/${id}/panel`, { method: 'POST' }),
  debate: (id: string) => req<{ session: CourtSession }>(`/api/session/${id}/debate`, { method: 'POST' }),
  verdict: (id: string) => req<{ session: CourtSession }>(`/api/session/${id}/verdict`, { method: 'POST' }),
  get: (id: string) => req<{ session: CourtSession }>(`/api/session/${id}`),
  pause: (id: string) => req<{ session: CourtSession }>(`/api/session/${id}/pause`, { method: 'POST' }),
  resume: (id: string) => req<{ session: CourtSession }>(`/api/session/${id}/resume`, { method: 'POST' }),
  publicView: (slug: string) => req<{ session: CourtSession }>(`/api/public/${slug}`),
  history: () => req<{ sessions: any[] }>('/api/user/history'),
  exportMarkdown: async (id: string) => {
    const res = await raw(`/api/session/${id}/export?format=md`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  },
};
