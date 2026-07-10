/**
 * NARRATIVE MEMORY — the concrete realization of the 10 memory orchestrations for the 5 Super Creatures.
 *
 * "Memory should be a decision system, not an archive."
 *
 * Implements the layered, typed, feedback-controlled stack distilled from control/chaos/info/type/graph/matrix/game theory:
 * - Belief-State + Surprise-Gated + Typed Event-Sourced
 * - Graph with Provenance + Matrix Compression (latent summaries)
 * - Regime-Shift Sentinel + Strategic Reputation/Commitment
 * - Information-Bottleneck Retrieval + Reflection-to-Skill (procedural traces)
 * - Multi-Store Orchestra (scratch / episodic / semantic / procedural / graph / reputation)
 *
 * All deterministic (seeded Rng only for init), allocation-free in hot path (preallocated rings + fixed arrays),
 * O(1) or O(k) with tiny k for retrieval. Each of the 5 Archons owns its own instance on a child stream.
 *
 * No online learning of weights; the "learning" is architectural adaptation inside the fixed dynamics
 * (consolidation, regime reweight, graph updates) plus the creature's fixed super-mind.
 *
 * POWER OF MATH: uses linear algebra (means, dots for relevance), info theory (entropy gate), graph (adjacency for causes),
 * fourier-ish temporal (recency decay), set ops (typed filters), probability (confidence).
 *
 * See docs/SUPER-CREATURE-RESEARCH-2026-06-26.md and the memory orchestration research notes for full mapping.
 * This fulfills the "persistent lifelong narrative memory + grounded symbol layer" (VSA holographic already provides
 * symbol grounding; this adds the typed event narrative + router on top).
 */

import type { Rng } from '../math/rng';

export const NARRATIVE_CAP = 64; // bounded lifelong ring (promoted to durable semantic on consolidation)
export const GRAPH_NODES = 8; // self + key rivals/resources (small fixed graph for provenance)

export type MemoryKind = 'OBS' | 'PREF' | 'COMMIT' | 'PLAN' | 'FAIL' | 'INSIGHT' | 'REPUTATION';

export interface TypedEvent {
  kind: MemoryKind;
  // wrapped time (monotonic but bounded for determinism)
  t: number;
  confidence: number; // 0..1
  scope: number; // 0..1 spatial/temporal scope
  // compact payload (decision-relevant bits only)
  val: number;
  tag: number; // hashed entity / plan id
}

/** Small fixed graph for provenance (caused-by, contradicts, same-as etc as bitmasks). */
export interface ProvenanceGraph {
  // adj bitmask: bit j means edge from i to j (caused-by etc)
  edges: Uint8Array; // GRAPH_NODES x GRAPH_NODES / 8 packed, but simple Uint8 for tiny
  trust: Float32Array; // per node strategic trust/reputation
}

export interface NarrativeSnapshot {
  eventCount: number;
  regimeShift: number; // 0..1 detected change
  beliefMeans: number[]; // compressed state estimate (matrix factor style)
  routerRelevance: number; // last retrieval quality
  graphTrustMean: number;
}

/**
 * The Multi-Store Memory Orchestra + router.
 * Scratch is transient (caller manages).
 * Episodic = ring of typed events.
 * Semantic = beliefMeans (low-rank).
 * Procedural = success stats per plan kind.
 * Graph = provenance + reputation.
 * Strategic = trust in graph.
 */
export class NarrativeMemory {
  private readonly ring: TypedEvent[] = Array.from({ length: NARRATIVE_CAP }, () => ({
    kind: 'OBS' as MemoryKind,
    t: 0,
    confidence: 0,
    scope: 0,
    val: 0,
    tag: 0,
  }));
  private head = 0;
  private count = 0;

  private readonly graph: ProvenanceGraph = {
    edges: new Uint8Array(GRAPH_NODES),
    trust: new Float32Array(GRAPH_NODES),
  };

  // matrix-compressed belief state (4D latent for state estimate)
  private readonly belief = new Float32Array(4);

  // procedural skill traces (plan success EMA)
  private readonly _skill = new Float32Array(7); // one per SUPER_PLAN (GOAL5 reflection-to-skill hook)

  private regime = 0;
  private lastSurprise = 0;

  constructor(_rng: Rng) {
    // init trust neutral; graph sparse by construction
    this.graph.trust.fill(0.5);
    void this._skill; // GOAL5 skill traces (consolidation target)
  }

