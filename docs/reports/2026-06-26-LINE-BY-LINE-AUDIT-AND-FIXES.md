# Line-by-Line Audit and Fixes (2026-06-26)

**Scope:** an obsessive, file-by-file review of the source tree to find and fix real
defects the green gate does not catch. Every fix below was verified against the full
gate (`bun run check`: prettier + tsc strict + oxlint + 1514 tests + receipts + build)
and classified by wiring (does the result reach the deterministic golden) before
touching it. Findings were cross-checked with parallel reviewer agents and an
adversarial finder->verify workflow; only verified defects were changed.

## 0. Gate restoration

- The container shipped with **no `node_modules`**, so `bun run check` could not run
  (`prettier-plugin-tailwindcss` not found). `bun install` restored it; the gate then
  ran green except for the oxlint warnings and the supply-chain audit below.

## 1. Lint: 27 oxlint warnings -> 0

- **2x `no-self-assign`** (`quantum.ts`, `super-mind.ts`): cosmetic `x = x` "Ralph 10x"
  provenance grafts (self-described stubs / voided locals with no downstream effect).
  Removed the whole `_mpoBond`/`_useMpo`/`_caMpsEnabled` block and the `_useTensor`
  alias; kept the genuinely-used `tensorScratch`.
- **23x `no-new-array`**: converted every `new Array(n)` / `new Array<T>(n)` to
  `Array.from(...)`. Behavior-identical (sparse-vs-dense only matters with a later
  `.map`, which none use); confirmed by the determinism suite. Typing `new Array(bins)`
  (previously `any[]`) surfaced a latent unchecked-index access in
  `quantum-qrng-full.ts` (`histogram[bin]++`), now guarded with `?? 0`.
- **1x `no-thenable`** (`tsotchke-deep-wire.ts`): renamed the Eshkol `if`-AST fields
  `then`/`else` -> `consequent`/`alternate` (ESTree convention).
- Also removed 4 stale `eslint-disable no-unused-vars` comments in `super-mind.ts` on
  imports that are actually load-bearing, and a garbled "Ralph 10x" graft spliced into
  the middle of the `hashSeed` JSDoc in `rng.ts`.

## 2. Supply chain (CI fix)

- The "Supply-chain audit (full tree)" job (`bun audit`) failed: mermaid's transitive
  `dompurify` resolved to 3.4.10 (moderate **GHSA-cmwh-pvxp-8882**). The `^3.4.9`
  override no longer excluded the vulnerable range. Bumped the override to **^3.4.11**
  (the patched release, satisfies mermaid's `^3.3.1`); `bun audit` is now clean.

## 3. Latent correctness bugs fixed

All in currently unwired/unread paths (verified: no importers / no callers / not
serialized into the golden), so the fixes are behavior-safe and the gate stayed green.

| File:line                       | Defect                                                                                                                                                                                                                                                         | Fix                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `causal-graph.ts:134,163`       | do(X=x) graph surgery cut edges **out of** X on pass 0 only; Pearl's do-operator cuts edges **into** X on every pass. X's parents overwrote the intervened value each pass, so interventions/counterfactuals were value-independent for any parented variable. | `if (e.to === xIdx) continue;` in both loops.                                      |
| `tsotchke-deep-wire.ts:259`     | `libirrepSU2CharacterTable` returned **NaN** (`sin/sin` = 0/0 at the identity class m=0, at m=j, and the whole j=0 row).                                                                                                                                       | Use the Dirichlet-kernel limit `2j+1` where `sin(a) -> 0`.                         |
| `nqs-vmc-learning.ts:112`       | `initVMC` seeded every sample to the **all-zero** bitstring (`rng() >>> k` on a float in [0,1) is `ToUint32(<1)=0`).                                                                                                                                           | Scale to a full uint32 before extracting the top `visibleCount` bits.              |
| `morphic-field.ts:71`           | imprint EMA added a spurious `field*(1-gain)` term -> coefficient ~1.93, saturating to the clamp ceiling instead of accumulating.                                                                                                                              | Reduced to a proper tau-decay EMA.                                                 |
| `narrative-memory.ts:158`       | `retrieve()` read the "now" timestamp via `Math.max(0, head-1)`, returning slot 0 (not CAP-1) right after head wraps -> stale clock for 1/CAP of calls.                                                                                                        | Modular wraparound, matching the loops below it.                                   |
| `emergent-language.ts:184`      | `createSign()` incremented `nextSignId` twice on the auto-create path -> ids skipped every other integer.                                                                                                                                                      | Removed the redundant second increment.                                            |
| `integrated-information.ts:280` | `computeLocalIntegration` accumulated the same term into both locals and returned their ratio -> always exactly 1 (no per-module information). `modulePhi` is unread.                                                                                          | Replaced with a genuine per-module flow normalized to a [0,1] participation share. |
| `clifford-tableau.ts:205`       | unused `rows` destructure + `void rows;` noUnused graft in `measure()`.                                                                                                                                                                                        | Removed (the algorithm correctly uses `2*n` bounds).                               |

## 4. Reviewed and verified clean (no defects)

- **Audit subsystem** (the branch's namesake): `src/logging/audit.ts`,
  `src/logging/logger.ts` (bounded rings, graceful degradation, correct circular-buffer
  reconstruction), and `server.ts`'s `/api/audit` ingest -- token-bucket rate limit,
  dual body-size guards, HTML escaping, surrogate-pair truncation guard, ts-magnitude
  guard, and the ring-render index math all correct.
- **Server security:** `ai-sandbox.ts` (default-deny `confine`/`validateCommand`,
  `Bun.spawn(argv)` exec with no shell, `minimalEnv` with no secret leak),
  `web-search.ts` (query-not-URL, fixed host, no SSRF). No hole found.
- **Math kernels (line-by-line):** `rng`, `scalar`, `quantum-coherence`, `dual`,
  `izhikevich`, `quantum-magic`, `hopfield`, `predictive-coding`, `belief-propagation`,
  `heap`, `spatial-hash`, `mps-svd` (one-sided Jacobi SVD), `schrodinger`
  (Crank-Nicolson Thomas solve), `clifford-tableau` (Aaronson-Gottesman), `irrep`
  (Wigner d / Clebsch-Gordan / 6j / 9j). All verified against their stated formulas.
- **`world.ts`** `Date.now` use (super-creature persistence) confirmed contained
  outside the population golden; determinism suite passes.
- **Adversarial workflow** over sim (m-q, r-z) and ui/audio/core returned **zero
  confirmed bugs** after independent verification.

## 5. Noted, deliberately NOT changed

- `brutal-god-releases.ts:154-170 / 252-266` -- a byte-identical snap/drain/possess
  block appears twice (double-applies the vitality multiplier). It is in a wired,
  explicitly-maximalist flavor module; "fixing" it would force a golden regeneration on
  ambiguous intent, so it is recorded rather than changed.
- `tsotchke-registry.ts:283` (`tsotchkeWiringCoverage`) -- the honesty-metric inflation
  already documented in the 2026-06-21 honesty audit (counting fenced/meta entries);
  a metric-policy decision, not a code defect.
- `clifford-tableau.ts` `caMpsBond`/`caMpsCurrentBond` snapshot fields -- decorative
  constants surfaced as telemetry; removing them is a snapshot-shape/UI change left to
  the maintainer.

## Final gate

`prettier` clean, `tsc --noEmit` clean, **oxlint 0 warnings** (was 27), **1514 tests
pass**, receipts match (90.80% line / 87.91% function), build OK, `bun audit` clean.
