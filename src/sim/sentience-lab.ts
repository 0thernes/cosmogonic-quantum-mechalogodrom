/**
 * SENTIENCE LAB - headless analytics over the consciousness indicator kernel.
 *
 * This is the second lab surface: no dome renderer, no visual simulation loop, no subjective-experience
 * assertion. It mass-runs deterministic seeds, records null gaps and ablation effects, and exports compact
 * telemetry traces for charts, reports, and AI analysis.
 */
import {
  ConsciousnessKernel,
  FRAMEWORK_IDS,
  FRAMEWORKS,
  type ConsciousnessFrameworkId,
} from './consciousness-kernel';
import {
  DEFAULT_ENTITY_CONSCIOUSNESS_PROFILES,
  buildEntityConsciousnessRecord,
  signalsFromEntityProfile,
  type EntityConsciousnessProfile,
} from './consciousness-adapters';
import { runConsciousnessLab, type LabReport } from './consciousness-lab';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const round = (v: number, digits = 6): number => Number(v.toFixed(digits));

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
}

function std(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length);
}

export interface SentienceRunSummary {
  seed: number;
  structuredIndex: number;
  nullIndex: number;
  nullGap: number;
  structuredConvergence: number;
  nullConvergence: number;
  convergenceGap: number;
  rewardGap: number;
  events: number;
  peakMoving: number;
  singularityProven: boolean;
  ablationProven: boolean;
  emergenceProven: boolean;
}

export interface SentienceFrameworkAggregate {
  id: ConsciousnessFrameworkId;
  name: string;
  bucket: string;
  source: string;
  meanAblationLoss: number;
  meanCausalEffect: number;
  meanNullSeparation: number;
  connectedness: number;
  loadBearingRate: number;
}

export interface SentienceTelemetryPoint {
  tick: number;
  index: number;
  convergence: number;
  emergence: number;
  moving: number;
  coherence: number;
  nullMargin: number;
  eventCount: number;
}

export interface SentienceEntityTelemetry {
  id: string;
  kind: string;
  label: string;
  seed: number;
  activeFrameworks: number;
  dominantFramework: ConsciousnessFrameworkId;
  weakestPresentFramework: ConsciousnessFrameworkId | null;
  meanIndex: number;
  peakIndex: number;
  finalIndex: number;
  volatility: number;
  slope: number;
  eventCount: number;
  trace: readonly SentienceTelemetryPoint[];
}

export interface SentienceEntityFrameworkEdge {
  entityId: string;
  frameworkId: ConsciousnessFrameworkId;
  weight: number;
  status: string;
}

export interface SentienceLabData {
  version: 'sentience-lab-v1';
  generatedAt: '2026-07-07T00:00:00.000Z';
  claim: 'indicatorOnly';
  proofBoundary: string;
  rootSeed: number;
  seedBatch: readonly number[];
  sourceDocs: readonly string[];
  sweep: {
    runs: number;
    singularityRate: number;
    ablationRate: number;
    emergenceRate: number;
    meanStructuredIndex: number;
    meanNullIndex: number;
    meanNullGap: number;
    meanConvergenceGap: number;
    meanRewardGap: number;
    eventTotal: number;
  };
  runSummaries: readonly SentienceRunSummary[];
  frameworkAggregates: readonly SentienceFrameworkAggregate[];
  entityTelemetry: readonly SentienceEntityTelemetry[];
  entityFrameworkEdges: readonly SentienceEntityFrameworkEdge[];
  exportSchema: readonly string[];
}

export function sentienceSeedBatch(rootSeed = 0x20260704, count = 32): readonly number[] {
  const seeds: number[] = [];
  let x = rootSeed >>> 0 || 1;
  for (let i = 0; i < count; i++) {
    x = (Math.imul(x ^ (0x9e3779b9 + i), 1664525) + 1013904223) >>> 0;
    seeds.push(x || i + 1);
  }
  return Object.freeze(seeds);
}

function summarizeReport(report: LabReport): SentienceRunSummary {
  return {
    seed: report.seed,
    structuredIndex: round(report.structured.meanIndex),
    nullIndex: round(report.nullShuffled.meanIndex),
    nullGap: round(clamp01(report.structured.meanIndex - report.nullShuffled.meanIndex)),
    structuredConvergence: round(report.structured.meanConvergence),
    nullConvergence: round(report.nullShuffled.meanConvergence),
    convergenceGap: round(
      clamp01(report.structured.meanConvergence - report.nullShuffled.meanConvergence),
    ),
    rewardGap: round(clamp01(report.structured.meanReward - report.nullShuffled.meanReward)),
    events: report.structured.eventCount,
    peakMoving: report.structured.peakMoving,
    singularityProven: report.singularityProven,
    ablationProven: report.ablationProven,
    emergenceProven: report.emergenceProven,
  };
}

function aggregateFrameworks(
  reports: readonly LabReport[],
): readonly SentienceFrameworkAggregate[] {
  return FRAMEWORK_IDS.map((id, i) => {
    const meta = FRAMEWORKS[id];
    const stats = reports.map((r) => r.frameworks[i]!);
    return {
      id,
      name: meta.name,
      bucket: meta.bucket,
      source: meta.source,
      meanAblationLoss: round(mean(stats.map((s) => s.ablationLoss))),
      meanCausalEffect: round(mean(stats.map((s) => s.causalEffect))),
      meanNullSeparation: round(mean(stats.map((s) => s.nullSeparation))),
      connectedness: round(mean(stats.map((s) => s.connectedness))),
      loadBearingRate: round(
        stats.filter((s) => s.ablationLoss > 0).length / Math.max(1, stats.length),
      ),
    };
  });
}

