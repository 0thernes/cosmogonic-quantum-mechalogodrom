/**
 * Composition root of the simulation: constructs every system against the
 * contracts in docs/MODULE-CONTRACTS.md, owns the mutable SimState, implements
 * all UiActions, and drives the per-frame pipeline
 * (camera → weather → puppet masters → grid → shoggoths → sector → sort step →
 *  entities → connectome → quantum → environment → telemetry → render).
 *
 * Frame-pipeline cadences (mirrors the legacy monolith):
 * grid rebuild every 2nd frame; connectome every 1/2/3 frames at n≤400/≤700/>700;
 * telemetry every 8th frame. `step()` is allocation-free (module scratch only).
 */
import * as THREE from 'three';
import type { Engine } from './core/engine';
import type {
  PersistedState,
  QualityProfile,
  SimContext,
  SimState,
  TelemetrySnapshot,
  UiActions,
} from './types';
import type { Entity } from './types';
import type { ViewMode, Weather } from './sim/constants';
import {
  ARENA_MID,
  ARENA_Y,
  CHAOS_MAX,
  CHAOS_MIN,
  GRID_CELL,
  GROUND_EXTENT,
  ULTRA_GRID_CELL,
  VIEW_MODES,
  WEATHERS,
} from './sim/constants';
import { ALGOS } from './sim/algorithms';
import { SONGS, SFX_TYPES } from './audio/songs';
import { mulberry32, type Rng } from './math/rng';
import { clamp } from './math/scalar';
import { SpatialHash } from './math/spatial-hash';
import { createGeometryCache } from './sim/geometry-cache';
import { createMorphotypes } from './sim/morphotypes';
import { createPhyla } from './sim/phyla';
import { EntityManager } from './sim/entities';
import { InstancedEntityRenderer } from './sim/instanced-entities';
import { ShoggothSystem } from './sim/shoggoths';
import { PuppetMasterSystem } from './sim/puppet-masters';
import { TitanSystem } from './sim/titans';
import { WeatherSystem } from './sim/weather';
import { QuantumCloud } from './sim/quantum';
import { Connectome } from './sim/connectome';
import { EnvironmentSystem } from './sim/environment';
import { QuantumCircuitSystem } from './sim/qcircuit';
import { ReactionDiffusionSystem } from './sim/reaction-diffusion';
import { GraphMind } from './sim/graph-mind';
import { ConstellationSystem } from './sim/constellations';
import { AtmosphereSystem } from './sim/atmosphere';
import { Viz3DSystem, type Viz3DSnapshot } from './sim/viz3d';
import { LoreEngine } from './sim/lore';
import { AnalyticsSystem } from './sim/analytics';
import { AudioEngine } from './audio/engine';
import { AudioAnalysis } from './audio/analysis';
import { Hud } from './ui/hud';
import { Observatory } from './ui/observatory';
import { TelemetryPanel, bindPanelToggles } from './ui/panels';
import { InputSystem } from './ui/input';
import type { AuditTrail } from './logging/audit';
import { createLogger } from './logging/logger';
import type { MemoryStore } from './memory/store';

/** Cyclic element access into a non-empty readonly array. O(1). */
function cyc<T>(arr: readonly T[], i: number): T {
  const v = arr[((i % arr.length) + arr.length) % arr.length];
  if (v === undefined) throw new Error('cyc: empty array');
  return v;
}

export interface WorldOptions {
  engine: Engine;
  quality: QualityProfile;
  persisted: PersistedState;
  store: MemoryStore;
  audit: AuditTrail;
}

export class World {
  private readonly engine: Engine;
  private readonly quality: QualityProfile;
  private readonly persisted: PersistedState;
  private readonly store: MemoryStore;
  private readonly audit: AuditTrail;
  private readonly log = createLogger('world');

  private readonly rng: Rng;
  private readonly state: SimState;
  private readonly grid: SpatialHash<Entity>;
  private readonly audio: AudioEngine;
  private readonly entities: EntityManager;
  private readonly shoggoths: ShoggothSystem;
  private readonly puppets: PuppetMasterSystem;
  private readonly weather: WeatherSystem;
  private readonly quantum: QuantumCloud;
  private readonly connectome: Connectome;
  private readonly environment: EnvironmentSystem;
  private readonly hud: Hud;
  private readonly panel: TelemetryPanel;
  private readonly input: InputSystem;

  // ── PANTHEON V3 systems (CONTRACTS V3) ──
  private readonly titans: TitanSystem;
  private readonly observatory: Observatory;
  /** Pool renderer; null on the phone tier (V1 per-mesh path — V3.1). */
  private readonly instanced: InstancedEntityRenderer | null;
  /** Total morphotypes minted at boot (250 in phylum mode). */
  private readonly morphTotal: number;
  /** Strided mean of the RD V field, refreshed every 60 frames (V3.5). */
  private rdEnergy = 0;

