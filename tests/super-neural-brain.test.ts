/**
 * IV · BRAIN is measured, not decorative (src/ui/super-neural-brain.ts). The graph copies each module's
 * actual output from a live SuperMind snapshot, its flows carry exact snapshot values, its parameter
 * counts add up to the mind's total, and both views (CONNECTOME, MEGA 4D) are pure functions of the
 * graph: identical for identical data, different when any module's values change. Drawing goes through
 * a recording canvas, so "different" means the drawing commands differ.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SuperMind, type SuperMindSnapshot } from '../src/sim/super-mind';
import {
  brainGraphText,
  buildBrainGraph,
  drawBrainConnectome,
  drawBrainMega,
  type BrainGraph,
} from '../src/ui/super-neural-brain';

function recorder(): { ctx: CanvasRenderingContext2D; ops: string[] } {
  const ops: string[] = [];
  const r = (v: unknown): string => (typeof v === 'number' ? v.toFixed(3) : String(v));
  const state: Record<string, unknown> = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'top',
  };
  const ctx = new Proxy(state, {
    get(t, prop: string) {
      if (prop in t) return t[prop];
      if (prop === 'measureText') return (s: string) => ({ width: s.length * 4 });
      return (...a: unknown[]) => {
        ops.push(`${prop}(${a.map(r).join(',')})`);
      };
    },
    set(t, prop: string, v: unknown) {
      ops.push(`${prop}=${r(v)}`);
      t[prop] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, ops };
}

function liveSnapshot(beats = 9, seed = 21): SuperMindSnapshot {
  const mind = new SuperMind(mulberry32(seed));
  for (let k = 0; k < beats; k++) {
    const f = (o: number): number => 0.5 + 0.45 * Math.sin(k * 0.9 + o);
    mind.think({
      energy: f(0),
      threat: f(1),
      crowding: f(2),
      chaos: f(3),
      wealthRel: f(4),
      preyClose: f(5),
      rivalClose: f(6),
      pull: f(7),
      light: f(8),
      sound: f(9),
      phase: (k % 10) / 10,
    });
  }
  return structuredClone(mind.snapshot());
}
const rms = (a: readonly number[]): number =>
  a.length ? Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length) : 0;
function draw(view: typeof drawBrainConnectome, g: BrainGraph): string {
  const { ctx, ops } = recorder();
  view(ctx, 640, 480, g);
  return ops.join('|');
}

describe('IV · BRAIN measured module connectome', () => {
  const snap = liveSnapshot();
  const g = buildBrainGraph(snap);

  test('16 modules whose values are exact copies of their declared snapshot fields', () => {
    expect(g.modules).toHaveLength(16);
    const at = (path: string): unknown =>
      path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], snap);
    for (const m of g.modules) {
      expect(m.values, m.label).toEqual(Array.from(at(m.source) as ArrayLike<number>));
      expect(m.rms).toBeCloseTo(rms(m.values), 12);
    }
    expect(g.units).toBe(g.modules.reduce((n, m) => n + m.values.length, 0));
    expect(g.units).toBeGreaterThan(300);
  });

  test("module parameter counts add up to the mind's 10,081 weights", () => {
    expect(g.modules.reduce((n, m) => n + m.params, 0)).toBe(snap.paramCount);
    expect(snap.paramCount).toBe(10081);
  });

  test('every flow joins two real modules and carries values taken from the snapshot', () => {
    const ids = new Set(g.modules.map((m) => m.id));
    const byId = new Map(g.modules.map((m) => [m.id, m]));
    expect(g.edges.length).toBeGreaterThanOrEqual(30);
    for (const e of g.edges) {
      expect(ids.has(e.from) && ids.has(e.to), `${e.from}→${e.to}`).toBe(true);
      expect(e.carried.length, `${e.from}→${e.to}`).toBeGreaterThan(0);
      expect(e.rms).toBeCloseTo(rms(e.carried), 12);
      expect(e.via.length).toBeGreaterThan(10);
    }
    // full-vector flows carry their source module's exact output
    const flow = (a: string, b: string) => g.edges.find((e) => e.from === a && e.to === b)!;
    expect(flow('senses', 'cortex').carried).toEqual(byId.get('senses')!.values);
    expect(flow('cortex', 'meta').carried).toEqual(snap.latent);
    expect(flow('imagitron', 'reasoner').carried).toEqual(snap.observatory.brain.imaginationWinner);
    expect(flow('organs', 'meta').carried).toEqual(snap.observatory.organAggregates);
    expect(flow('meta', 'plan').carried).toEqual(snap.observatory.actionOutputs.slice(3, 8));
    expect(flow('reservoir', 'plan').carried).toEqual([snap.reservoir.novelty]);
  });

  test('both views are pure and a tick-only change updates status, never plotted geometry', () => {
    for (const view of [drawBrainConnectome, drawBrainMega])
      expect(draw(view, g)).toBe(draw(view, g));
    const later = { ...g, tick: g.tick + 1 };
    for (const view of [drawBrainConnectome, drawBrainMega])
      expect(draw(view, later).replace(/tick \d+/g, 'tick')).toBe(
        draw(view, g).replace(/tick \d+/g, 'tick'),
      );
  });

  test("changing any one module's values changes both drawings", () => {
    const refC = draw(drawBrainConnectome, g);
    const refM = draw(drawBrainMega, g);
    for (const id of g.modules.map((m) => m.id)) {
      const s2 = structuredClone(snap);
      const g2 = buildBrainGraph(s2);
      const m = g2.modules.find((x) => x.id === id)!;
      const values = m.values.map((v, i) => v * 0.5 + 0.2 + (i % 3) * 0.05);
      const g3: BrainGraph = {
        ...g2,
        modules: g2.modules.map((x) =>
          x.id === id
            ? {
                ...x,
                values,
                rms: rms(values),
                maxAbs: Math.max(...values.map(Math.abs)),
              }
            : x,
        ),
      };
      expect(draw(drawBrainConnectome, g3), id).not.toBe(refC);
      expect(draw(drawBrainMega, g3), id).not.toBe(refM);
    }
  });

  test('the text dump lists every module and flow with its exact numbers', () => {
    const txt = brainGraphText(g);
    for (const m of g.modules) expect(txt).toContain(m.label);
    expect(txt.split('\n').filter((l) => l.includes(' → '))).toHaveLength(g.edges.length);
    expect(txt).toContain(`tick ${g.tick}`);
  });

  test('temporal payloads use captured inputs, not later imagination/aspect states', () => {
    const graph = buildBrainGraph(snap);
    const flow = (a: string, b: string) => graph.edges.find((e) => e.from === a && e.to === b)!;
    expect(flow('quantum', 'meta').carried).toEqual(snap.observatory.brain.quantumRaw);
    expect(flow('quantum', 'meta').carried).not.toEqual(snap.quantum);
    expect(flow('quantum', 'qubits').carried).toEqual(snap.observatory.brain.qubitAspects);
    expect(flow('imagitron', 'reasoner').carried).toEqual(snap.observatory.brain.imaginationWinner);
    expect(flow('imagitron', 'reasoner').carried).not.toEqual(snap.imagined);
    expect(flow('search', 'imagitron').carried).toEqual(
      snap.observatory.brain.searchWinnerVectors.slice(0, 64),
    );
    expect(flow('search', 'imagitron').carried).toHaveLength(64);
    expect(flow('memory', 'senses').carried).toEqual([snap.observatory.senses[13]!]);
    expect(flow('memory', 'senses').carried).not.toEqual([snap.observatory.memory.mean]);
    expect(flow('senses', 'instinct').measurement).toBe('operands');
    expect(flow('organs', 'meta').measurement).toBe('payload');
    expect(flow('cortex', 'organs').carried).toHaveLength(120);
  });

  test('invalid values remain invalid and are disclosed without invalid canvas commands', () => {
    const changed = structuredClone(snap);
    changed.latent[0] = NaN;
    changed.observatory.actionOutputs[3] = Infinity;
    const graph = buildBrainGraph(changed);
    expect(Number.isNaN(graph.modules.find((m) => m.id === 'cortex')!.values[0])).toBe(true);
    expect(graph.modules.find((m) => m.id === 'meta')!.values[3]).toBe(Infinity);
    expect(graph.warning).toContain('invalid');
    expect(brainGraphText(graph)).toContain('NaN');
    expect(brainGraphText(graph)).toContain('Infinity');
    for (const view of [drawBrainConnectome, drawBrainMega]) {
      const { ctx, ops } = recorder();
      view(ctx, 372, 460, graph);
      expect(ops.filter((op) => !op.startsWith('fillText(')).join('|')).not.toMatch(/NaN|Infinity/);
      expect(ops.some((op) => op.includes('invalid'))).toBe(true);
    }
  });

  test('unstarted and missing payloads are unavailable, never zero activity', () => {
    const unstarted = buildBrainGraph(new SuperMind(mulberry32(20)).snapshot());
    expect(unstarted.units).toBe(0);
    expect(unstarted.edges).toEqual([]);
    expect(unstarted.modules.every((m) => m.values.length === 0 && Number.isNaN(m.rms))).toBe(true);
    expect(unstarted.warning).toContain('No completed');
    const missing = structuredClone(snap);
    Reflect.deleteProperty(missing.observatory, 'brain');
    const graph = buildBrainGraph(missing);
    const edge = graph.edges.find((e) => e.from === 'quantum' && e.to === 'meta')!;
    expect(edge.measurement).toBe('unavailable');
    expect(edge.carried).toEqual([]);
    expect(Number.isNaN(edge.rms)).toBe(true);
    expect(graph.warning).toContain('unavailable');
    expect(draw(drawBrainMega, graph)).toContain('setLineDash(3,3)');
  });

  test('numeric disclosure round-trips every finite value without four-digit rounding', () => {
    const changed = structuredClone(snap);
    changed.latent[0] = 0.12345678901234568;
    changed.latent[1] = -0;
    const graph = buildBrainGraph(changed);
    const text = brainGraphText(graph);
    expect(text).toContain('0.12345678901234568');
    expect(text).toContain('-0');
    for (const module of graph.modules)
      for (const value of module.values)
        expect(text).toContain(Object.is(value, -0) ? '-0' : String(value));
    expect(graph.modules.find((m) => m.id === 'memory')!.note).toContain('one writer');
    expect(graph.modules.find((m) => m.id === 'reservoir')!.note).toContain('outside');
  });

  test('responsive drawings use readable fonts and an echo graph omits an unexecuted recursive link', () => {
    for (const view of [drawBrainConnectome, drawBrainMega]) {
      const { ctx, ops } = recorder();
      view(ctx, 372, 460, g);
      for (const op of ops.filter((op) => op.startsWith('font='))) {
        const size = Number(op.match(/(\d+(?:\.\d+)?)px/)![1]);
        expect(size).toBeGreaterThanOrEqual(9);
      }
    }
    const mind = new SuperMind(mulberry32(22));
    mind.think(
      {
        energy: 0.5,
        threat: 0.2,
        crowding: 0.1,
        chaos: 0.3,
        wealthRel: 0.5,
        preyClose: 0.4,
        rivalClose: 0.2,
        pull: 0.1,
        light: 0.3,
        sound: 0.1,
        phase: 0.2,
      },
      'echo',
    );
    const echo = buildBrainGraph(mind.snapshot());
    expect(echo.edges.find((e) => e.from === 'search' && e.to === 'imagitron')).toBeUndefined();
    expect(echo.edges).toHaveLength(g.edges.length - 1);
  });
});
