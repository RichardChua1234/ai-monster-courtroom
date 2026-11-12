/**
 * LLM client — one place where model calls, retries and JSON validation live.
 * Design contract: 30s timeout, 3 attempts, exponential backoff, one parse-repair pass.
 */
import { stripFences } from '@shared/schemas';

export interface CallOptions {
  model: string;
  temperature: number;
  system: string;
  user: string;
  timeoutMs?: number;
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
}

export class LLMError extends Error {
  constructor(message: string, readonly attempts: number, readonly lastRaw?: string) {
    super(message);
    this.name = 'LLMError';
  }
}

export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_ATTEMPTS = 3;

function endpoint(): string {
  return process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1/chat/completions';
}

/**
 * Call a chat model and return parsed JSON validated by `parse`.
 * Retries on network error, non-2xx, or unparseable output.
 */
export async function callJson<T>(
  opts: CallOptions,
  parse: (raw: unknown) => T,
): Promise<T> {
  const {
    model, temperature, system, user,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    fetchImpl = fetch,
  } = opts;

  const key = process.env.OPENROUTER_API_KEY;
  let lastError: unknown = null;
  let lastRaw: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(endpoint(), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(key ? { authorization: `Bearer ${key}` } : {}),
        },
        body: JSON.stringify({
          model,
          temperature,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });

      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      const body = (await res.json()) as any;
      const content: string = body?.choices?.[0]?.message?.content ?? '';
      lastRaw = content;
      const parsed = JSON.parse(stripFences(content));
      return parse(parsed);
    } catch (err) {
      lastError = err;
      // backoff before next attempt
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 250 * 2 ** (attempt - 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw new LLMError(
    `model call failed after ${maxAttempts} attempts: ${String(lastError)}`,
    maxAttempts,
    lastRaw,
  );
}
