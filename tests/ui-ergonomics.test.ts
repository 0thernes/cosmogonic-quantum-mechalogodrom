/**
 * UI ergonomics guardrails for the center HUD + Architecture panel. These pin the readability
 * constants behind the "no tiny flat scroll strips" mandate without needing a browser DOM.
 */
import { describe, expect, test } from 'bun:test';
import { CENTER_HUD_DESKTOP_HEIGHT, CENTER_HUD_TOUCH_HEIGHT } from '../src/ui/center-hud';
import {
  ARCHITECTURE_PANEL_CANVAS_HEIGHT,
  ARCHITECTURE_PANEL_CANVAS_FLEX,
  ARCHITECTURE_PANEL_DATA_HEIGHT,
  ARCHITECTURE_PANEL_DATA_MIN_HEIGHT,
} from '../src/ui/pantheon-architecture-panel';

function clampParts(css: string): { minPx: number; vh: number; maxPx: number } {
  const m = css.match(/^clamp\((\d+)px,\s*([\d.]+)vh,\s*(\d+)px\)$/);
  if (!m) throw new Error(`not a clamp: ${css}`);
  return { minPx: Number(m[1]), vh: Number(m[2]), maxPx: Number(m[3]) };
}

describe('UI ergonomics — center HUD and Architecture panel', () => {
  test('center HUD default slot is a readable panel, not the old 30vh strip', () => {
    const desktop = clampParts(CENTER_HUD_DESKTOP_HEIGHT);
    const touch = clampParts(CENTER_HUD_TOUCH_HEIGHT);
    expect(desktop.minPx).toBeGreaterThanOrEqual(300);
    expect(desktop.vh).toBeGreaterThanOrEqual(50);
    expect(desktop.maxPx).toBeGreaterThanOrEqual(640);
    expect(touch.minPx).toBeGreaterThanOrEqual(320);
    expect(touch.vh).toBeGreaterThanOrEqual(60);
  });

  test('Architecture keeps a substantial dynamics canvas and data well', () => {
    const canvas = clampParts(ARCHITECTURE_PANEL_CANVAS_HEIGHT);
    expect(canvas.minPx).toBeGreaterThanOrEqual(170);
    expect(canvas.vh).toBeGreaterThanOrEqual(28);
    expect(canvas.maxPx).toBeGreaterThanOrEqual(260);
    expect(Number.parseInt(ARCHITECTURE_PANEL_DATA_MIN_HEIGHT, 10)).toBeGreaterThanOrEqual(180);
    expect(ARCHITECTURE_PANEL_CANVAS_FLEX).toBe('0 0 auto');
    expect(ARCHITECTURE_PANEL_DATA_HEIGHT).toBe('100%');
  });
});
