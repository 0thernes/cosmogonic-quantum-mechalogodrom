<!-- reviewed: 2026-07-02 | mega-audit round 3 | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Reproduce This — the third-party replication artifact

**Living document.** The project's single weakest scientific axis is **external validation** (risk
register R2; scrutiny point #22): every internal receipt is strong, but no third party has re-run
anything. This page is the mechanical fix — the exact procedure by which **anyone** can replicate the
headline measured claims on their own machine, with zero trust in this repo's CI.

## One-command replication

```bash
git clone https://github.com/0thernes/cosmogonic-quantum-mechalogodrom
cd cosmogonic-quantum-mechalogodrom          # any commit; fingerprints are PER-COMMIT
bun install --frozen-lockfile
bun scripts/reproduce.ts --seed 123 --beats 200
```

The script runs the **real apex `SuperMind`** (the full cognition stack — GWT ignition, IIT-Φ, active
inference, spin-glass instinct, 6-qubit register, 16-qubit Clifford reflex) under a fixed seed and a
scripted percept schedule, records the 16 consciousness-faculty activations each beat, and prints a
receipt:

- **`fingerprint`** — FNV-1a over the exact IEEE-754 bytes of every recorded activation. The script runs
  the whole experiment **twice in-process** and exits non-zero if the two hashes differ.
- **`meanAbsCoupling` / `density` / `isolated`** — the same coupling metrics the test gate enforces with
  a regression floor (`tests/coupling-audit.test.ts`: `0.188 < meanAbsCoupling < 0.6`).
- **final headline indicators** (Φ surrogate, ignition, self-awareness, empowerment).

## What a match proves — and what it does not

| Claim                                                         | Replicated by                                                                                                                                                              |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Determinism** — same seed ⇒ bit-identical cognition         | same fingerprint twice on your machine; same fingerprint across machines at the same commit                                                                                |
| **Coupling measurement is real** — not a hand-asserted number | your `meanAbsCoupling` equals ours and sits inside the gate band                                                                                                           |
| **The test/coverage receipts are real**                       | `bun run check` — the full gate (format → tsc → lint → 2,372-test floor + coverage → sync → facts → build)                                                                 |
| Consciousness / sentience / AGI                               | **NOTHING here proves these.** The indicators are computational proxies; the hard problem is untouched. A matching hash validates _reproducibility_, not _interpretation_. |

The fingerprint is a **per-commit** value: it legitimately changes whenever the apex cognition evolves.
Replication means "same commit + same command ⇒ same hash," not an eternal constant. (For that reason the
test suite asserts determinism and the coupling band, but deliberately pins no golden hash.)

## Environment notes

- Bun ≥ 1.3 (the repo pins behavior via `bun.lock`; `--frozen-lockfile` is required for byte-identical
  dependency trees).
- Pure CPU float math — no GPU, no threads, no locale, no clock in the measured path — which is why the
  hash is expected to be identical across OS/architectures that implement IEEE-754 doubles correctly.
  If you find a platform where it differs, that is a **real, reportable finding** (see
  [SECURITY.md](../SECURITY.md) for contact; determinism-law violations are treated as bugs).

## Escalation path for a real validation

1. Replicate the fingerprint (above) — mechanical trust established.
2. Run the coupling experiment yourself: `bun test tests/coupling-audit.test.ts` — the measured
   `meanAbsCoupling` regression floor is the project's central "coupling > count" bet, live.
3. Run any single suite of interest (`bun test tests/integrated-information.test.ts`,
   `clifford-tableau`, `quantum`, …) — every consciousness-indicator mechanism has its own falsifiable
   tests with analytic expectations (GHZ Φ, Bell entropy, Born-rule bounds).
4. For the A-Life comparative claims, regenerate every statistic from the CSV:
   `bun scripts/alife-comparison-stats.ts` (identical CSV ⇒ identical bytes; see
   [reports/2026-06-26-ALIFE-COMPARATIVE-AUDIT.md](./reports/2026-06-26-ALIFE-COMPARATIVE-AUDIT.md)).

What would count as **actual external validation** (still open, honestly): an independent replication
_published somewhere citable_, or a peer-reviewed treatment of the coupling/open-endedness experiments.
This artifact only removes the mechanical excuse.
