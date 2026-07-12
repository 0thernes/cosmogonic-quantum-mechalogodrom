import { describe, expect, test } from 'bun:test';

const ROOT = `${import.meta.dir}/..`;
const CANONICAL_AXES = [4, 2.4, 3.2, 3.8, 4.4, 4.5, 4.3, 3.5, 4];
const HISTORICAL_OPTIMISTIC_AXES = [4, 3.5, 5, 4, 4.5, 5, 4.5, 4.5, 5];
const EXPECTED_CONSUMER_TEST_FILES = [
  'tests/operational-organism-intelligence.test.ts',
  'tests/alien-flora.test.ts',
  'tests/nhi.test.ts',
  'tests/glyph-brain.test.ts',
  'tests/wilderness.test.ts',
  'tests/tsotchke-facade.test.ts',
  'tests/shoggoths.test.ts',
  'tests/puppet-masters.test.ts',
  'tests/titans.test.ts',
  'tests/leviathans.test.ts',
];
const EXPECTED_CONSUMER_CLASSES = [
  'ordinary-entities',
  'alien-flora',
  'nhi',
  'glyph-beings',
  'wilderness-fauna',
  'primordial-digital-biologics',
  'shoggoths',
  'puppeteers',
  'titans',
  'leviathans',
];

interface AlifeStats {
  generatedFrom: string;
  perAxis: { cosmo: number }[];
}

interface AlifeSensitivity {
  canonicalSource: string;
  historicalSelfScored: { axes: number[]; breadth: number };
  canonicalCodeGrounded: { axes: number[]; breadth: number };
  deltas: { basis: string; breadth: number };
}

interface IntelligenceReceipt {
  taskVersion: string;
  indicatorOnly: boolean;
  claimBoundary: string;
  provenance: { runtimeBaseCommit: string; benchmarkScriptSha256: string };
  protocol: {
    evaluationSeeds: number[];
    evaluationSeedPolicy: string;
    controls: string[];
  };
  acceptanceCriteria: { adaptationRelativeMedianImprovementMin: number };
  goalResponse: {
    enhancedMinusDisabled: { mean: number; bootstrap95: [number, number] };
    goalOnlyMinusLegacy: { mean: number; bootstrap95: [number, number] };
    enhancedMinusRandom: { mean: number; bootstrap95: [number, number] };
    acceptedAgainstDisabled: boolean;
    acceptedAgainstRandom: boolean;
    aggregateChannelMappingSpecific: boolean;
    uniformExplorationSurrogateSpecific: boolean;
  };
  adaptation: {
    relativeMedianImprovement: number;
    accepted: boolean;
  };
  corpusCausality: {
    evaluatedSeeds: number;
    integrated: number;
    integratedChanged: number;
    excluded: number;
    excludedExactZero: number;
    accepted: boolean;
  };
  numericalSafety: {
    forcedSteps: number;
    allFiniteAndBounded: boolean;
    finalRevision: number;
    accepted: boolean;
  };
  performance: {
    incrementalEntityMedianMs: number;
    incrementalEntityWorstBatchMs: number;
    repeatProcesses: number;
    repeatBatches: number;
    totalBatches: number;
    samplesPerBranchPerBatch: number;
    medianBudgetMet: boolean;
    stableAcrossBatches: boolean;
    accepted: boolean;
    orderCounterbalanced: boolean;
    branchStateIsolated: boolean;
  };
  consumerCoverage: {
    evidenceKind: string;
    evidenceTestFiles: string[];
    evidenceRun: {
      command: string[];
      exitCode: number;
      passedTests: number;
      failedTests: number;
      expectCalls: number;
    };
    directMatchedCounterfactuals: string[];
    sourcePathOnly: string[];
    accepted: boolean;
  };
  claims: {
    goalControllerUplift: boolean;
    corpusConditionedGoalUplift: boolean;
    beatsRandomPolicy: boolean;
    operationalGoalUplift: boolean;
    adaptivePostReversalUplift: boolean;
    allIntegratedReposCausal: boolean;
    numericalSafetyGateMet: boolean;
    everyConsumerCounterfactualGateMet: boolean;
    performanceMedianBudgetMet: boolean;
    performanceBudgetMet: boolean;
    performanceStabilityGateMet: boolean;
    aggregateChannelMappingSpecificUplift: boolean;
    uniformExplorationSurrogateSpecificUplift: boolean;
    substrateSpecificUplift: boolean;
    quantumSpecificUplift: boolean;
    numericScoreUpliftAllowed: boolean;
  };
  contentSha256: string;
}

