// NHSI AFFECT BINDING — wires the restored ResonanceIntegrator + ValenceSteering into the live apex beat.
// The 144-faculty pantheon's activations are split into 8 faculty-group vectors, each mapped to a phase;
// the integrator finds the phase-locked coalition (standing wave). Valence (PAD + pain/pleasure from the
// world) bends the integrator's phase tolerance (faculty #71) and yields an explore/exploit bias.
// Pure + deterministic: no rng, no allocation beyond the integrator's own snapshot.
import { ResonanceIntegrator, type IntegratorSnapshot } from './resonance-integrator';
import { ValenceSteering } from './valence-steering';

export const NHSI_AFFECT_GROUPS = 8;

export interface NhsiAffectInput {
  padPleasure: number;
  padArousal: number;
  padDominance: number;
  pain: number;
  pleasure: number;
}

export interface NhsiAffectOut {
  resonance: number;
  coherence: number;
  coalitionSize: number;
  standingWave: boolean;
  valence: number;
  arousal: number;
  exploration: number;
  painUrgent: boolean;
}

export class NhsiAffectBinding {
  readonly integrator = new ResonanceIntegrator();
  readonly steering = new ValenceSteering();
  private readonly groups: Float32Array[] = [];
  private last: NhsiAffectOut = {
    resonance: 0,
    coherence: 0,
    coalitionSize: 0,
    standingWave: false,
    valence: 0,
    arousal: 0,
    exploration: 0.5,
    painUrgent: false,
  };

  step(activations: ArrayLike<number>, a: NhsiAffectInput): NhsiAffectOut {
    this.steering.updateValence(a.padPleasure, a.padArousal, a.padDominance, a.pain, a.pleasure);
    const v = this.steering.state;
    this.integrator.applyValence(v.pleasure);
    const n = activations.length;
    const per = n / NHSI_AFFECT_GROUPS;
    for (let g = 0; g < NHSI_AFFECT_GROUPS; g++) {
      const lo = Math.floor(g * per);
      const hi = Math.floor((g + 1) * per);
      let vec = this.groups[g];
      if (!vec || vec.length !== hi - lo)
        vec = this.groups[g] = new Float32Array(Math.max(0, hi - lo));
      for (let i = lo; i < hi; i++) vec[i - lo] = activations[i] ?? 0;
    }
    this.integrator.updateFromActivations(this.groups);
    const s: IntegratorSnapshot = this.integrator.snapshot();
    this.last = {
      resonance: s.resonance,
      coherence: s.coherence,
      coalitionSize: s.coalitionSize,
      standingWave: s.standingWave,
      valence: v.pleasure,
      arousal: v.arousal,
      exploration: this.steering.exploration,
      painUrgent: this.steering.painUrgent,
    };
    return this.last;
  }

  snapshot(): NhsiAffectOut {
    return { ...this.last };
  }
}
