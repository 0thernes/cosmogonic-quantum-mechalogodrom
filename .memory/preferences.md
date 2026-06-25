# Preferences

Style, tone, and design choices for this project.

## Code

- TypeScript, strict, ESM, Bun-first. Small pure leaf modules with exclusive ownership; acyclic deps;
  unit-testable in isolation. `src/math/**` is pure leaf math (no `Rng`, no clock).
- Prefer real, cited algorithms over approximations. When you implement a known result, name the
  reference in the doc comment (e.g. "Racah W-formula; Edmonds 6.3.7", "Aaronson–Gottesman tableau").
- Behavioral-oracle tests: assert PROVABLE properties a stub cannot fake (unitarity, conservation,
  monotonicity, triangle/selection rules, determinism) — not just snapshot values.

## Voice & docs

- Two registers coexist deliberately: the mythopoetic "0thernes Corp / brutal-god / Quantum Wildbeyond"
  voice for narrative surfaces, and the measured, receipt-disciplined voice for status/audit surfaces.
  Keep them distinct — never let the myth voice state unmeasured numbers as fact.
- "Grow What Thou Wilt." Sentience/NHSI are GOALS, explicitly never claimed as reached.
- Em dashes and real Unicode are fine in docs, but the pre-commit hook normalizes mojibake — let it.

## Aesthetic (Quantum Wildbeyond)

- Every visible effect is the honestly-computed collapse of an exact mathematical state. "Real math
  under every effect." A frame that stutters is a measurement that failed — performance discipline is
  part of the art.
