import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { labDataJsonReplacer, stabilizeLabNumber } from '../scripts/lab-data-json';
import {
  escapeMarkdownTableCell,
  escapeMarkupAttribute,
  escapeMarkupText,
} from '../scripts/markup-escape';

async function text(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe('delivery gates fail closed', () => {
  test('the pre-commit hook cannot hide generator/formatter failures or sweep untracked surfaces', async () => {
    const hook = await text('.githooks/pre-commit');
    expect(hook).toContain('set -eu');
    expect(hook).toContain('git diff --quiet');
    expect(hook).not.toContain('|| true');
    expect(hook).not.toContain("git add -- '*.md'");
    expect(hook).toContain('git diff --name-only');
    expect(hook).toContain('bun run check');
    expect(hook).toContain('git ls-files --others --exclude-standard');

    const packageManifest = JSON.parse(await text('package.json')) as {
      scripts: Record<string, string>;
    };
    expect(packageManifest.scripts.prepare).toBe('bun scripts/install-hooks.ts');
    expect(packageManifest.scripts.prepare).not.toContain('|| true');
  });

  test('Pages and automatic tags wait for a successful push CI run', async () => {
    for (const path of ['.github/workflows/pages.yml', '.github/workflows/auto-tag.yml']) {
      const workflow = await text(path);
      expect(workflow).toContain('workflow_run:');
      expect(workflow).toContain('workflows: [CI]');
      expect(workflow).toContain("workflow_run.conclusion == 'success'");
      expect(workflow).toContain("workflow_run.event == 'push'");
      expect(workflow).toContain("workflow_run.head_branch == 'main'");
      expect(workflow).toContain('workflow_run.head_sha');
    }
    const pages = await text('.github/workflows/pages.yml');
    expect(pages).toContain("github.ref == 'refs/heads/main'");
    expect(pages).toContain('Full gate for manual deployments');

    const autoTag = await text('.github/workflows/auto-tag.yml');
    expect(autoTag).toContain('^[0-9]+\\.[0-9]+\\.[0-9]+$');
    expect(autoTag).toContain('gh workflow run release.yml --ref "$TAG"');
    expect(autoTag).toContain('Dispatch release idempotently');
    expect(autoTag).toContain('EXISTING_SHA="$(git rev-list -n 1 "$TAG")"');
    expect(autoTag).toContain('not CI-approved');

    const ci = await text('.github/workflows/ci.yml');
    expect(ci).toContain("github.event.before != '0000000000000000000000000000000000000000'");
    expect(ci).toContain('base-ref:');
    expect(ci).toContain('head-ref:');
  });

  test('release inputs and tags must exactly match the package manifest', async () => {
    const workflow = await text('.github/workflows/release.yml');
    expect(workflow).toContain('^v[0-9]+\\.[0-9]+\\.[0-9]+$');
    expect(workflow.match(/does not match package\.json/g)?.length).toBeGreaterThanOrEqual(2);
    expect(workflow).toContain('bun run check');
    expect(workflow).toContain('PUSHED_TAG: ${{ github.ref_name }}');
    expect(workflow.match(/Generated artifact freshness/g)?.length).toBeGreaterThanOrEqual(1);
  });

  test('cross-platform reproducibility contracts are pinned and verified', async () => {
    const cmake = await text('native/CMakeLists.txt');
    expect(cmake).not.toContain('GIT_SHALLOW');
    expect(cmake).not.toContain('-ffast-math');
    expect(cmake).toContain('/fp:strict');
    expect(cmake).toContain('-ffp-contract=off');
    expect(cmake).toContain('-fno-fast-math');
    expect(cmake.match(/GIT_TAG\s+[0-9a-f]{40}/g)?.length).toBe(4);
    expect(cmake).toContain('add_test(NAME cqm_apex_golden');

    const golden = await text('native/apex/apex_golden.cpp');
    expect(golden).toContain('return reproduced ? 0 : 1;');

    const ci = await text('.github/workflows/ci.yml');
    expect(ci).toContain('-DGLFW_BUILD_WAYLAND=OFF');
    expect(ci).toContain('bun scripts/verify-native-apex.ts native/build-ci/cqm_apex_golden');
    expect(ci).toContain('Configure the default Jolt-enabled engine');
    expect(ci.match(/name: Generated artifact freshness/g)?.length).toBeGreaterThanOrEqual(2);

    const packageManifest = JSON.parse(await text('package.json')) as {
      scripts: Record<string, string>;
    };
    expect(packageManifest.scripts.check).toContain('bun run generated:check');

    const crossLanguageGate = await text('scripts/verify-native-apex.ts');
    expect(crossLanguageGate).toContain("from '../src/sim/apex-native-backend'");

    const codeqlWorkflow = await text('.github/workflows/codeql.yml');
    const codeqlConfig = await text('.github/codeql/codeql-config.yml');
    expect(codeqlWorkflow).toContain('config-file: ./.github/codeql/codeql-config.yml');
    expect(codeqlConfig).toContain('legacy/**');

    expect(escapeMarkupText(`&<>"'`)).toBe(`&amp;&lt;&gt;"'`);
    expect(escapeMarkupAttribute(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
    expect(escapeMarkdownTableCell('a\\|b\nc')).toBe(String.raw`a\\\|b c`);

    const metricsSource = await text('scripts/codebase-metrics.ts');
    expect(metricsSource).not.toContain('statSync');
    expect(metricsSource).toContain('failed to read tracked file');

    const harvestSource = await text('scripts/harvest-tsotchke-corpus.ts');
    expect(harvestSource).not.toContain('catch {}');
    expect(harvestSource).toContain('plausible-looking partial census');

    const simulationWorker = await text('src/workers/simulation-worker.ts');
    expect(simulationWorker).toContain('MessageEvent<unknown>');
    expect(simulationWorker).toContain("event.origin !== '' && event.origin !== self.origin");
    expect(simulationWorker).toContain('isWorkerMessage(message)');
    const worldSource = await text('src/world.ts');
    const buildSource = await text('scripts/build.ts');
    const serverSource = await text('server.ts');
    expect(worldSource).toContain("new URL('./workers/simulation-worker.js', import.meta.url)");
    expect(buildSource).toContain("'./src/workers/simulation-worker.ts'");
    expect(buildSource).toContain("outdir: './dist/workers'");
    expect(buildSource).toContain("'./dist/workers/simulation-worker.js'");
    expect(serverSource).toContain("'/workers/simulation-worker.js': secured");

    // Exact values from the Windows/Ubuntu generated-artifact drift caught by hosted CI.
    expect(stabilizeLabNumber(0.38940480984070375)).toBe(stabilizeLabNumber(0.3894048098407037));
    expect(stabilizeLabNumber(0.00018843824789427366)).toBe(
      stabilizeLabNumber(0.00018843824789416264),
    );
    expect(stabilizeLabNumber(0.3894048098407)).not.toBe(stabilizeLabNumber(0.3894048099407));
    expect(stabilizeLabNumber(1_234_567_890_123)).toBe(1_234_567_890_123);
    expect(stabilizeLabNumber(stabilizeLabNumber(0.38940480984070375))).toBe(
      stabilizeLabNumber(0.38940480984070375),
    );
    expect(Object.is(stabilizeLabNumber(-0), -0)).toBe(false);
    expect(() => stabilizeLabNumber(Number.NaN)).toThrow('non-finite');
    expect(() => stabilizeLabNumber(Number.MAX_SAFE_INTEGER + 1)).toThrow('unsafe integer');
    expect(() => JSON.stringify({ metric: Number.POSITIVE_INFINITY }, labDataJsonReplacer)).toThrow(
      'non-finite',
    );
    expect(() => JSON.stringify({ metric: Number.NEGATIVE_INFINITY }, labDataJsonReplacer)).toThrow(
      'non-finite',
    );
    expect(
      JSON.parse(
        JSON.stringify(
          { nested: [true, null, 'receipt', -0, 1_234_567_890_123] },
          labDataJsonReplacer,
        ),
      ),
    ).toEqual({ nested: [true, null, 'receipt', 0, 1_234_567_890_123] });
  });

  test('aggregated benchmark modules cannot execute the shared runner while imported', async () => {
    const files = execFileSync('git', ['ls-files', '-z', '--', 'bench/*.bench.ts'], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean);
    for (const file of files) {
      const source = await text(file);
      if (source.includes("from 'mitata'") && /\brun\(\)/.test(source)) {
        if (!source.includes('import.meta.main')) {
          throw new Error(`${file} invokes the shared benchmark runner without an import guard`);
        }
      }
    }
  });
});