describe('public A-Life profile freshness', () => {
  test('the canonical code-grounded vector agrees across CSV and generated receipts', async () => {
    const csv = await Bun.file(
      `${ROOT}/docs/reports/2026-06-26-alife-comparison-matrix.csv`,
    ).text();
    const cosmogonic = csv
      .split(/\r?\n/)
      .find((line) => line.startsWith('Cosmogonic Quantum Mechalogodrom,'));
    expect(cosmogonic).toBeDefined();
    const csvAxes = cosmogonic!
      .split(',')
      .slice(3, 12)
      .map((value) => Number(value));

    const stats = (await Bun.file(
      `${ROOT}/docs/reports/assets/alife-stats.json`,
    ).json()) as AlifeStats;
    const sensitivity = (await Bun.file(
      `${ROOT}/docs/reports/assets/alife-codeground.json`,
    ).json()) as AlifeSensitivity;

    expect(csvAxes).toEqual(CANONICAL_AXES);
    expect(stats.generatedFrom).toBe('docs/reports/2026-06-26-alife-comparison-matrix.csv');
    expect(stats.perAxis.map((axis) => axis.cosmo)).toEqual(csvAxes);
    expect(sensitivity.canonicalSource).toBe(stats.generatedFrom);
    expect(sensitivity.canonicalCodeGrounded.axes).toEqual(csvAxes);
  });

  test('the superseded optimistic vector is historical, not mislabeled as the current CSV row', async () => {
    const sensitivity = (await Bun.file(
      `${ROOT}/docs/reports/assets/alife-codeground.json`,
    ).json()) as AlifeSensitivity;

    expect(sensitivity.historicalSelfScored.axes).toEqual(HISTORICAL_OPTIMISTIC_AXES);
    expect(sensitivity.canonicalCodeGrounded.axes).toEqual(CANONICAL_AXES);
    expect(sensitivity.deltas.basis).toBe('canonical-minus-historical');
    expect(sensitivity.canonicalCodeGrounded.breadth).toBeLessThan(
      sensitivity.historicalSelfScored.breadth,
    );
    expect(sensitivity.deltas.breadth).toBeLessThan(0);
  });
});

