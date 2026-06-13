/**
 * Generate a CycloneDX 1.5 Software Bill of Materials from `package.json` + the installed
 * `node_modules/*` versions (500-point §21.420). Prints the BOM JSON to stdout — the release
 * workflow redirects it into a published asset; locally, `bun run sbom` shows it.
 *
 * Deterministic by design: NO timestamp and a stable component order (sorted by name), so the same
 * lockfile always yields a byte-identical SBOM (no diff churn, reproducible supply-chain record).
 */

interface PkgJson {
  name: string;
  version: string;
  license?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface Component {
  type: 'library';
  name: string;
  version: string;
  purl: string;
  scope: 'required' | 'optional';
  licenses?: { license: { id: string } }[];
}

const root = new URL('../', import.meta.url);
const pkg = (await Bun.file(new URL('package.json', root)).json()) as PkgJson;

/** npm package URL; a scoped name keeps `@scope` as a url-encoded namespace per the purl spec. */
function purl(name: string, version: string): string {
  if (name.startsWith('@')) {
    const slash = name.indexOf('/');
    const scope = name.slice(0, slash);
    const bare = name.slice(slash + 1);
    return `pkg:npm/${encodeURIComponent(scope)}/${bare}@${version}`;
  }
  return `pkg:npm/${name}@${version}`;
}

async function resolve(name: string, prod: boolean): Promise<Component | null> {
  try {
    const dep = (await Bun.file(new URL(`node_modules/${name}/package.json`, root)).json()) as {
      version?: string;
      license?: string;
    };
    if (!dep.version) return null;
    const comp: Component = {
      type: 'library',
      name,
      version: dep.version,
      purl: purl(name, dep.version),
      scope: prod ? 'required' : 'optional',
    };
    if (typeof dep.license === 'string') comp.licenses = [{ license: { id: dep.license } }];
    return comp;
  } catch {
    return null; // not installed at this path (e.g. hoisted differently) — skip rather than fail
  }
}

const prodNames = Object.keys(pkg.dependencies ?? {});
const devNames = Object.keys(pkg.devDependencies ?? {}).filter((n) => !prodNames.includes(n));

const resolved = await Promise.all([
  ...prodNames.map((n) => resolve(n, true)),
  ...devNames.map((n) => resolve(n, false)),
]);
const components = resolved
  .filter((c): c is Component => c !== null)
  .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

const bom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  version: 1,
  metadata: {
    component: { type: 'application', name: pkg.name, version: pkg.version },
    tools: [{ name: 'cqm-sbom', vendor: 'cosmogonic-quantum-mechalogodrom' }],
  },
  components,
};

console.log(JSON.stringify(bom, null, 2));
