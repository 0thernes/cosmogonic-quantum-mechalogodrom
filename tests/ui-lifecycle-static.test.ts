/**
 * Static lifecycle seals for browser-only UI modules. Bun's test runtime has no DOM here, so these
 * source-level checks pin the HMR/idempotency contracts that prevent duplicate listeners and leaked
 * observers across dev reloads.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');

function src(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

describe('UI lifecycle static contracts', () => {
  test('InputSystem attaches DOM listeners through its AbortController', () => {
    const code = src('src/ui/input.ts');
    expect(code).not.toContain("addEventListener('pointerdown', down);");
    expect(code).not.toContain("addEventListener('click', (e) => {");
    expect((code.match(/signal: this\.ac\.signal/g) ?? []).length).toBeGreaterThan(18);
  });

  test('brain slot visualizers are idempotent and accessible', () => {
    const code = src('src/ui/brain-slots.ts');
    expect(code).toContain('cqmBrainSlotsWired');
    expect(code).toContain("canvas.setAttribute('aria-label'");
    expect(code).toContain('devicePixelRatio');
  });

  test('modal overlays close from Escape immediately after opening', () => {
    const access = src('src/ui/access-puzzle.ts');
    const settings = src('src/ui/settings-panel.ts');
    expect(access).toContain("aria-modal', 'true'");
    expect(access).toContain('wireClose(this.modal');
    expect(access).toContain('this.toggle.focus()');
    expect(settings).toContain('this.modal.focus()');
  });

  test('hot-reload teardown mirrors fullscreen and superhero HUD listeners', () => {
    const centerHud = src('src/ui/center-hud.ts');
    const superheroHud = src('src/ui/superhero-hud.ts');
    const world = src('src/world.ts');
    expect(centerHud).toContain("document.removeEventListener('fullscreenchange', scheduleFit)");
    expect(superheroHud).toContain('dispose(): void');
    expect(world).toContain('this.superheroHud.dispose()');
  });

  test('onboarding overlay clears the inline display:none/opacity:0 before adding .on', () => {
    const code = src('src/ui/onboarding.ts');
    // glassPanel()/overlayPanel() set `display:none; opacity:0` inline; an inline style always
    // beats the `.on` class rule (it carries no !important), so toggling the class alone can
    // never show the element. Pin that the open path sets these inline properties directly.
    expect(code).toMatch(/this\.root\.style\.display\s*=\s*['"]flex['"]/);
    expect(code).toMatch(/this\.root\.style\.opacity\s*=\s*['"]1['"]/);
  });
});

describe('world integration cadence static contracts', () => {
  test('driveSuper steps symbiosis and myth ritual exactly once per apex beat', () => {
    const code = src('src/world.ts');
    const start = code.indexOf('private driveSuper');
    const end = code.indexOf('  /** V34', start);
    const driveSuper = code.slice(start, end);
    expect((driveSuper.match(/this\.symbiosis\.step\(\)/g) ?? []).length).toBe(1);
    expect((driveSuper.match(/this\.mythRitual\.step\(\)/g) ?? []).length).toBe(1);
  });
});
