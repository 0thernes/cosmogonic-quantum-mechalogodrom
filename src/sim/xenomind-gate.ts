// XENOMIND TRUST GATE — the Xenomind is an untrained alien substrate. Its raw intent is ~random, so
// letting it bend the archons' pull/light from beat one injected noise into every brain ("dumber").
// The gate learns ONLINE how well the xenomind's pull intent predicts the brains' OWN pull drive
// (sign agreement around the midpoint, EMA). Until it has watched enough beats AND agrees reliably,
// its nudge is exactly zero; past the bar the nudge ramps in, and it is only ever applied in the
// direction the brain already leans — it can sharpen a decision, never contradict or randomise it.
// Pure, allocation-free, draws no rng (seeded streams and goldens are untouched).

export const XENO_TRUST_MIN_BEATS = 600;
export const XENO_TRUST_BAR = 0.8;
const EMA = 0.01;

export class XenomindTrustGate {
  private agree = 0.5;
  private beats = 0;

  /** Observe one beat: does the xenomind's pull intent lean the same way as the brain's own pull? */
  observe(intentPull: number, brainPull: number): void {
    const a = intentPull - 0.5;
    const b = brainPull - 0.5;
    const hit = a === 0 || b === 0 ? 0.5 : Math.sign(a) === Math.sign(b) ? 1 : 0;
    this.agree += (hit - this.agree) * EMA;
    this.beats++;
  }

  /** 0 until trained (≥ MIN_BEATS and agreement ≥ BAR), then ramps linearly to 1 at full agreement. */
  trust(): number {
    if (this.beats < XENO_TRUST_MIN_BEATS || this.agree < XENO_TRUST_BAR) return 0;
    return Math.min(1, (this.agree - XENO_TRUST_BAR) / (1 - XENO_TRUST_BAR));
  }

  /**
   * The gated nudge for one channel: trust × gain × |intent − ½|, signed by the BRAIN's own lean
   * (never the xenomind's), and zero when the two disagree this beat.
   */
  nudge(intent: number, brain: number, gain: number): number {
    const t = this.trust();
    if (t === 0) return 0;
    const a = intent - 0.5;
    const b = brain - 0.5;
    if (a === 0 || b === 0 || Math.sign(a) !== Math.sign(b)) return 0;
    return Math.sign(b) * Math.abs(a) * gain * t;
  }

  snapshot(): { agreement: number; beats: number; trust: number } {
    return { agreement: this.agree, beats: this.beats, trust: this.trust() };
  }
}
