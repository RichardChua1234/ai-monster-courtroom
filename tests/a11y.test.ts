import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAIRS, contrastRatio, requiredRatio } from '../src/shared/theme';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('accessibility', () => {
  // criterion: 9.1
  it('keeps every rendered colour pair at or above the WCAG AA ratio', () => {
    const failures = PAIRS.map((p) => {
      const ratio = contrastRatio(p.fg, p.bg);
      return { ...p, ratio, need: requiredRatio(p.size) };
    }).filter((p) => p.ratio < p.need);

    expect(
      failures.map((f) => `${f.name}: ${f.ratio.toFixed(2)} < ${f.need}`),
    ).toEqual([]);
  });

  // criterion: 9.1
  it('computes the WCAG ratio correctly against a known pair', () => {
    // black on white is exactly 21:1
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    // a colour against itself is 1:1
    expect(contrastRatio('#8b5cf6', '#8b5cf6')).toBeCloseTo(1, 5);
  });

  // criterion: 9.1
  it('paints the primary button from the contrast-checked theme tokens', () => {
    const src = read('src/client/components/IntakeForm.tsx');
    expect(src).toMatch(/import \{[^}]*STATE[^}]*\} from '@shared\/theme'/);
    expect(src).toMatch(/STATE\.accentDeep/);
    expect(src).toMatch(/STATE\.accent/);
    // no raw hex may slip back into the button fill
    expect(src).not.toMatch(/linear-gradient\(135deg,#/);
  });

  // criterion: 9.2
  it('suppresses animation when the user prefers reduced motion', () => {
    const html = read('index.html');
    expect(html).toMatch(/prefers-reduced-motion:\s*reduce/);
    // and the rule must actually neutralise durations, not merely exist
    expect(html).toMatch(/animation-duration:\s*\.?0*1?ms\s*!important/);
  });

  // criterion: 9.3
  it('exposes a visible focus indicator for keyboard users', () => {
    const html = read('index.html');
    expect(html).toMatch(/:focus-visible\s*\{[^}]*outline:/s);
    expect(html).toMatch(/outline-offset:/);
  });

  // criterion: 9.4
  it('associates every intake control with a label and announces live counts', () => {
    const src = read('src/client/components/IntakeForm.tsx');
    // the textarea is labelled by a real <label for>
    expect(src).toMatch(/<label\s+htmlFor="concept"/);
    expect(src).toMatch(/<textarea\s+id="concept"/);
    // the length counter is announced politely rather than only drawn
    expect(src).toMatch(/aria-live="polite"/);
    // validation state is exposed, and errors are announced as alerts
    expect(src).toMatch(/aria-invalid=/);
    expect(src).toMatch(/role="alert"/);
    // helper text is wired through aria-describedby
    expect(src).toMatch(/aria-describedby="concept-help"/);
  });

  // criterion: 9.4
  it('labels the verdict regions and its data table for assistive technology', () => {
    const src = read('src/client/components/VerdictCard.tsx');
    expect(src).toMatch(/aria-labelledby="verdict-heading"/);
    expect(src).toMatch(/<h2\s+id="verdict-heading"/);
    // the improvements matrix is a real table with a header row
    expect(src).toMatch(/<table/);
    expect(src).toMatch(/<thead>/);
    expect(src).toMatch(/<th[\s>]/);
    // decorative emoji must not be read aloud
    expect(src).toMatch(/aria-hidden="true"/);
  });
});