function entityTelemetry(
  profile: EntityConsciousnessProfile,
  labReport: LabReport,
  ticks: number,
  stride: number,
): SentienceEntityTelemetry {
  const record = buildEntityConsciousnessRecord(profile, labReport, ticks);
  const kernel = new ConsciousnessKernel(profile.seed ^ 0x51a11, {
    windowSize: 24,
    minMoving: 5,
  });
  const indices: number[] = [];
  const trace: SentienceTelemetryPoint[] = [];
  for (let tick = 0; tick < ticks; tick++) {
    kernel.ingest(signalsFromEntityProfile(profile, tick));
    indices.push(kernel.index);
    if (tick % stride === 0 || tick === ticks - 1) {
      const d = kernel.detection;
      trace.push({
        tick,
        index: round(kernel.index),
        convergence: round(kernel.convergence),
        emergence: round(kernel.emergence),
        moving: d.moving,
        coherence: round(d.coherence),
        nullMargin: round(d.nullMargin),
        eventCount: kernel.eventCount,
      });
    }
  }
  const q = Math.max(1, Math.floor(indices.length / 4));
  const first = mean(indices.slice(0, q));
  const last = mean(indices.slice(indices.length - q));
  return {
    id: profile.id,
    kind: profile.kind,
    label: profile.label,
    seed: profile.seed,
    activeFrameworks: record.activeFrameworks,
    dominantFramework: record.dominantFramework,
    weakestPresentFramework: record.weakestPresentFramework,
    meanIndex: round(mean(indices)),
    peakIndex: round(Math.max(...indices)),
    finalIndex: round(indices.at(-1) ?? 0),
    volatility: round(std(indices)),
    slope: round(last - first),
    eventCount: kernel.eventCount,
    trace,
  };
}

function entityFrameworkEdges(
  entities: readonly SentienceEntityTelemetry[],
  labReport: LabReport,
): readonly SentienceEntityFrameworkEdge[] {
  const records = DEFAULT_ENTITY_CONSCIOUSNESS_PROFILES.map((p) =>
    buildEntityConsciousnessRecord(p, labReport),
  );
  const keep = new Set(entities.map((e) => e.id));
  return records
    .filter((record) => keep.has(record.profile.id))
    .flatMap((record) =>
      record.snapshot.frameworks
        .filter((f) => f.status !== 'absent')
        .map((f) => ({
          entityId: record.profile.id,
          frameworkId: f.id,
          weight: round(f.score),
          status: f.status,
        })),
    );
}

export function generateSentienceLabData(rootSeed = 0x20260704, seedCount = 32): SentienceLabData {
  const seedBatch = sentienceSeedBatch(rootSeed, seedCount);
  const reports = seedBatch.map((seed) => runConsciousnessLab(seed));
  const runSummaries = reports.map(summarizeReport);
  const firstReport = reports[0] ?? runConsciousnessLab(rootSeed);
  const runCount = Math.max(1, reports.length);
  const entityTelemetryRows = DEFAULT_ENTITY_CONSCIOUSNESS_PROFILES.map((profile) =>
    entityTelemetry(profile, firstReport, 160, 4),
  );
  const gaps = runSummaries.map((r) => r.nullGap);
  const convergenceGaps = runSummaries.map((r) => r.convergenceGap);
  return {
    version: 'sentience-lab-v1',
    generatedAt: '2026-07-07T00:00:00.000Z',
    claim: 'indicatorOnly',
    proofBoundary:
      'Headless mass-run analytics over computational consciousness indicators; evidence of load-bearing mechanisms, not proof of phenomenal sentience.',
    rootSeed,
    seedBatch,
    sourceDocs: Object.freeze([
      'docs/CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.md',
      'docs/VERIFICATION-ANALYTICAL-DATA.md',
      'docs/SUPER-CREATURE-RESEARCH-2026-06-26.md',
    ]),
    sweep: {
      runs: reports.length,
      singularityRate: round(reports.filter((r) => r.singularityProven).length / runCount),
      ablationRate: round(reports.filter((r) => r.ablationProven).length / runCount),
      emergenceRate: round(reports.filter((r) => r.emergenceProven).length / runCount),
      meanStructuredIndex: round(mean(runSummaries.map((r) => r.structuredIndex))),
      meanNullIndex: round(mean(runSummaries.map((r) => r.nullIndex))),
      meanNullGap: round(mean(gaps)),
      meanConvergenceGap: round(mean(convergenceGaps)),
      meanRewardGap: round(mean(runSummaries.map((r) => r.rewardGap))),
      eventTotal: runSummaries.reduce((sum, r) => sum + r.events, 0),
    },
    runSummaries,
    frameworkAggregates: aggregateFrameworks(reports),
    entityTelemetry: entityTelemetryRows,
    entityFrameworkEdges: entityFrameworkEdges(entityTelemetryRows, firstReport),
    exportSchema: Object.freeze([
      'seed -> structured/null summary',
      'framework -> ablation/null/causal aggregate',
      'entity -> sampled index/convergence/emergence trace',
      'entity-framework -> weighted support edge',
    ]),
  };
}
