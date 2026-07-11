/**
 * Deterministic Phase-B mechanism-development evidence artifacts.
 *
 * The two source studies remain development-only. This generator runs each finalized in-memory
 * harness once, preserves their negative results and claim boundaries, and renders one canonical
 * JSON summary, compact long-form CSV, and accessible SVG. Metadata is fixed; no clock, Git, network,
 * or ambient machine state enters the bytes. Default CLI mode writes, while `--check` only compares.
 */

import { NhiAction } from '../../src/sim/nhi';
import {
  runEcologyTemporalDevelopment,
  type EcologyTemporalAdvancementGate,
  type EcologyTemporalDevelopmentStudy,
} from './ecology-temporal-development';
import {
  runNhiClosedLoopDevelopment,
  type NhiClosedLoopActionSemanticContrast,
  type NhiClosedLoopDevelopmentResult,
  type NhiClosedLoopPairedComparison,
} from './nhi-closed-loop-development';
import {
  canonicalizePhaseBEvidence,
  canonicalizePhaseBEvidenceNumber,
  PHASE_B_EVIDENCE_PRECISION_LAW,
} from './evidence-precision';

export const PHASE_B_MECHANISM_EVIDENCE_DATE = '2026-07-11' as const;
export const PHASE_B_MECHANISM_EVIDENCE_ID = 'phase-b-mechanism-development-v3' as const;
export const PHASE_B_ARTIFACT_LOCAL_HASH_LAW = Object.freeze({
  id: 'phase-b-rounded-material-canonical-json-sha256-v1',
  algorithm: 'sha256',
  serialization: 'lexicographically-key-sorted-canonical-json',
  boundary: 'after-phase-b-evidence-precision-before-artifact-embedding',
  scope:
    'each displayed validation comparison or action contrast excluding its source and artifact hash receipt fields',
} as const);
export const PHASE_B_MECHANISM_EVIDENCE_PATHS = Object.freeze({
  json: 'docs/reports/assets/phase-b-mechanism-development-v3.json',
  csv: 'docs/reports/assets/phase-b-mechanism-development-v3.csv',
  svg: 'docs/reports/assets/phase-b-mechanism-development-v3.svg',
});

type GateMetricId =
  | 'mean-sse-gain'
  | 'median-model-gain'
  | 'every-delay-mean-gain'
  | 'twin-margin'
  | 'ordering-rate'
  | 'holm-adjusted-p'
  | 'bootstrap-99-lower'
  | 'worst-model-gain';

interface GateMetric {
  readonly id: GateMetricId;
  readonly label: string;
  readonly observed: number;
  readonly threshold: number;
  readonly comparison: '>=' | '<' | '>';
  readonly passed: boolean;
}

function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError('evidence JSON rejects non-finite numbers');
    return JSON.stringify(canonicalizePhaseBEvidenceNumber(value));
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && value !== undefined) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  throw new TypeError(`evidence JSON rejects ${typeof value}`);
}

