/**
 * Generate a deterministic CycloneDX 1.5 SBOM for every installed dependency reachable from the
 * root manifest. The release workflow redirects stdout into the published SBOM asset.
 *
 * Resolution mirrors Node/Bun's nested `node_modules` lookup closely enough to retain multiple
 * installed versions. Missing required packages fail closed; absent platform-specific optional
 * dependencies are the only intentionally skipped edges.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

interface PackageJson {
  name?: string;
  version?: string;
  license?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

interface LicenseId {
  license: { id: string };
}

interface LicenseExpression {
  expression: string;
}

type ComponentScope = 'required' | 'optional' | 'excluded';

interface Component {
  type: 'library';
  name: string;
  version: string;
  'bom-ref': string;
  purl: string;
  scope: ComponentScope;
  licenses?: (LicenseId | LicenseExpression)[];
}

interface DependencyEdge {
  ref: string;
  dependsOn: string[];
}

export interface CycloneDxBom {
  $schema: 'http://cyclonedx.org/schema/bom-1.5.schema.json';
  bomFormat: 'CycloneDX';
  specVersion: '1.5';
  version: 1;
  metadata: {
    component: {
      type: 'application';
      name: string;
      version: string;
      'bom-ref': string;
      purl: string;
    };
    tools: { name: string; vendor: string }[];
  };
  components: Component[];
  dependencies: DependencyEdge[];
}

interface WorkItem {
  requestedName: string;
  fromDir: string;
  parentRef: string;
  scope: ComponentScope;
  missingAllowed: boolean;
}

const PACKAGE_NAME = /^(?:@[^/\\]+\/)?[^/\\]+$/;
const SPDX_ID = /^[A-Za-z0-9][A-Za-z0-9.+-]*$/;
const SCOPE_RANK: Record<ComponentScope, number> = { excluded: 0, optional: 1, required: 2 };

function optionalChildScope(parent: ComponentScope): ComponentScope {
  return parent === 'excluded' ? 'excluded' : 'optional';
}

function readPackage(path: string): PackageJson {
  return JSON.parse(readFileSync(path, 'utf8')) as PackageJson;
}

/** npm package URL; scoped package namespaces retain the encoded `@` required by purl. */
function purl(name: string, version: string): string {
  if (name.startsWith('@')) {
    const slash = name.indexOf('/');
    const scope = name.slice(0, slash);
    const bare = name.slice(slash + 1);
    return `pkg:npm/${encodeURIComponent(scope)}/${bare}@${version}`;
  }
  return `pkg:npm/${name}@${version}`;
}

