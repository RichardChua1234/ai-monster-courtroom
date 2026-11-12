import { describe, it, expect } from 'vitest';
import { validateSubmission, heuristicExtract, IntakeError, MIN_CHARS, MAX_CHARS } from '../src/server/intake';

describe('intake', () => {
  // criterion: AC-1.2
  it('rejects a submission under 50 characters', () => {
    expect(() => validateSubmission('too short')).toThrow(IntakeError);
  });

  // criterion: AC-1.2
  it('rejects a submission over 10,000 characters', () => {
    expect(() => validateSubmission('x'.repeat(MAX_CHARS + 1))).toThrow(IntakeError);
  });

  // criterion: AC-1.2
  it('accepts a submission at the boundaries', () => {
    expect(validateSubmission('x'.repeat(MIN_CHARS))).toHaveLength(MIN_CHARS);
    expect(validateSubmission('x'.repeat(MAX_CHARS))).toHaveLength(MAX_CHARS);
  });

  // criterion: AC-1.3
  it('extracts the four judged fields from labelled input', () => {
    const c = heuristicExtract(`Problem: devs cannot prove the spec is met
Solution: map criteria to tests
Target market: engineering teams
Revenue model: per seat`);
    expect(c.problem).toContain('devs cannot prove');
    expect(c.solution).toContain('map criteria');
    expect(c.targetMarket).toContain('engineering teams');
    expect(c.revenueModel).toContain('per seat');
    expect(c.extractionConfidence).toBe(100);
  });

  // criterion: AC-1.3
  it('marks unstated fields instead of inventing them', () => {
    const c = heuristicExtract('A long enough description of an idea with no labelled fields whatsoever, repeated to pass validation.');
    expect(c.targetMarket).toBe('Not stated.');
    expect(c.revenueModel).toBe('Not stated.');
    expect(c.extractionConfidence).toBeLessThan(100);
  });

  // criterion: AC-1.4
  it('preserves the raw submission for the record', () => {
    const raw = 'Problem: x. Solution: y. Target market: z. Revenue model: w. '.padEnd(80, 'x');
    expect(heuristicExtract(raw).raw).toBe(raw);
  });
});
