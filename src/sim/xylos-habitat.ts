/** Bounded Xylos ⇄ Gray–Scott loop. Numeric senses are not text prompts or tokens. */
import type { XylosPercept, XylosView } from './xylos-mind';
import type { ReactionDiffusionSystem } from './reaction-diffusion';

const unit = (x: number): number => (x > 0 ? (x < 1 ? x : 1) : 0); // NaN → 0
const signed = (x: number): number => (x > -1 ? (x < 1 ? x : 1) : x <= -1 ? -1 : 0);

/** Owns the organism's field adapter, never the field itself. O(1) sensing and fixed-radius writes. */
export class XylosHabitat {
  /** World weather/chaos pressure, supplied by the composition root in [0,1]. */
  hazard = 0;
  /** Number of actual substrate disturbances, for observability and causal tests. */
  writes = 0;
  constructor(
    private readonly field: Pick<
      ReactionDiffusionSystem,
      'fieldU' | 'fieldV' | 'seedDeterministic'
    >,
    private readonly radius: number,
    private readonly extent: number,
  ) {
    if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(extent) || extent <= 0) {
      throw new RangeError('Xylos habitat dimensions must be positive and finite');
    }
  }

  /** Read local substrate and spatial differences into the caller's existing percept. */
  readonly sense = (view: XylosView, out: XylosPercept): void => {
    const u = this.field.fieldU;
    const v = this.field.fieldV;
    const size = Math.sqrt(u.length);
    const x = Math.floor(((view.x * this.radius) / this.extent + 0.5) * size);
    const z = Math.floor(((view.z * this.radius) / this.extent + 0.5) * size);
    const col = ((x % size) + size) % size;
    const row = ((z % size) + size) % size;
    const index = row * size + col;
    // #186: XylosMind.tick throws on any out-of-range/non-finite percept, which would abort
    // world.step; sanitise at the habitat boundary so a bad field cell can never do that.
    out.nutrient = unit(u[index] ?? 0);
    out.signal = unit(v[index] ?? 0);
    out.hazard = unit(this.hazard);
    out.gradientX = signed(
      (u[row * size + ((col + 1) % size)] ?? 0) - (u[row * size + ((col + size - 1) % size)] ?? 0),
    );
    out.gradientZ = signed(
      (u[((row + 1) % size) * size + col] ?? 0) - (u[((row + size - 1) % size) * size + col] ?? 0),
    );
  };

  /** Every half second at most, the organism changes the chemistry it will subsequently sense (#185: radius scales with pulse/action). */
  readonly effect = (view: XylosView): void => {
    if (view.tick % 10 !== 0 || view.pulse <= 0.25) return;
    const rad = view.pulse > 0.68 ? 2 : 1;
    this.field.seedDeterministic(
      (view.x * this.radius) / this.extent + 0.5,
      (view.z * this.radius) / this.extent + 0.5,
      rad,
    );
    this.writes++;
  };
}
