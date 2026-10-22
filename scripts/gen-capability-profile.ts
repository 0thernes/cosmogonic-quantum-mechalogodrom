/** Deterministic publication of the canonical CQM-25 project standard; no simulation writes. */
import { readFileSync, writeFileSync } from 'node:fs';

/** The reviewed input and its three derived reader surfaces. */
export const PROFILE_FILES = {
  data: 'docs/alife/cqm-capability-profile.json',
  estimates: 'docs/alife/cqm-capability-estimates.json',
  html: 'docs/alife/cqm-capability-profile.html',
  markdown: 'docs/alife/cqm-capability-profile.md',
  svg: 'docs/reports/assets/alife-capability-profile-25.svg',
} as const;

/** Evidence labels are categorical review states, not a capability or consciousness scale. */
export type ReviewState = 'implemented' | 'bounded-test' | 'mixed' | 'unassessed';
/** A primary reference informing the construct, not an endorsement of this benchmark. */
export interface ProfileSource {
  id: string;
  title: string;
  url: string;
  kind: string;
  note: string;
}
/** One operational construct with an explicit scope, falsifier and repository evidence trail. */
export interface ProfileAxis {
  id: string;
  name: string;
  domain: string;
  kind: 'life' | 'cognition' | 'theory-linked' | 'engineering';
  definition: string;
  scope: ('entity' | 'population' | 'world')[];
  measures: string[];
  protocol: string;
  falsifier: string;
  sourceIds: string[];
  assessment: {
    status: ReviewState;
    summary: string;
    score: null;
    evidence: { path: string; label: string }[];
  };
}
/** Canonical project standard; adoption authority is separate from scientific validation. */
export interface CapabilityProfile {
  schemaVersion: 1;
  frameworkId: 'CQM-25';
  frameworkVersion: '1.0.0';
  authority: 'project';
  status: 'canonical';
  adoptedAt: '2026-10-22';
  title: string;
  reviewedAt: string;
  sourceCommit: string;
  scope: string;
  limitations: string[];
  evaluationProtocol: string[];
  legacyVisualReview: string;
  sources: ProfileSource[];
  axes: ProfileAxis[];
}

/** Separate, uncalibrated author judgments; no scientific acceptance result is inferred. */
export interface CapabilityEstimates {
  schemaVersion: 1;
  frameworkId: 'CQM-25';
  frameworkVersion: '1.0.0';
  classification: 'provisional-author-estimates';
  calibrationStatus: 'uncalibrated';
  recordedAt: '2026-10-22';
  basedOnEvidenceCommit: string;
  rationaleStatus: 'imported-pending-review';
  measurementStatus: 'not-protocol-results';
  aggregation: 'prohibited';
  rubric: {
    id: 'cqm25-author-heuristic-v1';
    interpretation: 'ordinal-implementation-judgment';
    assignmentStatus: 'imported-not-recalibrated';
    scaleMin: 0;
    scaleMax: 5;
    description: string;
    assignmentNote: string;
    anchors: { value: number; label: string; definition: string }[];
  };
  limitations: string[];
  estimates: { axisId: string; value: number; rationale: string }[];
}

/** Versioned project contract; adoption does not certify scientific capability. */
const CANONICAL_METADATA = {
  frameworkId: 'CQM-25',
  frameworkVersion: '1.0.0',
  authority: 'project',
  status: 'canonical',
  adoptedAt: '2026-10-22',
} as const;

