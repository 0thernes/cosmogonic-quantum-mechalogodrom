/**
 * Heads-up display: sector banner (`#sec`), puppet-master toast (`#nm`), and the algorithm
 * readout (`#a-name` / `#a-step`).
 *
 * Port of the legacy `showS` (line 597), `showNM` (line 491), and the per-frame algorithm text
 * writes (lines 695-696). Known Bug 4 fix: all element refs are resolved once in the
 * constructor — the legacy code called `getElementById('a-name')`/`('a-step')` inside the
 * render loop.
 */

/** Resolve a required element by id, failing loudly on integration mistakes. */
function mustGet(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Hud: missing required element #${id}`);
  return el;
}

/** Legacy sector banner fade-out delay (showS), ms. */
const SECTOR_FADE_MS = 2500;
/** Legacy puppet-master toast fade-out delay (showNM), ms. */
const TOAST_FADE_MS = 3000;

/**
 * Owns the transient overlay text. Fades are CSS-driven (`.show` class, opacity transition);
 * this class only schedules the class removal, mirroring the legacy `secTO`/`nmTO` timeouts.
 */
export class Hud {
  private readonly sec: HTMLElement;
  private readonly nm: HTMLElement;
  private readonly aName: HTMLElement;
  private readonly aStep: HTMLElement;
  private secTimer = 0;
  private nmTimer = 0;

  /** Caches `#sec`, `#nm`, `#a-name`, `#a-step` once (Known Bug 4). Throws if any is absent. */
  constructor() {
    this.sec = mustGet('sec');
    this.nm = mustGet('nm');
    this.aName = mustGet('a-name');
    this.aStep = mustGet('a-step');
  }

  /**
   * Show the centered sector banner, restarting its 2.5s fade (legacy `showS`).
   * Also used for action toasts like 'GENESIS RESET' and 'VIEW: ORBIT'. O(1).
   */
  showSector(name: string): void {
    this.sec.textContent = name;
    this.sec.classList.add('show');
    clearTimeout(this.secTimer);
    this.secTimer = window.setTimeout(() => this.sec.classList.remove('show'), SECTOR_FADE_MS);
  }

  /**
   * Show the puppet-master toast as `NAME — action`, restarting its 3s fade
   * (legacy `showNM`). O(1).
   */
  showToast(name: string, action: string): void {
    this.nm.textContent = `${name} — ${action}`;
    this.nm.classList.add('show');
    clearTimeout(this.nmTimer);
    this.nmTimer = window.setTimeout(() => this.nm.classList.remove('show'), TOAST_FADE_MS);
  }

  /**
   * Update the algorithm readout: name plus `step N` with a `⇄` suffix when the last step
   * swapped (legacy lines 695-696). O(1) — called from the frame loop; the only allocation is
   * the label string the DOM requires.
   */
  setAlgo(name: string, step: number, swapped: boolean): void {
    this.aName.textContent = name;
    this.aStep.textContent = `step ${step}${swapped ? ' ⇄' : ''}`;
  }
}
