import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const panel = readFileSync('src/ui/sandbox-panel.ts', 'utf8');
const world = readFileSync('src/world.ts', 'utf8');

describe('sandbox badge + Mini World defaults', () => {
  test('a custom-sandbox badge is shown only when settings deviate from default', () => {
    expect(panel).toContain("b.id = 'cqm-sb-badge'");
    expect(panel).toMatch(/display = n > 0 \? 'block' : 'none'/);
    expect(panel).toContain('Custom sandbox active');
  });
  test('Mini World boots from defaults and never persists over the main-world save', () => {
    expect(world).toMatch(/const saved = IS_MINI_WORLD\s*\?\s*\{\}/);
    expect(panel).toMatch(/this\.settings = IS_MINI_WORLD \? \{\} : loadSettings/);
    expect(panel).toMatch(/if \(!IS_MINI_WORLD\) saveSettings/);
  });
  test('the Mini World pill has a compact phone label and no wrapping', () => {
    expect(panel).toMatch(/@media \(max-width:560px\)/);
    expect(panel).toContain('#cqm-mini-entry{white-space:nowrap}');
    expect(panel).toContain("'✦ Mini World'");
  });
});
