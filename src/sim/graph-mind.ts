/**
 * GraphMind — the connectome's slow-thinking analytical cortex (CONTRACTS V2).
 *
 * On a slow cadence it mirrors the connectome's link pairs into a graphology graph and runs
 * real graph science over the living network: Louvain community detection (every 240 frames)
 * and PageRank centrality (every 600 frames, offset 300 — offset 120 would land on the 240f
 * Louvain cadence at frame 720 and every 1200 frames after; 300 mod 240 alternates 60/180 and
 * never collides, so the two heavy passes never share a frame). Results feed BACK into the
 * simulation (philosophy rule 4): community indices are written into each member's
 * `userData.setGroup`, making the set-theory behavior tribe-aware; an 8-hue community palette
 * is installed on the connectome's link coloring; and the top-ranked entities receive an
 * emissive halo boost while their rank holds.
 *
 * Determinism: Louvain's random walk consumes `ctx.rng` exclusively — one seed, one tribal
 * history. Both update methods are slow-cadence paths (never per-frame), so the graphology
 * rebuild/allocation cost is paid at most once per 240 frames; the per-frame work this module
 * induces (the connectome's palette lookup) is a single O(1) closure call per link.
 */
import { UndirectedGraph } from 'graphology';
import louvain from 'graphology-communities-louvain';
import pagerank from 'graphology-metrics/centrality/pagerank';
import type { Entity, SimContext } from '../types';
import type { EntityManager } from './entities';
import type { Connectome } from './connectome';

/** How many top-PageRank entities get the emissive halo (contract: top-20). */
const RANK_TOP = 20;
/**
 * Emissive-intensity floor applied to ranked entities. Sits below the entity loop's 2.5
 * activation ceiling; the loop lerps intensity back toward the morph baseline between rank
 * passes, so the boost reads as a flare re-armed at every `updateRank()` while rank holds.
 */
const RANK_EMISSIVE_FLOOR = 2.0;

/**
 * Community detection + centrality over the connectome graph. The composition root constructs
 * one and calls {@link updateCommunities} every 240 frames and {@link updateRank} every 600
 * frames (offset 300) — both methods rebuild the graph from the connectome's latest pairs, so
 * neither depends on the other having run first.
 */
export class GraphMind {
  private readonly ctx: SimContext;
  private readonly entities: EntityManager;
  private readonly connectome: Connectome;
  /** Rebuilt (cleared + refilled) from `connectome.pairs` on every update call. */
  private readonly graph: UndirectedGraph;
  /** Community per entity-list index from the last Louvain pass; -1 = unassigned. */
  private readonly communities: Int32Array;
  /** Stable closure handed to `Connectome.setCommunityOf` — created once, O(1) per call. */
  private readonly communityLookup: (entityIndex: number) => number;
  /** Entities currently carrying the rank halo (restored when rank is lost). */
  private readonly boosted = new Set<Entity>();
  /** Scratch set reused by {@link updateRank} (cleared before and after use). */
  private readonly topScratch = new Set<Entity>();
  private tribeCount = 0;
  private paletteInstalled = false;

  constructor(ctx: SimContext, entities: EntityManager, connectome: Connectome) {
    this.ctx = ctx;
    this.entities = entities;
    this.connectome = connectome;
    this.graph = new UndirectedGraph();
    this.communities = new Int32Array(ctx.quality.maxEntities).fill(-1);
    this.communityLookup = (entityIndex: number): number => {
      const c = this.communities[entityIndex];
      return c === undefined || c < 0 ? 0 : c;
    };
  }

  /** Community count found by the last Louvain pass (telemetry `tribes`, row #v9). */
  get tribes(): number {
    return this.tribeCount;
  }

  /**
   * Mirror the connectome's latest index pairs into the graphology graph. Duplicate undirected
   * pairs collapse via `mergeEdge`; defensive self-loop skip (the connectome never emits them).
   * O(E) where E = `connectome.pairCount`.
   */
  private rebuildGraph(): void {
    const g = this.graph;
    g.clear();
    const pairs = this.connectome.pairs;
    const n = this.connectome.pairCount;
    for (let p = 0; p < n; p++) {
      const a = pairs[p * 2];
      const b = pairs[p * 2 + 1];
      if (a === undefined || b === undefined || a === b) continue; // noUncheckedIndexedAccess
      g.mergeEdge(a, b);
    }
  }

