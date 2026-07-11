/**
 * GATE-OE-LIVE — bounded active novelty from the digital-biologics BIRTH engine, measured by the
 * canonical Bedau-Packard-inspired verdict (`open-endedness.ts`) on the cumulative distinct-form
 * trajectory produced by the real `birthBiologic` leaf. The generator deterministically explores its
 * finite 26-form catalog and then plateaus, while a frozen monoculture is `inactive`. Together with the
 * separately tested live selection loops, this measured separation supports the cautious 2.4 axis
 * floor; it does not demonstrate unbounded open-ended evolution.
 */
import { describe, expect, test } from 'bun:test';
import { BIOLOGIC_FORMS, birthBiologic } from '../src/sim/digital-biologics';
import { openEndednessVerdict } from '../src/sim/open-endedness';

/** Snapshot the cumulative count of distinct forms visited within the fixed catalog. */
function birthDistinctFormsTrajectory(beats: number): { snapshots: number[]; distinct: number } {
  const seen = new Set<string>();
  const snapshots: number[] = [];
  for (let beat = 0; beat < beats; beat++) {
    seen.add(birthBiologic(beat % 10, beat).form);
    snapshots.push(seen.size);
  }
  return { snapshots, distinct: seen.size };
}

describe('GATE-OE-LIVE: finite active novelty separates from a frozen stream', () => {
  const live = birthDistinctFormsTrajectory(160);

  test('the birth engine visits the finite catalog, then plateaus — not unbounded evolution', () => {
    expect(live.distinct).toBe(BIOLOGIC_FORMS.length);
    expect(new Set(live.snapshots.slice(-20))).toEqual(new Set([BIOLOGIC_FORMS.length]));
    expect(openEndednessVerdict(live.snapshots).verdict).not.toBe('inactive');
  });

  test('a frozen / monoculture trajectory (no new forms) IS inactive — the measured separation', () => {
    const frozen = Array.from({ length: 160 }, () => 1); // cumulative distinct forms never grows
    expect(openEndednessVerdict(frozen).verdict).toBe('inactive');
  });

  test('deterministic: the pure birth engine reproduces its trajectory + verdict exactly', () => {
    const a = birthDistinctFormsTrajectory(160);
    expect(a.snapshots).toEqual(live.snapshots);
    expect(openEndednessVerdict(a.snapshots).verdict).toBe(
      openEndednessVerdict(live.snapshots).verdict,
    );
  });
});