  // ── Wildbeyond V2 systems (CONTRACTS V2) ──
  private readonly lore: LoreEngine;
  private readonly qc: QuantumCircuitSystem;
  private readonly rd: ReactionDiffusionSystem;
  private readonly graphMind: GraphMind;
  private readonly constellations: ConstellationSystem;
  private readonly atmosphere: AtmosphereSystem;
  private readonly viz3d: Viz3DSystem;
  private readonly audioAnalysis: AudioAnalysis;
  private readonly analytics: AnalyticsSystem;
  /** Reused adapter mapping `titanLedger`→`ledger` for Viz3DSnapshot; fields
   *  point at the live snapshot views, repopulated each frame (allocation-free). */
  private readonly viz3dSnap: Viz3DSnapshot;
  /** Last collapse basis seen, to detect measurement events across frames. */
  private lastCollapseSeen = -1;
  /** Cached `.algo-row` elements (one per ALGOS entry) for the picker panel. */
  private readonly algoRows: HTMLElement[] = [];
  /** `#algo-active` readout, or null when the picker DOM is absent. */
  private algoActiveEl: HTMLElement | null = null;
  /** Sorted-ness of the active field, 0 (chaotic) .. 1 (sorted) — picker progress. */
  private sortedFraction = 0;

  /** Pre-allocated sort-value buffer (Known Bug 4 fix). */
  private readonly sortVals: Float32Array;
  /** Scratch vectors — step() and actions never allocate. */
  private readonly sv1 = new THREE.Vector3();
  private readonly sv2 = new THREE.Vector3();
  /** Reused telemetry snapshot (panel reads synchronously). */
  private readonly snap: TelemetrySnapshot;

  private lastSector = '';
  private energy = 0;
  private morphCount = 0;
  private sfxRestored = false;

  constructor(opts: WorldOptions) {
    this.engine = opts.engine;
    this.quality = opts.quality;
    this.persisted = opts.persisted;
    this.store = opts.store;
    this.audit = opts.audit;

    this.rng = mulberry32(this.persisted.seed);

    this.state = {
      chaos: 0.5,
      mutations: 0,
      timeScale: 1,
      wireframe: false,
      weatherIdx: this.persisted.weatherIdx % WEATHERS.length,
      temperature: 20,
      wind: { x: 0, z: 0 },
      viewIdx: this.persisted.viewIdx % VIEW_MODES.length,
      algoIdx: this.persisted.algoIdx % ALGOS.length,
      songIdx: this.persisted.songIdx % SONGS.length,
      algoStep: 0,
      frame: 0,
      elapsed: 0,
    };

    // Spatial-hash cell size. The legacy GRID_CELL (16, = 8 × ARENA-scaled) is kept for every
    // tier ≤ 5,000 entities — same cells, same query neighbor sets, same rng-relevant decisions
    // (nash/market draw rng conditional on neighbor payoffs, so the cell size is part of the
    // seeded stream; tuning it at ≤5,000 would break reproducibility). At the ultra tier (10k)
    // the arena packs ~4× denser, so a 3×3 GRID_CELL block returns ~214 candidates per query.
    // A 10-unit cell (measured sweet spot, docs/BENCHMARKS.md) cuts that ~36% while keeping the
    // visited-cell count low for the radius-8..16 behavior queries — the smaller cells below 10
    // were rejected (per-query cell-iteration overhead overtook the neighbor savings). V3.6.
    this.grid = new SpatialHash<Entity>(
      this.quality.maxEntities > 5000 ? ULTRA_GRID_CELL : GRID_CELL,
    );
    // Audio gets its OWN derived stream: its setInterval callbacks drain rng at
    // wall-clock moments, which would make the sim stream timing-dependent and
    // break same-seed reproducibility (audit finding, 0.2.1).
    this.audio = new AudioEngine(this.state, mulberry32((this.persisted.seed ^ 0xa0d10) >>> 0));

    // Lore precedes the taxonomy: phyla are lore-named at mint (CONTRACTS V3.2).
    this.lore = new LoreEngine(this.persisted.seed);
    const geos = createGeometryCache();
    const phyla = createPhyla(this.rng, (i) => this.lore.name('tribe', i), geos.length);
    const morphs = createMorphotypes(this.rng, geos.length, phyla);
    this.morphTotal = morphs.length;
    const ctx: SimContext = {
      scene: this.engine.scene,
      quality: this.quality,
      rng: this.rng,
      grid: this.grid,
      morphs,
      geos,
      state: this.state,
      audit: this.audit,
      sfx: (type) => this.audio.play(type),
    };

    this.environment = new EnvironmentSystem(ctx);
    this.entities = new EntityManager(ctx);
    this.instanced = this.quality.instanced ? new InstancedEntityRenderer(ctx) : null;
    this.entities.reset(this.bootPopulation());
    this.shoggoths = new ShoggothSystem(ctx, this.entities);
    // Callback fires from update(), well after `hud`/`qc`/`lore` are assigned
    // below; the PuppetEvent argument is a reused scratch object — read
    // synchronously (qc.onPuppetEvent reads e.name synchronously too).
    this.puppets = new PuppetMasterSystem(ctx, this.entities, (e) => {
      this.qc.onPuppetEvent(e);
      this.hud.showToast(`${e.name} ${this.lore.epithet('puppet', e.name)}`, e.action);
    });
    this.weather = new WeatherSystem(ctx, this.engine);
    this.quantum = new QuantumCloud(ctx);
    this.connectome = new Connectome(ctx, this.entities);

    // ── Wildbeyond V2 wiring (cadences in step(); see ARCHITECTURE.md) ──
    this.qc = new QuantumCircuitSystem(ctx);
    // The bands buffer is live/reused — hand it to the cloud once; qc.bands()
    // refreshes its contents in place on the 6-frame cadence.
    this.quantum.setQuantumBands(this.qc.bands());
    this.rd = new ReactionDiffusionSystem(ctx);
    this.environment.attachGroundEmissiveMap(this.rd.texture);
    // Death→ground feedback: every disposal (age-death AND shoggoth
    // consumption, single-fire inside disposeAt) scars the living ground at
    // the corpse's UV — the mortality loop the contract headlines.
    this.entities.onDeath = (x, z) =>
      this.rd.perturb(0.5 + x / GROUND_EXTENT, 0.5 - z / GROUND_EXTENT, 2);
    // Boot scars: the Gray-Scott fixed point is uniform — seed a few
    // disturbances so the ground skin starts breathing (rd writer note).
    for (let i = 0; i < 4; i++) this.rd.perturb(this.rng(), this.rng());
    // ── PANTHEON V3.3: the ten colossi and their economy/war layer ──
    this.titans = new TitanSystem(ctx, this.entities, this.lore, this.rd);
    this.graphMind = new GraphMind(ctx, this.entities, this.connectome);
    this.constellations = new ConstellationSystem(ctx, this.lore);
    this.audioAnalysis = new AudioAnalysis(this.audio);
    // Omens arrive lore-named: same seed, same prophecy vocabulary.
    this.analytics = new AnalyticsSystem(ctx, (i) => this.lore.name('omen', i));
    // ── XENOGENESIS V4: alien air + holographic 3D analytics ──
    // Atmosphere draws 13 + 5·floor(maxEntities/4) rng samples — constructed
    // last among rng-consuming sim systems so it never shifts their streams.
    this.atmosphere = new AtmosphereSystem(ctx);
    this.viz3d = new Viz3DSystem(ctx); // zero rng draws — placement-neutral

    this.hud = new Hud();
    this.panel = new TelemetryPanel();
    this.observatory = new Observatory();
    bindPanelToggles();
    this.bindObservatoryTabs();
    this.bindAlgoPicker();
    this.input = new InputSystem(this.buildActions());

    this.sortVals = new Float32Array(this.quality.maxEntities);
    this.snap = {
      entities: 0,
      maxEntities: this.quality.maxEntities,
      chaos: 0,
      mutations: 0,
      energy: 0,
      links: 0,
      morphs: 0,
      algoName: cyc(ALGOS, this.state.algoIdx).name,
      quantum: 0,
      songName: cyc(SONGS, this.state.songIdx).name,
      weather: cyc(WEATHERS, this.state.weatherIdx),
      wind: 0,
      temperature: 20,
      shoggoths: this.shoggoths.count,
      puppeteers: this.puppets.count,
      // V2 fields — placeholders until the Wildbeyond systems are integrated
      // (qcircuit/graph-mind/analytics/lore wiring tracked in task #12).
      tribes: 0,
      trend: 0,
      qEntropy: 0,
      lore: '---',
      // V3 — REUSED live views (documented in types.ts): consumers copy.
      maxLinks: this.quality.maxLinks,
      morphTotal: this.morphTotal,
      titans: this.titans.count,
      phylumCounts: this.entities.phylumCounts,
      titanLedger: this.titans.ledger,
      warMatrix: this.titans.warMatrix,
      rdEnergy: 0,
      sentience: 0,
    };
    // The three V3.5 arrays are stable LIVE views (contents mutate in place),
    // so this adapter is built once and never repopulated — just a field rename.
    this.viz3dSnap = {
      phylumCounts: this.snap.phylumCounts,
      ledger: this.snap.titanLedger,
      warMatrix: this.snap.warMatrix,
    };

    this.log.info('world ready', {
      seed: this.persisted.seed,
      tier: this.quality.tier,
      maxEntities: this.quality.maxEntities,
      morphs: this.morphTotal,
      titans: this.titans.count,
      geometries: geos.length,
    });
  }