  /**
   * Rebuild the graph and run Louvain community detection (rng = `ctx.rng` — deterministic per
   * seed). Each member entity's `userData.setGroup` becomes its community index (tribe-aware
   * set theory), and the 8-hue community palette is installed on the connectome. When the graph
   * is empty the palette is uninstalled, degrading visibly back to the V1 time hue.
   * Slow-cadence path (every 240 frames): O(E·i) for Louvain's i refinement iterations.
   */
  updateCommunities(): void {
    this.rebuildGraph();
    const g = this.graph;
    this.communities.fill(-1);
    if (g.order === 0) {
      this.tribeCount = 0;
      if (this.paletteInstalled) {
        this.connectome.setCommunityOf(null);
        this.paletteInstalled = false;
      }
      return;
    }
    const result = louvain.detailed(g, { rng: this.ctx.rng, getEdgeWeight: null });
    this.tribeCount = result.count;
    const list = this.entities.list;
    const mapping = result.communities;
    // Integer-like keys iterate in ascending numeric order (JS spec) — deterministic.
    for (const node of Object.keys(mapping)) {
      const c = mapping[node];
      if (c === undefined) continue; // noUncheckedIndexedAccess
      const idx = Number(node);
      if (idx >= 0 && idx < this.communities.length) this.communities[idx] = c;
      const e = list[idx];
      if (e) e.userData.setGroup = c;
    }
    if (!this.paletteInstalled) {
      this.connectome.setCommunityOf(this.communityLookup);
      this.paletteInstalled = true;
    }
  }

  /**
   * Rebuild the graph and run PageRank; the top-{@link RANK_TOP} entities get an
   * emissive-intensity floor of {@link RANK_EMISSIVE_FLOOR}, and entities that held the halo
   * but fell out of the top set are restored to their morph baseline. Ties rank by ascending
   * entity index (stable sort over numerically ordered keys) — deterministic.
   * Slow-cadence path (every 600 frames, offset 300): O((V + E)·i + V log V).
   */
  updateRank(): void {
    this.rebuildGraph();
    const g = this.graph;
    const list = this.entities.list;
    const top = this.topScratch;
    top.clear();
    if (g.order > 0) {
      const ranks = pagerank(g, { getEdgeWeight: null });
      const nodes = Object.keys(ranks);
      nodes.sort((a, b) => (ranks[b] ?? 0) - (ranks[a] ?? 0));
      const limit = Math.min(RANK_TOP, nodes.length);
      for (let r = 0; r < limit; r++) {
        const key = nodes[r];
        if (key === undefined) continue; // noUncheckedIndexedAccess: r < length
        const e = list[Number(key)];
        if (e) top.add(e);
      }
    }
    for (const e of this.boosted) {
      if (!top.has(e)) this.restoreEmissive(e);
    }
    this.boosted.clear();
    for (const e of top) {
      this.boosted.add(e);
      if (e.material.emissiveIntensity < RANK_EMISSIVE_FLOOR) {
        e.material.emissiveIntensity = RANK_EMISSIVE_FLOOR;
      }
    }
    top.clear();
  }

  /**
   * Reset a former rank-holder's emissive intensity to its morph baseline. O(1).
   *
   * No liveness guard ON PURPOSE (audit fix): the old `e.parent === null` check meant "skip
   * dead entities", but in INSTANCED mode data meshes never join the scene graph, so the
   * guard was true for EVERY live entity above the phone tier and the restore was dead code —
   * ex-rank-holders kept their halo until the slow per-frame lerp eroded it. Writing a scalar
   * onto a dead entity's already-disposed material is harmless (the mesh is out of the list
   * and never rendered), so restoring unconditionally is correct on BOTH render paths.
   */
  private restoreEmissive(e: Entity): void {
    const m = this.ctx.morphs[e.userData.mi];
    if (m) e.material.emissiveIntensity = m.emI;
  }
}
