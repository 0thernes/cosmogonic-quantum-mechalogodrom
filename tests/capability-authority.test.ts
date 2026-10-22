import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { ALIFE_METRICS } from '../src/alife-metrics-gallery';

const ROOT = `${import.meta.dir}/..`;
const read = (file: string): string => readFileSync(`${ROOT}/${file}`, 'utf8');
const canonicalAsset = 'alife-capability-profile-25.svg';
const historicalAsset = 'alife-radar-profile.svg';

function historicalDisclosure(text: string): { start: number; body: string } {
  const matches = [
    ...text.matchAll(
      /<details\b[^>]*\bdata-legacy-comparison(?:="[^"]*")?[^>]*>[\s\S]*?<\/details>/g,
    ),
  ];
  expect(matches).toHaveLength(1);
  const match = matches[0]!;
  expect(match[0].match(/^<details\b[^>]*>/)?.[0]).not.toMatch(/\bopen(?:\s|=|>)/);
  expect(match[0]).toMatch(/<summary[\s\S]*?historical[\s\S]*?<\/summary>/i);
  return { start: match.index!, body: match[0] };
}

describe('CQM-25 is the canonical project capability publication', () => {
  test('the default gallery selection is CQM-25 and the historical radar remains identifiable', () => {
    expect(ALIFE_METRICS[0]?.id).toBe('capability-25');
    expect(ALIFE_METRICS[0]?.file).toBe(canonicalAsset);
    expect(ALIFE_METRICS[0]?.label).toMatch(/25/);
    expect(ALIFE_METRICS.filter((metric) => metric.file === canonicalAsset)).toHaveLength(1);
    const oldProfile = ALIFE_METRICS.find((metric) => metric.file === historicalAsset);
    expect(oldProfile).toBeDefined();
    expect(oldProfile!.context).toBe('historical');
    expect(oldProfile!.alt).toMatch(/historical/i);
  });

  test.each(['docs.html', 'specs.html'])(
    '%s leads with the canonical profile and discloses historical scores separately',
    (file) => {
      const html = read(file);
      const section = html.match(
        /<section\b[^>]*\bid="capability-profile"[^>]*>[\s\S]*?<\/section>/,
      );
      expect(section).not.toBeNull();
      expect(section![0]).toMatch(/canonical/i);
      expect(section![0]).toContain(canonicalAsset);
      expect(section![0]).toContain('docs/alife/cqm-capability-profile.html');
      expect(section![0]).not.toContain('Nine-axis capability radar');
      const historical = historicalDisclosure(html);
      expect(section!.index!).toBeLessThan(historical.start);
      expect(historical.body).toContain('Nine-axis capability radar');
      expect([...html.matchAll(/aria-label="Nine-axis capability radar[^"]*"/g)]).toHaveLength(1);
    },
  );

  test('README presents the canonical image before the historical disclosure', () => {
    const readme = read('README.md');
    const canonicalImage = readme.indexOf(`](./docs/reports/assets/${canonicalAsset})`);
    expect(canonicalImage).toBeGreaterThan(-1);
    const historical = historicalDisclosure(readme);
    expect(canonicalImage).toBeLessThan(historical.start);
    expect(historical.body).toContain(historicalAsset);
    expect(readme.slice(0, historical.start)).not.toContain(
      `](./docs/reports/assets/${historicalAsset})`,
    );
  });

  test('all governing documents identify the same binding capability source', () => {
    const steering = ['AGENTS.md', 'CLAUDE.md', 'docs/MODULE-CONTRACTS-2026-06-26.md'];
    const masters = readdirSync(`${ROOT}/masters`).filter((file) => file.endsWith('.xml'));
    expect(masters).toHaveLength(3);
    for (const file of [...steering, ...masters.map((name) => `masters/${name}`)]) {
      const text = read(file);
      expect(text).toContain('docs/alife/cqm-capability-profile.json');
      expect(text).toMatch(/CQM-25/);
      expect(text).toMatch(/binding/i);
    }
    for (const file of masters) {
      expect(read(`masters/${file}`)).toContain(
        '<capability-standard id="cqm-25" version="1.0.0" adopted="2026-10-22">',
      );
    }
  });
});
