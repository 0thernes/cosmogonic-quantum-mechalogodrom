/**
 * CQM-25 is the capability law (ADR 0018). These gates keep it law rather than prose: the clause
 * stays in the steering files and the module contract, the profile stays canonical, the crosswalk
 * stays aligned with the legacy survey's nine axes (and with the "19 of the 25" the public surfaces
 * state), and the capability gallery leads with CQM-25 while the survey radar names its constructs.
 */
import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { AXES } from '../scripts/alife-comparison-stats';
import {
  LEGACY_SURVEY_AXES,
  axisNumbers,
  legacyAxisOf,
  loadCapabilityProfile,
  validateCapabilityProfile,
} from '../scripts/gen-capability-profile';
import { ALIFE_METRICS } from '../src/alife-metrics-gallery';

const ROOT = `${import.meta.dir}/..`;
const read = (path: string): string => readFileSync(`${ROOT}/${path}`, 'utf8');
const profile = loadCapabilityProfile(ROOT);
const ADR = 'docs/adr/0018-cqm-25-capability-law-2026-10-22.md';

describe('CQM-25 capability law', () => {
  test('the steering files, contract and decision record carry the law', () => {
    for (const steering of ['CLAUDE.md', 'AGENTS.md']) {
      const text = read(steering);
      expect(text, steering).toContain('**CQM-25 capability law (binding');
      expect(text, steering).toContain(ADR);
      expect(text, steering).toContain('never a score source');
    }
    expect(read('docs/MODULE-CONTRACTS-2026-06-26.md')).toContain(
      '## CQM-25 capability law (canonical framework)',
    );
    expect(existsSync(`${ROOT}/${ADR}`)).toBe(true);
    expect(read(ADR)).toContain('Status: accepted');
  });

  test('the profile is canonical and its rules forbid score transfer and aggregate verdicts', () => {
    expect(profile.governance.status).toBe('canonical');
    expect(profile.governance.decision).toBe(ADR);
    const rules = profile.governance.rules.join(' ');
    expect(rules).toContain('never supplies or receives CQM-25 scores');
    expect(rules).toContain(
      'No aggregate life, consciousness, sentience, AGI or superintelligence',
    );
    expect(rules).toContain('Numeric capability scores stay null');
    for (const axis of profile.axes) expect(axis.assessment.score).toBeNull();
  });

  test('the crosswalk follows the survey axes and maps each construct at most once', () => {
    expect([...LEGACY_SURVEY_AXES]).toEqual([...AXES]);
    expect(profile.legacyCrosswalk.map((c) => c.legacyAxis)).toEqual([...AXES]);
    const mapped = profile.legacyCrosswalk.flatMap((c) => c.axisIds);
    expect(new Set(mapped).size).toBe(mapped.length);
    expect(mapped).toHaveLength(19);
    // The gap the legacy survey never measured stays named, not silently absorbed.
    expect(
      profile.axes.filter((a) => legacyAxisOf(profile, a.id) === null).map((a) => a.id),
    ).toEqual([
      'social_communication',
      'individuality',
      'resource_maintenance',
      'homeostasis',
      'repair_resilience',
      'valence_tradeoffs',
    ]);
  });

  test('public surfaces state the crosswalk coverage the data computes', () => {
    const mapped = profile.legacyCrosswalk.flatMap((c) => c.axisIds).length;
    for (const surface of [
      'README.md',
      'docs.html',
      'specs.html',
      'docs/VERIFICATION-ANALYTICAL-DATA.md',
      'src/ui/help-knowledge.ts',
    ]) {
      expect(read(surface).replace(/\s+/g, ' '), surface).toContain(`${mapped} of the 25`);
    }
  });

  test('the gallery leads with CQM-25 and the survey radar names the constructs of each spoke', () => {
    expect(ALIFE_METRICS[0]?.id).toBe('capability-25');
    expect(ALIFE_METRICS[1]?.id).toBe('radar');
    const radar = read('docs/reports/assets/alife-radar-profile.svg');
    expect(radar).toContain('Nine-axis survey view');
    expect(radar).toContain('not CQM-25 ratings');
    for (const entry of profile.legacyCrosswalk)
      expect(radar).toContain(`>CQM-25 ${axisNumbers(profile, entry.axisIds)}<`);
    for (const page of ['docs.html', 'specs.html'])
      expect(read(page), page).toContain('Nine-axis survey view');
  });

  test('a profile that weakens the law fails validation', () => {
    const cases = [
      (p: typeof profile) => {
        (p.governance as { status: string }).status = 'proposed';
      },
      (p: typeof profile) => {
        p.governance.decision = 'docs/notes.md';
      },
      (p: typeof profile) => {
        p.governance.rules = [];
      },
      (p: typeof profile) => {
        p.legacyCrosswalk.reverse();
      },
      (p: typeof profile) => {
        p.legacyCrosswalk.pop();
      },
      (p: typeof profile) => {
        p.legacyCrosswalk[1]!.axisIds.push(p.legacyCrosswalk[0]!.axisIds[0]!);
      },
      (p: typeof profile) => {
        p.legacyCrosswalk[0]!.axisIds = ['not_an_axis'];
      },
    ];
    for (const mutate of cases) {
      const candidate = structuredClone(profile);
      mutate(candidate);
      expect(() => validateCapabilityProfile(candidate)).toThrow();
    }
  });

  test('axis numbers compress runs for display', () => {
    const ids = (nums: number[]): string[] => nums.map((n) => profile.axes[n - 1]!.id);
    expect(axisNumbers(profile, ids([1]))).toBe('01');
    expect(axisNumbers(profile, ids([6, 7, 8, 9, 10, 11, 12]))).toBe('06–12');
    expect(axisNumbers(profile, ids([21, 13, 19, 20]))).toBe('13, 19–21');
  });
});