  /**
   * Boot/reset population: 30% of the adaptive steady-state target (legacy 300 of 1000).
   * Uses `targetEntities` (= maxEntities on every tier except ultra) so the world boots toward
   * its idle equilibrium, not the 10k ceiling — organic auto-split then fills to the target.
   */
  private bootPopulation(): number {
    return Math.max(300, Math.round(this.quality.targetEntities * 0.3));
  }

  /**
   * First-gesture unlock: initializes the AudioContext and restores the
   * persisted SFX preference exactly once. Safe to call repeatedly.
   */
  unlock(): void {
    this.audio.init();
    if (!this.sfxRestored) {
      this.sfxRestored = true;
      if (this.persisted.sfxOn && !this.audio.sfxOn) this.audio.toggleSfx();
    }
  }

  /** Advance one frame. rawDt is the unclamped clock delta in seconds. */
  step(rawDt: number): void {
    const s = this.state;
    // Clamp to [0, 50ms]: negative deltas (clock skew) and tab-switch gaps
    // would otherwise drive curve parameters and physics out of range.
    const dt = Math.min(Math.max(rawDt, 0), 0.05) * s.timeScale;
    s.elapsed += dt;
    s.frame++;
    const t = s.elapsed;

    this.updateCamera(dt, t);
    this.handleHotkeys(dt);
    s.chaos = Math.max(CHAOS_MIN, s.chaos - dt * 0.005);

    // One bands poll per frame, shared by every consumer (reused object).
    const bands = this.audioAnalysis.update();
    // Audio couplings, each ≤ 0.35 per contract: bass shimmers the six-lamp
    // rig (inside environment.update — the contracted LOCAL coupling, which
    // replaced the global exposure offset), level breathes the cloud points.
    this.environment.setAudioBass(bands.bass);
    this.quantum.setBreath(bands.level);

    this.weather.apply(dt, t);
    this.puppets.update(dt, t);

    if (s.frame % 2 === 0) {
      this.grid.clear();
      const list = this.entities.list;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e) this.grid.insert(e);
      }
    }
    this.shoggoths.update(dt, t);
    // Titans roam every frame; economy/diplomacy/strikes are internally cadenced
    // off s.frame (CONTRACTS V3.3) — after the grid so strikes can query it.
    this.titans.update(dt, t);

    const sector = this.environment.sectorAt(this.engine.camera.position);
    if (sector !== this.lastSector) {
      this.lastSector = sector;
      this.hud.showSector(sector);
    }

    this.sortStep();

    const stats = this.entities.update(dt, t);
    this.energy = stats.energy; // stats object is reused — copy immediately
    this.morphCount = stats.morphCount;

    const n = this.entities.list.length;
    // Connectome rebuild cadence by live population. Legacy ladder 1/2/3 at ≤400/≤700/>700
    // is preserved exactly through the desktop tier; the ultra-class rungs (/4 above 2,000,
    // /6 above 5,000) keep the O(n·k) link rebuild + GPU upload off the 10k cost wall. The
    // connectome draws no rng, so cadence changes are determinism-neutral (GraphMind, which
    // does draw rng, runs on its own 240/600f cadence over whatever pairs exist). V3.6.
    const cadence = n > 5000 ? 6 : n > 2000 ? 4 : n > 700 ? 3 : n > 400 ? 2 : 1;
    if (s.frame % cadence === 0) this.connectome.update(dt, t);

    // ── V2 cadences (ARCHITECTURE.md frame pipeline) ──
    if (s.frame % 30 === 0) {
      this.qc.update();
      if (this.qc.lastCollapse !== this.lastCollapseSeen) {
        this.lastCollapseSeen = this.qc.lastCollapse;
        this.onCollapse(this.qc.lastCollapse);
      }
    }
    if (s.frame % 6 === 0) this.qc.bands(); // refresh the live buffer the cloud reads

    this.quantum.update(dt, t);

    if (s.frame % 2 === 1) this.rd.step(); // offset 1 from the grid rebuild
    this.titans.drainPerturb(); // route any pending waste scar AFTER the RD step
    // Graph passes double their period above 2,500 entities — louvain over a
    // 10k-node mirror would spike the budget at the V2 cadence (V3.6 note).
    const gmScale = n > 2500 ? 2 : 1;
    if (s.frame % (240 * gmScale) === 0) this.graphMind.updateCommunities();
    // Offset 300 provably never collides with the communities cadence above.
    if (s.frame % (600 * gmScale) === 300) this.graphMind.updateRank();

    this.constellations.update(t, bands);
    // Alien sky + air: dome recolors with weather/chaos, haze advects with wind
    // and breathes with bass, aurora brightens with quantum entropy (V4.1).
    this.atmosphere.update(dt, t, bands, this.qc.entropy);
    // Holographic 3D analytics panel reads the LIVE reused snapshot views
    // (phylumCounts/titanLedger/warMatrix), always current; internally cadenced.
    this.viz3d.update(this.viz3dSnap);
    this.environment.update(dt, t);

    if (s.frame % 60 === 30) {
      // RD pattern energy: strided mean of the V field (offset 30 — never
      // shares a frame with analytics/analyze). Feeds titan entropy relief
      // (PRODUCE hook) and the observatory environment timeline.
      this.rdEnergy = this.sampleRdEnergy();
      this.titans.feedEntropy(this.rdEnergy * 2);
    }

    if (s.frame % 8 === 0) {
      this.analytics.push(n, this.energy, this.connectome.links);
      this.panel.update(this.snapshot());
      this.updateAlgoPicker(); // live progress on the active field's row
    }
    if (s.frame % 60 === 0) this.analytics.analyze(); // after push at coinciding frames

    // Observatory: push+draw every 18f (36f on phone) AFTER the telemetry
    // snapshot refresh so its rings sample the same values the panel shows.
    const obsCadence = this.quality.isMobile ? 36 : 18;
    if (s.frame % obsCadence === 0) {
      this.observatory.push(this.snapshot());
      this.observatory.draw();
    }

    // Pool mirror runs LAST — after every system that mutates entity visuals
    // (sort flash, graph rank floor, belly pulse, conscription tints).
    if (this.instanced) this.instanced.sync(this.entities.list, s.wireframe);

    this.engine.render();
  }

  /**
   * Strided mean of the reaction-diffusion V field (stride 16 ≈ 1k reads of
   * 16k texels) — the "pattern energy" of the living ground. Allocation-free.
   */
  private sampleRdEnergy(): number {
    const v = this.rd.fieldV;
    if (v.length === 0) return 0;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < v.length; i += 16) {
      sum += v[i] ?? 0;
      count++;
    }
    return count > 0 ? sum / count : 0;
  }

  /**
   * A quantum measurement collapsed the register: soft chime, a Gray-Scott
   * scar at a seeded location, and an audit record named from the lore.
   */
  private onCollapse(basis: number): void {
    if (basis < 0) return;
    this.audio.play('crystallize');
    this.quantum.implodeAt(basis); // the index%32===basis particle subset collapses
    this.rd.perturb(this.rng(), this.rng(), 6);
    // Every titan witnesses the measurement and banks energy (V3.3 PRODUCE hook).
    this.titans.onCollapseWitness();
    this.audit.record('collapse', { basis, star: this.lore.name('star', basis) });
  }

  /** Legacy chaos multiplier cMul(): min(chaos/2, 3). */
  private chaosMul(): number {
    return Math.min(this.state.chaos / 2, 3);
  }

  /** Camera modes free/orbit/fly/top — legacy motion constants × ARENA_MID (V3.1). */
  private updateCamera(dt: number, t: number): void {
    const cam = this.engine.camera;
    const spd = 14 * ARENA_MID * dt;
    const rs = 1.5 * dt;
    const mode: ViewMode = cyc(VIEW_MODES, this.state.viewIdx);
    if (mode === 'free') {
      const k = this.input.keys;
      const cv = this.input.camVel;
      const touch = this.input.touch;
      if (k['w'] || k['arrowup']) cam.translateZ(-spd);
      if (k['s'] || k['arrowdown']) cam.translateZ(spd);
      if (k['a']) cam.translateX(-spd);
      if (k['d']) cam.translateX(spd);
      if (k['q']) cam.position.y += spd;
      if (k['e']) cam.position.y -= spd;
      if (k['z']) cam.rotation.z += rs;
      if (k['x']) cam.rotation.z -= rs;
      if (k['r']) cam.rotation.x += rs;
      if (k['f']) cam.rotation.x -= rs;
      if (k['c'] || k['arrowleft']) cam.rotation.y += rs;
      if (k['v'] || k['arrowright']) cam.rotation.y -= rs;
      if (touch.active) {
        cam.translateX(touch.x * spd);
        cam.translateZ(touch.y * spd);
      }
      if (cv.x) cam.translateX(cv.x * spd * 2);
      if (cv.y) cam.position.y += cv.y * spd * 2;
      if (cv.z) cam.translateZ(cv.z * spd * 2);
      if (cv.rx) cam.rotation.x += cv.rx * rs;
      if (cv.ry) cam.rotation.y += cv.ry * rs;
      if (cv.rz) cam.rotation.z += cv.rz * rs;
      // Mouse-look + wheel zoom (InputSystem contract amendment, 0.2.1).
      const lk = this.input.look;
      if (lk.dx !== 0 || lk.dy !== 0) {
        cam.rotation.y -= lk.dx * 0.003;
        cam.rotation.x -= lk.dy * 0.003;
      }
      if (this.input.zoom !== 0) cam.translateZ(this.input.zoom * 0.05);
    } else if (mode === 'orbit') {
      const oR = (65 + Math.sin(t * 0.05) * 18) * ARENA_MID;
      cam.position.set(
        Math.cos(t * 0.12) * oR,
        (22 + Math.sin(t * 0.08) * 18) * ARENA_Y,
        Math.sin(t * 0.12) * oR,
      );
      cam.lookAt(0, 8 * ARENA_Y, 0);
    } else if (mode === 'fly') {
      const ft = t * 0.06;
      cam.position.set(
        (Math.sin(ft) * 45 + Math.cos(ft * 1.3) * 22) * ARENA_MID,
        (16 + Math.sin(ft * 0.4) * 22) * ARENA_Y,
        (Math.cos(ft) * 45 + Math.sin(ft * 0.7) * 28) * ARENA_MID,
      );
      cam.lookAt(
        Math.sin(ft * 0.3) * 12 * ARENA_MID,
        (5 + Math.sin(ft * 0.5) * 12) * ARENA_Y,
        Math.cos(ft * 0.3) * 12 * ARENA_MID,
      );
    } else {
      cam.position.set(0, 90 * ARENA_MID + 75, 0); // top-down survey of the 5× floor
      cam.lookAt(0, 0, 0);
      cam.rotation.z = t * 0.015;
    }
    // Consume-and-zero in EVERY mode so stale drag/wheel deltas never
    // accumulate while orbit/fly/top views ignore them.
    this.input.look.dx = 0;
    this.input.look.dy = 0;
    this.input.zoom = 0;
  }

  /** Held-key macros (legacy 665-666): Space/Shift/M repeat, Tab feeds chaos. */
  private handleHotkeys(dt: number): void {
    const s = this.state;
    const k = this.input.keys;
    if (k[' '] && s.frame % 12 === 0) this.doBurst();
    if (k['shift'] && s.frame % 20 === 0) this.doSplit();
    if (k['m'] && s.frame % 30 === 0) this.doMutate();
    if (k['tab']) s.chaos = clamp(s.chaos + dt * 2, CHAOS_MIN, CHAOS_MAX);
  }

  /**
   * The sorting field — now BATCHED so the selected algorithm visibly organizes
   * the world (one swap among thousands of organisms was imperceptible). Each
   * frame it runs K proposals from the active algorithm (K scales with the
   * population, 6..28), applying every accepted swap: the two organisms trade
   * sort values, get nudged toward each other's positions, and flash bright.
   * The HUD shows the live swap count so cycling the algorithm obviously
   * changes the activity. Allocation-free, no rng (deterministic from seed).
   * O(K · step-cost); the O(n) algorithms still dominate at K · n.
   */
  private sortStep(): void {
    const list = this.entities.list;
    const n = list.length;
    const s = this.state;
    const algo = cyc(ALGOS, s.algoIdx);
    if (n < 2) {
      this.hud.setAlgo(algo.name, s.algoStep, 0);
      return;
    }
    for (let i = 0; i < n; i++) {
      const e = list[i];
      this.sortVals[i] = e ? e.userData.sortVal : 0;
    }
    // Batch size: enough to read as motion, bounded so the O(n) algorithms stay
    // cheap even at the 10k ceiling (28 · 10k ≈ 280k int-compares ≈ 0.5 ms).
    const batch = Math.min(28, Math.max(6, n >> 8));
    const push = 0.05 * this.chaosMul();
    let swaps = 0;
    for (let b = 0; b < batch; b++) {
      s.algoStep++;
      const swap = algo.step(this.sortVals, n, s.algoStep);
      if (!swap) continue;
      const a0 = swap[0];
      const a1 = swap[1];
      if (a0 === a1 || a0 < 0 || a1 >= n) continue;
      const ea = list[a0];
      const eb = list[a1];
      if (!ea || !eb) continue;
      const tv = ea.userData.sortVal;
      ea.userData.sortVal = eb.userData.sortVal;
      eb.userData.sortVal = tv;
      this.sortVals[a0] = ea.userData.sortVal; // keep the view coherent for later steps
      this.sortVals[a1] = eb.userData.sortVal;
      this.sv1.copy(eb.position).sub(ea.position).normalize().multiplyScalar(push);
      ea.userData.vel.add(this.sv1);
      eb.userData.vel.add(this.sv1.negate());
      // Brighter sparkle per swap so the field's working front reads as a
      // shimmering light show across the world (entities.update fades it back).
      ea.material.emissiveIntensity = 4;
      eb.material.emissiveIntensity = 4;
      if (swaps === 0) this.qc.onSortSwap(a0, a1); // one CNOT/frame (preserve coupling rate)
      swaps++;
    }
    // Sorted-ness proxy for the picker progress bar: the fraction of adjacent
    // pairs already in order (O(n), cheap; reaches 1 as a terminating field
    // settles, hovers for the perpetual fields). The sortVals view is current
    // after the batch above.
    let ordered = 0;
    const sv = this.sortVals;
    // i ∈ [1, n) and n = list.length ≤ sortVals.length, so both reads are in bounds.
    for (let i = 1; i < n; i++) if (sv[i - 1]! <= sv[i]!) ordered++;
    this.sortedFraction = n > 1 ? ordered / (n - 1) : 1;
    this.hud.setAlgo(algo.name, s.algoStep, swaps);
  }

  /** Refill the reused snapshot object. Allocation-free. */
  private snapshot(): TelemetrySnapshot {
    const s = this.state;
    const sn = this.snap;
    sn.entities = this.entities.list.length;
    sn.chaos = s.chaos;
    sn.mutations = s.mutations;
    sn.energy = this.energy;
    sn.links = this.connectome.links;
    sn.morphs = this.morphCount;
    sn.algoName = cyc(ALGOS, s.algoIdx).name;
    sn.quantum = this.quantum.signal;
    sn.songName = cyc(SONGS, s.songIdx).name;
    sn.weather = cyc(WEATHERS, s.weatherIdx);
    sn.wind = Math.hypot(s.wind.x, s.wind.z);
    sn.temperature = s.temperature;
    sn.shoggoths = this.shoggoths.count;
    sn.puppeteers = this.puppets.count;
    sn.tribes = this.graphMind.tribes;
    sn.trend = this.analytics.trendPerMin;
    sn.qEntropy = this.qc.entropy;
    sn.lore = this.constellations.subSectorAt(this.engine.camera.position);
    // V3: phylumCounts/titanLedger/warMatrix are LIVE reused views installed at
    // boot — only the scalar needs refreshing here.
    sn.rdEnergy = this.rdEnergy;
    // Biome sentience index (V4.5): community structure × quantum coherence ×
    // demographic momentum, normalized 0..1. The cosmos rating its own aliveness.
    sn.sentience = clamp(
      ((sn.tribes / 256) * (0.5 + sn.qEntropy) * (0.5 + Math.min(Math.abs(sn.trend) / 50, 1))) /
        1.5,
      0,
      1,
    );
    this.hud.setLore(sn.lore); // O(1) no-op when unchanged
    return sn;
  }

  private save(): void {
    this.store.save(this.persisted);
  }

  /** Legacy doSplit: up to 5 mature entities each bud 4 children. */
  private doSplit(): void {
    this.audio.play('split');
    const list = this.entities.list;
    let picked = 0;
    for (let i = 0; i < list.length && picked < 5; i++) {
      const e = list[i];
      if (!e || e.userData.age <= 50) continue;
      picked++;
      e.userData.belly = 60;
      // Birth scars the living ground (UV over the GROUND_EXTENT plane).
      this.rd.perturb(0.5 + e.position.x / GROUND_EXTENT, 0.5 - e.position.z / GROUND_EXTENT, 3);
      for (let j = 0; j < 4; j++) {
        this.sv1.set((this.rng() - 0.5) * 3, (this.rng() - 0.5) * 2, (this.rng() - 0.5) * 3);
        this.sv2.copy(e.position).add(this.sv1);
        const child = this.entities.spawn(
          this.sv2,
          (e.userData.mi + 1 + Math.floor(this.rng() * 10)) % this.morphTotal,
          0.6,
        );
        if (child) child.userData.vel.copy(this.sv1.normalize().multiplyScalar(0.15));
      }
    }
  }

  /** Legacy doBurst, tier-scaled: 30..100 spawns in the (×ARENA_MID) core volume. */
  private doBurst(): void {
    this.audio.play('burst');
    const room = this.quality.maxEntities - this.entities.list.length;
    const count = Math.min(Math.max(30, Math.floor(this.quality.maxEntities / 100)), room);
    for (let i = 0; i < count; i++) {
      this.sv1.set(
        (this.rng() - 0.5) * 25 * ARENA_MID,
        this.rng() * 14 * ARENA_Y,
        (this.rng() - 0.5) * 25 * ARENA_MID,
      );
      this.entities.spawn(this.sv1, Math.floor(this.rng() * this.morphTotal), 0.5 + this.rng());
    }
  }

  /** Legacy doMutate: remorph the whole population (Known Bug 14 counter). */
  private doMutate(): void {
    this.audio.play('mutate');
    const list = this.entities.list;
    this.state.mutations += list.length;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e) this.entities.remorph(e, Math.floor(this.rng() * this.morphTotal));
    }
  }

  /** Legacy apoc: max chaos, scatter everything, triple burst. */
  private apocalypse(): void {
    this.audio.play('burst');
    this.audio.play('warp');
    this.audio.play('resonance');
    this.state.chaos = CHAOS_MAX;
    this.hud.showSector('APOCALYPSE');
    const list = this.entities.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue;
      e.userData.vel.set((this.rng() - 0.5) * 3, (this.rng() - 0.5) * 3, (this.rng() - 0.5) * 3);
      e.userData.belly = 120;
    }
    this.doBurst();
    this.doBurst();
    this.doBurst();
    // The apocalypse brands the ground itself.
    for (let i = 0; i < 3; i++) this.rd.perturb(this.rng(), this.rng(), 9);
  }

  /** Legacy rSim: genesis reset (entities + counters; prefs untouched). */
  private resetSim(): void {
    this.entities.reset(this.bootPopulation());
    this.state.chaos = 0.5;
    this.state.mutations = 0;
    this.state.algoStep = 0;
    this.hud.showSector('GENESIS RESET');
  }

  /** UiActions implementation handed to InputSystem. */
  /**
   * Wire the observatory's four page tabs (`[data-obs-page="0..3"]`) to
   * `observatory.setPage`, toggling the active pane + `aria-selected`. Degrades
   * silently if the tab DOM is absent (e.g. a stripped index.html). O(tabs).
   */
  private bindObservatoryTabs(): void {
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('[data-obs-page]'));
    if (tabs.length === 0) return;
    const panes = Array.from(document.querySelectorAll<HTMLElement>('.obs-page'));
    const select = (p: number): void => {
      if (p < 0 || p > 3) return;
      this.observatory.setPage(p as 0 | 1 | 2 | 3);
      for (const tab of tabs) {
        const on = Number(tab.dataset['obsPage']) === p;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
      }
      // Panes carry no page attribute — the Nth `.obs-page` IS page N.
      panes.forEach((pane, i) => pane.classList.toggle('active', i === p));
      this.observatory.draw(); // immediate repaint so the switch feels instant
    };
    for (const tab of tabs) {
      tab.addEventListener('click', () => select(Number(tab.dataset['obsPage'])));
    }
  }

  /**
   * Populate the algorithm picker (`#algo-list`) with one clickable `.algo-row`
   * per sorting field, so all 25 are visible and selectable (not just a cycle
   * button). Each row click selects that field. Degrades silently if the picker
   * DOM is absent. O(ALGOS).
   */
  private bindAlgoPicker(): void {
    const listEl = document.getElementById('algo-list');
    if (!listEl) return;
    // The ui-shell ships #algo-active as a container with an inner name span.
    this.algoActiveEl = document.getElementById('algo-active-name');
    const frag = document.createDocumentFragment();
    for (let i = 0; i < ALGOS.length; i++) {
      const algo = ALGOS[i];
      if (!algo) continue;
      const row = document.createElement('div');
      row.className = 'algo-row';
      row.dataset['algo'] = String(i);
      row.setAttribute('role', 'option'); // #algo-list is a role=listbox
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-label', `Select ${algo.name} sorting field`);
      const name = document.createElement('span');
      name.className = 'algo-name';
      name.textContent = algo.name;
      const prog = document.createElement('div');
      prog.className = 'algo-prog';
      row.append(name, prog);
      row.addEventListener('click', () => this.selectAlgo(i, true));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectAlgo(i, true);
        }
      });
      frag.appendChild(row);
      this.algoRows.push(row);
    }
    listEl.appendChild(frag);
    this.refreshAlgoActive();
  }

  /**
   * Select a sorting field by index (picker click, toolbar cycle, keyboard).
   * `fromUser` adds the audio unlock + a distinct per-field selection tone (the
   * 8 SFX timbres cycle by index, so each field announces itself differently).
   */
  private selectAlgo(idx: number, fromUser: boolean): void {
    const s = this.state;
    const n = ALGOS.length;
    s.algoIdx = ((idx % n) + n) % n;
    s.algoStep = 0;
    const algo = cyc(ALGOS, s.algoIdx);
    this.persisted.algoIdx = s.algoIdx;
    this.save();
    this.hud.showSector(algo.name);
    this.audit.record('algo', { name: algo.name });
    if (fromUser) {
      this.unlock();
      this.audio.play(SFX_TYPES[s.algoIdx % SFX_TYPES.length] ?? 'crystallize');
      this.sortPerformance(); // the field ignites — a shimmer sweeps the population
    }
    this.refreshAlgoActive();
  }

  /**
   * Visible "ignition" when a sorting field is chosen: a stride sample (~500
   * organisms regardless of population) flashes bright, sweeping a shimmer
   * across the world so the algorithm announces its performance. Visual only —
   * entities.update lerps the boosted emissive back down. O(n / stride).
   */
  private sortPerformance(): void {
    const list = this.entities.list;
    const stride = Math.max(1, (list.length / 500) | 0);
    for (let i = 0; i < list.length; i += stride) {
      const e = list[i];
      if (e) e.material.emissiveIntensity = 4.5;
    }
  }

  /** Sync the picker's active row + readout to `state.algoIdx`; reset progress bars. */
  private refreshAlgoActive(): void {
    const active = this.state.algoIdx;
    for (let i = 0; i < this.algoRows.length; i++) {
      const row = this.algoRows[i];
      if (!row) continue;
      row.classList.toggle('active', i === active);
      if (i !== active) {
        const prog = row.querySelector<HTMLElement>('.algo-prog');
        if (prog) prog.style.width = '0%';
      }
    }
    if (this.algoActiveEl) this.algoActiveEl.textContent = cyc(ALGOS, active).name;
  }

  /** Drive the active row's progress bar from the live sorted fraction. O(1). */
  private updateAlgoPicker(): void {
    const row = this.algoRows[this.state.algoIdx];
    if (!row) return;
    const prog = row.querySelector<HTMLElement>('.algo-prog');
    if (prog) prog.style.width = `${Math.round(this.sortedFraction * 100)}%`;
  }

  private buildActions(): UiActions {
    const s = this.state;
    return {
      split: () => {
        this.unlock();
        this.audit.record('split');
        this.doSplit();
      },
      burst: () => {
        this.unlock();
        this.audit.record('burst');
        this.doBurst();
      },
      mutate: () => {
        this.unlock();
        this.audit.record('mutate');
        this.doMutate();
      },
      chaosBoost: () => {
        this.unlock();
        s.chaos = clamp(s.chaos * 1.5, CHAOS_MIN, CHAOS_MAX);
        this.audio.play('burst');
        this.audit.record('chaos-boost', { chaos: s.chaos });
      },
      apocalypse: () => {
        this.unlock();
        this.audit.record('apocalypse');
        this.apocalypse();
      },
      reset: () => {
        this.unlock();
        this.audit.record('reset');
        this.resetSim();
      },
      toggleMusic: () => {
        this.unlock();
        const on = this.audio.toggleMusic();
        this.audit.record('music', { on });
        return on;
      },
      toggleSfx: () => {
        this.unlock();
        const on = this.audio.toggleSfx();
        this.persisted.sfxOn = on;
        this.save();
        this.audit.record('sfx', { on });
        return on;
      },
      cycleSong: () => {
        this.unlock();
        const name = this.audio.cycleSong();
        this.persisted.songIdx = s.songIdx;
        this.save();
        this.hud.showSector(name);
        this.audit.record('song', { name });
        return name;
      },
      cycleSfxPreview: () => {
        this.unlock();
        const label = this.audio.cycleSfxPreview();
        this.hud.showSector(label);
        this.audit.record('sfx-preview', { label });
        return label;
      },
      cycleTimeScale: () => {
        this.unlock();
        s.timeScale = s.timeScale === 1 ? 0.2 : s.timeScale === 0.2 ? 3 : 1;
        this.audit.record('time-scale', { value: s.timeScale });
        return s.timeScale;
      },
      toggleWireframe: () => {
        this.unlock();
        s.wireframe = !s.wireframe; // flag first — spawn/remorph read it
        this.entities.setWireframe(s.wireframe);
        this.audit.record('wireframe', { on: s.wireframe });
        return s.wireframe;
      },
      cycleView: () => {
        this.unlock();
        s.viewIdx = (s.viewIdx + 1) % VIEW_MODES.length;
        const mode = cyc(VIEW_MODES, s.viewIdx);
        this.persisted.viewIdx = s.viewIdx;
        this.save();
        this.hud.showSector('VIEW: ' + mode.toUpperCase());
        this.audit.record('view', { mode });
        return mode;
      },
      cycleAlgo: () => {
        this.selectAlgo(s.algoIdx + 1, true); // shares the picker selection path
        return cyc(ALGOS, s.algoIdx).name;
      },
      cycleWeather: (): Weather => {
        this.unlock();
        const w = this.weather.cycle(); // plays the crystallize sfx itself
        this.persisted.weatherIdx = s.weatherIdx;
        this.save();
        this.hud.showSector(w);
        this.audit.record('weather', { weather: w });
        return w;
      },
    };
  }
}
