/**
 * Static accessibility invariants of `index.html` (500-point §13.259, partial). A real,
 * browser-free subset of what axe-core checks at the markup level: a document language, a title,
 * a viewport, and an accessible NAME on every interactive control (a `<button>` with no text,
 * `aria-label`, or `title` is invisible to a screen reader) and on every `role="img"`/`role="tab"`.
 * Guards the hand-authored markup against an a11y regression on every CI run.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(import.meta.dir, '..', 'index.html'), 'utf8');

function textOutsideTags(markup: string): string {
  let text = '';
  let inTag = false;
  let quote: '"' | "'" | null = null;
  for (const character of markup) {
    if (!inTag) {
      if (character === '<') inTag = true;
      else text += character;
    } else if (quote !== null) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      inTag = false;
    }
  }
  return text;
}

describe('static a11y invariants of index.html (§13.259)', () => {
  test('document declares a language, a title, and a viewport', () => {
    expect(html).toMatch(/<html[^>]*\blang=/i);
    expect(html).toMatch(/<title>[^<]+<\/title>/i);
    expect(html).toMatch(/<meta[^>]*name=["']viewport["']/i);
  });

  test('every <button> has an accessible name (visible text, aria-label, or title)', () => {
    const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
    expect(buttons.length).toBeGreaterThan(5);
    const unnamed: string[] = [];
    for (const m of buttons) {
      const attrs = m[1] ?? '';
      const visibleText = textOutsideTags(m[2] ?? '').trim();
      const named = /\baria-label=/.test(attrs) || /\btitle=/.test(attrs) || visibleText.length > 0;
      if (!named) unnamed.push(m[0].slice(0, 60));
    }
    expect(unnamed).toEqual([]);
  });

  test('every role="img" / role="tab" element carries an aria-label', () => {
    const roled = [...html.matchAll(/<[^>]*\brole=["'](?:img|tab)["'][^>]*>/gi)];
    expect(roled.length).toBeGreaterThan(0);
    for (const m of roled) {
      const tag = m[0];
      expect(
        /\baria-label=/.test(tag),
        `role element missing aria-label: ${tag.slice(0, 70)}`,
      ).toBe(true);
    }
  });
});
