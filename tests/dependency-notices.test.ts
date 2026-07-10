import { expect, test } from 'bun:test';

interface Manifest {
  dependencies: Record<string, string>;
}

test('dependency/API notices follow the manifest and shipped CDN boundary', async () => {
  const pkg = (await Bun.file('package.json').json()) as Manifest;
  const notice = await Bun.file('NOTICE.md').text();
  const contributing = await Bun.file('CONTRIBUTING.md').text();
  const technical = await Bun.file('docs/TECHNICAL-SPECIFICATION-2026-06-26.md').text();
  const security = await Bun.file('SECURITY.md').text();

  const three = pkg.dependencies['three'];
  const stats = pkg.dependencies['simple-statistics'];
  const mermaid = pkg.dependencies['mermaid'];
  expect(three).toBeDefined();
  expect(stats).toBeDefined();
  expect(mermaid).toBeDefined();
  const threeVersion = three!.replace(/^[~^]/, '');
  const statsVersion = stats!.replace(/^[~^]/, '');
  expect(notice).toContain(`| ${threeVersion} | MIT`);
  expect(notice).toContain(`| ${statsVersion}   | ISC`);
  expect(contributing).toContain(`modern ${three!.split('.').slice(0, 2).join('.')} API`);
  expect(technical).toContain(`three \`${three}\``);
  expect(technical).toContain(`mermaid \`${mermaid}\``);
  expect(technical).toContain(`simple-statistics \`${stats}\``);

  for (const origin of [
    'https://cdnjs.cloudflare.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ]) {
    expect(security).toContain(origin);
  }
  expect(notice).toContain('Poppins');
  expect(notice).toContain('Lora');
});
