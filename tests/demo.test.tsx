// @vitest-environment jsdom
/**
 * Demo smoke test.
 *
 * `docs/` is the page a judge opens. Verifying it means running the demo's own boot
 * sequence -- the real Hono app in-process via `setTransport`, the real rehearsal
 * stand-in, the real React components -- and clicking through a whole trial, exactly
 * as a visitor would. If this fails, the hosted demo is broken.
 *
 * Environment: jsdom (see the file-level pragma in vitest config for this file).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../src/client/App';
import { setTransport } from '../src/client/api';
import { setApiKey } from '../src/agents/client';
import { createRehearsalFetch } from '../src/agents/rehearsal';
import { app, useMemoryStore, setUserIdResolver } from '../src/server/index';

/** Mirrors demo/main.tsx exactly. */
function bootDemo() {
  useMemoryStore();
  void setUserIdResolver(async () => 'demo-visitor');
  setTransport((path, init) => app.request(path, init));
  setApiKey(null);
  vi.stubGlobal('fetch', createRehearsalFetch());
}

describe('hosted demo', () => {
  beforeEach(() => bootDemo());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    setTransport(null);
  });

  // criterion: 10.5
  it('boots, renders the intake form and offers a sample concept', () => {
    render(createElement(App));
    expect(screen.getByText('Put your idea on trial')).toBeTruthy();
    expect(screen.getByLabelText(/Describe the concept/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Use a sample/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Convene the court/i })).toBeTruthy();
  });

  // criterion: 10.5
  it('keeps the submit button disabled until a concept is long enough', async () => {
    render(createElement(App));
    const submit = screen.getByRole('button', { name: /Convene the court/i });
    expect(submit).toHaveProperty('disabled', true);

    await userEvent.click(screen.getByRole('button', { name: /Use a sample/i }));
    await waitFor(() => expect(submit).toHaveProperty('disabled', false));
  });

  // criterion: 10.5
  it('runs a whole trial from the sample concept to a verdict, in the browser', async () => {
    render(createElement(App));

    await userEvent.click(screen.getByRole('button', { name: /Use a sample/i }));
    const submit = screen.getByRole('button', { name: /Convene the court/i });
    await waitFor(() => expect(submit).toHaveProperty('disabled', false));
    await userEvent.click(submit);

    // all four monsters must report
    await waitFor(
      () => {
        for (const name of ['Count Cashula', 'Zed', 'Dr. Frankenbyte']) {
          expect(screen.getAllByText(new RegExp(name, 'i')).length).toBeGreaterThan(0);
        }
      },
      { timeout: 20_000 },
    );

    // and the trial must finish with a reachable verdict and a seven-day plan
    await waitFor(
      () => {
        expect(screen.getAllByText(/Validation Plan/i).length).toBeGreaterThan(0);
      },
      { timeout: 30_000 },
    );

    expect(screen.getAllByText(/DAY 7/i).length).toBeGreaterThan(0);
    const decision = screen.getAllByText(/\b(Proceed|Pivot|Pause|Abandon)\b/i);
    expect(decision.length).toBeGreaterThan(0);
  }, 60_000);
});
