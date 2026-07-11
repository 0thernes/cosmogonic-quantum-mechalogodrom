import { describe, expect, test } from 'bun:test';

const ROOT = `${import.meta.dir}/..`;
const CANONICAL_AXES = [4, 2.2, 3.2, 3.8, 3.9, 4.5, 4.3, 3.5, 4];
const HISTORICAL_OPTIMISTIC_AXES = [4, 3.5, 5, 4, 4.5, 5, 4.5, 4.5, 5];

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
  indicatorOnly: boolean;
  claimBoundary: string;
  protocol: { heldOutSeeds: number[] };
  acceptanceCriteria?: { adaptationRelativeMedianImprovementMin?: number };
  adaptation: {
    relativeMedianImprovement: number;
    accepted: boolean;
  };
  corpusCausality: {
    integrated: number;
    integratedChanged: number;
    excluded: number;
    excludedExactZero: number;
    accepted: boolean;
  };
  claims: {
    operationalGoalUplift: boolean;
    adaptivePostReversalUplift: boolean;
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
  test('the held-out receipt blocks score uplift after missing the 5% adaptation threshold', async () => {
    const path = `${ROOT}/docs/reports/assets/organism-intelligence-causal-benchmark-v2.json`;
    const receipt = (await Bun.file(path).json()) as IntelligenceReceipt;
    const requiredImprovement =
      receipt.acceptanceCriteria?.adaptationRelativeMedianImprovementMin ?? 0.05;

    expect(receipt.protocol.heldOutSeeds).toHaveLength(30);
    expect(receipt.indicatorOnly).toBe(true);
    expect(receipt.claimBoundary.toLowerCase()).toContain('not phenomenal consciousness');
    expect(requiredImprovement).toBe(0.05);
    expect(receipt.adaptation.relativeMedianImprovement).toBeCloseTo(0.039129219926143224, 12);
    expect(receipt.adaptation.relativeMedianImprovement).toBeLessThan(requiredImprovement);
    expect(receipt.adaptation.accepted).toBe(false);
    expect(receipt.claims.operationalGoalUplift).toBe(true);
    expect(receipt.claims.adaptivePostReversalUplift).toBe(false);
    expect(receipt.claims.substrateSpecificUplift).toBe(false);
    expect(receipt.claims.quantumSpecificUplift).toBe(false);
    expect(receipt.claims.numericScoreUpliftAllowed).toBe(false);
    expect(receipt.corpusCausality).toMatchObject({
      integrated: 17,
      integratedChanged: 17,
      excluded: 5,
      excludedExactZero: 5,
      accepted: true,
    });

    const { contentSha256, ...body } = receipt;
    const computed = new Bun.CryptoHasher('sha256').update(JSON.stringify(body)).digest('hex');
    expect(contentSha256).toBe(computed);
  });

  test('both lab pages publish the operational receipt without relabeling static proxies', async () => {
    const paths = [`${ROOT}/lab/consciousness.html`, `${ROOT}/lab/sentience.html`];

    for (const path of paths) {
      const html = (await Bun.file(path).text()).toLowerCase();
      const prose = html.replace(/\s+/g, ' ');
      expect(prose).toContain('operational organism intelligence · held-out receipt');
      expect(prose).toContain('organism-intelligence-causal-benchmark-v2.json');
      expect(prose).toContain('below the preregistered 5% acceptance threshold');
      expect(prose).toContain('not sentience');
      expect(prose).toContain('scores remain frozen');
      expect(prose).toContain('static');
      expect(prose).toContain('no substrate-specific or quantum-specific uplift');
    }
  });
});
