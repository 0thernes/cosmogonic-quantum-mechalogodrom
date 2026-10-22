import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import {
  PROFILE_FILES,
  loadCapabilityProfile,
  renderCapabilityHtml,
  renderCapabilityMarkdown,
  renderCapabilitySvg,
  validateCapabilityProfile,
} from '../scripts/gen-capability-profile';

const ROOT = `${import.meta.dir}/..`;
const profile = loadCapabilityProfile(ROOT);

describe('CQM-25 publishes a source-grounded profile without invented scores', () => {
  test('all 25 distinct constructs retain uncalibrated scores and separate engineering context', () => {
    expect(profile.axes).toHaveLength(25);
    expect(new Set(profile.axes.map((a) => a.id)).size).toBe(25);
    for (const axis of profile.axes) expect(axis.assessment.score).toBeNull();
    for (const id of [
      'visual_embodied_scale',
      'substrate_pluralism',
      'instrumentation_reproducibility',
      'embodied_dynamics',
    ]) {
      expect(profile.axes.find((a) => a.id === id)?.kind).toBe('engineering');
    }
    expect(profile.axes.find((a) => a.id === 'visual_embodied_scale')?.scope).toContain('entity');
  });

  test('invalid provenance, unknown states, duplicate axes and premature scores fail closed', () => {
    const cases = [
      (p: typeof profile) => {
        p.axes.pop();
      },
      (p: typeof profile) => {
        p.axes[1]!.id = p.axes[0]!.id;
      },
      (p: typeof profile) => {
        p.axes[0]!.sourceIds = ['missing-source'];
      },
      (p: typeof profile) => {
        p.sources[0]!.url = 'javascript:alert(1)';
      },
      (p: typeof profile) => {
        p.axes[0]!.assessment.evidence[0]!.path = 'docs/../../private';
      },
      (p: typeof profile) => {
        Object.assign(p.axes[0]!.assessment, { score: 5 });
      },
      (p: typeof profile) => {
        Object.assign(p.axes[0]!.assessment, { status: 'proven-conscious' });
      },
      (p: typeof profile) => {
        p.sourceCommit = 'main';
      },
    ];
    for (const mutate of cases) {
      const candidate = structuredClone(profile);
      mutate(candidate);
      expect(() => validateCapabilityProfile(candidate)).toThrow();
    }
  });

  test('every reviewed implementation claim has existing evidence and a concrete falsifier', () => {
    const sources = new Set(profile.sources.map((s) => s.id));
    for (const axis of profile.axes) {
      expect(axis.falsifier.length).toBeGreaterThan(30);
      expect(axis.protocol.length).toBeGreaterThan(40);
      expect(axis.measures.length).toBeGreaterThan(0);
      for (const id of axis.sourceIds) expect(sources.has(id), axis.id).toBe(true);
      for (const evidence of axis.assessment.evidence)
        expect(existsSync(`${ROOT}/${evidence.path}`), evidence.path).toBe(true);
    }
  });

  test('generated HTML, Markdown and SVG match the single reviewed input exactly', () => {
    expect(readFileSync(`${ROOT}/${PROFILE_FILES.html}`, 'utf8')).toBe(
      renderCapabilityHtml(profile),
    );
    expect(readFileSync(`${ROOT}/${PROFILE_FILES.markdown}`, 'utf8')).toBe(
      renderCapabilityMarkdown(profile),
    );
    expect(readFileSync(`${ROOT}/${PROFILE_FILES.svg}`, 'utf8')).toBe(renderCapabilitySvg(profile));
  });

  test('all axes and protocols remain available without JavaScript or a numeric total', () => {
    const html = renderCapabilityHtml(profile);
    expect(html.match(/<article class="axis"/g)).toHaveLength(25);
    expect(html.match(/<h3>Acceptance experiment<\/h3>/g)).toHaveLength(25);
    expect(html).toContain('No aggregate verdict is calculated.');
    expect(html).toContain('No matching axes.');
    expect(html).toContain('aria-live="polite"');
    for (const source of profile.sources) expect(html).toContain(`id="source-${source.id}"`);
  });

  test('source text is escaped in HTML and SVG, including attributes and hostile names', () => {
    const candidate = structuredClone(profile);
    candidate.axes[0]!.name = '<img src=x onerror="boom">';
    candidate.axes[0]!.domain = 'Life" onmouseover="boom';
    candidate.sources[0]!.note = '<script>boom</script>';
    for (const output of [renderCapabilityHtml(candidate), renderCapabilitySvg(candidate)]) {
      expect(output).not.toContain('<img src=x');
      expect(output).not.toContain('<script>boom');
      expect(output).toContain('&lt;img');
    }
    expect(renderCapabilityHtml(candidate)).toContain('Life&quot; onmouseover=&quot;boom');
  });

  test('finite negative results and the unchanged visual rating remain explicit', () => {
    expect(profile.legacyVisualReview).toContain('4.0');
    expect(profile.legacyVisualReview).toContain('single');
    expect(profile.axes.find((a) => a.id === 'transfer_generalization')?.assessment.status).toBe(
      'mixed',
    );
    expect(profile.axes.find((a) => a.id === 'valence_tradeoffs')?.assessment.summary).toMatch(
      /not|unestablished|unknown/i,
    );
    expect(renderCapabilityMarkdown(profile)).toContain('not a consensus gold standard');
  });
});
