/**
 * TSOTCHKE PULSE WIRING — end-of-line evidence that represented entries reach a value a brain reads.
 *
 * tsotchke-brain-intake proves each repo is load-bearing on the intake VECTOR; this proves it at the
 * next boundary: `corpusPulse().qgtVolume`, the exact field the apex QuantumBrainOrgan / godform /
 * apex-quantum-substrate consume. Removing any wired repo measurably changes that value — the honest
 * form of "all 17 integrated entries are causally represented". The ablation parameter is
 * backward-compatible: an empty or omitted set reproduces the represented-entry pulse exactly and
 * never touches `adGradient`, so the facade's tested wired>fenced ordering invariant is preserved.
 */
import { describe, expect, test } from 'bun:test';
import { corpusPulse } from '../src/sim/tsotchke-facade';
import { isBrainWired } from '../src/sim/tsotchke-brain-intake';
import { getTsotchkeRepoByIndex, TSOTCHKE_REPO_COUNT } from '../src/sim/tsotchke-registry';

const SEED = 0x0c0ffee;

describe('Tsotchke corpus reaches the brain-facing pulse (qgtVolume)', () => {
  test('every wired scientific repo is load-bearing on corpusPulse().qgtVolume', () => {
    let checked = 0;
    for (let i = 0; i < TSOTCHKE_REPO_COUNT; i++) {
      const repo = getTsotchkeRepoByIndex(i);
      if (!isBrainWired(repo)) continue;
      checked += 1;
      // Wired-repo form indices saturate qgtVolume at 1 (clamped); the fenced-scale indices leave it
      // unsaturated, so the per-repo effect is visible there. Scan enough indices to hit one.
      let moved = false;
      for (let idx = 0; idx < 2 * TSOTCHKE_REPO_COUNT && !moved; idx++) {
        if (
          corpusPulse(SEED, idx).qgtVolume !==
          corpusPulse(SEED, idx, new Set([repo.slug])).qgtVolume
        ) {
          moved = true;
        }
      }
      expect(moved).toBe(true); // removing this repo measurably changes the pulse a brain reads
    }
    expect(checked).toBe(17);
  });

  test('an empty / omitted ablation reproduces the full-corpus pulse exactly (back-compat)', () => {
    for (let idx = 0; idx < 12; idx++) {
      expect(corpusPulse(SEED, idx, new Set())).toEqual(corpusPulse(SEED, idx));
    }
  });

  test('corpus ablation never touches adGradient — the wired>fenced ordering invariant is safe', () => {
    const wired = getTsotchkeRepoByIndex(0).slug;
    expect(corpusPulse(SEED, 0, new Set([wired])).adGradient).toBe(corpusPulse(SEED, 0).adGradient);
    // the facade's ordering invariant (a wired repo's adGradient exceeds a fenced one's) still holds
    expect(corpusPulse(1, 0).adGradient).toBeGreaterThan(corpusPulse(1, 7).adGradient);
  });
});
