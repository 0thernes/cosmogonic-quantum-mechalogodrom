/**
 * Robinson unification + knowledge base — proves the ported Eshkol logic primitive is genuine
 * symbolic resolution (occurs-check, variable chains, compound structural unification), not a
 * string-equality stub.
 */
import { describe, expect, test } from 'bun:test';
import {
  lvar,
  atom,
  compound,
  walk,
  unify,
  applySubst,
  query,
  holds,
  instinctSatisfaction,
  type Term,
} from '../src/math/unification';

describe('unify — atoms', () => {
  test('equal atoms unify; unequal do not', () => {
    expect(unify(atom('a'), atom('a'))).not.toBeNull();
    expect(unify(atom('a'), atom('b'))).toBeNull();
    expect(unify(atom(7), atom(7))).not.toBeNull();
    expect(unify(atom(7), atom(8))).toBeNull();
  });
});

describe('unify — variables', () => {
  test('a variable binds to an atom and walk resolves it', () => {
    const s = unify(lvar('X'), atom('cat'));
    expect(s).not.toBeNull();
    expect(walk(lvar('X'), s!)).toEqual(atom('cat'));
  });

  test('same-named variables unify to identity (no binding needed)', () => {
    const s = unify(lvar('X'), lvar('X'));
    expect(s).not.toBeNull();
    expect(s!.size).toBe(0);
  });

  test('transitive variable chains resolve through walk', () => {
    // X = Y, Y = atom(z)  ⇒ walk(X) = z
    let s = unify(lvar('X'), lvar('Y'))!;
    s = unify(lvar('Y'), atom('z'), s)!;
    expect(walk(lvar('X'), s)).toEqual(atom('z'));
  });
});

describe('unify — compounds (structural)', () => {
  test('same functor/arity unifies argument-wise', () => {
    // loves(alice, X) ⊔ loves(alice, bob) ⇒ X = bob
    const a = compound('loves', atom('alice'), lvar('X'));
    const b = compound('loves', atom('alice'), atom('bob'));
    const s = unify(a, b);
    expect(s).not.toBeNull();
    expect(walk(lvar('X'), s!)).toEqual(atom('bob'));
  });

  test('different functor or arity fails', () => {
    expect(unify(compound('f', atom('a')), compound('g', atom('a')))).toBeNull();
    expect(unify(compound('f', atom('a')), compound('f', atom('a'), atom('b')))).toBeNull();
  });

  test('a variable binds an entire sub-term', () => {
    const s = unify(compound('p', lvar('X')), compound('p', compound('q', atom('1'))));
    expect(s).not.toBeNull();
    expect(applySubst(lvar('X'), s!)).toEqual(compound('q', atom('1')));
  });
});

describe('occurs-check', () => {
  test('X = f(X) is rejected (no cyclic binding)', () => {
    expect(unify(lvar('X'), compound('f', lvar('X')))).toBeNull();
  });
});

describe('knowledge base — query / holds', () => {
  const kb: Term[] = [
    compound('parent', atom('zeus'), atom('ares')),
    compound('parent', atom('zeus'), atom('hebe')),
    compound('parent', atom('hera'), atom('ares')),
  ];

  test('query returns one substitution per matching fact', () => {
    const sols = query(compound('parent', atom('zeus'), lvar('C')), kb);
    expect(sols.length).toBe(2);
    const children = sols
      .map((s) => walk(lvar('C'), s))
      .map((t) => (t.tag === 'atom' ? t.value : '?'));
    expect(children.sort()).toEqual(['ares', 'hebe']);
  });

  test('holds is true for provable goals, false otherwise', () => {
    expect(holds(compound('parent', atom('hera'), atom('ares')), kb)).toBe(true);
    expect(holds(compound('parent', atom('hera'), atom('hebe')), kb)).toBe(false);
  });

  test('instinctSatisfaction is the deterministic provable fraction', () => {
    const goals = [
      compound('parent', atom('zeus'), atom('ares')), // provable
      compound('parent', atom('hera'), atom('ares')), // provable
      compound('parent', atom('nobody'), atom('x')), // not provable
    ];
    expect(instinctSatisfaction(goals, kb)).toBeCloseTo(2 / 3, 6);
    expect(instinctSatisfaction([], kb)).toBe(0);
  });
});

describe('determinism', () => {
  test('identical queries give identical results', () => {
    const kb: Term[] = [compound('p', lvar('X'), atom('1'))];
    const a = query(compound('p', atom('a'), lvar('Y')), kb);
    const b = query(compound('p', atom('a'), lvar('Y')), kb);
    expect(a.length).toBe(b.length);
    expect(walk(lvar('Y'), a[0]!)).toEqual(walk(lvar('Y'), b[0]!));
    expect(walk(lvar('X'), a[0]!)).toEqual(atom('a'));
  });
});