/** Stable construct identities; edits require framework-version and contract review. */
const CANONICAL_TAXONOMY: Readonly<Record<string, Pick<ProfileAxis, 'domain' | 'kind' | 'scope'>>> =
  {
    reproduction_heredity: {
      domain: 'Life, evolution and embodiment',
      kind: 'life',
      scope: ['entity', 'population'],
    },
    evolutionary_innovation: {
      domain: 'Life, evolution and embodiment',
      kind: 'life',
      scope: ['population'],
    },
    environmental_coupling: {
      domain: 'Life, evolution and embodiment',
      kind: 'life',
      scope: ['entity', 'population', 'world'],
    },
    morphology_development: {
      domain: 'Life, evolution and embodiment',
      kind: 'life',
      scope: ['entity'],
    },
    embodied_dynamics: {
      domain: 'Life, evolution and embodiment',
      kind: 'engineering',
      scope: ['entity', 'world'],
    },
    perception: {
      domain: 'Adaptive and general cognition',
      kind: 'cognition',
      scope: ['entity'],
    },
    learning: {
      domain: 'Adaptive and general cognition',
      kind: 'cognition',
      scope: ['entity'],
    },
    memory: {
      domain: 'Adaptive and general cognition',
      kind: 'cognition',
      scope: ['entity'],
    },
    predictive_causal_models: {
      domain: 'Adaptive and general cognition',
      kind: 'cognition',
      scope: ['entity'],
    },
    autonomous_goals: {
      domain: 'Adaptive and general cognition',
      kind: 'cognition',
      scope: ['entity'],
    },
    reasoning_planning: {
      domain: 'Adaptive and general cognition',
      kind: 'cognition',
      scope: ['entity'],
    },
    transfer_generalization: {
      domain: 'Adaptive and general cognition',
      kind: 'cognition',
      scope: ['entity'],
    },
    metacognition_self_model: {
      domain: 'Adaptive and general cognition',
      kind: 'cognition',
      scope: ['entity'],
    },
    social_communication: {
      domain: 'Adaptive and general cognition',
      kind: 'cognition',
      scope: ['entity', 'population'],
    },
    individuality: {
      domain: 'Individual organization and viability',
      kind: 'life',
      scope: ['entity', 'population'],
    },
    resource_maintenance: {
      domain: 'Individual organization and viability',
      kind: 'life',
      scope: ['entity', 'world'],
    },
    homeostasis: {
      domain: 'Individual organization and viability',
      kind: 'life',
      scope: ['entity'],
    },
    repair_resilience: {
      domain: 'Individual organization and viability',
      kind: 'life',
      scope: ['entity'],
    },
    recurrent_processing: {
      domain: 'Consciousness and sentience research',
      kind: 'theory-linked',
      scope: ['entity'],
    },
    global_availability: {
      domain: 'Consciousness and sentience research',
      kind: 'theory-linked',
      scope: ['entity'],
    },
    causal_integration: {
      domain: 'Consciousness and sentience research',
      kind: 'theory-linked',
      scope: ['entity'],
    },
    valence_tradeoffs: {
      domain: 'Consciousness and sentience research',
      kind: 'theory-linked',
      scope: ['entity'],
    },
    substrate_pluralism: {
      domain: 'Engineering and observation context',
      kind: 'engineering',
      scope: ['entity', 'population', 'world'],
    },
    instrumentation_reproducibility: {
      domain: 'Engineering and observation context',
      kind: 'engineering',
      scope: ['entity', 'population', 'world'],
    },
    visual_embodied_scale: {
      domain: 'Engineering and observation context',
      kind: 'engineering',
      scope: ['entity', 'population', 'world'],
    },
  };

const STATES: readonly ReviewState[] = ['implemented', 'bounded-test', 'mixed', 'unassessed'];
const STATE_LABELS: Record<ReviewState, string> = {
  implemented: 'Implementation identified',
  'bounded-test': 'Bounded test evidence',
  mixed: 'Mixed or restricted evidence',
  unassessed: 'Not established',
};
const COLORS: Record<ReviewState, string> = {
  implemented: '#93c5fd',
  'bounded-test': '#5eead4',
  mixed: '#fbbf24',
  unassessed: '#cbd5e1',
};

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${label}: object required`);
  return value as Record<string, unknown>;
}
function nonempty(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${label}: nonempty text required`);
}
function list(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value) || !value.length) throw new Error(`${label}: nonempty array required`);
}
function strings(value: unknown, label: string): asserts value is string[] {
  list(value, label);
  for (const item of value) nonempty(item, label);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  for (const key of Object.keys(value))
    if (!keys.includes(key)) throw new Error(label + ': unsupported field ' + key);
}

