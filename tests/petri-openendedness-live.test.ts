/**
 * GATE-OE-LIVE — the digital-biologics BIRTH engine's open-endedness, measured by the canonical
 * Bedau-Packard verdict (open-endedness.ts) on the CUMULATIVE distinct-forms trajectory produced by the
 * real `birthBiologic` leaf (the layer's actual form-generation mechanism, keyed off the Tsotchke depth
 * ledger by beat + archon). Honest claim: the birth stream keeps minting new biologic forms (verdict NOT
 * 'inactive'), while a frozen / monoculture trajectory IS 'inactive' — a measured separation, not a
 * synthetic series. Together with the two live selection loops (soup harvest + petri truncation) this is
 * the evidence for the Open-endedness axis floor. Deterministic (birthBiologic is pure in beat/archon).
 */
import { describe, expect, test } from 'bun:test';
import { birthBiologic } from '../src/sim/digital-biologics';
import { openEndednessVerdict } from '../src/sim/open-endedness';

/** Snapshot the cumulative count of DISTINCT biologic forms the birth engine discovers over `beats`. */
function birthDistinctFormsTrajectory(beats: number): { snapshots: number[]; distinct: number } {
  const seen = new Set<string>();
  const snapshots: number[] = [];
  for (let beat = 0; beat < beats; beat++) {
    seen.add(birthBiologic(beat % 10, beat).form);
    snapshots.push(seen.size);
  }
  return { snapshots, distinct: seen.size };
}

describe('GATE-OE-LIVE: the digital-biologics birth engine is open-ended; a frozen stream is not', () => {
  const live = birthDistinctFormsTrajectory(160);

  test('the birth engine keeps minting new forms → verdict is NOT inactive', () => {
    expect(live.distinct).toBeGreaterThan(1); // multiple distinct forms genuinely emerged
    expect(openEndednessVerdict(live.snapshots).verdict).not.toBe('inactive');
  });

  test('a frozen / monoculture trajectory (no new forms) IS inactive — the measured separation', () => {
    const frozen = new Array(160).fill(1); // cumulative distinct forms never grows
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