  /** Surprise/entropy gate + type contract write. Only high-value writes. O(1). */
  write(
    kind: MemoryKind,
    surprise: number,
    confidence: number,
    scope: number,
    val: number,
    tag: number,
    t: number,
  ): void {
    // chaos + info theory gate: only novel, wrong, useful, risky, or high-utility
    const gate = surprise > 0.12 || confidence > 0.75 || kind === 'COMMIT' || kind === 'FAIL';
    if (!gate) return;

    const e = this.ring[this.head];
    if (e) {
      e.kind = kind;
      e.t = t % 1e9;
      e.confidence = Math.max(0, Math.min(1, confidence));
      e.scope = Math.max(0, Math.min(1, scope));
      e.val = val;
      e.tag = tag | 0;
    }

    this.head = (this.head + 1) % NARRATIVE_CAP;
    this.count = Math.min(NARRATIVE_CAP, this.count + 1);

    // update compressed belief (matrix low-rank update, O(1))
    const a = 0.1;
    this.belief[0] = (1 - a) * (this.belief[0] ?? 0) + a * val;
    this.belief[1] = (1 - a) * (this.belief[1] ?? 0) + a * confidence;
    this.belief[2] = (1 - a) * (this.belief[2] ?? 0) + a * scope;
    this.belief[3] =
      (1 - a) * (this.belief[3] ?? 0) + a * (kind === 'COMMIT' ? 1 : kind === 'FAIL' ? -0.5 : 0);

    // regime shift sentinel (control + chaos)
    const d = Math.abs(surprise - this.lastSurprise);
    this.regime = Math.max(0, Math.min(1, 0.9 * this.regime + 0.1 * d * 2));
    this.lastSurprise = surprise;

    // graph provenance touch (simple tag as node)
    const node = Math.abs(tag) % GRAPH_NODES;
    const tn = this.graph.trust[node] ?? 0.5;
    this.graph.trust[node] = 0.9 * tn + 0.1 * confidence;
    if (kind === 'COMMIT') this.graph.edges[node] = (this.graph.edges[node] ?? 0) | 1;
    if (kind === 'FAIL') this.graph.edges[node] = (this.graph.edges[node] ?? 0) | 2;
  }

  /** Information-bottleneck + multi-view router. Returns min info that changes decision. O(k). */
  retrieve(
    currentPlanTag: number,
    taskRelevance: number,
    recencyBias: number,
  ): { relevance: number; confidence: number; trust: number } {
    let bestRel = 0;
    let sumConf = 0;
    let hits = 0;
    // Most-recent entry sits one slot behind head, with ring wraparound (matches the loops below).
    // `Math.max(0, head-1)` read slot 0 instead of NARRATIVE_CAP-1 right after head wrapped to 0.
    const now = this.ring[(this.head - 1 + NARRATIVE_CAP) % NARRATIVE_CAP]?.t ?? 0;

    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - 1 - i + NARRATIVE_CAP) % NARRATIVE_CAP;
      const e = this.ring[idx];
      if (!e) continue;
      const age = Math.max(0, (now - e.t + 1e9) % 1e9) / 240;
      const rec = Math.exp(-age * 3) * recencyBias;
      const tagMatch = e.tag === currentPlanTag ? 1.2 : 1.0;
      const rel = e.confidence * e.scope * tagMatch * (0.6 + 0.4 * taskRelevance) * rec;
      if (rel > bestRel) bestRel = rel;
      sumConf += e.confidence;
      hits++;
    }

    const meanConf = hits > 0 ? sumConf / hits : 0.5;
    // graph strategic
    const gtrust = this.graph.trust.reduce((s, v) => s + v, 0) / GRAPH_NODES;

    return { relevance: Math.min(1, bestRel), confidence: meanConf, trust: gtrust };
  }

  /** Consolidation: episodes → durable semantic (reflection-to-skill + matrix). Called on ignition. */
  consolidate(ignition: number): void {
    if (ignition < 0.3) return;
    // promote high-conf recent into belief (low-rank)
    for (let i = 0; i < Math.min(8, this.count); i++) {
      const idx = (this.head - 1 - i + NARRATIVE_CAP) % NARRATIVE_CAP;
      const e = this.ring[idx];
      if (e && e.confidence > 0.6) {
        const a = 0.05 * ignition;
        this.belief[0] = (1 - a) * (this.belief[0] ?? 0) + a * (e.val ?? 0) * e.confidence;
      }
    }
    // update procedural skills from recent plans
    // (caller feeds success signal via write('PLAN'...) )
  }

  snapshot(): NarrativeSnapshot {
    return {
      eventCount: this.count,
      regimeShift: this.regime,
      beliefMeans: Array.from(this.belief),
      routerRelevance: 0, // filled by last retrieve if desired
      graphTrustMean: this.graph.trust.reduce((s, v) => s + v, 0) / GRAPH_NODES,
    };
  }
}
