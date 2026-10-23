import { WildernessWebGpu } from '../../src/core/wilderness-webgpu';
import { simulateWildernessData, WildernessPopulation } from '../../src/sim/wilderness-population';
import { WorkerPool, type WorkerTask } from '../../src/core/worker-pool';
import {
  calibrateWildernessCompute,
  createWildernessCalibrationTasks,
} from '../../src/core/wilderness-compute';

interface Check {
  passed: boolean;
  name: string;
  detail?: unknown;
}
interface ValidationReport {
  status: 'passed' | 'failed';
  checks: Check[];
  benchmarks: unknown[];
  states: unknown[];
  [key: string]: unknown;
}

declare global {
  interface Window {
    runKernelValidation(): Promise<ValidationReport>;
    runIntegrationValidation(): Promise<ValidationReport>;
    diagnoseBoundary(): Promise<{
      status: 'passed' | 'failed';
      adapter: string;
      mismatches: unknown[];
    }>;
  }
}

function tasksFor(entities: number, adaptive = true): WorkerTask[] {
  const tasks: WorkerTask[] = [];
  for (let c = 0; c < Math.ceil(entities / 128); c++) {
    const n = Math.min(128, entities - c * 128),
      cx = (c % 7) - 3,
      cz = Math.floor(c / 7) - 4;
    const data = new Float32Array(n * 8);
    for (let i = 0; i < n; i++) {
      data.set(
        [
          cx * 100 + 2 + ((i * 17) % 96),
          -10 + ((i * 13) % 20),
          cz * 100 + 2 + ((i * 29) % 96),
          ((i % 3) - 1) * 4,
          ((i % 7) - 3) * 0.1,
          ((i % 5) - 2) * 3,
          i % 11,
          i % 4 === 0 ? -1 : i % 4 === 1 ? 4294967296 : i * 3389821,
        ],
        i * 8,
      );
    }
    tasks.push({
      id: `batch-${c}`,
      type: 'wilderness',
      data,
      seed: 123456 + c,
      dt: 1 / 60,
      chunkId: `${cx},${cz}`,
      intelligenceResource: adaptive ? 0.7 : 0,
      intelligenceThreat: adaptive ? 0.9 : 0,
      intelligenceExplore: adaptive ? 0.4 : 0,
    });
  }
  return tasks;
}
function cpu(tasks: readonly WorkerTask[]) {
  return tasks.map((task) => ({
    ...task,
    success: true,
    data: simulateWildernessData(
      task.data.slice(),
      task.seed,
      task.chunkId!,
      task.dt,
      100,
      task.intelligenceResource,
      task.intelligenceThreat,
      task.intelligenceExplore,
    ),
  }));
}
function compare(expected: { data: Float32Array }[], actual: { data: Float32Array }[]) {
  let maxPositionError = 0,
    maxVelocityError = 0,
    violations = 0,
    identityChanges = 0,
    nonFinite = 0;
  expected.forEach((e, t) =>
    e.data.forEach((value, i) => {
      const a = actual[t]?.data[i] ?? Number.NaN,
        lane = i % 8,
        error = Math.abs(value - a);
      if (!Number.isFinite(a)) nonFinite++;
      if (lane >= 6) {
        if (value !== a) identityChanges++;
      } else {
        const tolerance = (lane < 3 ? 2e-4 : 2e-5) + 2e-6 * Math.abs(value);
        if (error > tolerance) violations++;
        if (lane < 3) maxPositionError = Math.max(maxPositionError, error);
        else maxVelocityError = Math.max(maxVelocityError, error);
      }
    }),
  );
  return {
    maxPositionError,
    maxVelocityError,
    violations,
    identityChanges,
    nonFinite,
    passed: violations === 0 && identityChanges === 0 && nonFinite === 0,
  };
}
function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    samples: values,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    meanMs: values.reduce((a, b) => a + b, 0) / values.length,
  };
}

