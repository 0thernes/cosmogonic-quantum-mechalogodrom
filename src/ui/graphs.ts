/**
 * Canvas sparkline graphs for the telemetry panel.
 *
 * Port of the legacy `ensureGS` / `drawGraph` / `pushG` trio (legacy lines 600-603) with the
 * Known Bug 4 fixes applied: the 2d context is resolved once in the constructor instead of
 * `getElementById` + `getContext` per redraw, and the rolling buffer is a fixed-capacity
 * Float32Array ring instead of a growing `Array#push`/`shift` pair (no per-sample allocation,
 * no O(n) shift).
 */

/** Rolling-window capacity — legacy `GM = 100` samples. */
const CAPACITY = 100;

/**
 * A single sparkline bound to one `<canvas>`.
 *
 * Visuals match the legacy `drawGraph`: dark `rgba(0,0,8,.85)` backing fill, 1.2px stroke,
 * values normalized to 88% of the canvas height, and a translucent area fill derived from the
 * stroke color (alpha `1)` → `0.08)`). The backing store is kept at 2x the CSS size for HiDPI
 * crispness, exactly like the legacy `ensureGS` (`offsetWidth * 2`).
 */
export class Sparkline {
  /**
   * Vertical full-scale value. `0` means auto-scale to the current buffer maximum (legacy
   * `mx || Math.max(...data) || 1` semantics). Writable so callers can track quality-dependent
   * caps (e.g. the entity graph's `maxEntities`) without reconstructing the sparkline.
   */
  max: number;

  private readonly canvas: HTMLCanvasElement;
  /** Cached once (Known Bug 4) — `getContext('2d')` is stable across canvas resizes. */
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly stroke: string;
  private readonly fill: string;
  /** Ring buffer of the last `CAPACITY` samples; `head` is the oldest, `count` ≤ CAPACITY. */
  private readonly buf = new Float32Array(CAPACITY);
  private head = 0;
  private count = 0;

  /**
   * @param canvas Target canvas (one of `#g0..#g3`).
   * @param color Stroke color as an `rgba(r,g,b,1)` string — the area fill is derived from it.
   * @param fixedMax Fixed full-scale value; `0`/omitted auto-scales to the data maximum.
   */
  constructor(canvas: HTMLCanvasElement, color: string, fixedMax = 0) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stroke = color;
    // Legacy area fill: drawGraph did col.replace('1)', '0.08)') on every frame; do it once.
    this.fill = color.replace('1)', '0.08)');
    this.max = fixedMax;
  }

  /**
   * Append a sample to the rolling window, evicting the oldest once full
   * (legacy `pushG`). O(1), allocation-free.
   */
  push(v: number): void {
    if (this.count < CAPACITY) {
      this.buf[(this.head + this.count) % CAPACITY] = v;
      this.count++;
    } else {
      this.buf[this.head] = v;
      this.head = (this.head + 1) % CAPACITY;
    }
  }

  /**
   * Redraw the sparkline from the current buffer (legacy `drawGraph`).
   * O(n) where n = buffered samples (≤ 100); allocation-free (path commands only).
   */
  draw(): void {
    const c = this.canvas;
    const x = this.ctx;
    if (!x) return;
    // Legacy ensureGS: keep the backing store at 2x CSS pixels for HiDPI; only touch
    // width/height when stale (assigning them clears the canvas).
    const w = c.offsetWidth * 2;
    const h = c.offsetHeight * 2;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = 'rgba(0,0,8,.85)';
    x.fillRect(0, 0, c.width, c.height);
    const n = this.count;
    if (n < 2) return;
    // Full-scale: fixed max if set, else buffer max, else 1 (legacy mx||max(data)||1).
    let m = this.max;
    if (!m) {
      for (let i = 0; i < n; i++) {
        const v = this.buf[(this.head + i) % CAPACITY] ?? 0;
        if (v > m) m = v;
      }
    }
    if (!m) m = 1;
    x.strokeStyle = this.stroke;
    x.lineWidth = 1.2;
    x.beginPath();
    for (let i = 0; i < n; i++) {
      const v = this.buf[(this.head + i) % CAPACITY] ?? 0;
      const px = (i / (n - 1)) * c.width;
      const py = c.height - (v / m) * c.height * 0.88;
      if (i === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    // Legacy order: stroke the line first, then extend the same path down to the baseline
    // and fill the enclosed area with the translucent variant of the stroke color.
    x.stroke();
    x.lineTo(c.width, c.height);
    x.lineTo(0, c.height);
    x.closePath();
    x.fillStyle = this.fill;
    x.fill();
  }
}
