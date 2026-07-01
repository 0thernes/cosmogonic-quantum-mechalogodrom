/**
 * APEX RARITY MATRIX tests — the machine-checked form of the doctrine's "1-of-1 by combination"
 * claim (Wave E). These assert:
 *   • the signature is exactly the eight doctrine axes;
 *   • APEX satisfies ALL eight, no baseline satisfies all eight, so the conjunction is rare;
 *   • the closest prior challenger overlaps on only a couple of axes (rare by combination);
 *   • every axis maps to VALID axis keys and every one of the eleven organs backs ≥1 axis
 *     (the rarity claim is tied to the ablation-proven organs, not to prose);
 *   • the report is deterministic.
 * This is a DESIGN-COMPARISON claim (doctrine Level 3), never a capability/sentience claim.
 */
import { describe, expect, test } from 'bun:test';
import {
  RARITY_AXES,
  APEX_AXES,
  BASELINES,
  rarityReport,
  type RarityAxis,
} from '../src/sim/apex-rarity';
import { APEX_ORGAN_KEYS } from '../src/sim/apex-brain';

const AXIS_SET = new Set<RarityAxis>(RARITY_AXES);

describe('the eight-axis signature', () => {
  test('there are exactly eight distinct axes', () => {
    expect(RARITY_AXES.length).toBe(8);
    expect(new Set(RARITY_AXES).size).toBe(8);
  });

  test('APEX_AXES covers every axis exactly once', () => {
    const covered = APEX_AXES.map((a) => a.axis);
    expect(new Set(covered).size).toBe(8);
    for (const ax of RARITY_AXES) expect(covered).toContain(ax);
  });
});

describe('one-of-one by combination', () => {
  const report = rarityReport();

  test('APEX satisfies all eight axes', () => {
    expect(report.apexAxisCount).toBe(8);
    expect(report.axisCount).toBe(8);
  });

  test('no prior baseline satisfies all eight — the conjunction is rare', () => {
    expect(report.oneOfOneByCombination).toBe(true);
    for (const b of report.baselines) expect(b.overlap).toBeLessThan(8);
  });

  test('the closest challenger overlaps on only a couple of axes (rare by combination)', () => {
    // Honest headroom: no prior system realises more than a small handful of the eight axes.
    expect(report.maxBaselineOverlap).toBeGreaterThan(0); // baselines are strong SOMEWHERE (not strawmen)
    expect(report.maxBaselineOverlap).toBeLessThanOrEqual(3);
  });

  test('every baseline only claims valid axis names', () => {
    for (const b of BASELINES) for (const ax of b.satisfies) expect(AXIS_SET.has(ax)).toBe(true);
  });
});

describe('rarity is grounded in the ablation-proven organs', () => {
  test('every one of the eleven organs backs at least one axis (completeness)', () => {
    const report = rarityReport();
    expect(report.organsWithoutAxis).toEqual([]);
  });

  test('every organ named by an axis is a real APEX organ', () => {
    const organSet = new Set<string>(APEX_ORGAN_KEYS);
    for (const a of APEX_AXES) for (const o of a.organs) expect(organSet.has(o)).toBe(true);
  });
});

describe('report integrity', () => {
  test('the report is deterministic', () => {
    expect(JSON.stringify(rarityReport())).toBe(JSON.stringify(rarityReport()));
  });
});