window.runKernelValidation = async () => {
  const report: ValidationReport = {
    status: 'failed',
    states: [],
    checkedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    logicalCpus: navigator.hardwareConcurrency,
    crossOriginIsolated,
    webNNAvailable: 'ml' in navigator,
    scope:
      'Bounded ambient wilderness kernel, real production WebGPU and CPU worker implementations. CPU and worker measurements include input-copy; GPU includes validation, packing, upload, dispatch, readback, and output-copy. No rendering, full World, or overall FPS measurement.',
    checks: [],
    benchmarks: [],
  };
  let gpu: WildernessWebGpu | null = null,
    pool: WorkerPool | null = null;
  const check = (passed: boolean, name: string, detail?: unknown) => {
    report.checks.push({ passed, name, detail });
  };
  try {
    const started = performance.now();
    gpu = await WildernessWebGpu.create({ timeoutMs: 5000 });
    report.gpuStartupMs = performance.now() - started;
    report.adapterDescription = gpu.adapterDescription;
    pool = new WorkerPool({ maxWorkers: 4, useSharedArrayBuffer: false, qualityTier: 'laptop' });
    await pool.initialize('/simulation-worker.js');
    const worker = async (tasks: readonly WorkerTask[]) =>
      Promise.all(tasks.map((task) => pool!.executeAsync({ ...task, data: task.data.slice() })));
    for (const adaptive of [false, true]) {
      for (const n of [1, 127, 128, 129, 1024, 8192]) {
        const tasks = tasksFor(n, adaptive),
          before = tasks.map((t) => Array.from(t.data));
        const expected = cpu(tasks),
          actual = await gpu.executeBatch(tasks),
          parity = compare(expected, actual);
        check(
          parity.passed,
          `${n} entities / ${adaptive ? 'adaptive' : 'legacy'} CPU-GPU parity`,
          parity,
        );
        check(
          tasks.every((t, i) => t.data.every((v, j) => v === before[i]![j])),
          `${n} entities input ownership preserved`,
        );
        const offthread = await worker(tasks),
          exact = expected.every((e, i) =>
            e.data.every((v, j) => Object.is(v, offthread[i]?.data[j])),
          );
        check(
          exact && offthread.every((r) => r.success),
          `${n} entities / ${adaptive ? 'adaptive' : 'legacy'} worker exact parity`,
        );
      }
    }
    const sequenceCpu = tasksFor(1024),
      sequenceGpu = tasksFor(1024);
    for (let tick = 0; tick < 32; tick++) {
      const c = cpu(sequenceCpu),
        g = await gpu.executeBatch(sequenceGpu);
      for (let i = 0; i < c.length; i++) {
        // Both complete batches retain the fixture's chunk count and ordering.
        sequenceCpu[i]!.data = c[i]!.data;
        sequenceGpu[i]!.data = g[i]!.data;
      }
      const parity = compare(c, g);
      check(parity.passed, `adaptive sequence step ${tick + 1}`, parity);
    }
    for (const dt of [0, -1, Number.NaN, 1]) {
      const tasks = tasksFor(128);
      tasks[0]!.dt = dt; // The 128-entity fixture contains exactly one task.
      const parity = compare(cpu(tasks), await gpu.executeBatch(tasks));
      check(parity.passed, `dt normalization ${String(dt)}`, parity);
    }
    check((await gpu.executeBatch([])).length === 0, 'empty batch returns empty');
    const malformed = tasksFor(1);
    malformed[0]!.data[0] = Number.NaN; // The one-entity fixture is nonempty.
    let rejected = false;
    try {
      await gpu.executeBatch(malformed);
    } catch {
      rejected = true;
    }
    check(rejected, 'nonfinite input rejected');
    for (const entities of [128, 1024, 8192]) {
      const tasks = tasksFor(entities),
        samples: Record<'main' | 'workers' | 'gpu', number[]> = { main: [], workers: [], gpu: [] };
      const run: Record<'main' | 'workers' | 'gpu', () => Promise<unknown> | unknown> = {
        main: () => cpu(tasks),
        workers: () => worker(tasks),
        gpu: () => gpu!.executeBatch(tasks),
      };
      for (let i = 0; i < 4; i++)
        for (const name of ['main', 'workers', 'gpu'] as const) await run[name]();
      for (let i = 0; i < 16; i++) {
        const order = ['main', 'workers', 'gpu'] as const;
        for (let j = 0; j < 3; j++) {
          const name = order[(i + j) % 3]!; // Modulo the three-entry order.
          const start = performance.now();
          await run[name]();
          samples[name].push(performance.now() - start);
        }
      }
      report.benchmarks.push({
        entities,
        chunks: tasks.length,
        workerCount: 4,
        warmups: 4,
        timedTrials: 16,
        results: Object.fromEntries(Object.entries(samples).map(([k, v]) => [k, summarize(v)])),
      });
    }
    gpu.dispose();
    let disposedReject = false;
    try {
      await gpu.executeBatch(tasksFor(1));
    } catch {
      disposedReject = true;
    }
    check(disposedReject, 'disposed GPU cannot resume');
    report.status = report.checks.every((c) => c.passed) ? 'passed' : 'failed';
  } catch (error) {
    report.status = 'failed';
    report.error = String((error as Error)?.stack ?? error);
  } finally {
    gpu?.dispose();
    pool?.dispose();
  }
  return report;
};