/** Validate the separate author layer without promoting it to measured capability. */
export function validateCapabilityEstimates(value: unknown): asserts value is CapabilityEstimates {
  const e = record(value, 'estimates');
  exactKeys(
    e,
    [
      'schemaVersion',
      'frameworkId',
      'frameworkVersion',
      'classification',
      'calibrationStatus',
      'recordedAt',
      'basedOnEvidenceCommit',
      'rationaleStatus',
      'measurementStatus',
      'aggregation',
      'rubric',
      'limitations',
      'estimates',
    ],
    'estimates',
  );
  const required = {
    schemaVersion: 1,
    frameworkId: 'CQM-25',
    frameworkVersion: '1.0.0',
    classification: 'provisional-author-estimates',
    calibrationStatus: 'uncalibrated',
    recordedAt: '2026-10-22',
    rationaleStatus: 'imported-pending-review',
    measurementStatus: 'not-protocol-results',
    aggregation: 'prohibited',
  };
  for (const [key, expected] of Object.entries(required))
    if (e[key] !== expected) throw new Error('Invalid estimate classification: ' + key);
  if (
    typeof e.basedOnEvidenceCommit !== 'string' ||
    !/^[a-f0-9]{40}$/.test(e.basedOnEvidenceCommit)
  )
    throw new Error('Estimate provenance must pin a full Git SHA');
  strings(e.limitations, 'estimate limitations');
  const rubric = record(e.rubric, 'estimate rubric');
  exactKeys(
    rubric,
    [
      'id',
      'interpretation',
      'assignmentStatus',
      'scaleMin',
      'scaleMax',
      'description',
      'assignmentNote',
      'anchors',
    ],
    'estimate rubric',
  );
  if (
    rubric.id !== 'cqm25-author-heuristic-v1' ||
    rubric.interpretation !== 'ordinal-implementation-judgment' ||
    rubric.assignmentStatus !== 'imported-not-recalibrated' ||
    rubric.scaleMin !== 0 ||
    rubric.scaleMax !== 5
  )
    throw new Error('Invalid heuristic estimate rubric');
  nonempty(rubric.description, 'rubric description');
  nonempty(rubric.assignmentNote, 'rubric assignment note');
  list(rubric.anchors, 'rubric anchors');
  if (rubric.anchors.length !== 6) throw new Error('Rubric requires all six anchors from 0 to 5');
  const anchors = new Set<number>();
  for (const candidate of rubric.anchors) {
    const anchor = record(candidate, 'rubric anchor');
    exactKeys(anchor, ['value', 'label', 'definition'], 'rubric anchor');
    if (
      typeof anchor.value !== 'number' ||
      !Number.isInteger(anchor.value) ||
      anchor.value < 0 ||
      anchor.value > 5 ||
      anchors.has(anchor.value)
    )
      throw new Error('Invalid or duplicate rubric anchor');
    anchors.add(anchor.value);
    nonempty(anchor.label, 'anchor label');
    nonempty(anchor.definition, 'anchor definition');
  }
  list(e.estimates, 'axis estimates');
  if (e.estimates.length !== 25) throw new Error('Estimates require all 25 canonical axes');
  const ids = new Set<string>();
  for (const candidate of e.estimates) {
    const estimate = record(candidate, 'axis estimate');
    exactKeys(estimate, ['axisId', 'value', 'rationale'], 'axis estimate');
    nonempty(estimate.axisId, 'estimate axis ID');
    if (!Object.hasOwn(CANONICAL_TAXONOMY, estimate.axisId) || ids.has(estimate.axisId))
      throw new Error('Unknown or duplicate canonical estimate axis');
    ids.add(estimate.axisId);
    if (
      typeof estimate.value !== 'number' ||
      !Number.isFinite(estimate.value) ||
      estimate.value < 0 ||
      estimate.value > 5
    )
      throw new Error('Estimate values must be finite numbers from 0 to 5');
    nonempty(estimate.rationale, 'imported estimate rationale');
  }
}

/** Load the author layer independently of the canonical evidence inventory. */
export function loadCapabilityEstimates(root = `${import.meta.dir}/..`): CapabilityEstimates {
  const value: unknown = JSON.parse(readFileSync(`${root}/${PROFILE_FILES.estimates}`, 'utf8'));
  validateCapabilityEstimates(value);
  return value;
}

function validatePublication(p: CapabilityProfile, e: CapabilityEstimates): void {
  validateCapabilityProfile(p);
  validateCapabilityEstimates(e);
  if (e.basedOnEvidenceCommit !== p.sourceCommit)
    throw new Error('Estimate provenance must match the displayed evidence review');
}