describe('organism-intelligence claim boundary', () => {
  test('v3 uses disjoint fixed seeds and blocks uplift on random and specificity gates', async () => {
    const path = `${ROOT}/docs/reports/assets/organism-intelligence-causal-benchmark-v3.json`;
    const receipt = (await Bun.file(path).json()) as IntelligenceReceipt;
    const requiredImprovement = receipt.acceptanceCriteria.adaptationRelativeMedianImprovementMin;

    expect(receipt.taskVersion).toBe('organism-intelligence-v3-disjoint-synthetic-goal-evaluation');
    expect(receipt.protocol.evaluationSeeds).toHaveLength(30);
    expect(new Set(receipt.protocol.evaluationSeeds).size).toBe(30);
    expect(receipt.protocol.evaluationSeedPolicy).toContain('not external preregistration');
    expect(receipt.protocol.controls).toContain('substrate-disabled-goal-preserved');
    expect(receipt.protocol.controls).toContain('four-aggregate-channel-cyclic-rotation');
    expect(receipt.protocol.controls).toContain(
      'uniform-final-exploration-surrogate-not-entropy-matched',
    );
    expect(receipt.protocol.controls).toContain('uniform-random-action-baseline');
    expect(receipt.indicatorOnly).toBe(true);
    expect(receipt.claimBoundary.toLowerCase()).toContain('not phenomenal consciousness');
    expect(requiredImprovement).toBe(0.05);
    expect(receipt.adaptation.relativeMedianImprovement).toBeCloseTo(0.06121266720602802, 12);
    expect(receipt.adaptation.relativeMedianImprovement).toBeGreaterThan(requiredImprovement);
    expect(receipt.adaptation.accepted).toBe(true);
    expect(receipt.claimBoundary).toContain('synthetic +x goal field');
    expect(receipt.claimBoundary).toContain('not a flora/resource simulation');
    expect(receipt.goalResponse.enhancedMinusDisabled.mean).toBeGreaterThan(0);
    expect(receipt.goalResponse.enhancedMinusDisabled.bootstrap95[0]).toBeGreaterThan(0);
    expect(receipt.goalResponse.goalOnlyMinusLegacy.mean).toBeGreaterThan(0);
    expect(receipt.goalResponse.goalOnlyMinusLegacy.bootstrap95[0]).toBeGreaterThan(0);
    expect(receipt.goalResponse.acceptedAgainstDisabled).toBe(true);
    expect(receipt.goalResponse.enhancedMinusRandom.mean).toBeGreaterThan(0);
    expect(receipt.goalResponse.enhancedMinusRandom.bootstrap95[0]).toBeLessThanOrEqual(0);
    expect(receipt.goalResponse.acceptedAgainstRandom).toBe(false);
    expect(receipt.goalResponse.aggregateChannelMappingSpecific).toBe(false);
    expect(receipt.goalResponse.uniformExplorationSurrogateSpecific).toBe(false);
    expect(receipt.claims.goalControllerUplift).toBe(true);
    expect(receipt.claims.corpusConditionedGoalUplift).toBe(true);
    expect(receipt.claims.beatsRandomPolicy).toBe(false);
    expect(receipt.claims.operationalGoalUplift).toBe(false);
    expect(receipt.claims.adaptivePostReversalUplift).toBe(true);
    expect(receipt.claims.allIntegratedReposCausal).toBe(true);
    expect(receipt.claims.numericalSafetyGateMet).toBe(true);
    expect(receipt.claims.everyConsumerCounterfactualGateMet).toBe(true);
    expect(receipt.claims.performanceMedianBudgetMet).toBe(true);
    expect(receipt.claims.performanceBudgetMet).toBe(true);
    expect(receipt.claims.performanceStabilityGateMet).toBe(true);
    expect(receipt.claims.aggregateChannelMappingSpecificUplift).toBe(false);
    expect(receipt.claims.uniformExplorationSurrogateSpecificUplift).toBe(false);
    expect(receipt.claims.substrateSpecificUplift).toBe(false);
    expect(receipt.claims.quantumSpecificUplift).toBe(false);
    expect(receipt.claims.numericScoreUpliftAllowed).toBe(false);
    expect(receipt.corpusCausality).toMatchObject({
      evaluatedSeeds: 30,
      integrated: 17,
      integratedChanged: 17,
      excluded: 5,
      excludedExactZero: 5,
      accepted: true,
    });
    expect(receipt.numericalSafety).toEqual({
      forcedSteps: 10_000,
      allFiniteAndBounded: true,
      finalRevision: 10_000,
      accepted: true,
    });
    expect(receipt.performance.repeatProcesses).toBe(3);
    expect(receipt.performance.repeatBatches).toBe(10);
    expect(receipt.performance.totalBatches).toBe(30);
    expect(receipt.performance.samplesPerBranchPerBatch).toBe(7);
    expect(receipt.performance.incrementalEntityMedianMs).toBeLessThan(3);
    expect(receipt.performance.incrementalEntityWorstBatchMs).toBeLessThan(3);
    expect(receipt.performance.medianBudgetMet).toBe(true);
    expect(receipt.performance.stableAcrossBatches).toBe(true);
    expect(receipt.performance.accepted).toBe(true);
    expect(receipt.performance.orderCounterbalanced).toBe(true);
    expect(receipt.performance.branchStateIsolated).toBe(true);
    expect(receipt.consumerCoverage.evidenceKind).toBe(
      'targeted-bun-test-run-plus-exact-test-suite-inventory',
    );
    expect(receipt.consumerCoverage.evidenceTestFiles).toEqual(EXPECTED_CONSUMER_TEST_FILES);
    expect(receipt.consumerCoverage.directMatchedCounterfactuals).toEqual(
      EXPECTED_CONSUMER_CLASSES,
    );
    expect(receipt.consumerCoverage.evidenceRun.command).toEqual([
      'bun',
      'test',
      ...EXPECTED_CONSUMER_TEST_FILES,
    ]);
    expect(receipt.consumerCoverage.evidenceRun.exitCode).toBe(0);
    expect(receipt.consumerCoverage.evidenceRun.passedTests).toBeGreaterThan(0);
    expect(receipt.consumerCoverage.evidenceRun.failedTests).toBe(0);
    expect(receipt.consumerCoverage.evidenceRun.expectCalls).toBeGreaterThan(0);
    for (const evidencePath of receipt.consumerCoverage.evidenceTestFiles) {
      expect(await Bun.file(`${ROOT}/${evidencePath}`).exists()).toBe(true);
    }
    expect(receipt.consumerCoverage.sourcePathOnly).toEqual([]);
    expect(receipt.consumerCoverage.accepted).toBe(true);

    const v1 = (await Bun.file(
      `${ROOT}/docs/reports/assets/organism-intelligence-causal-benchmark.json`,
    ).json()) as { protocol: { heldOutSeeds: number[] } };
    const v2 = (await Bun.file(
      `${ROOT}/docs/reports/assets/organism-intelligence-causal-benchmark-v2.json`,
    ).json()) as { protocol: { heldOutSeeds: number[] } };
    const priorSeeds = new Set([...v1.protocol.heldOutSeeds, ...v2.protocol.heldOutSeeds]);
    expect(receipt.protocol.evaluationSeeds.filter((seed) => priorSeeds.has(seed))).toEqual([]);

    const benchmarkSource = await Bun.file(
      `${ROOT}/scripts/organism-intelligence-benchmark.ts`,
    ).text();
    const benchmarkHash = new Bun.CryptoHasher('sha256').update(benchmarkSource).digest('hex');
    expect(receipt.provenance.benchmarkScriptSha256).toBe(benchmarkHash);

    expect(receipt.provenance.runtimeBaseCommit).toMatch(/^[0-9a-f]{40}$/);
    const frozenSources = new Map<string, string>();
    for (const sourcePath of [
      'src/sim/entity-brain.ts',
      'scripts/organism-intelligence-benchmark.ts',
    ]) {
      const committedSource = Bun.spawnSync(
        ['git', 'show', `${receipt.provenance.runtimeBaseCommit}:${sourcePath}`],
        { cwd: ROOT },
      );
      expect(committedSource.exitCode).toBe(0);
      frozenSources.set(sourcePath, committedSource.stdout.toString().replaceAll('\r\n', '\n'));
    }
    // The V3 benchmark remains frozen and hash-pinned. Runtime code may evolve in a later protocol;
    // the receipt's commit—not an impossible forever-equality rule—preserves the exact V3 source.
    expect(frozenSources.get('scripts/organism-intelligence-benchmark.ts')).toBe(
      (await Bun.file(`${ROOT}/scripts/organism-intelligence-benchmark.ts`).text()).replaceAll(
        '\r\n',
        '\n',
      ),
    );
    expect(frozenSources.get('src/sim/entity-brain.ts')).toContain('private corpusU = 0');
    expect(await Bun.file(`${ROOT}/src/sim/entity-brain.ts`).text()).toContain(
      'private readonly semanticContext',
    );

    const { contentSha256, ...body } = receipt;
    const computed = new Bun.CryptoHasher('sha256').update(JSON.stringify(body)).digest('hex');
    expect(contentSha256).toBe(computed);

    const report = await Bun.file(
      `${ROOT}/docs/reports/2026-07-10-OPERATIONAL-ORGANISM-INTELLIGENCE-CAUSAL-AUDIT.md`,
    ).text();
    const verification = await Bun.file(`${ROOT}/docs/VERIFICATION-ANALYTICAL-DATA.md`).text();
    expect(report).toContain(contentSha256);
    expect(verification).toContain(contentSha256);
  });

  test('both lab pages publish the V4 descendant without relabeling static proxies', async () => {
    const receipt = (await Bun.file(
      `${ROOT}/docs/reports/assets/organism-intelligence-causal-benchmark-v4.json`,
    ).json()) as { contentSha256: string };
    const paths = [`${ROOT}/lab/consciousness.html`, `${ROOT}/lab/sentience.html`];

    for (const path of paths) {
      const html = (await Bun.file(path).text()).toLowerCase();
      const prose = html.replace(/\s+/g, ' ');
      expect(html).toContain(`data-receipt-sha="${receipt.contentSha256}"`);
      expect(prose).toContain('operational organism intelligence · v4 phase-a receipt');
      expect(prose).toContain('organism-intelligence-causal-benchmark-v4.json');
      expect(prose).toContain('cross-being-neural-causality-v1.csv');
      expect(prose).toContain('organism-intelligence-v4-cross-being-forest.svg');
      expect(prose).toContain('all 1,152 raw rows over 64 frozen seeds');
      expect(prose).toContain('ordinary organisms and petri biologics passed inference');
      expect(prose).toContain('adaptive ecology predictor lost to frozen and shuffled controls');
      expect(prose).toContain('titans alone passed');
      expect(prose).toContain('one family pass is not an overall v4 pass');
      expect(prose).toContain('not sentience');
      expect(prose).toContain('numeric scores remain frozen');
      expect(prose).toContain('neural scaling');
      expect(prose).toContain('v3 predecessor');
    }
  });

  test('docs, specification, and bible retain V3 while exposing the V4 descendant', async () => {
    for (const name of ['docs.html', 'specs.html', 'bible.html']) {
      const prose = (await Bun.file(`${ROOT}/${name}`).text()).toLowerCase().replace(/\s+/g, ' ');
      expect(prose).toContain(
        'docs/reports/2026-07-10-operational-organism-intelligence-causal-audit.md',
      );
      expect(prose).toContain('docs/reports/assets/organism-intelligence-causal-benchmark-v3.json');
      expect(prose).toContain('corpus-conditioned goal-response');
      expect(prose).toContain('three-process/30-batch performance gates');
      expect(prose).toContain('no numeric a-life-score uplift');
      expect(prose).toContain('organism-intelligence-v4-results-2026-07-11.md');
      expect(prose).toContain('organism-intelligence-causal-benchmark-v4.json');
      expect(prose).toContain('cross-being-neural-causality-v1.csv');
      expect(prose).toContain('organism-intelligence-v4-cross-being-forest.svg');
    }
  });

  test('Phase-B public truth surfaces retain every rejected stage and the V3 falsification boundary', async () => {
    const adr = (
      await Bun.file(`${ROOT}/docs/adr/0015-phase-b-neural-semantic-expansion-2026-07-11.md`).text()
    )
      .toLowerCase()
      .replace(/\s+/g, ' ');
    expect(adr).toContain('4,224/4,224 rows retained');
    expect(adr).toContain('fails to demonstrate temporal-context benefit');
    expect(adr).toContain('exactly the same 34/384');
    expect(adr).toContain('yoked surrogate is higher at 50/384');
    expect(adr).toContain('no successor protocol');
    expect(adr).toContain('no successor protocol, manifest, confirmatory seed family');
    expect(adr).toContain('b09a4f5e02b1d1eccaf8341e21cfabac8054efa4e99417b0021478ecad6d25de');
    expect(adr).toContain('309b6b4eff1b5fadacf6184e6436551148f05a0fa0495991b17b44000d95fe53');
    expect(adr).toContain('ecology-development-hash-fixed-decimal-1e-9-v1');
    expect(adr).toContain('ordinary-resource-development-v2-hash-fixed-decimal-1e-9-v1');
    expect(adr).toContain('46,080/46,080 rows');
    expect(adr).toContain('fails all eight frozen criteria');
    expect(adr).toContain('41,472/41,472 rows');
    expect(adr).toContain('hunt/resource');
    expect(adr).toContain('spawn/social');
    expect(adr).toContain('no adaptation or broad claim');
    expect(adr).toContain('bfff6581b8e3e032c596a114ef3bfc86c7d5067537efe24043d5d731a09e0f0c');
    expect(adr).toContain('43f26e8b224449db588dd56ba5dd16c7f37c579e396a5689421e5545ee35db06');

    for (const path of ['README.md', 'docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md', 'specs.html']) {
      const prose = (await Bun.file(`${ROOT}/${path}`).text()).toLowerCase().replace(/\s+/g, ' ');
      expect(prose).toContain('phase-b-mechanism-development-v3-2026-07-11.md');
      expect(prose).toContain('phase-b-mechanism-development-v3.svg');
      expect(prose).toContain('41,472');
      expect(prose).toContain('46,080');
      expect(prose).toContain('hunt/resource');
      expect(prose).toContain('spawn/social');
      expect(prose).toContain('consciousness');
      expect(prose).toContain('sentience');
    }

    const report = await Bun.file(
      `${ROOT}/docs/reports/PHASE-B-MECHANISM-DEVELOPMENT-V3-2026-07-11.md`,
    ).text();
    expect(report).toContain('a509e241d9393bc807312fe994815f1fe988590112fc31736854992ede93ec83');
    expect(report).toContain('eafef6d180c350b103f7a4fd33f57325a4acdb650ccd7aaea6490f33dd7f476c');
    expect(report).toContain('bf7bb362d472aee5e848c2ef9d13b44c56a44c6af86e27e1568943a07f84af47');
    expect(report).toContain('phase-b-rounded-material-canonical-json-sha256-v1');
    expect(report).toContain('resourceCleanupStatus');
    expect(report).toContain('caller-owned decision-RNG state');
    expect(report).toContain('the RNG is not serialized');
  });
});