window.runIntegrationValidation = async () => {
  const report: ValidationReport = {
    status: 'failed',
    benchmarks: [],
    checkedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    crossOriginIsolated,
    scope:
      'Real browser calibration + production WildernessPopulation lifecycle with actual worker pool and GPU. No World rendering/FPS assertion.',
    checks: [],
    states: [],
  };
  const check = (passed: boolean, name: string, detail?: unknown) =>
    report.checks.push({ passed, name, detail });
  let gpu: WildernessWebGpu | null = null,
    pool: WorkerPool | null = null,
    pop: WildernessPopulation | null = null,
    control: WildernessPopulation | null = null;
  const drain = async (p: WildernessPopulation) => {
    const until = performance.now() + 6000;
    while (p.getComputeStatus().inFlight && performance.now() < until)
      await new Promise((r) => setTimeout(r, 5));
    if (p.getComputeStatus().inFlight) throw Error('Population drain deadline exceeded');
  };
  const snapshot = (p: WildernessPopulation) => {
    const data: number[] = [];
    p.forEachEntity((e) => data.push(e.x, e.y, e.z, e.vx, e.vy, e.vz, e.type, e.seed));
    return data;
  };
  try {
    gpu = await WildernessWebGpu.create();
    pool = new WorkerPool({ maxWorkers: 4, useSharedArrayBuffer: false, qualityTier: 'laptop' });
    await pool.initialize('/simulation-worker.js');
    const autoCalibration = await calibrateWildernessCompute(gpu, pool, 'auto');
    report.autoCalibration = autoCalibration;
    const a = autoCalibration,
      g = a.gpuTiming,
      w = a.workerTiming;
    const faster =
      a.parityPassed &&
      a.workerParityPassed &&
      g &&
      w &&
      g.medianMs < w.medianMs * 0.9 &&
      g.p95Ms <= w.p95Ms;
    check(
      a.parityPassed && a.workerParityPassed === true,
      'actual calibration GPU tolerance and worker exact parity pass',
      a,
    );
    check(
      a.selected === (faster ? 'webgpu' : 'cpu-workers'),
      'automatic selection obeys measured transfer-inclusive threshold',
    );
    const explicitCalibration = await calibrateWildernessCompute(gpu, pool, 'webgpu');
    report.explicitCalibration = explicitCalibration;
    check(
      explicitCalibration.selected === 'webgpu' && explicitCalibration.parityPassed,
      'explicit GPU still requires actual parity',
    );
    pop = new WildernessPopulation(pool, 33445);
    control = new WildernessPopulation(null, 33445);
    pop.setBatchExecutor(gpu);
    pop.update(0, 0, 1 / 60);
    control.update(0, 0, 1 / 60);
    await drain(pop);
    const accepted = pop.getComputeStatus();
    report.states.push({ stage: 'accepted GPU', ...accepted });
    check(
      accepted.acceptedBackend === 'webgpu' &&
        accepted.completedFrames === 1 &&
        accepted.acceptedFrame === 1,
      'real population publishes completed GPU frame',
    );
    const actual = snapshot(pop),
      expected = snapshot(control);
    check(
      actual.length === 49 * 128 * 8,
      'camera-streamed population includes49chunks and6272entities',
    );
    let max = 0,
      violations = 0;
    actual.forEach((v, i) => {
      const e = expected[i] ?? Number.NaN;
      max = Math.max(max, Math.abs(v - e));
      if (i % 8 >= 6 ? v !== e : Math.abs(v - e) > (i % 8 < 3 ? 2e-4 : 2e-5) + 2e-6 * Math.abs(e))
        violations++;
    });
    check(violations === 0, 'accepted population GPU values match CPU control within tolerance', {
      maxError: max,
      violations,
    });
    const frozenBefore = snapshot(pop);
    pop.update(0, 0, 1 / 60);
    pop.setPaused(true);
    await drain(pop);
    const frozen = pop.getComputeStatus();
    report.states.push({ stage: 'pause discards in-flight', ...frozen });
    check(
      snapshot(pop).every((v, i) => v === frozenBefore[i]),
      'pause rejects delayed GPU values',
    );
    check(
      frozen.acceptedFrame === 1 && frozen.staleResults >= 49 && frozen.paused,
      'stale-result counter identifies cancelled GPU frame',
    );
    pop.update(100, 100, 1 / 60);
    check(
      pop.getComputeStatus().requestedFrame === frozen.requestedFrame,
      'paused updates schedule no new work',
    );
    pop.setPaused(false);
    pop.update(0, 0, 1 / 60);
    await drain(pop);
    check(
      pop.getComputeStatus().acceptedBackend === 'webgpu' &&
        pop.getComputeStatus().acceptedFrame === 3,
      'resume accepts fresh GPU work',
    );
    gpu.dispose();
    pop.update(0, 0, 1 / 60);
    await drain(pop);
    const fallback = pop.getComputeStatus();
    report.states.push({ stage: 'device disposed CPU fallback', ...fallback });
    check(
      fallback.backend === 'cpu-workers' &&
        fallback.acceptedBackend === 'cpu-workers' &&
        fallback.gpuFailures === 1 &&
        fallback.acceptedFrame === 4,
      'lost/disposed GPU frame falls back to actual workers',
    );
    pool.dispose();
    pop.update(0, 0, 1 / 60);
    await drain(pop);
    const sync = pop.getComputeStatus();
    report.states.push({ stage: 'worker disposed sync fallback', ...sync });
    check(
      sync.acceptedBackend === 'cpu-main' && sync.acceptedFrame === 5 && sync.fallbackTasks >= 49,
      'failed workers fall back to serial reference',
    );
    pop.dispose();
    check(pop.getComputeStatus().disposed, 'population disposal recorded');
    report.status = report.checks.every((c) => c.passed) ? 'passed' : 'failed';
  } catch (error) {
    report.status = 'failed';
    report.error = String((error as Error)?.stack ?? error);
  } finally {
    pop?.dispose();
    control?.dispose();
    pool?.dispose();
    gpu?.dispose();
  }
  return report;
};