/** Validate before rendering, rejecting uncalibrated scores and unsafe provenance links. */
export function validateCapabilityProfile(value: unknown): asserts value is CapabilityProfile {
  const p = record(value, 'profile');
  exactKeys(
    p,
    [
      'schemaVersion',
      'frameworkId',
      'frameworkVersion',
      'authority',
      'status',
      'adoptedAt',
      'title',
      'reviewedAt',
      'sourceCommit',
      'scope',
      'limitations',
      'evaluationProtocol',
      'legacyVisualReview',
      'sources',
      'axes',
    ],
    'canonical profile',
  );
  if (p.schemaVersion !== 1) throw new Error('Unsupported profile schema');
  for (const [key, expected] of Object.entries(CANONICAL_METADATA)) {
    if (p[key] !== expected)
      throw new Error('Invalid canonical metadata: ' + key + ' must equal ' + expected);
  }
  for (const key of ['title', 'reviewedAt', 'sourceCommit', 'scope', 'legacyVisualReview'])
    nonempty(p[key], key);
  if (!/^[a-f0-9]{40}$/.test(String(p.sourceCommit)))
    throw new Error('sourceCommit must pin a full Git SHA');
  const reviewedAt = String(p.reviewedAt);
  const reviewTime = Date.parse(reviewedAt + 'T00:00:00.000Z');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt) ||
    !Number.isFinite(reviewTime) ||
    new Date(reviewTime).toISOString().slice(0, 10) !== reviewedAt
  )
    throw new Error('reviewedAt must be a valid ISO calendar date');
  strings(p.limitations, 'limitations');
  strings(p.evaluationProtocol, 'evaluationProtocol');
  list(p.sources, 'sources');
  const sourceIds = new Set<string>();
  for (const candidate of p.sources) {
    const s = record(candidate, 'source');
    for (const key of ['id', 'title', 'url', 'kind', 'note']) nonempty(s[key], key);
    if (!/^[a-z0-9_-]+$/.test(String(s.id)) || sourceIds.has(String(s.id)))
      throw new Error('Invalid or duplicate source id');
    const url = new URL(String(s.url));
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new Error('Source must use a public HTTPS URL');
    sourceIds.add(String(s.id));
  }
  list(p.axes, 'axes');
  if (p.axes.length !== 25) throw new Error('CQM-25 requires exactly 25 axes');
  const ids = new Set<string>();
  for (const candidate of p.axes) {
    const a = record(candidate, 'axis');
    exactKeys(
      a,
      [
        'id',
        'name',
        'domain',
        'kind',
        'definition',
        'scope',
        'measures',
        'protocol',
        'falsifier',
        'sourceIds',
        'assessment',
      ],
      'canonical axis',
    );
    for (const key of ['id', 'name', 'domain', 'kind', 'definition', 'protocol', 'falsifier'])
      nonempty(a[key], key);
    if (!/^[a-z0-9_]+$/.test(String(a.id)) || ids.has(String(a.id)))
      throw new Error('Invalid or duplicate axis id');
    ids.add(String(a.id));
    if (!['life', 'cognition', 'theory-linked', 'engineering'].includes(String(a.kind)))
      throw new Error('Unknown axis kind');
    strings(a.scope, 'scope');
    if (a.scope.some((s) => !['entity', 'population', 'world'].includes(s)))
      throw new Error('Unknown subject scope');
    const canonical = Object.hasOwn(CANONICAL_TAXONOMY, String(a.id))
      ? CANONICAL_TAXONOMY[String(a.id)]
      : undefined;
    if (!canonical) throw new Error('Unknown canonical axis: ' + String(a.id));
    if (a.domain !== canonical.domain || a.kind !== canonical.kind)
      throw new Error('Canonical domain or kind reassigned: ' + String(a.id));
    if (
      a.scope.length !== canonical.scope.length ||
      new Set(a.scope).size !== a.scope.length ||
      a.scope.some((scope) => !canonical.scope.includes(scope as ProfileAxis['scope'][number]))
    )
      throw new Error('Canonical subject scope reassigned: ' + String(a.id));
    strings(a.measures, 'measures');
    strings(a.sourceIds, 'sourceIds');
    if (a.sourceIds.some((id) => !sourceIds.has(id))) throw new Error('Unknown source reference');
    const assessment = record(a.assessment, 'assessment');
    exactKeys(assessment, ['status', 'summary', 'score', 'evidence'], 'canonical assessment');
    if (!STATES.includes(assessment.status as ReviewState))
      throw new Error('Unknown evidence state');
    if (assessment.score !== null)
      throw new Error('Initial capability scores must remain null until calibrated');
    nonempty(assessment.summary, 'assessment summary');
    if (!Array.isArray(assessment.evidence)) throw new Error('Evidence must be an array');
    if (assessment.status !== 'unassessed' && assessment.evidence.length === 0)
      throw new Error('An assessed axis needs repository evidence');
    for (const entry of assessment.evidence) {
      const e = record(entry, 'evidence');
      nonempty(e.path, 'evidence path');
      nonempty(e.label, 'evidence label');
      if (
        !/^(src|tests|docs|scripts)\/[A-Za-z0-9_./-]+$/.test(e.path) ||
        e.path.split('/').includes('..')
      )
        throw new Error('Unsafe evidence path');
    }
  }
}

/** Read the single source of truth without deriving ratings from the historical nine-axis matrix. */
export function loadCapabilityProfile(root = `${import.meta.dir}/..`): CapabilityProfile {
  const value: unknown = JSON.parse(readFileSync(`${root}/${PROFILE_FILES.data}`, 'utf8'));
  validateCapabilityProfile(value);
  return value;
}

function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function evidenceUrl(p: CapabilityProfile, path: string): string {
  return `https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/blob/${p.sourceCommit}/${path}`;
}

