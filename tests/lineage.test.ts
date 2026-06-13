import { describe, expect, test } from 'bun:test';
import { Lineage, NO_PARENT } from '../src/sim/lineage';

describe('Lineage births & generations', () => {
  test('mints increasing ids; genesis is generation 0', () => {
    const l = new Lineage(64);
    const a = l.birth(NO_PARENT, NO_PARENT, 0);
    const b = l.birth(NO_PARENT, NO_PARENT, 0);
    expect(a).toBe(0);
    expect(b).toBe(1);
    expect(l.generationOf(a)).toBe(0);
    expect(l.total).toBe(2);
  });
  test('single-parent child is one generation deeper', () => {
    const l = new Lineage(64);
    const p = l.birth(NO_PARENT, NO_PARENT, 0);
    const c = l.birth(p, NO_PARENT, 1);
    const g = l.birth(c, NO_PARENT, 2);
    expect(l.generationOf(c)).toBe(1);
    expect(l.generationOf(g)).toBe(2);
    expect(l.maxGeneration).toBe(2);
  });
  test('two-parent child is max(parent gens) + 1', () => {
    const l = new Lineage(64);
    const a = l.birth(NO_PARENT, NO_PARENT, 0); // gen 0
    const b = l.birth(a, NO_PARENT, 1); // gen 1
    const c = l.birth(a, b, 2); // max(0,1)+1 = 2
    expect(l.generationOf(c)).toBe(2);
  });
});

describe('Lineage info', () => {
  test('returns the full record', () => {
    const l = new Lineage(64);
    const a = l.birth(NO_PARENT, NO_PARENT, 5);
    const b = l.birth(NO_PARENT, NO_PARENT, 6);
    const c = l.birth(a, b, 7);
    expect(l.info(c)).toEqual({ id: c, parentA: a, parentB: b, gen: 1, bornTick: 7 });
  });
  test('unknown / future id yields null', () => {
    const l = new Lineage(64);
    expect(l.info(999)).toBeNull();
    expect(l.info(NO_PARENT)).toBeNull();
  });
});

describe('Lineage ancestry', () => {
  test('isAncestor finds parents and grandparents within depth', () => {
    const l = new Lineage(64);
    const gp = l.birth(NO_PARENT, NO_PARENT, 0);
    const p = l.birth(gp, NO_PARENT, 1);
    const c = l.birth(p, NO_PARENT, 2);
    expect(l.isAncestor(p, c)).toBe(true);
    expect(l.isAncestor(gp, c)).toBe(true);
    expect(l.isAncestor(c, gp)).toBe(false); // not symmetric
    expect(l.isAncestor(c, c)).toBe(true); // self
  });
  test('isAncestor respects the depth bound', () => {
    const l = new Lineage(64);
    let id = l.birth(NO_PARENT, NO_PARENT, 0);
    const root = id;
    for (let i = 0; i < 10; i++) id = l.birth(id, NO_PARENT, i + 1); // a 10-deep chain
    expect(l.isAncestor(root, id, 3)).toBe(false); // too far within depth 3
    expect(l.isAncestor(root, id, 20)).toBe(true); // reachable with a large bound
  });
});

describe('Lineage relatedness', () => {
  test('siblings sharing a parent are related; unrelated lines are not', () => {
    const l = new Lineage(64);
    const parent = l.birth(NO_PARENT, NO_PARENT, 0);
    const s1 = l.birth(parent, NO_PARENT, 1);
    const s2 = l.birth(parent, NO_PARENT, 1);
    const stranger = l.birth(NO_PARENT, NO_PARENT, 0);
    expect(l.related(s1, s2)).toBe(true);
    expect(l.related(s1, stranger)).toBe(false);
    expect(l.related(s1, s2)).toBe(l.related(s2, s1)); // symmetric
  });
  test('parent and child are related', () => {
    const l = new Lineage(64);
    const p = l.birth(NO_PARENT, NO_PARENT, 0);
    const c = l.birth(p, NO_PARENT, 1);
    expect(l.related(p, c)).toBe(true);
  });
});

describe('Lineage bounded window (eviction)', () => {
  test('ids older than capacity decay to genesis; live window stays correct', () => {
    const l = new Lineage(4);
    const ids: number[] = [];
    ids.push(l.birth(NO_PARENT, NO_PARENT, 0)); // id 0
    for (let i = 1; i < 6; i++) ids.push(l.birth(ids[i - 1] as number, NO_PARENT, i)); // chain to id 5
    // window is the last 4 ids [2,5]; id 0 and 1 have decayed.
    expect(l.info(0)).toBeNull();
    expect(l.generationOf(0)).toBe(0);
    expect(l.info(5)).not.toBeNull();
    expect(l.total).toBe(6);
    expect(l.maxGeneration).toBe(5); // deepest is remembered even as ids decay
  });
});
