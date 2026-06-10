/**
 * Input system: keyboard state, control-pad buttons (`[data-a]`), toolbar buttons
 * (`[data-action]`), and the touch joystick (`#jP`/`#jK`).
 *
 * Port of the legacy input block (lines 605-635) with three Known Bugs fixed:
 * - Bug 8: the joystick tracks its own touch by `identifier` instead of reading `touches[0]`,
 *   so a second finger elsewhere on screen no longer steals the stick.
 * - Bug 10: the touch roll/tilt buttons now rotate in the SAME direction as the Z/X/R/F keys
 *   they mirror (legacy signs were inverted).
 * - Bug 11: all held-input state is cleared on window blur, so the camera stops flying and
 *   Space stops bursting after an alt-tab mid-hold.
 *
 * New over legacy: yaw buttons `yleft`/`yright` drive `camVel.ry` ±1, giving touch users the
 * C/V yaw the keyboard has (this makes the legacy dead `camVel.ry` path live).
 *
 * New over legacy (0.2.x contract amendment): pointer-look and wheel zoom on the `#c` canvas.
 * A drag that STARTS on the canvas (mouse, pen, or a touch outside the joystick) accumulates
 * deltas into `look.dx`/`look.dy`; the wheel accumulates into `zoom`. The world consumes both
 * each frame in free view (`rotation.y -= dx * 0.003`, `rotation.x -= dy * 0.003`,
 * `translateZ(zoom * k)`) and zeroes them. Pointer capture keeps fast drags tracking; UI
 * elements all float above the canvas, so panel/toolbar interaction never steers the camera.
 *
 * Audio unlock: this module has no audio knowledge. The composition root wires
 * `AudioEngine.init()` into its `UiActions` implementations, so the first user gesture that
 * dispatches an action unlocks the AudioContext — input just forwards.
 */
import type { UiActions } from '../types';
import { clamp } from '../math/scalar';

/** Camera-velocity axis keys (matches the legacy `camVel` shape). */
type Axis = 'x' | 'y' | 'z' | 'rx' | 'ry' | 'rz';

/**
 * `[data-a]` movement buttons → camVel axis and sign (legacy line 614 map).
 * Held buttons set `camVel[axis] = sign * 0.3`, released buttons zero it.
 */
const MOVE_MAP: Readonly<Record<string, readonly [Axis, number]>> = {
  fwd: ['z', -1],
  back: ['z', 1],
  left: ['x', -1],
  right: ['x', 1],
  up: ['y', 1],
  down: ['y', -1],
  // Known Bug 10: signs must MATCH the keyboard (Z: rz+, X: rz-, R: rx+, F: rx-).
  rleft: ['rz', 1],
  rright: ['rz', -1],
  tup: ['rx', 1],
  tdown: ['rx', -1],
  // New yaw buttons mirroring the C/V keys (ry+ / ry-).
  yleft: ['ry', 1],
  yright: ['ry', -1],
};

/** Legacy button-press camVel magnitude (line 615: `m[1] * 0.3`). */
const MOVE_GAIN = 0.3;

/** `[data-a]` sim buttons → UiActions methods (legacy line 615 inline dispatch). */
const SIM_MAP: Readonly<Record<string, keyof UiActions>> = {
  split: 'split',
  burst: 'burst',
  mutate: 'mutate',
  chaos: 'chaosBoost',
};

/** `[data-action]` toolbar buttons → UiActions methods (legacy lines 124-129 inline onclicks). */
const TOOLBAR_MAP: Readonly<Record<string, keyof UiActions>> = {
  music: 'toggleMusic',
  song: 'cycleSong',
  sfx: 'toggleSfx',
  sfxcycle: 'cycleSfxPreview',
  reset: 'reset',
  time: 'cycleTimeScale',
  wire: 'toggleWireframe',
  view: 'cycleView',
  algo: 'cycleAlgo',
  weather: 'cycleWeather',
  apoc: 'apocalypse',
};

/**
 * Binds all DOM input once at construction and exposes live, read-only views of the input
 * state. The frame loop polls `keys`, `camVel`, `touch`, `look`, and `zoom` — no per-frame
 * work happens here (everything is event-driven), so the system contributes zero allocation
 * to the render loop. `look` and `zoom` are accumulators the world consumes-and-zeroes.
 */
