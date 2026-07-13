/** Canonical Xenomimic World/UI/Observatory/documentation integration seals. */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OBS_XENOMIMIC_SERIES, Observatory, type ObservatorySnapshot } from '../src/ui/observatory';

const ROOT = resolve(import.meta.dir, '..');
const read = (path: string): string => readFileSync(resolve(ROOT, path), 'utf8');

function snapshot(): ObservatorySnapshot {
  return {
    phylumCounts: new Float32Array(20),
    titanLedger: [],
    warMatrix: new Uint8Array(400),
    rdEnergy: 0.2,
    qEntropy: 0.4,
    trend: 0,
  };
}

describe('canonical Xenomimic public integration', () => {
  test('Observatory accepts both unwired and canonical optional telemetry', () => {
    expect(OBS_XENOMIMIC_SERIES).toBe(4);
    const observatory = new Observatory();
    expect(() => observatory.push(snapshot())).not.toThrow();
    expect(() =>
      observatory.push({
        ...snapshot(),
        xenomimics: 42,
        xenomimicMax: 1000,
        xenomimicCoherence: 0.82,
        xenomimicIntegration: 0.71,
        xenomimicBondTension: 0.4,
      }),
    ).not.toThrow();
  });

  test('wires one canonical population through World and the public telemetry row', () => {
    const types = read('src/types.ts');
    const panels = read('src/ui/panels.ts');
    const shell = read('index.html');
    const world = read('src/world.ts');
    expect(types).toContain('xenomimics: number');
    expect(types).toContain('xenomimicCoherence?: number');
    expect(panels).toContain("document.getElementById('xenomimic-count')");
    expect(shell).toContain('id="xenomimic-count"');
    expect(world).toContain("from './ui/xenomimic-panel'");
    expect(world).toContain('new XenomimicPopulation(this.persisted.seed');
    expect(world.match(/new XenomimicPopulation\(/g)?.length).toBe(1);
    expect(world).toContain('new XenomimicRenderer(this.engine.scene)');
    expect(world).toContain('new XenomimicConnectome(this.engine.scene)');
    expect(world).toContain('new XenomimicPanel()');
    expect(world).toContain('grazeAt: this.xenomimicGrazeAt');
    expect(world).toContain('xenomimicCouplings.entityActivation = Math.max');
    expect(world).toContain('this.xenomimics.step(dt, xenomimicCouplings)');
    expect(world).toContain('this.xenomimicPanel.update(this.syncXenomimicPanelData())');
  });

  test('publishes XNO/View controls, canonical help, Copilot, docs, and issue reporting', () => {
    const help = read('src/ui/help-knowledge.ts');
    const copilot = read('src/ui/copilot.ts');
    const serverCopilot = read('src/server/copilot.ts');
    const input = read('src/ui/input.ts');
    const constants = read('src/sim/constants.ts');
    const centerHud = read('src/ui/center-hud.ts');
    const shell = read('index.html');
    const docs = read('docs/XENOMIMICS-2026-07-12.md');
    const audit = read('docs/AUDIT-LOG.md');
    const issue = read('.github/ISSUE_TEMPLATE/xenomimic_report.yml');
    expect(help).toContain("id: 'xenomimics'");
    expect(help).toContain('exactly 101 trainable values');
    expect(copilot).toContain('simulated classical three-qubit statevector');
    expect(serverCopilot).toContain('docs/XENOMIMICS-2026-07-12.md');
    expect(input).toContain("xno: 'launchXenomimic'");
    expect(constants).toContain("'mimic', // canonical Xenomimic ground-fauna macro tour");
    expect(shell).toContain('data-action="xno"');
    expect(centerHud).toContain("name: 'XENOMIMIC'");
    expect(centerHud).toContain("toggle: 'cqm-xenomimic-toggle'");
    expect(centerHud).toContain("panel: 'cqm-xenomimic-panel'");
    expect(docs).toContain('Adds exactly one live body per activation');
    expect(audit).toContain('exact-one XNO/Y spawn');
    expect(issue).toContain('Delivered-frame evidence');
    expect(issue).toContain('not evidence of sentience or physical quantum effects');
  });

  test('keeps browser workers dormant in POWER mode while preserving synchronous wilderness', () => {
    const world = read('src/world.ts');
    const adr = read('docs/adr/0010-worker-offload-and-streamed-hybrid-world-2026-06-26.md');
    expect(world).toContain('this.workerPool = null');
    expect(world).toContain('new WildernessPopulation(null, this.persisted.seed)');
    expect(world).not.toContain('new WorkerPool(');
    expect(world).not.toContain('initWorkerPoolAsync');
    expect(adr).toContain('live browser runtime now constructs');
    expect(adr).toContain('delivered frames stalled for multiple seconds');
  });
});
