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
import { CHAOS_MAX, CHAOS_MIN, VIEW_MODES, WEATHERS } from './sim/constants';
import { ALGOS } from './sim/algorithms';
import { SONGS } from './audio/songs';
import { mulberry32, type Rng } from './math/rng';
import { clamp } from './math/scalar';
import { SpatialHash } from './math/spatial-hash';
import { createGeometryCache } from './sim/geometry-cache';
import { createMorphotypes } from './sim/morphotypes';
import { EntityManager } from './sim/entities';
import { ShoggothSystem } from './sim/shoggoths';
import { PuppetMasterSystem } from './sim/puppet-masters';
import { WeatherSystem } from './sim/weather';
import { QuantumCloud } from './sim/quantum';
import { Connectome } from './sim/connectome';
import { EnvironmentSystem } from './sim/environment';
import { QuantumCircuitSystem } from './sim/qcircuit';
import { ReactionDiffusionSystem } from './sim/reaction-diffusion';
import { GraphMind } from './sim/graph-mind';
import { ConstellationSystem } from './sim/constellations';
import { LoreEngine } from './sim/lore';
import { AnalyticsSystem } from './sim/analytics';
import { AudioEngine } from './audio/engine';
import { AudioAnalysis } from './audio/analysis';
import { Hud } from './ui/hud';
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

  // ── Wildbeyond V2 systems (CONTRACTS V2) ──
  private readonly lore: LoreEngine;
  private readonly qc: QuantumCircuitSystem;
  private readonly rd: ReactionDiffusionSystem;
  private readonly graphMind: GraphMind;
  private readonly constellations: ConstellationSystem;
  private readonly audioAnalysis: AudioAnalysis;
  private readonly analytics: AnalyticsSystem;
  /** Last collapse basis seen, to detect measurement events across frames. */
  private lastCollapseSeen = -1;

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

    this.grid = new SpatialHash<Entity>(8);
    this.audio = new AudioEngine(this.state, this.rng);

    const geos = createGeometryCache();
    const ctx: SimContext = {
      scene: this.engine.scene,
      quality: this.quality,
      rng: this.rng,
      grid: this.grid,
      morphs: createMorphotypes(this.rng, geos.length),
      geos,
      state: this.state,
      audit: this.audit,
      sfx: (type) => this.audio.play(type),
    };

    this.environment = new EnvironmentSystem(ctx);
    this.entities = new EntityManager(ctx);
    this.entities.reset(300);
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
    this.lore = new LoreEngine(this.persisted.seed);
    this.qc = new QuantumCircuitSystem(ctx);
    // The bands buffer is live/reused — hand it to the cloud once; qc.bands()
    // refreshes its contents in place on the 6-frame cadence.
    this.quantum.setQuantumBands(this.qc.bands());
    this.rd = new ReactionDiffusionSystem(ctx);
    this.environment.attachGroundEmissiveMap(this.rd.texture);
    // Boot scars: the Gray-Scott fixed point is uniform — seed a few
    // disturbances so the ground skin starts breathing (rd writer note).
    for (let i = 0; i < 4; i++) this.rd.perturb(this.rng(), this.rng());
    this.graphMind = new GraphMind(ctx, this.entities, this.connectome);
    this.constellations = new ConstellationSystem(ctx, this.lore);
    this.audioAnalysis = new AudioAnalysis(this.audio);
    this.analytics = new AnalyticsSystem(ctx);

    this.hud = new Hud();
    this.panel = new TelemetryPanel();
    bindPanelToggles();
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
    };

    this.log.info('world ready', {
      seed: this.persisted.seed,
      maxEntities: this.quality.maxEntities,
      geometries: geos.length,
    });
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

    this.weather.apply(dt, t);
    // Bass shimmer on exposure — small additive nudge; the weather lerp pulls
    // it back every frame so it cannot accumulate (multiplier ≤ 0.35 rule).
    this.engine.renderer.toneMappingExposure += bands.bass * 0.05;
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
    const cadence = n > 700 ? 3 : n > 400 ? 2 : 1;
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
    if (s.frame % 240 === 0) this.graphMind.updateCommunities();
    // Offset 300 provably never collides with the 240f communities cadence.
    if (s.frame % 600 === 300) this.graphMind.updateRank();

    this.constellations.update(t, bands);
    this.environment.update(dt, t);

    if (s.frame % 8 === 0) {
      this.analytics.push(n, this.energy, this.connectome.links);
      this.panel.update(this.snapshot());
    }
    if (s.frame % 60 === 0) this.analytics.analyze(); // after push at coinciding frames

    this.engine.render();
  }

  /**
   * A quantum measurement collapsed the register: soft chime, a Gray-Scott
   * scar at a seeded location, and an audit record named from the lore.
   */
  private onCollapse(basis: number): void {
    if (basis < 0) return;
    this.audio.play('crystallize');
    this.rd.perturb(this.rng(), this.rng(), 6);
    this.audit.record('collapse', { basis, star: this.lore.name('star', basis) });
  }

  /** Legacy chaos multiplier cMul(): min(chaos/2, 3). */
  private chaosMul(): number {
    return Math.min(this.state.chaos / 2, 3);
  }

  /** Camera modes free/orbit/fly/top — verbatim legacy motion constants. */
  private updateCamera(dt: number, t: number): void {
    const cam = this.engine.camera;
    const spd = 14 * dt;
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
    } else if (mode === 'orbit') {
      const oR = 65 + Math.sin(t * 0.05) * 18;
      cam.position.set(
        Math.cos(t * 0.12) * oR,
        22 + Math.sin(t * 0.08) * 18,
        Math.sin(t * 0.12) * oR,
      );
      cam.lookAt(0, 8, 0);
    } else if (mode === 'fly') {
      const ft = t * 0.06;
      cam.position.set(
        Math.sin(ft) * 45 + Math.cos(ft * 1.3) * 22,
        16 + Math.sin(ft * 0.4) * 22,
        Math.cos(ft) * 45 + Math.sin(ft * 0.7) * 28,
      );
      cam.lookAt(Math.sin(ft * 0.3) * 12, 5 + Math.sin(ft * 0.5) * 12, Math.cos(ft * 0.3) * 12);
    } else {
      cam.position.set(0, 90, 0);
      cam.lookAt(0, 0, 0);
      cam.rotation.z = t * 0.015;
    }
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

  /** One sorting-field step: propose, apply swap to values + entities, nudge. */
  private sortStep(): void {
    const list = this.entities.list;
    const n = list.length;
    if (n < 2) return;
    const s = this.state;
    const algo = cyc(ALGOS, s.algoIdx);
    s.algoStep++;
    for (let i = 0; i < n; i++) {
      const e = list[i];
      this.sortVals[i] = e ? e.userData.sortVal : 0;
    }
    const swap = algo.step(this.sortVals, n, s.algoStep);
    let swapped = false;
    if (swap && swap[0] !== swap[1] && swap[0] >= 0 && swap[1] < n) {
      const ea = list[swap[0]];
      const eb = list[swap[1]];
      if (ea && eb) {
        const tv = ea.userData.sortVal;
        ea.userData.sortVal = eb.userData.sortVal;
        eb.userData.sortVal = tv;
        this.sv1
          .copy(eb.position)
          .sub(ea.position)
          .normalize()
          .multiplyScalar(0.04 * this.chaosMul());
        ea.userData.vel.add(this.sv1);
        eb.userData.vel.add(this.sv1.negate());
        ea.material.emissiveIntensity = 2;
        eb.material.emissiveIntensity = 2;
        this.qc.onSortSwap(swap[0], swap[1]); // CNOT with parity-chosen targets
        swapped = true;
      }
    }
    this.hud.setAlgo(algo.name, s.algoStep, swapped);
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
      // Birth scars the living ground (UV map per rd writer: 240×240 plane).
      this.rd.perturb(0.5 + e.position.x / 240, 0.5 - e.position.z / 240, 3);
      for (let j = 0; j < 4; j++) {
        this.sv1.set((this.rng() - 0.5) * 3, (this.rng() - 0.5) * 2, (this.rng() - 0.5) * 3);
        this.sv2.copy(e.position).add(this.sv1);
        const child = this.entities.spawn(
          this.sv2,
          (e.userData.mi + 1 + Math.floor(this.rng() * 10)) % 100,
          0.6,
        );
        if (child) child.userData.vel.copy(this.sv1.normalize().multiplyScalar(0.15));
      }
    }
  }

  /** Legacy doBurst: up to 30 spawns in the core volume. */
  private doBurst(): void {
    this.audio.play('burst');
    const room = this.quality.maxEntities - this.entities.list.length;
    const count = Math.min(30, room);
    for (let i = 0; i < count; i++) {
      this.sv1.set((this.rng() - 0.5) * 25, this.rng() * 14, (this.rng() - 0.5) * 25);
      this.entities.spawn(this.sv1, Math.floor(this.rng() * 100), 0.5 + this.rng());
    }
  }

  /** Legacy doMutate: remorph the whole population (Known Bug 14 counter). */
  private doMutate(): void {
    this.audio.play('mutate');
    const list = this.entities.list;
    this.state.mutations += list.length;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e) this.entities.remorph(e, Math.floor(this.rng() * 100));
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
    this.entities.reset(300);
    this.state.chaos = 0.5;
    this.state.mutations = 0;
    this.state.algoStep = 0;
    this.hud.showSector('GENESIS RESET');
  }

  /** UiActions implementation handed to InputSystem. */
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
        this.unlock();
        s.algoIdx = (s.algoIdx + 1) % ALGOS.length;
        s.algoStep = 0;
        const name = cyc(ALGOS, s.algoIdx).name;
        this.persisted.algoIdx = s.algoIdx;
        this.save();
        this.hud.showSector(name);
        this.audit.record('algo', { name });
        return name;
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