function sha256(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

function gateMetrics(gate: EcologyTemporalAdvancementGate): readonly GateMetric[] {
  const { observed, thresholds } = gate;
  return [
    {
      id: 'mean-sse-gain',
      label: 'Minimum control mean SSE gain',
      observed: observed.minimumControlMeanSseGain,
      threshold: thresholds.meanSseGain,
      comparison: '>=',
      passed: observed.minimumControlMeanSseGain >= thresholds.meanSseGain,
    },
    {
      id: 'median-model-gain',
      label: 'Minimum median model gain',
      observed: observed.minimumControlMedianModelGain,
      threshold: thresholds.medianModelGain,
      comparison: '>=',
      passed: observed.minimumControlMedianModelGain >= thresholds.medianModelGain,
    },
    {
      id: 'every-delay-mean-gain',
      label: 'Minimum every-delay mean gain',
      observed: observed.minimumDelayMeanSseGain,
      threshold: thresholds.everyDelayMeanGain,
      comparison: '>=',
      passed: observed.minimumDelayMeanSseGain >= thresholds.everyDelayMeanGain,
    },
    {
      id: 'twin-margin',
      label: 'Mean cue/query twin margin',
      observed: observed.meanTwinMargin,
      threshold: thresholds.meanTwinMargin,
      comparison: '>=',
      passed: observed.meanTwinMargin >= thresholds.meanTwinMargin,
    },
    {
      id: 'ordering-rate',
      label: 'Twin ordering rate',
      observed: observed.orderingRate,
      threshold: thresholds.orderingRate,
      comparison: '>=',
      passed: observed.orderingRate >= thresholds.orderingRate,
    },
    {
      id: 'holm-adjusted-p',
      label: 'Maximum Holm-adjusted p',
      observed: observed.maximumHolmAdjustedPValue,
      threshold: thresholds.holmAdjustedPExclusiveMaximum,
      comparison: '<',
      passed: observed.maximumHolmAdjustedPValue < thresholds.holmAdjustedPExclusiveMaximum,
    },
    {
      id: 'bootstrap-99-lower',
      label: 'Minimum bootstrap 99% lower bound',
      observed: observed.minimumBootstrap99Lower,
      threshold: thresholds.bootstrap99LowerExclusiveMinimum,
      comparison: '>',
      passed: observed.minimumBootstrap99Lower > thresholds.bootstrap99LowerExclusiveMinimum,
    },
    {
      id: 'worst-model-gain',
      label: 'Worst independent-model gain',
      observed: observed.worstModelGain,
      threshold: thresholds.worstModelGain,
      comparison: '>=',
      passed: observed.worstModelGain >= thresholds.worstModelGain,
    },
  ];
}

function actionLabel(action: number): 'HUNT' | 'SPAWN' | 'MANIPULATE' | 'DOMINATE' {
  if (action === NhiAction.HUNT) return 'HUNT';
  if (action === NhiAction.SPAWN_SWARM) return 'SPAWN';
  if (action === NhiAction.MANIPULATE) return 'MANIPULATE';
  if (action === NhiAction.DOMINATE) return 'DOMINATE';
  throw new RangeError(`unsupported evidence action ${action}`);
}

function withActionLabel(contrast: NhiClosedLoopActionSemanticContrast) {
  return { ...contrast, actionLabel: actionLabel(contrast.requestedAction) };
}

function withArtifactComparisonHashes(comparison: NhiClosedLoopPairedComparison) {
  const { comparisonSha256: sourceComparisonSha256, ...sourceMaterial } = comparison;
  const material = canonicalizePhaseBEvidence(sourceMaterial);
  return {
    ...material,
    sourceComparisonSha256,
    artifactComparisonMaterialSha256: sha256(canonicalJson(material)),
  } as const;
}

function withArtifactActionContrastHashes(contrast: NhiClosedLoopActionSemanticContrast) {
  const { contrastSha256: sourceContrastSha256, ...sourceMaterial } = withActionLabel(contrast);
  const material = canonicalizePhaseBEvidence(sourceMaterial);
  return {
    ...material,
    sourceContrastSha256,
    artifactContrastMaterialSha256: sha256(canonicalJson(material)),
  } as const;
}

export function buildPhaseBMechanismEvidenceSummary(
  temporalStudy: EcologyTemporalDevelopmentStudy = runEcologyTemporalDevelopment(),
  nhiStudy: NhiClosedLoopDevelopmentResult = runNhiClosedLoopDevelopment(),
) {
  const metrics = gateMetrics(temporalStudy.summary.advancementGate);
  if (
    temporalStudy.summary.advancementGate.passed ||
    metrics.length !== 8 ||
    metrics.some((metric) => metric.passed) ||
    temporalStudy.summary.advancementGate.failedCriteria.length !== 8
  ) {
    throw new Error('final temporal development artifact requires all eight visible gate failures');
  }
  const validationArmSummaries = nhiStudy.armSummaries.filter(
    (summary) => summary.role === 'validation',
  );
  const validationActionSemanticContrasts = nhiStudy.actionSemanticContrasts
    .filter((contrast) => contrast.role === 'validation')
    .map(withArtifactActionContrastHashes);
  const validationPairedComparisons = nhiStudy.pairedComparisons
    .filter((comparison) => comparison.role === 'validation')
    .map(withArtifactComparisonHashes);
  const semanticShuffleFixedPointCount = nhiStudy.rows.filter(
    (row) => row.arm === 'semantic-cue-shuffled' && row.semanticCueMatchesRequest,
  ).length;
  const invalidYokeTargetCount = nhiStudy.rows.filter(
    (row) => row.arm === 'yoked-action-shift' && !row.targetValidForCurrentTrial,
  ).length;
  if (semanticShuffleFixedPointCount !== 0 || invalidYokeTargetCount !== 0) {
    throw new Error('final NHI controls require zero shuffle fixed points and zero invalid yokes');
  }
  const summaryBase = canonicalizePhaseBEvidence({
    schemaVersion: 4,
    artifactId: PHASE_B_MECHANISM_EVIDENCE_ID,
    generatedDate: PHASE_B_MECHANISM_EVIDENCE_DATE,
    status: 'development-only-negative-and-diagnostic-results-retained',
    developmentOnly: true,
    claimAllowed: false,
    metadataLaw: 'fixed-date-no-clock-git-network-or-machine-state',
    evidencePrecisionLaw: PHASE_B_EVIDENCE_PRECISION_LAW,
    artifactLocalHashLaw: PHASE_B_ARTIFACT_LOCAL_HASH_LAW,
    temporal: {
      studyId: temporalStudy.summary.studyId,
      conclusion: temporalStudy.summary.conclusion,
      developmentOnly: temporalStudy.summary.developmentOnly,
      claimAllowed: temporalStudy.summary.claimAllowed,
      hashes: {
        seedFamiliesSha256: temporalStudy.summary.seedFamiliesSha256,
        configurationSha256: temporalStudy.summary.configurationSha256,
        rowsSha256: temporalStudy.summary.rowsSha256,
      },
      rows: {
        configured: temporalStudy.summary.retention.configuredRows,
        retained: temporalStudy.summary.retention.retainedRows,
        inference: temporalStudy.summary.inferenceRowCount,
        filteredByOutcome: temporalStudy.summary.retention.rowsFilteredByOutcome,
      },
      analyticFloors: temporalStudy.summary.analyticFloors,
      targetShuffle: temporalStudy.summary.targetShuffle,
      taskProfileUniqueness: temporalStudy.summary.taskProfileUniqueness,
      pairedControlContrasts: temporalStudy.summary.pairedControlContrasts,
      advancementGate: {
        ...temporalStudy.summary.advancementGate,
        criteria: metrics,
      },
      claimProhibitions: {
        advancementAllowed: false,
        confirmatoryEvidenceClaimAllowed: false,
        temporalIdentifiabilityClaimAllowed: false,
        failedCriteriaSuppressionAllowed: false,
      },
    },
    nhi: {
      interpretation: nhiStudy.interpretation,
      reversalInterpretation: nhiStudy.reversalInterpretation,
      regretSemantics: nhiStudy.regretSemantics,
      neuralSemanticInterpretationScope: nhiStudy.neuralSemanticInterpretationScope,
      developmentOnly: nhiStudy.developmentOnly,
      claimAllowed: nhiStudy.claimAllowed,
      hashes: {
        selectedSeedFamiliesSha256: nhiStudy.selectedSeedFamiliesSha256,
        globalSeedFamilySha256: nhiStudy.seedFamilySha256,
        protocolHashScope: nhiStudy.protocolHashScope,
        configurationAndDeclaredLawsSha256: nhiStudy.protocolSha256,
        scheduleSha256: nhiStudy.scheduleSha256,
        rowsSha256: nhiStudy.rowsSha256,
        faultProbesSha256: nhiStudy.faultProbesSha256,
      },
      rows: {
        configured: nhiStudy.expectedRows,
        retained: nhiStudy.retainedRows,
        dropped: nhiStudy.droppedRows,
      },
      validationArmSummaries,
      validationPairedComparisons,
      validationActionSemanticContrasts,
      controlIntegrity: {
        semanticShuffleFixedPointCount,
        invalidYokeTargetCount,
        validationTargetValidityRates: validationArmSummaries.map(({ arm, validTargetRate }) => ({
          arm,
          validTargetRate,
        })),
      },
      claimProhibitions: {
        publicationClaimAllowed: false,
        adaptationClaimAllowed: nhiStudy.adaptationClaimAllowed,
        rewardLearningClaimAllowed: nhiStudy.rewardLearningClaimAllowed,
        consciousnessClaimAllowed: nhiStudy.consciousnessClaimAllowed,
        sentienceClaimAllowed: nhiStudy.sentienceClaimAllowed,
        broadFourActionSemanticClaimAllowed: nhiStudy.broadFourActionSemanticClaimAllowed,
        unsupportedActionLaneInterpretationAllowed: false,
      },
    },
    artifactClaims: {
      confirmatoryEvidence: false,
      advancement: false,
      adaptation: false,
      rewardLearning: false,
      consciousness: false,
      sentience: false,
      broadFourActionNeuralSemanticBenefit: false,
    },
  } as const);
  return {
    ...summaryBase,
    summaryMaterialSha256: sha256(canonicalJson(summaryBase)),
  };
}

export type PhaseBMechanismEvidenceSummary = ReturnType<typeof buildPhaseBMechanismEvidenceSummary>;

function csvCell(value: string | number | boolean): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvRow(values: readonly (string | number | boolean)[]): string {
  return values.map(csvCell).join(',');
}

export function renderPhaseBMechanismEvidenceCsv(summary: PhaseBMechanismEvidenceSummary): string {
  const rows: (string | number | boolean)[][] = [
    ['study', 'scope', 'metric', 'observed', 'threshold', 'comparison', 'status', 'interpretation'],
  ];
  for (const criterion of summary.temporal.advancementGate.criteria) {
    rows.push([
      'temporal',
      'advancement-gate',
      criterion.id,
      criterion.observed,
      criterion.threshold,
      criterion.comparison,
      criterion.passed ? 'pass' : 'fail',
      'development-gate-failed-no-advancement',
    ]);
  }
  rows.push([
    'temporal',
    'retention',
    'retained-rows',
    summary.temporal.rows.retained,
    summary.temporal.rows.configured,
    '=',
    summary.temporal.rows.retained === summary.temporal.rows.configured ? 'pass' : 'fail',
    'all rows retained',
  ]);
  for (const arm of summary.nhi.validationArmSummaries) {
    for (const [metric, value] of [
      ['mean-service-score', arm.meanServiceScore],
      ['success-rate', arm.successRate],
      ['pre-conflict-service-score', arm.preReversalMeanServiceScore],
      ['post-conflict-service-score', arm.postReversalMeanServiceScore],
      ['conflict-minus-aligned-service-score', arm.conflictMinusAlignedMeanServiceScore],
    ] as const) {
      rows.push([
        'nhi',
        `validation-arm:${arm.arm}`,
        metric,
        value,
        '',
        '',
        'diagnostic',
        'paired conflict response; not adaptation',
      ]);
    }
  }
  for (const contrast of summary.nhi.validationActionSemanticContrasts) {
    const status = contrast.neuralSemanticInterpretationAllowed
      ? 'supported-diagnostic-lane'
      : 'unsupported-do-not-interpret';
    const interpretation = contrast.neuralSemanticInterpretationAllowed
      ? contrast.supportedNeuralSemanticLane
      : 'no direct neural semantic lane';
    for (const [metric, value] of [
      ['full-minus-neural-semantic-ablated', contrast.fullMinusNeuralSemanticAblated],
      ['full-minus-semantic-utility-ablated', contrast.fullMinusSemanticUtilityAblated],
      ['full-minus-all-semantic-ablated', contrast.fullMinusAllSemanticAblated],
      ['full-minus-semantic-cue-shuffled', contrast.fullMinusSemanticCueShuffled],
    ] as const) {
      rows.push([
        'nhi',
        `validation-action:${contrast.actionLabel}`,
        metric,
        value,
        '',
        '',
        status,
        interpretation,
      ]);
    }
  }
  rows.push(
    [
      'nhi',
      'control-integrity',
      'semantic-shuffle-fixed-points',
      summary.nhi.controlIntegrity.semanticShuffleFixedPointCount,
      0,
      '=',
      'pass',
      'balanced fixed-point-free derangement',
    ],
    [
      'nhi',
      'control-integrity',
      'invalid-yoke-targets',
      summary.nhi.controlIntegrity.invalidYokeTargetCount,
      0,
      '=',
      'pass',
      'MANIPULATE targets rebound to current rival',
    ],
  );
  return `${rows.map(csvRow).join('\n')}\n`;
}

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function displayNumber(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude === 0) return '0';
  if (magnitude < 0.001 || magnitude >= 1000) return value.toExponential(2);
  return value.toFixed(4);
}

