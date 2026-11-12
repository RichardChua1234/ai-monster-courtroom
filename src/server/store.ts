/**
 * Persistence — one interface, two backends.
 * Redis in Devvit; an in-memory Map for tests and local dev.
 * AC-5.1, AC-5.8, NFR-2.2
 */
import type { CourtSession } from '@shared/types';

export interface Store {
  save(session: CourtSession): Promise<void>;
  get(id: string): Promise<CourtSession | null>;
  bySlug(slug: string): Promise<CourtSession | null>;
  listByUser(userId: string): Promise<CourtSession[]>;
  lock(id: string): Promise<boolean>;
  unlock(id: string): Promise<void>;
  incrementRate(userId: string): Promise<number>;
}

export const ACTIVE_TTL_SEC = 24 * 60 * 60;
export const COMPLETE_TTL_SEC = 90 * 24 * 60 * 60;

export function isComplete(s: CourtSession): boolean {
  return s.status === 'complete' || s.status === 'failed';
}

/** Minimal Redis surface we depend on (satisfied by Devvit's client). */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { EX?: number }): Promise<unknown>;
  zadd(key: string, score: number, member: string): Promise<unknown>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  expire(key: string, seconds: number): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  incr(key: string): Promise<number>;
}

const K = {
  session: (id: string) => `court:session:${id}`,
  slug: (slug: string) => `court:slug:${slug}`,
  userSessions: (u: string) => `court:user:${u}:sessions`,
  lock: (id: string) => `court:lock:${id}`,
  rate: (u: string) => `court:rate:${u}`,
};

export class RedisStore implements Store {
  constructor(private readonly redis: RedisLike) {}

  async save(session: CourtSession): Promise<void> {
    const ttl = isComplete(session) ? COMPLETE_TTL_SEC : ACTIVE_TTL_SEC;
    await this.redis.set(K.session(session.id), JSON.stringify(session), { EX: ttl });
    await this.redis.set(K.slug(session.publicSlug), session.id, { EX: COMPLETE_TTL_SEC });
    await this.redis.zadd(K.userSessions(session.userId), session.createdAt, session.id);
    await this.redis.expire(K.userSessions(session.userId), COMPLETE_TTL_SEC);
  }

  async get(id: string): Promise<CourtSession | null> {
    const raw = await this.redis.get(K.session(id));
    return raw ? (JSON.parse(raw) as CourtSession) : null;
  }

  async bySlug(slug: string): Promise<CourtSession | null> {
    const id = await this.redis.get(K.slug(slug));
    return id ? this.get(id) : null;
  }

  async listByUser(userId: string): Promise<CourtSession[]> {
    const ids = await this.redis.zrange(K.userSessions(userId), 0, -1);
    const out: CourtSession[] = [];
    for (const id of ids) {
      const s = await this.get(id);
      if (s) out.push(s);
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  }

  async lock(id: string): Promise<boolean> {
    const existing = await this.redis.get(K.lock(id));
    if (existing) return false;
    await this.redis.set(K.lock(id), String(Date.now()), { EX: 60 });
    return true;
  }

  async unlock(id: string): Promise<void> {
    await this.redis.del(K.lock(id));
  }

  async incrementRate(userId: string): Promise<number> {
    const n = await this.redis.incr(K.rate(userId));
    if (n === 1) await this.redis.expire(K.rate(userId), 3600);
    return n;
  }
}

export class MemoryStore implements Store {
  private sessions = new Map<string, CourtSession>();
  private slugs = new Map<string, string>();
  private locks = new Map<string, number>();
  private rates = new Map<string, number>();

  async save(s: CourtSession): Promise<void> {
    this.sessions.set(s.id, JSON.parse(JSON.stringify(s)));
    this.slugs.set(s.publicSlug, s.id);
  }
  async get(id: string): Promise<CourtSession | null> {
    const s = this.sessions.get(id);
    return s ? (JSON.parse(JSON.stringify(s)) as CourtSession) : null;
  }
  async bySlug(slug: string): Promise<CourtSession | null> {
    const id = this.slugs.get(slug);
    return id ? this.get(id) : null;
  }
  async listByUser(userId: string): Promise<CourtSession[]> {
    return [...this.sessions.values()]
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  async lock(id: string): Promise<boolean> {
    if (this.locks.has(id)) return false;
    this.locks.set(id, Date.now());
    return true;
  }
  async unlock(id: string): Promise<void> { this.locks.delete(id); }
  async incrementRate(userId: string): Promise<number> {
    const n = (this.rates.get(userId) ?? 0) + 1;
    this.rates.set(userId, n);
    return n;
  }
}
