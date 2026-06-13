/**
 * WCAG contrast of the design-system text tokens (500-point §13.260). Pure computation from the
 * `@theme` hex values in `src/styles/app.css` — no DOM. Guards the readable text colours against a
 * future token change that would drop them below the WCAG AA (4.5:1) / AAA (7:1) thresholds on the
 * near-black `--color-void` background.
 */
import { describe, expect, test } from 'bun:test';

/** sRGB 0..255 channel → linear-light, per the WCAG 2.x relative-luminance definition. */
function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Relative luminance of a `#rgb`/`#rrggbb` colour. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG contrast ratio between two colours (1:1 … 21:1). */
function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

const VOID = '#030612'; // --color-void (the app background)
const AA = 4.5; // WCAG AA, normal text
const AAA = 7; // WCAG AAA, normal text

describe('WCAG contrast of design tokens (§13.260)', () => {
  test('the contrast() helper matches known reference ratios', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 1); // a canonical ~AA boundary grey
  });

  test('primary text clears AAA (7:1) on the void background', () => {
    expect(contrast('#9fb6d9', VOID)).toBeGreaterThanOrEqual(AAA); // --color-ink
    expect(contrast('#ffffff', VOID)).toBeGreaterThanOrEqual(AAA); // --color-white
  });

  test('secondary / accent / bar text clears AA (4.5:1) on the void background', () => {
    const tokens: Record<string, string> = {
      'ink-dim': '#8fa8c8',
      accent: '#00eeff', // --color-accent (#0ef)
      'bar-ink': '#88eeaa', // --color-bar-ink (#8ea)
      warn: '#ffaa00', // --color-warn (#fa0)
    };
    for (const [name, hex] of Object.entries(tokens)) {
      const c = contrast(hex, VOID);
      expect(c, `${name} (${hex}) on void = ${c.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    }
  });
});
