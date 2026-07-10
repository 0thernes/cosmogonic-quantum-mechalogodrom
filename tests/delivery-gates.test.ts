import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

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
  });

  test('release inputs and tags must exactly match the package manifest', async () => {
    const workflow = await text('.github/workflows/release.yml');
    expect(workflow).toContain('^v[0-9]+\\.[0-9]+\\.[0-9]+$');
    expect(workflow.match(/does not match package\.json/g)?.length).toBeGreaterThanOrEqual(2);
    expect(workflow).toContain('bun run check');
    expect(workflow).toContain('PUSHED_TAG: ${{ github.ref_name }}');
    expect(workflow.match(/Generated artifact freshness/g)?.length).toBeGreaterThanOrEqual(1);
  });

  test('native dependencies are immutable and both native configurations are verified', async () => {
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

    const crossLanguageGate = await text('scripts/verify-native-apex.ts');
    expect(crossLanguageGate).toContain("from '../src/sim/apex-native-backend'");
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
