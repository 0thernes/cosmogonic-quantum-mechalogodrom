import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { resolvePagesFile } from '../scripts/pages-smoke-server';

const root = resolve(import.meta.dir, '..', 'site');
const project = 'cosmogonic-quantum-mechalogodrom';

describe('Pages-only visual smoke server', () => {
  test('maps only the project-prefixed artifact tree', () => {
    expect(resolvePagesFile(root, project, `/${project}/`)).toBe(resolve(root, 'index.html'));
    expect(resolvePagesFile(root, project, `/${project}/workers/simulation-worker.js`)).toBe(
      resolve(root, 'workers', 'simulation-worker.js'),
    );
    expect(resolvePagesFile(root, project, '/index.html')).toBeNull();
    expect(resolvePagesFile(root, project, `/${project}-other/index.html`)).toBeNull();
  });

  test('rejects encoded, slash, and backslash traversal', () => {
    expect(resolvePagesFile(root, project, `/${project}/../package.json`)).toBeNull();
    expect(resolvePagesFile(root, project, `/${project}/%2e%2e%2fpackage.json`)).toBeNull();
    expect(resolvePagesFile(root, project, `/${project}/..%5cpackage.json`)).toBeNull();
    expect(resolvePagesFile(root, project, `/${project}/%E0%A4%A`)).toBeNull();
  });
});