export class InputSystem {
  /** Live lowercase key-name → held map (legacy `keys`). Mutated only by this system. */
  readonly keys: Readonly<Record<string, boolean>>;
  /** Button-driven camera velocity (legacy `camVel`); the frame loop reads it every frame. */
  readonly camVel = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
  /** Joystick state (legacy `touchActive`/`touchX`/`touchY`), each axis in [-1, 1]. */
  readonly touch = { active: false, x: 0, y: 0 };
  /**
   * Pointer-look deltas in CSS pixels, accumulated while a drag that started on the `#c`
   * canvas is active. CONTRACT AMENDMENT (0.2.x): the world reads `dx`/`dy` once per frame
   * (free view: `rotation.y -= dx * 0.003`, `rotation.x -= dy * 0.003`) and MUST zero both
   * fields afterwards. The object identity is stable; only its fields mutate.
   */
  readonly look = { dx: 0, dy: 0 };
  /**
   * Accumulated wheel delta (deltaMode-normalized to ~pixels; positive = zoom out).
   * CONTRACT AMENDMENT (0.2.x): the world consumes it each frame
   * (`camera.translateZ(zoom * 0.02)` in free view) and resets it to 0. A mutable field by
   * necessity — a `readonly` primitive could not be consumed-and-zeroed by the reader.
   */
  zoom = 0;

  private readonly actions: UiActions;
  private readonly keyState: Record<string, boolean> = {};
  /** Identifier of the touch steering the joystick; null when idle (Known Bug 8). */
  private joyId: number | null = null;
  /** pointerId of the pointer dragging the camera look; null when idle. */
  private lookId: number | null = null;
  /** Last look-drag pointer position (clientX/clientY), valid while `lookId` is set. */
  private lookLastX = 0;
  private lookLastY = 0;
  /** Re-assigned by bindJoystick; default no-op keeps blur handling safe without a joystick. */
  private resetJoy: () => void = () => {};
  /** Bound `[data-a]` buttons, kept so blur can drop any lingering `.on` highlight. */
  private padButtons: HTMLElement[] = [];

  constructor(actions: UiActions) {
    this.actions = actions;
    this.keys = this.keyState;
    this.bindKeyboard();
    this.bindPadButtons();
    this.bindToolbar();
    this.bindJoystick();
    this.bindPointerLook();
  }

