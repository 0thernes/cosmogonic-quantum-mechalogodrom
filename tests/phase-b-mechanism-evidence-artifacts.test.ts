import { beforeAll, describe, expect, test } from 'bun:test';
import { statSync } from 'node:fs';
import {
  buildPhaseBMechanismEvidenceArtifacts,
  checkPhaseBMechanismEvidenceArtifacts,
  PHASE_B_MECHANISM_EVIDENCE_DATE,
  PHASE_B_MECHANISM_EVIDENCE_ID,
  PHASE_B_MECHANISM_EVIDENCE_PATHS,
  renderPhaseBMechanismEvidenceArtifacts,
} from '../scripts/organism-intelligence-phase-b/mechanism-evidence-artifacts';

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

    expect(parsed.temporal.hashes).toEqual({
      seedFamiliesSha256: 'a14179926f8fd43041b773790dc3bd62dcc5dc5bafc41db4a86fe4ea03794688',
      configurationSha256: '01afdd9d4983cc63652dd5bb266a5142bdf66f9ecf05a8e9d7c100216091a384',
      rowsSha256: '76e6d40fb6fc548bb2475e9b38e46646b8641756c45f4bc6fea2915e4b5ff48f',
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
      minimumControlMeanSseGain: -0.00809143052302232,
      minimumControlMedianModelGain: -0.007411638567394595,
      minimumDelayMeanSseGain: -0.014588363623341592,
      meanTwinMargin: 0.00011818860661448622,
      orderingRate: 0.5,
      maximumHolmAdjustedPValue: 1,
      minimumBootstrap99Lower: -0.010691272174589221,
      worstModelGain: -0.017918081632547704,
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
      rowsSha256: '43f26e8b224449db588dd56ba5dd16c7f37c579e396a5689421e5545ee35db06',
      faultProbesSha256: '2ba8bb51fa2c5d212cc51afd58883b4a8ecc0a62c0ad1f784ebd85b83c61670c',
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
      SPAWN: 0.01703813420416366,
      DOMINATE: 0.007297740406568413,
      HUNT: 0.018742616897973855,
      MANIPULATE: -0.0016959499927223232,
    });
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
    expect(built.files.svg).toContain('DECLINE -0.0133');
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
      '3122e53b2a95de2c665913ba976e33587a0b1e6e88f804597535d0fe51931b25',
    );
    expect(fileSha256(built.files.csv)).toBe(
      '916240cdca6f9ad8d9e0403d86e6e1fc82d4881a83effd288a982c517d38c015',
    );
    expect(fileSha256(built.files.svg)).toBe(
      'bf7bb362d472aee5e848c2ef9d13b44c56a44c6af86e27e1568943a07f84af47',
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
