import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import {
  PROFILE_FILES,
  loadCapabilityProfile,
  loadCapabilityEstimates,
  validateCapabilityEstimates,
  renderCapabilityHtml,
  renderCapabilityMarkdown,
  renderCapabilitySvg,
  validateCapabilityProfile,
} from '../scripts/gen-capability-profile';

const ROOT = `${import.meta.dir}/..`;
const profile = loadCapabilityProfile(ROOT);
const estimates = loadCapabilityEstimates(ROOT);

describe('CQM-25 publishes the canonical project standard without invented scores', () => {
  test('canonical adoption preserves the earlier evidence review and its provenance', () => {
    expect(profile.frameworkId).toBe('CQM-25');
    expect(profile.frameworkVersion).toBe('1.0.0');
    expect(profile.authority).toBe('project');
    expect(profile.status).toBe('canonical');
    expect(profile.adoptedAt).toBe('2026-10-22');
    expect(profile.reviewedAt).toBe('2026-10-21');
    expect(profile.sourceCommit).toBe('339c6daa8cdcaf27e4e6dcce3b93bdba39980bf9');
    expect(
      profile.axes.reduce<Record<string, number>>((counts, axis) => {
        counts[axis.assessment.status] = (counts[axis.assessment.status] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({ 'bounded-test': 11, mixed: 9, implemented: 4, unassessed: 1 });
  });

  test('missing or reassigned authority, version and adoption metadata fail closed', () => {
    for (const [key, invalid] of [
      ['frameworkId', 'OTHER-25'],
      ['frameworkVersion', '2.0.0'],
      ['authority', 'global-consensus'],
      ['status', 'proposed'],
      ['adoptedAt', '2026-02-30'],
    ] as const) {
      for (const value of [undefined, '', invalid]) {
        const candidate = structuredClone(profile);
        Object.assign(candidate, { [key]: value });
        expect(() => validateCapabilityProfile(candidate)).toThrow('canonical metadata');
      }
    }
    const candidate = structuredClone(profile);
    candidate.reviewedAt = '2026-02-30';
    expect(() => validateCapabilityProfile(candidate)).toThrow('valid ISO calendar date');
  });

  test('25 arbitrary axes cannot replace or reclassify the adopted taxonomy', () => {
    const mutations = [
      (p: typeof profile) => {
        p.axes[0]!.id = 'substitute_construct';
      },
      (p: typeof profile) => {
        p.axes[0]!.domain = 'Engineering and observation context';
      },
      (p: typeof profile) => {
        p.axes.find((axis) => axis.id === 'visual_embodied_scale')!.kind = 'theory-linked';
      },
      (p: typeof profile) => {
        p.axes.find((axis) => axis.id === 'recurrent_processing')!.kind = 'engineering';
      },
      (p: typeof profile) => {
        p.axes[0]!.scope = ['entity'];
      },
      (p: typeof profile) => {
        p.axes[0]!.scope = ['entity', 'entity'];
      },
      (p: typeof profile) => {
        p.axes[1]!.scope = ['population', 'world'];
      },
    ];
    for (const mutate of mutations) {
      const candidate = structuredClone(profile);
      mutate(candidate);
      expect(candidate.axes).toHaveLength(25);
      expect(() => validateCapabilityProfile(candidate)).toThrow(/canonical/i);
    }
  });

  test('all publication formats distinguish project authority from unexecuted experiments', () => {
    for (const output of [
      renderCapabilityHtml(profile, estimates),
      renderCapabilityMarkdown(profile, estimates),
      renderCapabilitySvg(profile),
    ]) {
      expect(output).toMatch(/canonical project standard/i);
      expect(output).toContain('1.0.0');
      expect(output).toContain('2026-10-22');
      expect(output).toContain('2026-10-21');
      expect(output).toMatch(/proposed/i);
      expect(output).toMatch(/unexecuted/i);
      expect(output).not.toContain('· proposed framework</p>');
      expect(output).not.toContain('Proposed operational framework');
    }
    const html = renderCapabilityHtml(profile, estimates);
    expect(html).toContain('<summary>Historical nine-axis comparison and visual review</summary>');
    expect(html).toContain('Feature plans and capability claims');
    for (const axis of profile.axes) expect(html).toContain('id="axis-' + axis.id + '"');
  });

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

  test('generated artifacts match the separate canonical and provisional inputs exactly', () => {
    expect(readFileSync(`${ROOT}/${PROFILE_FILES.html}`, 'utf8')).toBe(
      renderCapabilityHtml(profile, estimates),
    );
    expect(readFileSync(`${ROOT}/${PROFILE_FILES.markdown}`, 'utf8')).toBe(
      renderCapabilityMarkdown(profile, estimates),
    );
    expect(readFileSync(`${ROOT}/${PROFILE_FILES.svg}`, 'utf8')).toBe(renderCapabilitySvg(profile));
  });

  test('all axes and protocols remain available without JavaScript or a numeric total', () => {
    const html = renderCapabilityHtml(profile, estimates);
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
    candidate.sources[0]!.url = 'https://example.test/?q=" onmouseover="boom';
    candidate.sources[0]!.note = '<script>boom</script>';
    for (const output of [
      renderCapabilityHtml(candidate, estimates),
      renderCapabilitySvg(candidate),
    ]) {
      expect(output).not.toContain('<img src=x');
      expect(output).not.toContain('<script>boom');
      expect(output).toContain('&lt;img');
    }
    expect(renderCapabilityHtml(candidate, estimates)).toContain(
      'href="https://example.test/?q=&quot; onmouseover=&quot;boom"',
    );
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
    expect(renderCapabilityMarkdown(profile, estimates)).toContain('not a consensus gold standard');
  });
});

describe('CQM-25 separates provisional author estimates from canonical evidence', () => {
  test('all incoming values remain separate and preserve their provisional provenance', () => {
    expect(estimates.classification).toBe('provisional-author-estimates');
    expect(estimates.calibrationStatus).toBe('uncalibrated');
    expect(estimates.recordedAt).toBe('2026-10-22');
    expect(estimates.basedOnEvidenceCommit).toBe(profile.sourceCommit);
    expect(estimates.rationaleStatus).toBe('imported-pending-review');
    expect(estimates.measurementStatus).toBe('not-protocol-results');
    expect(estimates.estimates.map((item) => [item.axisId, item.value])).toEqual([
      ['reproduction_heredity', 4],
      ['evolutionary_innovation', 2],
      ['environmental_coupling', 3.4],
      ['morphology_development', 3.8],
      ['embodied_dynamics', 3.9],
      ['perception', 3.8],
      ['learning', 4.5],
      ['memory', 3.7],
      ['predictive_causal_models', 2.6],
      ['autonomous_goals', 4],
      ['reasoning_planning', 3.5],
      ['transfer_generalization', 2.2],
      ['metacognition_self_model', 3.7],
      ['social_communication', 3.5],
      ['individuality', 3.8],
      ['resource_maintenance', 3.4],
      ['homeostasis', 3.6],
      ['repair_resilience', 1.8],
      ['recurrent_processing', 3.6],
      ['global_availability', 3.6],
      ['causal_integration', 3.3],
      ['valence_tradeoffs', 3.1],
      ['substrate_pluralism', 4.6],
      ['instrumentation_reproducibility', 4.4],
      ['visual_embodied_scale', 4.2],
    ]);
    expect(estimates.estimates[0]!.rationale).toContain('GATE-REPRO-SELECT');
    expect(estimates.rubric.anchors.map((a) => a.value)).toEqual([0, 1, 2, 3, 4, 5]);
    for (const axis of profile.axes) expect(axis.assessment.score).toBeNull();
  });

  test('incomplete, non-finite, unsupported or falsely validated estimates fail closed', () => {
    const mutations = [
      (e: typeof estimates) => {
        e.estimates.pop();
      },
      (e: typeof estimates) => {
        e.estimates[0]!.axisId = 'replacement_axis';
      },
      (e: typeof estimates) => {
        e.estimates[0]!.axisId = e.estimates[1]!.axisId;
      },
      ...[-1, 5.1, NaN, Infinity, -Infinity].map((value) => (e: typeof estimates) => {
        e.estimates[0]!.value = value;
      }),
      (e: typeof estimates) => {
        Object.assign(e.estimates[0]!, { value: '4.0' });
      },
      (e: typeof estimates) => {
        e.estimates[0]!.rationale = ' ';
      },
      (e: typeof estimates) => {
        Object.assign(e, { classification: 'measured-capabilities' });
      },
      (e: typeof estimates) => {
        Object.assign(e, { calibrationStatus: 'validated' });
      },
      (e: typeof estimates) => {
        Object.assign(e, { rationaleStatus: 'reviewed' });
      },
      (e: typeof estimates) => {
        Object.assign(e, { measurementStatus: 'protocol-results' });
      },
      (e: typeof estimates) => {
        Object.assign(e, { aggregation: 'mean' });
      },
      (e: typeof estimates) => {
        Object.assign(e, { frameworkVersion: '2.0.0' });
      },
      (e: typeof estimates) => {
        Object.assign(e, { recordedAt: '2026-02-30' });
      },
      (e: typeof estimates) => {
        e.basedOnEvidenceCommit = 'main';
      },
      (e: typeof estimates) => {
        e.rubric.anchors.pop();
      },
      (e: typeof estimates) => {
        e.rubric.anchors[0]!.value = 1;
      },
      (e: typeof estimates) => {
        e.rubric.anchors[0]!.definition = '';
      },
      (e: typeof estimates) => {
        Object.assign(e.rubric, { interpretation: 'consciousness-probability' });
      },
      (e: typeof estimates) => {
        Object.assign(e, { meanScore: 3.52 });
      },
    ];
    for (const mutate of mutations) {
      const candidate = structuredClone(estimates);
      mutate(candidate);
      expect(() => validateCapabilityEstimates(candidate)).toThrow();
    }
    const wrongReference = structuredClone(estimates);
    wrongReference.basedOnEvidenceCommit = 'a'.repeat(40);
    expect(() => renderCapabilityHtml(profile, wrongReference)).toThrow('provenance');
    expect(() => renderCapabilityMarkdown(profile, wrongReference)).toThrow('provenance');
  });

  test('canonical schema rejects score rationales, projection fields and aggregate contamination', () => {
    const mutations = [
      (p: typeof profile) => {
        Object.assign(p, { meanScore: 3.52 });
      },
      (p: typeof profile) => {
        Object.assign(p, { domainSummaries: [] });
      },
      (p: typeof profile) => {
        Object.assign(p.axes[0]!, { legacyAxis: 'Reproduction' });
      },
      (p: typeof profile) => {
        Object.assign(p.axes[0]!, { indicatorOnly: false });
      },
      (p: typeof profile) => {
        Object.assign(p.axes[0]!.assessment, { scoreBasis: 'proposed' });
      },
    ];
    for (const mutate of mutations) {
      const candidate = structuredClone(profile);
      mutate(candidate);
      expect(() => validateCapabilityProfile(candidate)).toThrow('unsupported field');
    }
  });

  test('all author estimates and rubric remain accessible with explicit limits and no published means', () => {
    const html = renderCapabilityHtml(profile, estimates);
    const markdown = renderCapabilityMarkdown(profile, estimates);
    expect(html.match(/data-estimate-axis="/g)).toHaveLength(25);
    expect(html).toContain('id="estimate-rubric"');
    for (const output of [html, markdown]) {
      expect(output).toContain('Provisional author estimates');
      expect(output).toContain('not measured protocol results');
      expect(output).toContain('cqm-capability-estimates.json');
      expect(output).toContain('No aggregate or domain mean is published.');
      expect(output).not.toContain('meanScore');
      expect(output).not.toContain('domainSummaries');
      for (const estimate of estimates.estimates) {
        expect(output).toContain(estimate.axisId);
        expect(output).toContain(estimate.value.toFixed(1));
      }
      for (const anchor of estimates.rubric.anchors) expect(output).toContain(anchor.label);
    }
    expect(renderCapabilitySvg(profile)).not.toContain('Provisional author estimates');
    expect(profile.legacyVisualReview).toContain('4.0');
    expect(estimates.estimates.find((e) => e.axisId === 'visual_embodied_scale')!.value).toBe(4.2);
  });

  test('imported rationale text cannot inject HTML or break the Markdown estimate table', () => {
    const candidate = structuredClone(estimates);
    candidate.estimates[0]!.rationale = '<script>bad()</script> | unexpected\nrow';
    const html = renderCapabilityHtml(profile, candidate);
    expect(html).not.toContain('<script>bad()');
    expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;');
    expect(renderCapabilityMarkdown(profile, candidate)).toContain('\\| unexpected row');
  });
});
