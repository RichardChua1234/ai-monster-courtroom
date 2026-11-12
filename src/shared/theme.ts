/**
 * The courtroom palette, in one place.
 * Every pair here is contrast-checked at test time (AC-9.1): text on surface must
 * clear WCAG 2.1 AA — 4.5:1 for body text, 3:1 for large text.
 */

export interface Pair {
  name: string;
  fg: string;
  bg: string;
  /** 'body' needs 4.5:1, 'large' needs 3:1 */
  size: 'body' | 'large';
}

export const SURFACE = {
  page: '#0a0510',
  panel: '#120b1c',
  raised: '#150d22',
  border: '#33234a',
} as const;

export const INK = {
  primary: '#e8e2f0',
  secondary: '#a99cc0',
  muted: '#8b7fa8',
  link: '#c8bde0',
} as const;

export const STATE = {
  critical: '#ff5c7a',
  high: '#ffa94d',
  medium: '#ffd43b',
  low: '#69db7c',
  accent: '#9333ea',
  accentDeep: '#7c3aed',
  onAccent: '#ffffff',
  onLightChip: '#0a0510',
  dangerBg: '#2a0f1a',
  dangerInk: '#ff8fa3',
} as const;

/** Every foreground/background combination the UI actually renders. */
export const PAIRS: Pair[] = [
  { name: 'primary on page', fg: INK.primary, bg: SURFACE.page, size: 'body' },
  { name: 'primary on panel', fg: INK.primary, bg: SURFACE.panel, size: 'body' },
  { name: 'primary on raised', fg: INK.primary, bg: SURFACE.raised, size: 'body' },
  { name: 'secondary on page', fg: INK.secondary, bg: SURFACE.page, size: 'body' },
  { name: 'secondary on panel', fg: INK.secondary, bg: SURFACE.panel, size: 'body' },
  { name: 'link on page', fg: INK.link, bg: SURFACE.page, size: 'body' },
  // the primary button paints white text over a gradient: BOTH stops must clear AA
  { name: 'on-accent on gradient start', fg: STATE.onAccent, bg: STATE.accentDeep, size: 'body' },
  { name: 'on-accent on gradient end', fg: STATE.onAccent, bg: STATE.accent, size: 'body' },
  { name: 'button disabled', fg: STATE.onAccent, bg: '#4a2f7a', size: 'body' },
  { name: 'danger ink on danger bg', fg: STATE.dangerInk, bg: STATE.dangerBg, size: 'body' },
  // severity chips render dark text on a bright fill (large/bold chip text)
  { name: 'chip: critical', fg: STATE.onLightChip, bg: STATE.critical, size: 'large' },
  { name: 'chip: high', fg: STATE.onLightChip, bg: STATE.high, size: 'large' },
  { name: 'chip: medium', fg: STATE.onLightChip, bg: STATE.medium, size: 'large' },
  { name: 'chip: low', fg: STATE.onLightChip, bg: STATE.low, size: 'large' },
  // verdict banners: bright ink on a dark tinted surface
  { name: 'verdict proceed', fg: STATE.low, bg: '#1b4332', size: 'body' },
  { name: 'verdict pivot', fg: STATE.medium, bg: '#4a3a10', size: 'body' },
  { name: 'verdict pause', fg: STATE.high, bg: '#4a2a10', size: 'body' },
  { name: 'verdict abandon', fg: STATE.dangerInk, bg: '#4a0f1c', size: 'body' },
];

export const AA_BODY = 4.5;
export const AA_LARGE = 3.0;

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.1 contrast ratio, 1..21. */
export function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

export function requiredRatio(size: Pair['size']): number {
  return size === 'body' ? AA_BODY : AA_LARGE;
}