function estimateHtml(p: CapabilityProfile, e: CapabilityEstimates): string {
  const rows = p.axes
    .map((axis) => {
      const estimate = e.estimates.find((item) => item.axisId === axis.id)!;
      return `<tr data-estimate-axis="${axis.id}"><th scope="row"><a href="#axis-${axis.id}">${esc(axis.name)}</a><br><code>${axis.id}</code><br><small>${esc(axis.kind)}</small></th><td class="estimate-value">${estimate.value.toFixed(1)}</td><td><details><summary>Imported rationale — pending review</summary><p>${esc(estimate.rationale)}</p></details></td></tr>`;
    })
    .join('\n');
  return `<section class="method provisional" id="provisional-estimates" aria-labelledby="estimates-title">
<h2 id="estimates-title">Provisional author estimates</h2>
<p><strong>Uncalibrated heuristic 0–5 judgments — not measured protocol results.</strong> Recorded ${esc(e.recordedAt)} against the original evidence reference <code>${e.basedOnEvidenceCommit.slice(0, 8)}</code>. All imported rationales are pending independent review; their claims are not newly verified by this publication. Canonical capability scores remain null.</p>
<p>${esc(e.rubric.description)}</p><p>${esc(e.rubric.assignmentNote)}</p>
<p><a href="cqm-capability-estimates.json" download>Download provisional author estimates and rubric (JSON)</a></p>
<details id="estimate-rubric"><summary>Heuristic rubric: all six anchors</summary><ol start="0">${e.rubric.anchors.map((a) => `<li value="${a.value}"><strong>${esc(a.label)}:</strong> ${esc(a.definition)}</li>`).join('')}</ol></details>
<ul>${e.limitations.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
<p>25 separate author estimates. No aggregate or domain mean is published.</p><p class="estimate-scroll-hint">Swipe horizontally, or focus the table and use the arrow keys, to read submitted rationales.</p><div class="estimate-table" role="region" aria-label="Provisional author estimate table" tabindex="0"><table><caption>Provisional author estimates (0–5)</caption><thead><tr><th scope="col">Canonical axis / kind</th><th scope="col">Heuristic estimate (0–5)</th><th scope="col">Submitted rationale</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function mdCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}
function estimateMarkdown(p: CapabilityProfile, e: CapabilityEstimates): string {
  const intro = [
    '## Provisional author estimates',
    '**Uncalibrated heuristic 0–5 judgments — not measured protocol results.** Recorded ' +
      e.recordedAt +
      ' against the original evidence reference `' +
      e.basedOnEvidenceCommit +
      '`. All imported rationales are pending independent review; their claims are not newly verified by this publication. Canonical capability scores remain null.',
    '[Download provisional author estimates and rubric (JSON)](cqm-capability-estimates.json)',
    e.rubric.description,
    e.rubric.assignmentNote,
    '### Heuristic rubric',
    e.rubric.anchors
      .map((a) => '- **' + a.value + ' — ' + a.label + ':** ' + a.definition)
      .join('\n'),
    e.limitations.map((item) => '- ' + item).join('\n'),
    '### Separate axis estimates',
    'No aggregate or domain mean is published.',
  ].join('\n\n');
  const table = [
    '| Canonical axis / kind | Heuristic estimate (0–5) | Imported rationale — pending review |',
    '| --- | ---: | --- |',
    ...p.axes.map((axis) => {
      const estimate = e.estimates.find((item) => item.axisId === axis.id)!;
      return (
        '| `' +
        axis.id +
        '` — ' +
        mdCell(axis.name) +
        ' (' +
        axis.kind +
        ') | ' +
        estimate.value.toFixed(1) +
        ' | ' +
        mdCell(estimate.rationale) +
        ' |'
      );
    }),
  ].join('\n');
  return intro + '\n\n' + table + '\n';
}

/** Generate a readable, offline, progressively enhanced profile with independent scope/evidence filters. */
export function renderCapabilityHtml(p: CapabilityProfile, estimates: CapabilityEstimates): string {
  validatePublication(p, estimates);
  const domains = [...new Set(p.axes.map((a) => a.domain))];
  const cards = p.axes
    .map(
      (
        a,
        i,
      ) => `<article class="axis" id="axis-${a.id}" data-domain="${esc(a.domain)}" data-state="${a.assessment.status}" data-scope="${a.scope.join(' ')}">
<div class="axis-top"><span class="number">${String(i + 1).padStart(2, '0')}</span><span class="kind">${esc(a.kind)} · ${esc(a.domain)}</span></div>
<h2>${esc(a.name)}</h2><p>${esc(a.definition)}</p>
<div class="tags"><span><code>${a.id}</code></span><span>${a.scope.join(' / ')}</span><span class="state ${a.assessment.status}">${STATE_LABELS[a.assessment.status]}</span></div>
<p class="finding">${esc(a.assessment.summary)}</p><p class="uncalibrated">Capability score: uncalibrated</p>
<details><summary>Measures, protocol and evidence</summary><h3>Record these measures</h3><ul>${a.measures.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
<h3>Acceptance experiment</h3><p>${esc(a.protocol)}</p><h3>What would weaken the claim?</h3><p>${esc(a.falsifier)}</p>
<h3>Repository evidence</h3><ul>${a.assessment.evidence.map((e) => `<li><a href="${evidenceUrl(p, e.path)}">${esc(e.label)}</a> <code>${esc(e.path)}</code></li>`).join('') || '<li>No axis-specific evidence established in this review.</li>'}</ul>
<p>Scientific basis: ${a.sourceIds.map((id) => `<a href="#source-${id}">${esc(id)}</a>`).join(' · ')}</p></details></article>`,
    )
    .join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(p.title)}</title>
