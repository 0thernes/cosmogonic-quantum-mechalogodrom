/**
 * Regression pins for the 2026-06-25 line-by-line audit's two MAJOR fixes. Both live in
 * currently-unreachable code, so without these the fixes are only "correct on paper" — these
 * tests exercise the fixed paths directly and fail loudly if either regresses.
 *
 * 1. causal-graph do(X=x): graph surgery must CUT edges INTO x (e.to === xIdx) so the intervention
 *    holds. The pre-fix guard cut edges OUT of x on pass 0 only, letting x be recomputed from its
 *    parents — washing the intervention out (E[Y|do(X=1)] ≈ E[Y|do(X=0)]).
 * 2. eshkol VM if-labels: each `if` site must emit UNIQUE labels. The pre-fix hard-coded
 *    `label_else`/`label_end`, so a second `if`'s JZ/JMP resolved (findIndex → first match) to the
 *    FIRST if's label — a backward jump that loops forever.
 */
import { test, expect, describe } from 'bun:test';
import { CausalGraph } from '../src/sim/causal-graph';
import { eshkolCompile, eshkolExecute, type EshkolASTNode } from '../src/sim/tsotchke-deep-wire';

describe('audit 2026-06-25 regression — major fixes', () => {
  test('causal do(X=x) holds the intervention through forward propagation', () => {
    const g = new CausalGraph();
    g.observe(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5);
    // `reasoning` has a single incoming edge (ignition -> reasoning, w=0.65), so it tracks the held
    // ignition value monotonically. With the surgery cutting edges INTO ignition every pass, ignition
    // stays pinned at xVal and drives reasoning; pre-fix it was diluted by surprise/novelty so hi ≈ lo.
    const hi = g.do('ignition', 1.0, 'reasoning').effect;
    const lo = g.do('ignition', 0.0, 'reasoning').effect;
    expect(hi).toBeGreaterThan(0.55);
    expect(lo).toBeLessThan(0.2);
    expect(hi - lo).toBeGreaterThan(0.4);
  });

  test('eshkol VM: two sequential ifs terminate and select the right branch (unique labels)', () => {
    const ast: EshkolASTNode = {
      type: 'program',
      body: [
        {
          type: 'if',
          condition: { type: 'literal', value: 1 },
          then: { type: 'literal', value: 10 },
          else: { type: 'literal', value: 20 },
        },
        {
          type: 'if',
          condition: { type: 'literal', value: 0 },
          then: { type: 'literal', value: 30 },
          else: { type: 'literal', value: 40 },
        },
      ],
    };
    // Pre-fix this hung (backward jump → infinite loop, tripping the bun-test timeout). With unique
    // labels it returns the SECOND if's else branch (condition 0 → 40), the last value on the stack.
    const result = eshkolExecute(eshkolCompile(ast), 0);
    expect(result).toBe(40);
  });
});
