import { describe, expect, test } from 'bun:test';

describe('Bible public link law', () => {
  test('generated Bible corpus does not point Pages at private source paths', async () => {
    const html = await Bun.file('bible.html').text();
    const forbidden = [
      'href="/docs/../src/',
      'href="/docs/../scripts/',
      'href="/docs/ROADMAP-2026-06-26.md"',
      'href="/docs/reports/2026-07-07/',
      'href="./docs/reports/2026-07-07/',
    ];

    const offenders = forbidden.filter((needle) => html.includes(needle));
    expect(offenders).toEqual([]);
  });

  test('root docs used by Bible are explicitly copied by the Pages assembler', async () => {
    const script = await Bun.file('scripts/build-pages.ts').text();
    expect(script).toContain('data-cqm-static-host="true"');
    expect(script).toContain('matches !== expectedMatches');
    for (const rootDoc of [
      'LICENSE',
      'NOTICE.md',
      'README.md',
      'SECURITY.md',
      'CHANGELOG.md',
      'ROADMAP-2026-06-26.md',
      'THIRD-PARTY-NOTICES.md',
    ]) {
      expect(script).toContain(rootDoc);
    }
  });

  test('current consolidated docs are copied from their real docs directory', async () => {
    const script = await Bun.file('scripts/build-pages.ts').text();
    const publicDocs = [
      'CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.md',
      'CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.html',
      'CONSOLIDATED-22-FILE-AUDIT-CURRENT-2026-07-07.md',
      'CONSOLIDATED-22-FILE-AUDIT-CURRENT-2026-07-07.html',
    ];

    for (const publicDoc of publicDocs) {
      const sourcePath = `docs/${publicDoc}`;
      expect(await Bun.file(sourcePath).exists()).toBe(true);
      expect(script).toContain(`source: '${sourcePath}'`);
      expect(script).toContain(`target: '${sourcePath}'`);
    }
  });
});
