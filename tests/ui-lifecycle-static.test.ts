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
    expect(code).toContain('function drawGrid');
    expect(code).not.toContain('function drawBars');
    expect(code).not.toContain('Date.now()');
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

describe('persistent dock controls (owner-critical)', () => {
  // The owner relies on a PAUSE control in the always-visible dock, immediately next to MUTE, to
  // freeze all motion and roam/inspect. It was silently removed once (relocated into SETTINGS at
  // V103). These seals keep it present AND correctly wired so it cannot regress unnoticed again.
  test('PAUSE + MUTE live ONCE in the green bottom toolbar (de-duplicated from the center HUD)', () => {
    const index = src('index.html');
    const centerHud = src('src/ui/center-hud.ts');
    // The green bottom toolbar (index.html #bar) is the SINGLE home for these controls.
    expect(index).toContain('data-action="pause"');
    expect(index).toContain('data-action="mute"');
    // They must NOT be duplicated in the center-hud persist-nav (owner UX: no double buttons).
    expect(centerHud).not.toContain("'⏸ PAUSE'");
    expect(centerHud).not.toContain("mkAct('🔇 MUTE'");
  });

  test('PANEL toolbar button dispatches openMasterPanel AND the center HUD listens for it', () => {
    const input = src('src/ui/input.ts');
    const index = src('index.html');
    const world = src('src/world.ts');
    const centerHud = src('src/ui/center-hud.ts');
    expect(index).toContain('data-action="panel"');
    expect(input).toMatch(/panel:\s*'openMasterPanel'/);
    expect(world).toContain('openMasterPanel:');
    expect(world).toContain("new CustomEvent('cqm:open-master-panel')");
    // The button was DEAD because nothing handled the event — seal that the center HUD now listens.
    expect(centerHud).toContain("'cqm:open-master-panel'");
    expect(centerHud).toContain('onOpenMasterPanel');
  });

  test('pause action is wired to a true freeze (timeScale -> 0)', () => {
    const input = src('src/ui/input.ts');
    const world = src('src/world.ts');
    // Delegated [data-action="pause"] resolves to UiActions.togglePause.
    expect(input).toMatch(/pause:\s*'togglePause'/);
    // togglePause performs a real freeze (timeScale set to 0), matching the "everything holds
    // position, then drifts slowly" intent — not merely a slow-motion multiplier.
    expect(world).toMatch(/togglePause:[\s\S]{0,600}timeScale\s*=\s*0/);
    // And it surfaces the paused state so the owner has unambiguous feedback.
    expect(world).toMatch(/togglePause:[\s\S]{0,600}'PAUSED'/);
    // Inspect mode must freeze sim bodies but still let the free camera consume real UI delta.
    expect(world).toMatch(/if \(isPaused\)[\s\S]{0,600}this\.updateCamera\(0,\s*uiDt,\s*t\)/);
    // …yet creatures stay ALIVE IN PLACE (owner #4): the paused branch advances a visual-only clock
    // and feeds it to the instanced shader time, so bodies writhe/shimmer where they stand while their
    // TRAVEL (position) is frozen — not a stiff, wholly-dead freeze.
    expect(world).toMatch(/if \(isPaused\)[\s\S]{0,400}this\.pauseVisualClock\s*\+=\s*uiDt/);
    expect(world).toMatch(/fr\.t\s*=\s*this\.pauseVisualClock/);
  });

  test('Archon panel five-card telemetry is live, not clock-fabricated', () => {
    const panel = src('src/ui/super-panel.ts');
    const world = src('src/world.ts');
    expect(panel).not.toContain('Date.now()');
    expect(panel).toContain('interface ArchonInfo');
    for (const key of [
      'surprise',
      'aggression',
      'deception',
      'curiosity',
      'dreaming',
      'hallucinating',
      'reasoning',
      'selfAware',
      'novelty',
      'ignition',
      'confidence',
    ]) {
      expect(panel).toContain(key);
    }
    expect(world).toContain('const mindSnap = this.superMinds[i]?.snapshot?.() ?? null');
    expect(world).toContain('confidence: mindSnap?.metacog?.confidence ?? 0');
  });
});