<meta name="description" content="CQM-25 is the canonical project capability standard for digital life, synthetic cognition and embodied systems, with source-grounded definitions and falsifiable protocols.">
<style>
:root{color-scheme:dark;--bg:#09111c;--panel:#101e2d;--ink:#e4edf7;--muted:#b0c2d7;--line:#30465f;--cyan:#5eead4;--amber:#fbbf24}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,sans-serif}main{max-width:1260px;margin:auto;padding:36px 24px 64px}a{color:#93c5fd;text-underline-offset:3px}h1{font-size:clamp(2rem,5vw,3.6rem);line-height:1.08;margin:12px 0 20px;letter-spacing:-.035em}h2{line-height:1.25}h3{font-size:1rem;margin-bottom:6px}p{margin:12px 0}header{max-width:1000px}.eyebrow{color:var(--cyan);letter-spacing:.14em;text-transform:uppercase;font-size:.8rem;font-weight:700}.intro{font-size:1.13rem;color:var(--muted)}.notice,.method{border:1px solid var(--line);border-radius:14px;background:var(--panel);padding:20px 24px;margin:24px 0}.notice{border-left:4px solid var(--amber)}.notice h2{margin-top:0;font-size:1.2rem}.downloads{display:flex;flex-wrap:wrap;gap:10px 20px;margin:20px 0}.filters{display:grid;grid-template-columns:2fr repeat(3,1fr) auto;gap:12px;border:1px solid var(--line);padding:18px;border-radius:14px;margin-top:28px;background:var(--panel)}label{display:flex;flex-direction:column;gap:5px;font-size:.82rem;color:var(--muted)}input,select,button{font:inherit;color:var(--ink);background:var(--bg);border:1px solid #56708c;border-radius:6px;min-height:44px;padding:8px;min-width:0;max-width:100%}button{align-self:end;cursor:pointer}button:hover{border-color:var(--cyan)}:focus-visible{outline:3px solid var(--cyan);outline-offset:3px}.summary{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.axis{border:1px solid var(--line);border-radius:14px;background:var(--panel);padding:24px;min-width:0}.axis-top{display:flex;gap:14px;align-items:center}.number{font-size:1.6rem;color:var(--cyan);font-variant-numeric:tabular-nums}.kind{text-transform:uppercase;letter-spacing:.07em;font-size:.7rem;color:var(--muted)}.axis h2{font-size:1.3rem;margin:12px 0}.tags{display:flex;gap:7px;flex-wrap:wrap;font-size:.75rem}.tags span{padding:3px 8px;border:1px solid var(--line);border-radius:5px}.bounded-test{color:#5eead4}.implemented{color:#93c5fd}.mixed{color:#fbbf24}.unassessed{color:#cbd5e1}.finding{border-top:1px solid var(--line);padding-top:12px;font-size:.91rem}.uncalibrated{font-size:.8rem;color:var(--muted)}details{margin-top:18px}summary{cursor:pointer;color:#93c5fd;padding:5px 0}li{margin:7px 0}code{font-size:.8em;overflow-wrap:anywhere}a{overflow-wrap:anywhere}.provisional{border-left:4px solid var(--amber)}.estimate-table{overflow-x:auto;margin-top:20px}.estimate-table table{width:100%;border-collapse:collapse;font-size:.88rem}.estimate-table th,.estimate-table td{border:1px solid var(--line);padding:12px;text-align:left;vertical-align:top}.estimate-table th:first-child{min-width:210px}.estimate-table th:nth-child(2),.estimate-table td:nth-child(2){min-width:96px}.estimate-table th:nth-child(3),.estimate-table td:nth-child(3){min-width:280px}.estimate-scroll-hint{display:none;color:var(--muted);font-size:.88rem}.estimate-table caption{text-align:left;color:var(--muted);margin-bottom:10px}.estimate-table details{margin:0}.estimate-value{font-variant-numeric:tabular-nums;font-weight:700;color:var(--amber)}.sources li{margin-bottom:16px}.source-note{color:var(--muted);display:block;font-size:.9rem}footer{color:var(--muted);border-top:1px solid var(--line);margin-top:32px;padding-top:18px;font-size:.85rem}[hidden]{display:none!important}@media(max-width:900px){.filters{grid-template-columns:repeat(2,minmax(0,1fr))}.filters label:first-child{grid-column:1/-1}}@media(max-width:620px){main{padding:24px 16px}.grid{grid-template-columns:1fr}.axis{padding:20px}.notice,.method{padding:18px}.filters{padding:12px;gap:10px}.filters button{grid-column:1/-1}.intro{font-size:1rem}.estimate-scroll-hint{display:block}}@media print{body{background:white;color:#111}main{max-width:none}.filters,.downloads{display:none}.axis,.notice,.method{background:white;border-color:#bbb;break-inside:avoid}.grid{display:block}.axis{margin:12px 0}a,.kind,.summary,.source-note,.intro,.uncalibrated{color:#333}details{display:block}}
</style></head><body><main>
<header><p class="eyebrow">Cosmogonic Quantum Mechalogodrom · canonical project standard</p><h1>CQM-25: the project capability standard.</h1><p class="intro">${esc(p.scope)}</p><p><strong>Version ${esc(p.frameworkVersion)} · adopted ${esc(p.adoptedAt)}.</strong> These 25 operational dimensions govern project capability plans and claims across individual beings, interacting populations and constructed worlds.</p></header>
<section class="notice"><h2>Canonical project authority; explicit evidence limits</h2><p>CQM-25 is the binding project standard, not a consensus certification or an executed 25-task benchmark. Acceptance experiments remain proposed and unexecuted as a unified benchmark. Review states describe available repository evidence. Numerical capability scores remain uncalibrated.</p><p>Feature plans and capability claims must identify the affected stable axis IDs and their evidence requirements. Taxonomy changes require an explicit framework version and contract review.</p><p>Engineering breadth and visual expression do not count as evidence of consciousness, sentience, AGI or superintelligence. No aggregate verdict is calculated.</p></section>
<nav class="downloads" aria-label="Profile downloads"><a href="#provisional-estimates">Separate provisional author estimates</a><a href="cqm-capability-profile.json" download>Data / protocols (JSON)</a><a href="cqm-capability-profile.md">Readable specification</a><a href="../reports/assets/alife-capability-profile-25.svg">Canonical 25-axis evidence map (SVG)</a></nav>
<section class="method"><h2>Scope of the standard</h2><p>Constructed physics is evaluated against declared rules and constraints. Ecology is one domain among several. An entity-level study can declare reproduction or population ecology not applicable, with a reason; a missing measurement remains unknown.</p><details><summary>Historical nine-axis comparison and visual review</summary><p>${esc(p.legacyVisualReview)}</p><p>The original nine-axis, 155-system comparison is historical secondary context. It retains its own rubric and scores; its rankings and averages are not transferred into the canonical CQM-25 standard.</p><p><a href="../reports/assets/alife-radar-profile.svg">Historical nine-axis comparison (SVG)</a></p></details></section>
<form class="filters" role="search"><label>Search axes or evidence<input id="search" type="search" placeholder="Try memory, Xylos, morphology…"></label><label>Domain<select id="domain"><option value="">All domains</option>${domains.map((d) => `<option>${esc(d)}</option>`).join('')}</select></label><label>Subject scope<select id="scope"><option value="">All scopes</option><option value="entity">Individual being</option><option value="population">Population</option><option value="world">World</option></select></label><label>Evidence state<select id="state"><option value="">All evidence</option>${STATES.map((s) => `<option value="${s}">${STATE_LABELS[s]}</option>`).join('')}</select></label><button type="reset">Reset filters</button></form>
<p id="result-count" class="summary" role="status" aria-live="polite">Showing all 25 axes. Scope tags indicate where a protocol can apply, not proof that it has passed.</p><p id="empty" hidden>No matching axes. Reset the filters to see the complete profile.</p>
<section class="grid" aria-label="25 operational dimensions">${cards}</section>
<section class="method"><h2>What a strong benchmark result must report</h2><ol>${p.evaluationProtocol.map((s) => `<li>${esc(s)}</li>`).join('')}</ol><h3>Limits of this edition</h3><ul>${p.limitations.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>
${estimateHtml(p, estimates)}
<section class="sources"><h2>Research foundations</h2><p>These sources motivate individual constructs and evaluation methods. They do not endorse the axis selection or establish universal thresholds.</p><ol>${p.sources.map((s) => `<li id="source-${s.id}"><a href="${esc(s.url)}">${esc(s.title)}</a> <small>(${esc(s.kind)})</small><span class="source-note">${esc(s.note)}</span></li>`).join('')}</ol></section>
<footer>CQM-25 v${esc(p.frameworkVersion)} · canonical project standard adopted ${esc(p.adoptedAt)}. Evidence reviewed ${esc(p.reviewedAt)}, pinned to <a href="https://github.com/0thernes/cosmogonic-quantum-mechalogodrom/tree/${p.sourceCommit}">${p.sourceCommit.slice(0, 8)}</a>. Project adoption does not establish global scientific consensus or benchmark validation. Existing ALife, robotics and cognition benchmarks remain relevant.</footer>
</main><script>
const form=document.querySelector('.filters');const cards=[...document.querySelectorAll('.axis')];const search=document.getElementById('search');const domain=document.getElementById('domain');const scope=document.getElementById('scope');const state=document.getElementById('state');
function filter(){const q=search.value.trim().toLowerCase();let count=0;for(const card of cards){const show=(!q||card.textContent.toLowerCase().includes(q))&&(!domain.value||card.dataset.domain===domain.value)&&(!scope.value||card.dataset.scope.split(' ').includes(scope.value))&&(!state.value||card.dataset.state===state.value);card.hidden=!show;if(show)count++;}document.getElementById('result-count').textContent='Showing '+count+' of 25 axes. Review states are evidence categories, not capability scores.';document.getElementById('empty').hidden=count!==0;}
for(const link of document.querySelectorAll('[data-estimate-axis] a')){link.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const target=document.getElementById(link.hash.slice(1));if(!target)return;form.reset();filter();target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({block:'start'});});}
form.addEventListener('input',filter);form.addEventListener('change',filter);form.addEventListener('submit',event=>event.preventDefault());form.addEventListener('reset',()=>setTimeout(filter,0));window.addEventListener('beforeprint',()=>{for(const card of cards){card.hidden=false;card.querySelector('details').open=true;}});window.addEventListener('afterprint',filter);
</script></body></html>\n`;
}

/** Render a labeled inventory rather than an uncalibrated 25-spoke numerical radar. */
export function renderCapabilitySvg(p: CapabilityProfile): string {
  validateCapabilityProfile(p);
  const rows = p.axes
    .map((a, i) => {
      const y = 152 + i * 43;
      return `<g><rect x="24" y="${y - 24}" width="952" height="38" rx="5" fill="${i % 2 ? '#122235' : '#0d1b2b'}"/><text x="40" y="${y}" fill="#5eead4" font-size="15">${String(i + 1).padStart(2, '0')}</text><text x="78" y="${y}" fill="#e4edf7" font-size="16">${esc(a.name)}</text><text x="955" y="${y}" text-anchor="end" fill="${COLORS[a.assessment.status]}" font-size="13">${esc(STATE_LABELS[a.assessment.status])}</text></g>`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1280" role="img" aria-labelledby="title desc" font-family="system-ui,sans-serif"><title id="title">CQM-25 v${esc(p.frameworkVersion)}: canonical project standard</title><desc id="desc">Canonical project standard adopted ${esc(p.adoptedAt)}. Twenty-five stable axes with categorical repository evidence states from ${esc(p.reviewedAt)}. Acceptance experiments remain proposed and unexecuted as a unified benchmark. No numerical capability, consciousness, sentience or general-intelligence score is inferred.</desc><rect width="1000" height="1280" rx="16" fill="#09111c"/><text x="32" y="48" fill="#e4edf7" font-size="27" font-weight="700">CQM-25 v${esc(p.frameworkVersion)} · Canonical project standard</text><text x="32" y="78" fill="#b0c2d7" font-size="15">Adopted ${esc(p.adoptedAt)} · evidence reviewed ${esc(p.reviewedAt)} · entity / population / world</text><text x="32" y="105" fill="#fbbf24" font-size="14">Proposed experiments; unified benchmark unexecuted. Scores uncalibrated; no aggregate verdict.</text>${rows}<text x="32" y="1243" fill="#b0c2d7" font-size="14">Open the interactive profile for measures, falsifiers, scope, and source-linked evidence.</text></svg>\n`;
}