window.diagnoseBoundary = async () => {
  const gpu = await WildernessWebGpu.create(),
    tasks = createWildernessCalibrationTasks();
  try {
    const expected = cpu(tasks),
      actual = await gpu.executeBatch(tasks),
      mismatches: unknown[] = [];
    for (let t = 0; t < tasks.length; t++) {
      // CPU and GPU results have the same complete batch shape as the task fixture.
      const task = tasks[t]!;
      const control = expected[t]!;
      const candidate = actual[t]!;
      for (let i = 0; i < task.data.length; i += 8) {
        if (
          control.data.slice(i, i + 6).some((v, j) => Math.abs(v - candidate.data[i + j]!) > 0.01)
        )
          mismatches.push({
            task: t,
            entity: i / 8,
            chunkId: task.chunkId,
            seed: task.seed,
            dt: task.dt,
            resource: task.intelligenceResource,
            threat: task.intelligenceThreat,
            explore: task.intelligenceExplore,
            input: Array.from(task.data.slice(i, i + 8)),
            cpu: Array.from(control.data.slice(i, i + 8)),
            gpu: Array.from(candidate.data.slice(i, i + 8)),
          });
      }
    }
    return {
      status: mismatches.length ? 'failed' : 'passed',
      adapter: gpu.adapterDescription,
      mismatches,
    };
  } finally {
    gpu.dispose();
  }
};
