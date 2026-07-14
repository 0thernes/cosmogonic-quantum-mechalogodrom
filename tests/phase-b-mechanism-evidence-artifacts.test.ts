import { beforeAll, describe, expect, test } from 'bun:test';
import { statSync } from 'node:fs';
import {
  buildPhaseBMechanismEvidenceArtifacts,
  checkPhaseBMechanismEvidenceArtifacts,
  PHASE_B_ARTIFACT_LOCAL_HASH_LAW,
  PHASE_B_MECHANISM_EVIDENCE_DATE,
  PHASE_B_MECHANISM_EVIDENCE_ID,
  PHASE_B_MECHANISM_EVIDENCE_PATHS,
  renderPhaseBMechanismEvidenceArtifacts,
} from '../scripts/organism-intelligence-phase-b/mechanism-evidence-artifacts';
import {
  canonicalizePhaseBEvidence,
  PHASE_B_EVIDENCE_PRECISION_LAW,
} from '../scripts/organism-intelligence-phase-b/evidence-precision';

const SHA256 = /^[a-f\d]{64}$/;
let built: ReturnType<typeof buildPhaseBMechanismEvidenceArtifacts>;

beforeAll(() => {
  // Both expensive finalized harnesses run exactly once for this test module. Every other assertion
  // reuses the resulting summary or exercises only the pure render/check surfaces.
  built = buildPhaseBMechanismEvidenceArtifacts();
}, 60_000);

function fileSha256(content: string): string {
  return new Bun.CryptoHasher('sha256').update(content).digest('hex');
}

function canonicalArtifactJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError('test canonical JSON rejects non-finite');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalArtifactJson).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalArtifactJson(record[key])}`)
      .join(',')}}`;
  }
  throw new TypeError(`test canonical JSON rejects ${typeof value}`);
}

function artifactMaterialSha256(value: unknown): string {
  return new Bun.CryptoHasher('sha256').update(canonicalArtifactJson(value)).digest('hex');
}