function withinRoot(rootDir: string, candidate: string): boolean {
  const rel = relative(rootDir, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function resolveInstalled(
  rootDir: string,
  fromDir: string,
  requestedName: string,
): { dir: string; pkg: PackageJson } | null {
  if (!PACKAGE_NAME.test(requestedName)) {
    throw new Error(`Invalid dependency name in package manifest: ${requestedName}`);
  }

  let cursor = resolvePath(fromDir);
  while (withinRoot(rootDir, cursor)) {
    // When cursor itself is node_modules, appending another node_modules segment cannot be a normal
    // package-resolution location. Scoped package directories may still be checked harmlessly.
    if (cursor.split(/[\\/]/).at(-1) !== 'node_modules') {
      const dir = join(cursor, 'node_modules', requestedName);
      const manifest = join(dir, 'package.json');
      if (existsSync(manifest)) return { dir, pkg: readPackage(manifest) };
    }
    if (cursor === rootDir) break;
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return null;
}

function licenseChoice(value: string | undefined): (LicenseId | LicenseExpression)[] | undefined {
  if (!value) return undefined;
  return SPDX_ID.test(value) ? [{ license: { id: value } }] : [{ expression: value }];
}

function sortedNames(record: Record<string, string> | undefined): string[] {
  return Object.keys(record ?? {}).sort((a, b) => a.localeCompare(b));
}

export function buildBom(directory = fileURLToPath(new URL('../', import.meta.url))): CycloneDxBom {
  const rootDir = resolvePath(directory);
  const rootPkg = readPackage(join(rootDir, 'package.json'));
  if (!rootPkg.name || !rootPkg.version) {
    throw new Error('Root package.json must contain non-empty name and version fields');
  }

  const rootRef = purl(rootPkg.name, rootPkg.version);
  const components = new Map<string, Component>();
  const relationships = new Map<string, Set<string>>([[rootRef, new Set()]]);
  const visitedScope = new Map<string, ComponentScope>();
  const queue: WorkItem[] = [];

  const rootOptionalNames = sortedNames(rootPkg.optionalDependencies);
  const rootOptionalSet = new Set(rootOptionalNames);
  const prodNames = sortedNames(rootPkg.dependencies).filter((name) => !rootOptionalSet.has(name));
  const prodSet = new Set(prodNames);
  for (const requestedName of prodNames) {
    queue.push({
      requestedName,
      fromDir: rootDir,
      parentRef: rootRef,
      scope: 'required',
      missingAllowed: false,
    });
  }
  for (const requestedName of rootOptionalNames) {
    queue.push({
      requestedName,
      fromDir: rootDir,
      parentRef: rootRef,
      scope: 'optional',
      missingAllowed: true,
    });
  }
  const rootPeerNames = sortedNames(rootPkg.peerDependencies);
  const rootPeerSet = new Set(rootPeerNames);
  for (const requestedName of rootPeerNames) {
    const optional = rootPkg.peerDependenciesMeta?.[requestedName]?.optional === true;
    if (!prodSet.has(requestedName) && !rootOptionalSet.has(requestedName)) {
      queue.push({
        requestedName,
        fromDir: rootDir,
        parentRef: rootRef,
        scope: optional ? 'optional' : 'required',
        missingAllowed: optional,
      });
    }
  }
  for (const requestedName of sortedNames(rootPkg.devDependencies)) {
    if (
      !prodSet.has(requestedName) &&
      !rootOptionalSet.has(requestedName) &&
      !rootPeerSet.has(requestedName)
    ) {
      queue.push({
        requestedName,
        fromDir: rootDir,
        parentRef: rootRef,
        scope: 'excluded',
        missingAllowed: false,
      });
    }
  }

  while (queue.length > 0) {
    const item = queue.shift()!;
    const installed = resolveInstalled(rootDir, item.fromDir, item.requestedName);
    if (!installed) {
      if (item.missingAllowed) continue;
      throw new Error(
        `Unable to resolve required dependency ${item.requestedName} from ${item.fromDir}`,
      );
    }

    const actualName = installed.pkg.name ?? item.requestedName;
    const version = installed.pkg.version;
    if (!version)
      throw new Error(
        `Installed dependency ${item.requestedName} has no version: ${installed.dir}`,
      );
    const ref = purl(actualName, version);
    relationships.get(item.parentRef)?.add(ref);
    if (!relationships.has(item.parentRef)) relationships.set(item.parentRef, new Set([ref]));
    if (!relationships.has(ref)) relationships.set(ref, new Set());

    const existing = components.get(ref);
    if (!existing) {
      const component: Component = {
        type: 'library',
        name: actualName,
        version,
        'bom-ref': ref,
        purl: ref,
        scope: item.scope,
      };
      const licenses = licenseChoice(installed.pkg.license);
      if (licenses) component.licenses = licenses;
      components.set(ref, component);
    } else if (SCOPE_RANK[item.scope] > SCOPE_RANK[existing.scope]) {
      existing.scope = item.scope;
    }

    // Revisit only when a stronger runtime path upgrades an excluded/optional traversal; that scope
    // must propagate through the package's normal descendants and required peers.
    const visitKey = resolvePath(installed.dir).toLowerCase();
    const previousScope = visitedScope.get(visitKey);
    if (previousScope !== undefined && SCOPE_RANK[previousScope] >= SCOPE_RANK[item.scope])
      continue;
    visitedScope.set(visitKey, item.scope);

    const optionalNames = new Set(sortedNames(installed.pkg.optionalDependencies));
    for (const requestedName of sortedNames(installed.pkg.dependencies)) {
      if (optionalNames.has(requestedName)) continue;
      queue.push({
        requestedName,
        fromDir: installed.dir,
        parentRef: ref,
        scope: item.scope,
        missingAllowed: false,
      });
    }
    for (const requestedName of [...optionalNames].sort((a, b) => a.localeCompare(b))) {
      queue.push({
        requestedName,
        fromDir: installed.dir,
        parentRef: ref,
        scope: optionalChildScope(item.scope),
        missingAllowed: true,
      });
    }
    const declaredChildren = new Set([
      ...sortedNames(installed.pkg.dependencies),
      ...optionalNames,
    ]);
    for (const requestedName of sortedNames(installed.pkg.peerDependencies)) {
      if (declaredChildren.has(requestedName)) continue;
      const optional = installed.pkg.peerDependenciesMeta?.[requestedName]?.optional === true;
      queue.push({
        requestedName,
        fromDir: installed.dir,
        parentRef: ref,
        scope: optional ? optionalChildScope(item.scope) : item.scope,
        missingAllowed: optional,
      });
    }
  }

  const sortedComponents = [...components.values()].sort((a, b) => a.purl.localeCompare(b.purl));
  const dependencies = [...relationships.entries()]
    .map(([ref, dependsOn]) => ({
      ref,
      dependsOn: [...dependsOn].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.ref.localeCompare(b.ref));

  return {
    $schema: 'http://cyclonedx.org/schema/bom-1.5.schema.json',
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: {
      component: {
        type: 'application',
        name: rootPkg.name,
        version: rootPkg.version,
        'bom-ref': rootRef,
        purl: rootRef,
      },
      tools: [{ name: 'cqm-sbom', vendor: 'cosmogonic-quantum-mechalogodrom' }],
    },
    components: sortedComponents,
    dependencies,
  };
}

if (import.meta.main) console.log(JSON.stringify(buildBom(), null, 2));
