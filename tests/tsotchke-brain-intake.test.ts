/**
 * TSOTCHKE BRAIN INTAKE tests — evidence that every represented external substrate feeds the intake.
 *   • determinism (same seed+frame ⇒ identical intake);
 *   • no decoration: each of the 17 represented non-meta entries measurably moves the intake;
 *   • fenced repos (gpt2-basic / llm-arbitrator / SolanaQuantumFlux / OBLITERATUS) plus org-meta
 *     (.github) are excluded by design — never wired, never removed;
 *   • all channels + drive stay bounded in [0,1].
 * Facades/adaptations are tested as such; no physical-quantum or upstream-parity claim is made.
 */
import { describe, expect, test } from 'bun:test';
import {
  corpusBrainVector,
  corpusBrainScalar,
  corpusBrainAblation,
  corpusBrainDistance,
  isBrainWired,
  substrateScalar,
} from '../src/sim/tsotchke-brain-intake';
import {
  FENCED_REPO_SLUGS,
  getTsotchkeRepo,
  tsotchkeBrainChannelIndex,
} from '../src/sim/tsotchke-registry';

const SEED = 0x5eed_beef;

describe('determinism', () => {
  test('same seed + frame ⇒ identical brain intake', () => {
    expect(corpusBrainVector(SEED, 12)).toEqual(corpusBrainVector(SEED, 12));
    expect(corpusBrainScalar(SEED, 12)).toBe(corpusBrainScalar(SEED, 12));
  });

  test('different seeds ⇒ different intake (not a constant)', () => {
    const d = corpusBrainDistance(corpusBrainVector(1, 5), corpusBrainVector(2, 5));
    expect(d).toBeGreaterThan(0);
  });
});

describe('bounded intake', () => {
  test('every channel + drive stays in [0,1] across frames', () => {
    for (let frame = 0; frame < 40; frame++) {
      const v = corpusBrainVector(SEED, frame);
      for (const c of v.channels) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
      expect(v.drive).toBeGreaterThanOrEqual(0);
      expect(v.drive).toBeLessThanOrEqual(1);
      expect(corpusBrainScalar(SEED, frame)).toBeGreaterThanOrEqual(0);
      expect(corpusBrainScalar(SEED, frame)).toBeLessThanOrEqual(1);
    }
  });
});

describe('no decoration — every wired repo is load-bearing on the brain', () => {
  const report = corpusBrainAblation(SEED, 9);

  test('every wired scientific repo measurably moves the brain intake', () => {
    expect(report.wiredRepoCount).toBe(17);
    for (const a of report.ablations) {
      expect(a.distance).toBeGreaterThan(0);
      expect(a.loadBearing).toBe(true);
    }
    expect(report.loadBearingCount).toBe(report.wiredRepoCount);
    expect(report.allLoadBearing).toBe(true);
  });

  test('the report is deterministic', () => {
    expect(JSON.stringify(corpusBrainAblation(SEED, 9))).toBe(JSON.stringify(report));
  });

  test('each repo ablation changes only its declared semantic channel aggregate', () => {
    const baseline = corpusBrainVector(SEED, 9);
    const channelIndices = [0, 1, 2, 3] as const;

    for (const ablation of report.ablations) {
      const repo = getTsotchkeRepo(ablation.slug)!;
      expect(isBrainWired(repo)).toBe(true);
      expect(repo.brainChannel).not.toBeNull();
      if (repo.brainChannel === null) throw new Error(`${repo.slug} must have a semantic channel`);
      expect(ablation.brainChannel).toBe(repo.brainChannel);

      const intendedIndex = tsotchkeBrainChannelIndex(ablation.brainChannel);
      const withoutRepo = corpusBrainVector(SEED, 9, new Set([ablation.slug]));
      expect(withoutRepo.repoCount).toBe(baseline.repoCount - 1);

      for (const channelIndex of channelIndices) {
        if (channelIndex === intendedIndex) {
          expect(withoutRepo.channels[channelIndex]).not.toBe(baseline.channels[channelIndex]);
        } else {
          expect(withoutRepo.channels[channelIndex]).toBe(baseline.channels[channelIndex]);
        }
      }
    }
  });

  test('runtime-aware ablation exercises the live adaptive simple_mnist value', () => {
    const fixed = corpusBrainVector(SEED, 9);
    const runtime = { simpleMnistRisk: 0.99 };
    const adaptive = corpusBrainVector(SEED, 9, undefined, runtime);
    expect(adaptive.channels[1]).not.toBe(fixed.channels[1]);

    const liveReport = corpusBrainAblation(SEED, 9, runtime);
    const simpleMnist = liveReport.ablations.find((row) => row.slug === 'simple_mnist');
    expect(simpleMnist).toBeDefined();
    expect(simpleMnist?.brainChannel).toBe('threat');
    expect(simpleMnist?.loadBearing).toBe(true);
  });
});

describe('fenced + meta repos are excluded by design (never wired into a brain)', () => {
  const report = corpusBrainAblation(SEED, 3);
  const wiredSlugs = new Set(report.ablations.map((a) => a.slug));

  test('no fenced (non-LLM mandate) repo appears in the brain intake', () => {
    for (const fenced of FENCED_REPO_SLUGS) expect(wiredSlugs.has(fenced)).toBe(false);
  });

  test('org-meta (.github) never feeds a brain', () => {
    expect(wiredSlugs.has('.github')).toBe(false);
  });

  test('the exported substrate primitive itself returns exact zero for every excluded row', () => {
    for (const slug of [...FENCED_REPO_SLUGS, '.github'] as const) {
      const repo = getTsotchkeRepo(slug);
      expect(repo).toBeDefined();
      expect(substrateScalar(repo!, SEED, 3, 0)).toBe(0);
    }
  });
});