describe('Phase-B mechanism evidence artifacts', () => {
  test('matches all generated files byte-for-byte and check mode remains read-only', async () => {
    const before = Object.fromEntries(
      Object.entries(PHASE_B_MECHANISM_EVIDENCE_PATHS).map(([kind, path]) => [
        kind,
        statSync(path).mtimeMs,
      ]),
    );
    for (const kind of ['json', 'csv', 'svg'] as const) {
      expect(await Bun.file(PHASE_B_MECHANISM_EVIDENCE_PATHS[kind]).text()).toBe(built.files[kind]);
    }
    expect(await checkPhaseBMechanismEvidenceArtifacts(built.files)).toEqual([]);
    const after = Object.fromEntries(
      Object.entries(PHASE_B_MECHANISM_EVIDENCE_PATHS).map(([kind, path]) => [
        kind,
        statSync(path).mtimeMs,
      ]),
    );
    expect(after).toEqual(before);
    expect(renderPhaseBMechanismEvidenceArtifacts(built.summary)).toEqual(built.files);
  });

  test('pins fixed metadata, exact source hashes, row retention, and all eight temporal failures', () => {
    const parsed = JSON.parse(built.files.json) as typeof built.summary;
    expect(parsed).toEqual(built.summary);
    expect(parsed.artifactId).toBe(PHASE_B_MECHANISM_EVIDENCE_ID);
    expect(parsed.generatedDate).toBe(PHASE_B_MECHANISM_EVIDENCE_DATE);
    expect(parsed.developmentOnly).toBe(true);
    expect(parsed.claimAllowed).toBe(false);
    expect(parsed.summaryMaterialSha256).toMatch(SHA256);
    const { summaryMaterialSha256, ...summaryMaterial } = parsed;
    expect(summaryMaterialSha256).toBe(artifactMaterialSha256(summaryMaterial));
    expect(parsed.schemaVersion).toBe(4);
    expect(parsed.evidencePrecisionLaw).toEqual(PHASE_B_EVIDENCE_PRECISION_LAW);
    expect(parsed.artifactLocalHashLaw).toEqual(PHASE_B_ARTIFACT_LOCAL_HASH_LAW);
    expect(canonicalizePhaseBEvidence(parsed.temporal)).toEqual(parsed.temporal);
    expect(canonicalizePhaseBEvidence(parsed.nhi)).toEqual(parsed.nhi);

    expect(parsed.temporal.hashes).toEqual({
      seedFamiliesSha256: 'a14179926f8fd43041b773790dc3bd62dcc5dc5bafc41db4a86fe4ea03794688',
      configurationSha256: 'e9d41c9ed838375f848867fd05e71ee895868feb8b5d64044a9015bf6ec73479',
      rowsSha256: '241f61fee25f4d48462135083cecedd55cd60f36178dacd56a843de6121226c4',
    });
    expect(parsed.temporal.rows).toEqual({
      configured: 46_080,
      retained: 46_080,
      inference: 36_864,
      filteredByOutcome: 0,
    });
    expect(parsed.temporal.advancementGate.passed).toBe(false);
    expect(parsed.temporal.advancementGate.failedCriteria).toEqual([
      'mean-sse-gain',
      'median-model-gain',
      'every-delay-mean-gain',
      'twin-margin',
      'ordering-rate',
      'holm-adjusted-p',
      'bootstrap-99-lower',
      'worst-model-gain',
    ]);
    expect(parsed.temporal.advancementGate.criteria).toHaveLength(8);
    expect(parsed.temporal.advancementGate.criteria.every((criterion) => !criterion.passed)).toBe(
      true,
    );
    expect(parsed.temporal.pairedControlContrasts).toHaveLength(10);
    expect(parsed.temporal.pairedControlContrasts.every((contrast) => !contrast.passes)).toBe(true);
    expect(Object.values(parsed.temporal.claimProhibitions).every((allowed) => !allowed)).toBe(
      true,
    );
    expect(parsed.temporal.advancementGate.thresholds).toEqual({
      meanSseGain: 0.04,
      medianModelGain: 0.03,
      everyDelayMeanGain: 0.02,
      meanTwinMargin: 0.2,
      orderingRate: 0.75,
      holmAdjustedPExclusiveMaximum: 0.01,
      bootstrap99LowerExclusiveMinimum: 0,
      worstModelGain: -0.01,
      rowsFilteredByOutcome: 0,
    });
    expect(parsed.temporal.advancementGate.observed).toEqual({
      minimumControlMeanSseGain: -0.008091,
      minimumControlMedianModelGain: -0.007411,
      minimumDelayMeanSseGain: -0.014588,
      meanTwinMargin: 0.000118,
      orderingRate: 0.5,
      maximumHolmAdjustedPValue: 1,
      minimumBootstrap99Lower: -0.010691,
      worstModelGain: -0.017918,
      rowsFilteredByOutcome: 0,
    });
  });

  test('retains NHI validation diagnostics, scoped action lanes, control integrity, and prohibitions', () => {
    const nhi = built.summary.nhi;
    expect(nhi.hashes).toEqual({
      selectedSeedFamiliesSha256:
        'ab86f694abcf079ed0ab44aaf97c5cf3fc4ae709d1d8b0580ed4f87dadfc3408',
      globalSeedFamilySha256: '469f79e59c29639034afb4aea2bf6b0e3a82f2a3f3303b7fb3c9efa7ec443b8a',
      protocolHashScope: 'configuration-and-declared-laws-not-source-blob-closure',
      configurationAndDeclaredLawsSha256:
        'bfff6581b8e3e032c596a114ef3bfc86c7d5067537efe24043d5d731a09e0f0c',
      scheduleSha256: '8acb60a51bbef06bbf238f8b365f8b9f2d61314850909ff109cbbf70514f617f',
      rowsSha256: 'd3d364fc2cba7ae4eb2ebfefb2819ceaa55dbe1b5edb201163a5aa08b8cdb3e0',
      faultProbesSha256: 'e08e5609aaadd14186794a56f0bf027a788fa96f6ce3400bf3118c835a59e8ad',
    });
    expect(nhi.rows).toEqual({ configured: 41_472, retained: 41_472, dropped: 0 });
    expect(nhi.validationArmSummaries).toHaveLength(9);
    expect(nhi.validationPairedComparisons).toHaveLength(8);
    expect(nhi.validationActionSemanticContrasts).toHaveLength(4);
    expect(nhi.controlIntegrity.semanticShuffleFixedPointCount).toBe(0);
    expect(nhi.controlIntegrity.invalidYokeTargetCount).toBe(0);
    expect(
      nhi.controlIntegrity.validationTargetValidityRates.every(
        ({ validTargetRate }) => validTargetRate === 1,
      ),
    ).toBe(true);

    const supported = nhi.validationActionSemanticContrasts
      .filter(({ neuralSemanticInterpretationAllowed }) => neuralSemanticInterpretationAllowed)
      .map(({ actionLabel, supportedNeuralSemanticLane }) => [
        actionLabel,
        supportedNeuralSemanticLane,
      ]);
    expect(supported).toEqual([
      ['SPAWN', 'social-to-spawn'],
      ['HUNT', 'resource-to-hunt'],
    ]);
    const unsupported = nhi.validationActionSemanticContrasts
      .filter(({ neuralSemanticInterpretationAllowed }) => !neuralSemanticInterpretationAllowed)
      .map(({ actionLabel }) => actionLabel);
    expect(unsupported).toEqual(['DOMINATE', 'MANIPULATE']);
    expect(
      Object.fromEntries(
        nhi.validationActionSemanticContrasts.map(
          ({ actionLabel, fullMinusNeuralSemanticAblated }) => [
            actionLabel,
            fullMinusNeuralSemanticAblated,
          ],
        ),
      ),
    ).toEqual({
      SPAWN: 0.002754,
      DOMINATE: 0.008847,
      HUNT: 0.008008,
      MANIPULATE: 0.012289,
    });
    for (const comparison of nhi.validationPairedComparisons) {
      const { sourceComparisonSha256, artifactComparisonMaterialSha256, ...displayedMaterial } =
        comparison;
      expect(sourceComparisonSha256).toMatch(SHA256);
      expect(artifactComparisonMaterialSha256).toMatch(SHA256);
      expect(artifactComparisonMaterialSha256).toBe(artifactMaterialSha256(displayedMaterial));
      expect(artifactComparisonMaterialSha256).not.toBe(sourceComparisonSha256);
      expect('comparisonSha256' in comparison).toBe(false);
    }
    for (const contrast of nhi.validationActionSemanticContrasts) {
      const { sourceContrastSha256, artifactContrastMaterialSha256, ...displayedMaterial } =
        contrast;
      expect(sourceContrastSha256).toMatch(SHA256);
      expect(artifactContrastMaterialSha256).toMatch(SHA256);
      expect(artifactContrastMaterialSha256).toBe(artifactMaterialSha256(displayedMaterial));
      expect(artifactContrastMaterialSha256).not.toBe(sourceContrastSha256);
      expect('contrastSha256' in contrast).toBe(false);
    }
    expect(Object.values(nhi.claimProhibitions).every((allowed) => allowed === false)).toBe(true);
    expect(Object.values(built.summary.artifactClaims).every((claim) => claim === false)).toBe(
      true,
    );
  });

  test('renders compact long-form CSV and an accessible, failure-visible SVG', () => {
    const csvLines = built.files.csv.trimEnd().split('\n');
    expect(csvLines[0]).toBe(
      'study,scope,metric,observed,threshold,comparison,status,interpretation',
    );
    expect(csvLines.filter((line) => line.startsWith('temporal,advancement-gate,')).length).toBe(8);
    expect(
      csvLines.filter((line) => line.includes(',fail,development-gate-failed-no-advancement'))
        .length,
    ).toBe(8);
    expect(built.files.csv).toContain('nhi,validation-action:HUNT');
    expect(built.files.csv).toContain('nhi,validation-action:SPAWN');
    expect(built.files.csv).toContain('unsupported-do-not-interpret');

    expect(built.files.svg).toContain('role="img"');
    expect(built.files.svg).toContain('aria-labelledby="phase-b-title phase-b-desc"');
    expect((built.files.svg.match(/data-gate-status="fail"/g) ?? []).length).toBe(8);
    for (const label of [
      'Minimum control mean SSE gain',
      'Minimum median model gain',
      'Minimum every-delay mean gain',
      'Mean cue/query twin margin',
      'Twin ordering rate',
      'Maximum Holm-adjusted p',
      'Minimum bootstrap 99% lower bound',
      'Worst independent-model gain',
    ]) {
      expect(built.files.svg).toContain(label);
    }
    expect(built.files.svg).toContain('NHI paired surface-conflict response · not adaptation');
    expect(built.files.svg).toContain('DECLINE -7.69e-4');
    expect((built.files.svg.match(/data-lane-support="supported-diagnostic"/g) ?? []).length).toBe(
      2,
    );
    expect((built.files.svg.match(/data-lane-support="unsupported"/g) ?? []).length).toBe(2);
    expect(built.files.svg).toContain('resource → HUNT');
    expect(built.files.svg).toContain('social → SPAWN');
    expect(built.files.svg).toContain('UNSUPPORTED · DO NOT INTERPRET');
    expect(built.files.svg).toContain('CONFIGURATION + DECLARED-LAWS HASH (NOT SOURCE CLOSURE)');
  });

  test('pins canonical artifact byte hashes and excludes ambient provenance APIs', async () => {
    expect(fileSha256(built.files.json)).toBe(
      '609d47367c7b2731f62c70f769f2daeb496657698a342c3a736088c1354ea333',
    );
    expect(fileSha256(built.files.csv)).toBe(
      '58cc6de6b5a542edb5a1c02093eaef99b89b8cbccb66d3fcfa63e4d51fa950ef',
    );
    expect(fileSha256(built.files.svg)).toBe(
      'cf4c81b10e53ee2be5f76194c2914406a345f0073a3c6825a7df1ad3508ba4b9',
    );
    const source = await Bun.file(
      'scripts/organism-intelligence-phase-b/mechanism-evidence-artifacts.ts',
    ).text();
    expect(source).toContain('contrast.neuralSemanticInterpretationAllowed');
    expect(source).not.toMatch(/laneCard\([^\n]+,\s*(?:true|false)\)/);
    expect(source).not.toMatch(/Date\.now|new Date\s*\(|performance\.now|fetch\s*\(|Bun\.spawn/);
    expect(source).not.toMatch(/child_process|node:os|process\.(?:platform|arch|version)/);
  });
});