  /** Keyboard state + Tab/Space preventDefault (legacy 606-607); blur clear is Known Bug 11. */
  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      this.keyState[e.key.toLowerCase()] = true;
      if (e.key === 'Tab' || e.key === ' ') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keyState[e.key.toLowerCase()] = false;
    });
    // Known Bug 11: held keys (and held buttons) must not survive losing window focus.
    window.addEventListener('blur', () => this.clearHeldInput());
  }

  /**
   * Control-pad `[data-a]` buttons. pointerdown/up/leave/cancel covers mouse, pen, and touch,
   * including pointers dragged off a button or cancelled by the OS (legacy 612-621).
   */
  private bindPadButtons(): void {
    document.querySelectorAll<HTMLElement>('[data-a]').forEach((btn) => {
      const act = btn.dataset['a'];
      if (!act) return;
      this.padButtons.push(btn);
      const move = MOVE_MAP[act];
      const sim = SIM_MAP[act];
      const down = (): void => {
        btn.classList.add('on');
        if (move) this.camVel[move[0]] = move[1] * MOVE_GAIN;
        if (sim) this.actions[sim]();
      };
      const up = (): void => {
        btn.classList.remove('on');
        if (move) this.camVel[move[0]] = 0;
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('pointercancel', up);
    });
  }

  /** Toolbar `[data-action]` buttons dispatch straight to UiActions (returns are ignored). */
  private bindToolbar(): void {
    document.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
      const name = btn.dataset['action'];
      if (!name) return;
      const method = TOOLBAR_MAP[name];
      if (!method) return;
      btn.addEventListener('click', () => {
        this.actions[method]();
      });
    });
  }

  /**
   * Touch joystick on `#jP` (pad) / `#jK` (knob). Known Bug 8 fix: the steering touch is
   * matched by `identifier` on move/end, so multi-touch (e.g. joystick + a control button)
   * keeps the stick bound to the finger that grabbed it. Per-event work is O(touches).
   */
  private bindJoystick(): void {
    const pad = document.getElementById('jP');
    const knob = document.getElementById('jK');
    if (!pad || !knob) {
      console.warn('InputSystem: joystick elements #jP/#jK not found — joystick disabled');
      return;
    }
    const apply = (t: Touch): void => {
      const r = pad.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      this.touch.x = clamp((t.clientX - cx) / (r.width / 2), -1, 1);
      this.touch.y = clamp((t.clientY - cy) / (r.height / 2), -1, 1);
      // Legacy knob travel: half the pad minus the 15px knob radius.
      const kx = this.touch.x * (r.width / 2 - 15);
      const ky = this.touch.y * (r.height / 2 - 15);
      knob.style.transform = `translate(${kx}px,${ky}px)`;
    };
    const reset = (): void => {
      this.joyId = null;
      this.touch.active = false;
      this.touch.x = 0;
      this.touch.y = 0;
      knob.style.transform = 'translate(0,0)';
    };
    this.resetJoy = reset;
    pad.addEventListener(
      'touchstart',
      (e) => {
        if (this.joyId !== null) return; // already steering — ignore extra fingers
        const t = e.changedTouches[0];
        if (!t) return;
        this.joyId = t.identifier;
        this.touch.active = true;
        apply(t);
      },
      { passive: true },
    );
    pad.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault(); // keep the page from scrolling under the stick (legacy 633)
        if (this.joyId === null) return;
        for (let i = 0; i < e.touches.length; i++) {
          const t = e.touches[i];
          if (t && t.identifier === this.joyId) {
            apply(t);
            return;
          }
        }
      },
      { passive: false },
    );
    const end = (e: TouchEvent): void => {
      if (this.joyId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t && t.identifier === this.joyId) {
          reset();
          return;
        }
      }
    };
    pad.addEventListener('touchend', end, { passive: true });
    pad.addEventListener('touchcancel', end, { passive: true }); // iOS interrupt fix (legacy 635)
  }

  /**
   * Mouse-look + wheel zoom on the `#c` canvas (0.2.x contract amendment; see class fields).
   * Only pointers that go DOWN on the canvas itself steer the camera — every UI surface
   * (panels, toolbar, joystick) stacks above it, so taps there never reach the canvas. The
   * first pointer wins (`lookId` gate, mirroring the joystick's identifier tracking) and is
   * captured so fast drags keep delivering moves outside the window. Touch drags work because
   * the canvas carries `touch-none` (no scroll/zoom gesture competes). All handlers are
   * event-driven and allocation-free; per-event work is O(1).
   */
  private bindPointerLook(): void {
    const canvas = document.getElementById('c');
    if (!canvas) {
      console.warn('InputSystem: canvas #c not found — pointer look disabled');
      return;
    }
    canvas.addEventListener('pointerdown', (e) => {
      if (this.lookId !== null || e.button !== 0) return;
      this.lookId = e.pointerId;
      this.lookLastX = e.clientX;
      this.lookLastY = e.clientY;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // NotFoundError when the pointer is already gone (released mid-dispatch, or a
        // synthetic test event). The drag still works uncaptured; pointerup ends it.
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      this.look.dx += e.clientX - this.lookLastX;
      this.look.dy += e.clientY - this.lookLastY;
      this.lookLastX = e.clientX;
      this.lookLastY = e.clientY;
    });
    const end = (e: PointerEvent): void => {
      if (e.pointerId === this.lookId) this.lookId = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    // Wheel zoom: normalize the rare line/page delta modes to ~pixels, accumulate for world.
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault(); // page never scrolls; keep browser zoom gestures off the canvas
        this.zoom += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      },
      { passive: false },
    );
  }

  /**
   * Known Bug 11: release everything held — key map, button-driven camVel, joystick, look
   * drag, and any lingering `.on` button highlight. Runs on window blur only, so allocation
   * here is fine.
   */
  private clearHeldInput(): void {
    for (const k of Object.keys(this.keyState)) this.keyState[k] = false;
    this.camVel.x = 0;
    this.camVel.y = 0;
    this.camVel.z = 0;
    this.camVel.rx = 0;
    this.camVel.ry = 0;
    this.camVel.rz = 0;
    this.resetJoy();
    this.lookId = null;
    this.look.dx = 0;
    this.look.dy = 0;
    this.zoom = 0;
    for (const btn of this.padButtons) btn.classList.remove('on');
  }
}