function requiredActionContrast(
  summary: PhaseBMechanismEvidenceSummary,
  action: 'HUNT' | 'SPAWN' | 'MANIPULATE' | 'DOMINATE',
) {
  const contrast = summary.nhi.validationActionSemanticContrasts.find(
    (candidate) => candidate.actionLabel === action,
  );
  if (contrast === undefined) throw new Error(`missing NHI action contrast ${action}`);
  return contrast;
}

export function renderPhaseBMechanismEvidenceSvg(summary: PhaseBMechanismEvidenceSummary): string {
  const criteria = summary.temporal.advancementGate.criteria;
  const validationFull = summary.nhi.validationArmSummaries.find(({ arm }) => arm === 'full');
  if (validationFull === undefined) throw new Error('missing NHI validation full summary');
  const hunt = requiredActionContrast(summary, 'HUNT');
  const spawn = requiredActionContrast(summary, 'SPAWN');
  const manipulate = requiredActionContrast(summary, 'MANIPULATE');
  const dominate = requiredActionContrast(summary, 'DOMINATE');
  const scoreScale = 4_000;
  const preWidth = Math.max(0, validationFull.preReversalMeanServiceScore * scoreScale);
  const postWidth = Math.max(0, validationFull.postReversalMeanServiceScore * scoreScale);
  const gateRows = criteria
    .map((criterion, index) => {
      const y = 196 + index * 43;
      return `  <g data-gate-status="fail" transform="translate(44 ${y})">
    <rect width="1112" height="35" rx="7" fill="#3b1118" stroke="#ff6577"/>
    <text x="14" y="23" class="fail">FAIL</text>
    <text x="80" y="23" class="body">${xml(criterion.label)}</text>
    <text x="1088" y="23" text-anchor="end" class="mono">${xml(displayNumber(criterion.observed))} ${xml(criterion.comparison)} ${xml(displayNumber(criterion.threshold))}</text>
  </g>`;
    })
    .join('\n');
  const laneCard = (
    x: number,
    action: string,
    lane: string,
    contrast: Pick<
      NhiClosedLoopActionSemanticContrast,
      'neuralSemanticInterpretationAllowed' | 'fullMinusNeuralSemanticAblated'
    >,
  ) => {
    const supported = contrast.neuralSemanticInterpretationAllowed;
    return `  <g transform="translate(${x} 790)" data-lane-support="${supported ? 'supported-diagnostic' : 'unsupported'}">
    <rect width="266" height="112" rx="12" fill="${supported ? '#123b36' : '#252a32'}" stroke="${supported ? '#56d6b3' : '#7d8592'}" stroke-width="2"/>
    <text x="16" y="28" class="lane-title">${xml(action)}</text>
    <text x="16" y="53" class="${supported ? 'supported' : 'muted'}">${xml(lane)}</text>
    <text x="16" y="81" class="mono">Δ neural = ${xml(displayNumber(contrast.fullMinusNeuralSemanticAblated))}</text>
    <text x="16" y="102" class="small">${supported ? 'SUPPORTED DIAGNOSTIC LANE' : 'UNSUPPORTED · DO NOT INTERPRET'}</text>
  </g>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1020" viewBox="0 0 1200 1020" role="img" aria-labelledby="phase-b-title phase-b-desc">
  <title id="phase-b-title">Phase-B mechanism development: failed temporal gate and bounded NHI diagnostics</title>
  <desc id="phase-b-desc">All eight temporal advancement criteria fail. NHI service declines under a paired surface conflict. Only HUNT resource and SPAWN social neural semantic lanes are supported for diagnostic interpretation; MANIPULATE and DOMINATE are unsupported.</desc>
  <style>
    text{font-family:Inter,Segoe UI,Arial,sans-serif;fill:#f6f8fb}.title{font-size:28px;font-weight:750}.subtitle{font-size:15px;fill:#b8c1cf}.section{font-size:20px;font-weight:700}.body{font-size:14px}.mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px}.fail{font-size:13px;font-weight:800;fill:#ff93a0}.honesty{font-size:14px;font-weight:800;fill:#ffd166}.lane-title{font-size:18px;font-weight:750}.supported{font-size:14px;fill:#78e7c8}.muted{font-size:14px;fill:#a9b0bb}.small{font-size:10px;font-weight:700;letter-spacing:.4px;fill:#d6dbe3}
  </style>
  <rect width="1200" height="1020" fill="#0d1117"/>
  <text id="phase-b-heading" x="44" y="48" class="title">Phase-B mechanism development · V3</text>
  <text x="44" y="74" class="subtitle">Fixed ${PHASE_B_MECHANISM_EVIDENCE_DATE} · deterministic development artifacts · negative results retained</text>
  <g transform="translate(44 94)">
    <rect width="1112" height="52" rx="10" fill="#33270d" stroke="#ffd166" stroke-width="2"/>
    <text x="18" y="22" class="honesty">DEVELOPMENT ONLY · CLAIMS DISALLOWED</text>
    <text x="18" y="42" class="body">No advancement, adaptation, reward-learning, consciousness, sentience, or broad four-action semantic claim.</text>
  </g>
  <text x="44" y="177" class="section">Temporal identifiability gate · 8 / 8 criteria failed</text>
${gateRows}
  <text x="44" y="568" class="section">NHI paired surface-conflict response · not adaptation</text>
  <text x="44" y="596" class="body">Same exogenous base trials; environment, cognition, and policy RNG reset at the phase boundary.</text>
  <g transform="translate(44 620)">
    <text x="0" y="18" class="body">Aligned pre-conflict</text>
    <rect x="170" y="2" width="${preWidth.toFixed(2)}" height="22" rx="5" fill="#56d6b3"/>
    <text x="${(184 + preWidth).toFixed(2)}" y="18" class="mono">${xml(displayNumber(validationFull.preReversalMeanServiceScore))}</text>
    <text x="0" y="62" class="body">Post-conflict</text>
    <rect x="170" y="46" width="${postWidth.toFixed(2)}" height="22" rx="5" fill="#ffb454"/>
    <text x="${(184 + postWidth).toFixed(2)}" y="62" class="mono">${xml(displayNumber(validationFull.postReversalMeanServiceScore))}</text>
    <text x="650" y="40" class="fail">DECLINE ${xml(displayNumber(validationFull.conflictMinusAlignedMeanServiceScore))}</text>
  </g>
  <text x="44" y="758" class="section">Neural semantic action lanes · diagnostic scope only</text>
${laneCard(44, 'HUNT', 'resource → HUNT', hunt)}
${laneCard(326, 'SPAWN', 'social → SPAWN', spawn)}
${laneCard(608, 'MANIPULATE', 'no direct target lane', manipulate)}
${laneCard(890, 'DOMINATE', 'no direct target lane', dominate)}
  <g transform="translate(44 932)">
    <rect width="1112" height="54" rx="9" fill="#171c24" stroke="#48515e"/>
    <text x="16" y="22" class="body">Temporal rows ${summary.temporal.rows.retained}/${summary.temporal.rows.configured} · NHI rows ${summary.nhi.rows.retained}/${summary.nhi.rows.configured}</text>
    <text x="16" y="43" class="small">NHI CONFIGURATION + DECLARED-LAWS HASH (NOT SOURCE CLOSURE): ${xml(summary.nhi.hashes.configurationAndDeclaredLawsSha256)}</text>
  </g>
</svg>
`;
}

export function renderPhaseBMechanismEvidenceArtifacts(summary: PhaseBMechanismEvidenceSummary) {
  return {
    json: `${canonicalJson(summary)}\n`,
    csv: renderPhaseBMechanismEvidenceCsv(summary),
    svg: renderPhaseBMechanismEvidenceSvg(summary),
  } as const;
}

export function buildPhaseBMechanismEvidenceArtifacts() {
  const summary = buildPhaseBMechanismEvidenceSummary();
  return { summary, files: renderPhaseBMechanismEvidenceArtifacts(summary) } as const;
}

export async function checkPhaseBMechanismEvidenceArtifacts(
  files: ReturnType<typeof renderPhaseBMechanismEvidenceArtifacts>,
): Promise<readonly string[]> {
  const drifted: string[] = [];
  for (const kind of ['json', 'csv', 'svg'] as const) {
    const path = PHASE_B_MECHANISM_EVIDENCE_PATHS[kind];
    const file = Bun.file(path);
    if (!(await file.exists()) || (await file.text()) !== files[kind]) drifted.push(path);
  }
  return drifted;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const unknown = args.filter((argument) => argument !== '--check');
  if (unknown.length > 0)
    throw new Error(`unknown evidence-artifact argument: ${unknown.join(' ')}`);
  const built = buildPhaseBMechanismEvidenceArtifacts();
  if (args.includes('--check')) {
    const drifted = await checkPhaseBMechanismEvidenceArtifacts(built.files);
    if (drifted.length > 0) {
      console.error(`phase-b mechanism artifacts are stale: ${drifted.join(', ')}`);
      process.exitCode = 1;
    } else {
      console.log('phase-b mechanism artifacts are byte-current');
    }
    return;
  }
  for (const kind of ['json', 'csv', 'svg'] as const) {
    await Bun.write(PHASE_B_MECHANISM_EVIDENCE_PATHS[kind], built.files[kind]);
  }
  console.log(
    `wrote ${Object.values(PHASE_B_MECHANISM_EVIDENCE_PATHS).join(', ')} (${built.summary.temporal.rows.retained + built.summary.nhi.rows.retained} retained rows)`,
  );
}

if (import.meta.main) await main();
