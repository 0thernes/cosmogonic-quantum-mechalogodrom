/** Focused canonical XENOMIMIC inspector contracts: honest math, geometry, and lifecycle. */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  XENOMIMIC_BRAIN_PARAMETERS,
  XENOMIMIC_INDICATOR_CHANNELS,
  XenomimicPanel,
  projectXenomimicIndicators,
  type XenomimicPanelTelemetry,
} from '../src/ui/xenomimic-panel';

const ROOT = resolve(import.meta.dir, '..');
const source = readFileSync(resolve(ROOT, 'src/ui/xenomimic-panel.ts'), 'utf8');

const TELEMETRY: XenomimicPanelTelemetry = {
  population: 42,
  pairs: 24,
  births: 18,
  deaths: 4,
  eaten: 3,
  teleports: 6,
  meanEnergy: 0.67,
  coherence: 0.82,
  bondTension: 0.4,
  integration: 0.71,
  freeEnergy: 0.36,
  quantumSpread: 0.31,
  rngQuality: 0.99,
  speciesCounts: [5, 6, 4, 7, 5, 3, 4, 2, 3, 3],
  dominantSpecies: 3,
  growthTarget: 200,
  weather: 'AURORA',
};

describe('XenomimicPanel indicator projection', () => {
  test('uses the exact canonical brain width and ten operational lanes', () => {
    expect(XENOMIMIC_BRAIN_PARAMETERS).toBe(101);
    expect(XENOMIMIC_INDICATOR_CHANNELS).toEqual([
      'POP',
      'ENER',
      'COH',
      'TWIN',
      'IIT*',
      'GWT*',
      'DIV',
      'LIFE',
      'BIRTH',
      'PORT',
    ]);
    const out = projectXenomimicIndicators(TELEMETRY, new Float32Array(10));
    for (const value of out) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(out[2]).toBeCloseTo(0.82, 5);
    expect(out[4]).toBeCloseTo(0.71, 5);
    expect(out[5]).toBeCloseTo(0.4 * 0.71, 5);
  });

  test('caller lanes override fallbacks while hostile values remain bounded', () => {
    const indicatorScores = new Float32Array([1.4, -0.3, Number.NaN, 0.33]);
    const out = new Float32Array(10);
    const returned = projectXenomimicIndicators({ ...TELEMETRY, indicatorScores }, out);
    expect(returned).toBe(out);
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(0);
    expect(out[2]).toBeCloseTo(TELEMETRY.coherence, 5);
    expect(out[3]).toBeCloseTo(0.33, 5);
    expect(() => projectXenomimicIndicators(TELEMETRY, new Float32Array(9))).toThrow(RangeError);
  });

  test('headless construction records telemetry and disposes idempotently', () => {
    const panel = new XenomimicPanel(undefined);
    panel.update(TELEMETRY);
    expect(panel.lastTelemetry()).toBe(TELEMETRY);
    expect(() => panel.dispose()).not.toThrow();
    expect(() => panel.dispose()).not.toThrow();
  });
});

describe('XenomimicPanel SuperPanel geometry and honesty seals', () => {
  test('matches the SuperPanel outer placement and wireframe dimensions', () => {
    for (const fragment of [
      'left:var(--cqm-hud-left,calc(clamp(180px,19vw,260px) + 16px))',
      'right:var(--cqm-hud-right,calc(clamp(220px,23vw,340px) + 16px))',
      'bottom:var(--cqm-hud-bottom,calc(var(--cqm-bottom-h,108px) + 130px))',
      'max-height:var(--cqm-hud-height,min(84vh,1040px))',
      'border-radius:12px',
      'gap:8px;padding:7px 10px',
      'flex-direction:row;gap:10px;overflow:auto;align-items:stretch',
      'padding:7px 12px',
      'grid-template-columns:auto minmax(0,1fr);gap:3px 12px',
      'padding:10px 12px',
      'grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:8px 16px',
      'grid-template-columns:72px 1fr 42px;align-items:center;gap:8px',
    ]) {
      expect(source).toContain(fragment);
    }
  });

  test('owns its stable ids, listeners, and lifecycle resources', () => {
    expect(source).toContain("toggle.className = 'cqm-dock-toggle'");
    expect(source).toContain('constructor(doc?: Document)');
    expect(source).toContain('__cqmXenomimicPanelDispose');
    expect(source).toContain('private readonly ac = new AbortController()');
    expect((source.match(/signal: this\.ac\.signal/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('this.doc.getElementById(TOGGLE_ID)?.remove()');
    expect(source).toContain('this.doc.getElementById(PANEL_ID)?.remove()');
    expect(source).toContain('this.doc.getElementById(STYLE_ID)?.remove()');
    expect(source).toContain('this.ac.abort()');
    expect(source).toContain('this.panel?.remove()');
    expect(source).toContain('this.toggle?.remove()');
    expect(source).toContain('this.style?.remove()');
  });

  test('contains one bounded honest radar and no decorative randomness', () => {
    expect(source).toContain("el(this.doc, 'canvas', 'cqm-xenomimic-radar')");
    expect(source).toContain('height:132px;min-height:132px');
    expect(source).toContain('projectXenomimicIndicators(telemetry, this.indicatorScratch)');
    expect(source).toContain('INDICATOR ONLY | CLASSICAL SIMULATION | NOT SENTIENCE');
    expect(source).toContain('not evidence of sentience or physical quantum effects');
    expect(source).not.toContain('Date.now()');
    expect(source).not.toContain('Math.random()');
  });
});