/** Render an editable, source-linked specification from the same reviewed input. */
export function renderCapabilityMarkdown(
  p: CapabilityProfile,
  estimates: CapabilityEstimates,
): string {
  validatePublication(p, estimates);
  const blocks = p.axes.map(
    (a, i) =>
      `## ${i + 1}. ${a.name}\n\n${a.definition}\n\n- Axis ID: \`${a.id}\`.\n- Domain: ${a.domain}; kind: ${a.kind}; scope: ${a.scope.join(', ')}.\n- Evidence review: ${STATE_LABELS[a.assessment.status]}. Capability score: uncalibrated.\n- Current finding: ${a.assessment.summary}\n- Measures: ${a.measures.join('; ')}\n- Acceptance experiment: ${a.protocol}\n- Falsifier: ${a.falsifier}\n- Repository evidence: ${a.assessment.evidence.map((e) => `[${e.label}](${evidenceUrl(p, e.path)})`).join('; ') || 'Not established.'}\n- Sources: ${a.sourceIds.join(', ')}\n`,
  );
  return `# ${p.title}\n\nCanonical project standard, version ${p.frameworkVersion}; adopted ${p.adoptedAt}.\n\nAuthority: ${p.authority}; status: ${p.status}. Evidence reviewed ${p.reviewedAt}, pinned to \`${p.sourceCommit}\`.\n\n${p.scope}\n\nCQM-25 is the binding project capability standard, not a consensus gold standard or an executed 25-task benchmark. Acceptance experiments remain proposed and unexecuted as a unified benchmark. Feature plans and capability claims identify affected stable axis IDs and their evidence requirements; taxonomy changes require an explicit framework version and contract review. Engineering dimensions do not establish consciousness, sentience, AGI or superintelligence. Numeric capability scores remain null until calibrated.\n\n## Historical nine-axis comparison and visual review\n\n${p.legacyVisualReview}\n\nThe 155-system comparison is historical secondary context with its separate nine-axis rubric. It cannot substitute for the canonical CQM-25 standard. No peer scores or rankings are inferred here.\n\n## Evaluation protocol\n\n${p.evaluationProtocol.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n## Limits\n\n${p.limitations.map((s) => `- ${s}`).join('\n')}\n\n${blocks.join('\n')}\n${estimateMarkdown(p, estimates)}\n## Research foundations\n\n${p.sources.map((s) => `- **${s.id}:** [${s.title}](${s.url}) (${s.kind}). ${s.note}`).join('\n')}\n`;
}

if (import.meta.main) {
  const root = `${import.meta.dir}/..`;
  const p = loadCapabilityProfile(root);
  const estimates = loadCapabilityEstimates(root);
  writeFileSync(`${root}/${PROFILE_FILES.html}`, renderCapabilityHtml(p, estimates));
  writeFileSync(`${root}/${PROFILE_FILES.markdown}`, renderCapabilityMarkdown(p, estimates));
  writeFileSync(`${root}/${PROFILE_FILES.svg}`, renderCapabilitySvg(p));
  console.log(
    'CQM-25: generated HTML, Markdown and SVG; canonical capability scores remain null; author estimates are separate and uncalibrated.',
  );
}
