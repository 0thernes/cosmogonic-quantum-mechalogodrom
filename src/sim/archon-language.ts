/**
 * ARCHON LANGUAGE — wires the restored {@link EmergentLanguage} into the apex beat.
 *
 * Two Archon speech communities play a seeded naming game every apex beat. The speaker's private
 * signal is the dominant faculty group of the pantheon (0..7); it encodes the signal to a sign
 * (proposing a fresh, seeded sign when it has none), and the listener decodes it. Success reinforces
 * both lexicons; failure makes the listener adopt the speaker's sign, and a misunderstanding (the
 * listener maps the sign to another signal) also weakens the speaker's mapping. Every 32 beats both lexicons evolve (decay, ageing, seeded mutation). The shared
 * vocabulary that emerges is nobody's design.
 *
 * Output: `fluency` (EMA of communicative success, 0..1), lexicon size and Shannon diversity.
 * Deterministic: its own mulberry32 stream, so it never perturbs the World rng order.
 */

import { EmergentLanguage, computeLanguageDiversity } from './emergent-language';
import { mulberry32, type Rng } from '../math/rng';

const ARCHON_SIGNALS = 8;
const MAX_SIGNS = 64;
const EVOLVE_EVERY = 32;

export interface ArchonLanguageState {
  fluency: number;
  signs: number;
  diversity: number;
  lastSuccess: boolean;
}

export class ArchonLanguage {
  readonly communities: [EmergentLanguage, EmergentLanguage] = [
    new EmergentLanguage({ maxSigns: MAX_SIGNS }),
    new EmergentLanguage({ maxSigns: MAX_SIGNS }),
  ];
  private readonly rng: Rng;
  private beat = 0;
  private readonly state: ArchonLanguageState = {
    fluency: 0,
    signs: 0,
    diversity: 0,
    lastSuccess: false,
  };

  constructor(seed: number) {
    this.rng = mulberry32(seed >>> 0 || 1);
  }

  /** One naming-game round. `groups` = the pantheon's faculty-group activations. */
  step(groups: ArrayLike<number>): Readonly<ArchonLanguageState> {
    let sig = 0;
    for (let i = 1; i < Math.min(ARCHON_SIGNALS, groups.length); i++) {
      if ((groups[i] ?? 0) > (groups[sig] ?? 0)) sig = i;
    }
    const [a, b] = this.communities;
    const speaker = this.beat & 1 ? b : a;
    const listener = this.beat & 1 ? a : b;
    this.beat++;
    const sign = speaker.encode(sig) ?? Math.floor(this.rng() * MAX_SIGNS);
    const heard = listener.decode(sign);
    const ok = heard === sig;
    if (ok) {
      speaker.reinforce(sig, sign);
      listener.reinforce(sig, sign);
    } else {
      // Only a MISunderstanding (listener maps the sign elsewhere) weakens the speaker; silence doesn't.
      if (heard !== null) speaker.punish(sig, sign);
      speaker.reinforce(sig, sign);
      listener.reinforce(sig, sign);
    }
    if (this.beat % EVOLVE_EVERY === 0) {
      speaker.evolve(this.rng);
      listener.evolve(this.rng);
    }
    const st = this.state;
    st.lastSuccess = ok;
    st.fluency += 0.05 * ((ok ? 1 : 0) - st.fluency);
    st.signs = speaker.lexicon.length + listener.lexicon.length;
    if (this.beat % 8 === 0) st.diversity = computeLanguageDiversity(speaker);
    return st;
  }

  snapshot(): ArchonLanguageState {
    return { ...this.state };
  }
}
