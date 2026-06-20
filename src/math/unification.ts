/**
 * UNIFICATION + KNOWLEDGE BASE — faithful port of Eshkol's logic-programming primitive
 * (lib/backend/vm_logic.c / lib/core/logic_builtins.cpp: unify, walk, make-substitution,
 * make-fact, make-kb, kb-assert!, kb-query). Robinson's (1965) unification algorithm with an
 * occurs-check, plus a queryable fact base — genuine SYMBOLIC, NON-token cognition: a creature's
 * instinct/belief expressed as terms it can match and resolve by logic, not statistics over
 * tokens. The audit confirmed the Eshkol C kernel runnable; this is the deterministic TS analogue.
 *
 * UPSTREAM (ported, with attribution — see THIRD-PARTY-NOTICES.md):
 *   tsotchke/Eshkol/eshkol_repo — lib/backend/vm_logic.c, lib/core/logic_builtins.cpp,
 *   inc/eshkol/core/logic.h. (MIT, © 2024–2026 tsotchke;
 *   full local corpus Z:\[Vibe Coded (AI)]\(Tsotchke)\Eshkol\eshkol_repo)
 *
 * Determinism: pure. No Rng / Date.now / Math.random. Substitutions are immutable maps
 * (copy-on-extend); variable resolution by `walk` over the binding chain; first-match query.
 */

/** A first-order term: a logic variable, a ground atom, or a functor applied to argument terms. */
export type Term =
  | { readonly tag: 'var'; readonly name: string }
  | { readonly tag: 'atom'; readonly value: string | number }
  | { readonly tag: 'compound'; readonly functor: string; readonly args: readonly Term[] };

/** A binding environment: variable name → bound term (possibly another variable). */
export type Substitution = ReadonlyMap<string, Term>;

/** Construct a logic variable `?name`. */
export const lvar = (name: string): Term => ({ tag: 'var', name });
/** Construct a ground atom (symbol or number). */
export const atom = (value: string | number): Term => ({ tag: 'atom', value });
/** Construct a compound term `functor(args…)`. */
export const compound = (functor: string, ...args: Term[]): Term => ({
  tag: 'compound',
  functor,
  args,
});

/** Follow the variable chain in `s` until a non-variable or an unbound variable is reached. */
export function walk(t: Term, s: Substitution): Term {
  let cur = t;
  while (cur.tag === 'var') {
    const bound = s.get(cur.name);
    if (bound === undefined) return cur;
    cur = bound;
  }
  return cur;
}

/** Occurs-check: does variable `name` occur within `t` (after walking)? Blocks cyclic bindings. */
function occurs(name: string, t: Term, s: Substitution): boolean {
  const w = walk(t, s);
  if (w.tag === 'var') return w.name === name;
  if (w.tag === 'compound') {
    for (const a of w.args) if (occurs(name, a, s)) return true;
  }
  return false;
}

/** Extend a substitution with `name → t` (copy-on-extend; the input is never mutated). */
function extend(s: Substitution, name: string, t: Term): Substitution {
  const next = new Map(s);
  next.set(name, t);
  return next;
}

/**
 * Robinson unification with occurs-check. Returns the extended substitution under which `a` and
 * `b` are syntactically equal, or `null` if they cannot be unified.
 */
export function unify(a: Term, b: Term, s: Substitution = new Map()): Substitution | null {
  const wa = walk(a, s);
  const wb = walk(b, s);
  if (wa.tag === 'var' && wb.tag === 'var' && wa.name === wb.name) return s;
  if (wa.tag === 'var') {
    if (occurs(wa.name, wb, s)) return null;
    return extend(s, wa.name, wb);
  }
  if (wb.tag === 'var') {
    if (occurs(wb.name, wa, s)) return null;
    return extend(s, wb.name, wa);
  }
  if (wa.tag === 'atom' && wb.tag === 'atom') return wa.value === wb.value ? s : null;
  if (wa.tag === 'compound' && wb.tag === 'compound') {
    if (wa.functor !== wb.functor || wa.args.length !== wb.args.length) return null;
    let cur: Substitution | null = s;
    for (let i = 0; i < wa.args.length; i++) {
      cur = unify(wa.args[i]!, wb.args[i]!, cur as Substitution);
      if (cur === null) return null;
    }
    return cur;
  }
  return null;
}

/** Fully instantiate a term under a substitution (recursively resolves all bound variables). */
export function applySubst(t: Term, s: Substitution): Term {
  const w = walk(t, s);
  if (w.tag === 'compound') {
    return { tag: 'compound', functor: w.functor, args: w.args.map((a) => applySubst(a, s)) };
  }
  return w;
}

/** A knowledge base: an ordered list of facts (ground or non-ground terms). */
export type KnowledgeBase = readonly Term[];

/** Query a goal against the KB; returns every substitution under which the goal unifies a fact. */
export function query(goal: Term, kb: KnowledgeBase): Substitution[] {
  const out: Substitution[] = [];
  for (const fact of kb) {
    const s = unify(goal, fact, new Map());
    if (s !== null) out.push(s);
  }
  return out;
}

/** True iff `goal` is provable against the KB (unifies at least one fact). */
export function holds(goal: Term, kb: KnowledgeBase): boolean {
  for (const fact of kb) if (unify(goal, fact, new Map()) !== null) return true;
  return false;
}

/**
 * Deterministic instinct-satisfaction in [0,1]: the fraction of `goals` provable against `kb`.
 * A creature's "how well does my situation match my instincts" signal — symbolic drive for the
 * petri dish / Super Creature, computed by logic rather than token statistics.
 */
export function instinctSatisfaction(goals: readonly Term[], kb: KnowledgeBase): number {
  if (goals.length === 0) return 0;
  let n = 0;
  for (const g of goals) if (holds(g, kb)) n += 1;
  return n / goals.length;
}
