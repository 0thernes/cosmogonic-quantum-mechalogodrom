// SANDBOX — user-chosen compute budget / world richness. Every system in the World is ENUMERATED by
// reflection (never a hand-picked list): each World field that owns a THREE.Object3D (directly or via
// .group/.mesh/.root/.object) or exposes update()/step() becomes a system entry; every InstancedMesh in
// its subtree becomes a per-species/per-pool entry; every creature phylum and the organism population
// are entries too. Each entry has an on/off switch and a 0..300 % level in 10 % steps.
// DEFAULT (on, 100 %) TOUCHES NOTHING: apply() only acts on non-default entries and restores originals
// when an entry returns to default, so goldens and seeded determinism are untouched unless the user
// chooses otherwise.
import type * as THREE from 'three';

export const SANDBOX_PCT_MIN = 0;
export const SANDBOX_PCT_MAX = 300;
export const SANDBOX_PCT_STEP = 10;
export const SANDBOX_STORAGE_KEY = 'cqm.sandbox.v1';

export interface SandboxLevel {
  on: boolean;
  pct: number;
}
export type SandboxSettings = Record<string, SandboxLevel>;

export type SandboxKind = 'system' | 'pool' | 'population' | 'phylum';
export interface SandboxEntry {
  id: string;
  label: string;
  kind: SandboxKind;
  parent?: string;
}

export function snapPct(p: number): number {
  if (!Number.isFinite(p)) return 100;
  const s = Math.round(p / SANDBOX_PCT_STEP) * SANDBOX_PCT_STEP;
  return Math.min(SANDBOX_PCT_MAX, Math.max(SANDBOX_PCT_MIN, s));
}

export function levelOf(settings: SandboxSettings, id: string): SandboxLevel {
  const l = settings[id];
  return l ? { on: l.on !== false, pct: snapPct(l.pct) } : { on: true, pct: 100 };
}

/** Effective multiplier: 0 when off, else pct/100. */
export function factorOf(settings: SandboxSettings, id: string): number {
  const l = levelOf(settings, id);
  return l.on ? l.pct / 100 : 0;
}

export function isDefault(l: SandboxLevel): boolean {
  return l.on && l.pct === 100;
}

/** Drop defaults + junk; snap levels. The persisted form only stores user deviations. */
export function normalizeSettings(raw: unknown): SandboxSettings {
  const out: SandboxSettings = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const o = v as { on?: unknown; pct?: unknown };
    const l = { on: o.on !== false, pct: snapPct(typeof o.pct === 'number' ? o.pct : 100) };
    if (!isDefault(l)) out[k] = l;
  }
  return out;
}

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function loadSettings(store: KV | null, key = SANDBOX_STORAGE_KEY): SandboxSettings {
  try {
    const s = store?.getItem(key);
    return s ? normalizeSettings(JSON.parse(s)) : {};
  } catch {
    return {};
  }
}

export function saveSettings(
  store: KV | null,
  s: SandboxSettings,
  key = SANDBOX_STORAGE_KEY,
): void {
  try {
    const n = normalizeSettings(s);
    if (Object.keys(n).length === 0) store?.removeItem(key);
    else store?.setItem(key, JSON.stringify(n));
  } catch {
    /* storage unavailable — settings stay live for this session */
  }
}

// ── reflection-based enumeration ─────────────────────────────────────────────────────────────────

type Obj3 = THREE.Object3D & { isInstancedMesh?: boolean; count?: number };

function obj3Of(v: unknown): Obj3 | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (o.isObject3D === true) return v as Obj3;
  for (const k of ['group', 'mesh', 'root', 'object', 'points']) {
    const c = o[k] as Record<string, unknown> | undefined;
    if (c && c.isObject3D === true) return c as unknown as Obj3;
  }
  return null;
}

function hasStep(v: unknown): boolean {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return typeof o.update === 'function' || typeof o.step === 'function';
}

const NO_SUSPEND = new Set(['entities', 'audioAnalysis', 'nhsiAffect', 'selfEvoLoop']);
const SKIP_FIELDS = new Set(['engine', 'ctx', 'state', 'persisted', 'store', 'audit', 'quality']);

function prettify(name: string): string {
  return name
    .replace(/^_+/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

interface Bound {
  entry: SandboxEntry;
  host?: Record<string, unknown>;
  obj?: Obj3;
  pool?: Obj3;
  poolCap?: number;
}

/** Hooks a World exposes for the population + phylum levels (optional — tests may omit). */
export interface SandboxWorldHooks {
  setPopulationScale?(f: number): void;
  setPhylumScale?(phylum: number, f: number): void;
  phylumCount?: number;
}

export class SandboxController {
  private readonly bound = new Map<string, Bound>();
  readonly entries: SandboxEntry[] = [];
  private readonly origUpdate = new Map<string, { k: string; fn: unknown }[]>();
  private readonly origVisible = new Map<string, boolean>();
  private readonly baseCount = new Map<string, number>();
  private settings: SandboxSettings = {};

  constructor(
    private readonly world: object,
    private readonly hooks: SandboxWorldHooks = world as SandboxWorldHooks,
  ) {
    this.enumerate();
  }

  private add(b: Bound): void {
    if (this.bound.has(b.entry.id)) return;
    this.bound.set(b.entry.id, b);
    this.entries.push(b.entry);
  }

  private enumerate(): void {
    if (this.hooks.setPopulationScale) {
      this.add({
        entry: { id: 'pop:organisms', label: 'Organisms (all creatures)', kind: 'population' },
      });
    }
    const pc = this.hooks.setPhylumScale ? (this.hooks.phylumCount ?? 0) : 0;
    for (let p = 0; p < pc; p++) {
      this.add({
        entry: {
          id: `phylum:${p}`,
          label: `Creature phylum ${p + 1}`,
          kind: 'phylum',
          parent: 'pop:organisms',
        },
      });
    }
    const seen = new Set<unknown>();
    for (const [field, v] of Object.entries(this.world)) {
      if (SKIP_FIELDS.has(field) || seen.has(v)) continue;
      const items: [string, unknown][] = Array.isArray(v)
        ? v.map((x, i) => [`${field}[${i}]`, x] as [string, unknown])
        : [[field, v]];
      for (const [name, x] of items) {
        if (seen.has(x)) continue;
        const obj = obj3Of(x);
        if (!obj && !hasStep(x)) continue;
        seen.add(x);
        const id = `sys:${name}`;
        this.add({
          entry: { id, label: prettify(name), kind: 'system' },
          host: x as Record<string, unknown>,
          obj: obj ?? undefined,
        });
        if (!obj) continue;
        let k = 0;
        obj.traverse((o) => {
          const m = o as Obj3;
          if (!m.isInstancedMesh) return;
          const cap = (m as unknown as THREE.InstancedMesh).instanceMatrix?.count ?? m.count ?? 0;
          this.add({
            entry: {
              id: `${id}/pool${k}`,
              label: `${prettify(name)} · ${m.name || `species/pool ${k + 1}`}`,
              kind: 'pool',
              parent: id,
            },
            pool: m,
            poolCap: cap,
          });
          k++;
        });
      }
    }
  }

  get current(): SandboxSettings {
    return { ...this.settings };
  }

  /** Apply settings live. Only non-default entries are touched; defaults are restored exactly. */
  apply(next: SandboxSettings): void {
    const prev = this.settings;
    this.settings = normalizeSettings(next);
    for (const b of this.bound.values()) {
      const id = b.entry.id;
      const was = prev[id];
      const now = this.settings[id];
      if (!was && !now) continue;
      const f = factorOf(this.settings, id);
      switch (b.entry.kind) {
        case 'population':
          this.hooks.setPopulationScale?.(f);
          break;
        case 'phylum':
          this.hooks.setPhylumScale?.(Number(id.slice(7)), f);
          break;
        case 'system':
          this.applySystem(b, f);
          break;
        case 'pool':
          this.applyPool(b, f);
          break;
      }
    }
  }

  /** Re-assert pool counts (systems that rewrite .count each frame). Cheap; call every ~30 frames. */
  tick(): void {
    for (const id of Object.keys(this.settings)) {
      const b = this.bound.get(id);
      if (b?.entry.kind === 'pool') this.applyPool(b, factorOf(this.settings, id));
    }
  }

  private applySystem(b: Bound, f: number): void {
    const id = b.entry.id;
    const off = f === 0;
    if (b.obj) {
      if (!this.origVisible.has(id)) this.origVisible.set(id, b.obj.visible);
      b.obj.visible = off ? false : this.origVisible.get(id)!;
    }
    const h = b.host;
    // Systems whose update() result the World consumes keep running (visibility/population only).
    if (!h || NO_SUSPEND.has(id.slice(4))) return;
    if (off && !this.origUpdate.has(id)) {
      const saved: { k: string; fn: unknown }[] = [];
      for (const k of ['update', 'step']) {
        if (typeof h[k] === 'function') {
          saved.push({ k, fn: Object.prototype.hasOwnProperty.call(h, k) ? h[k] : undefined });
          h[k] = SANDBOX_NOOP;
        }
      }
      this.origUpdate.set(id, saved);
    } else if (!off && this.origUpdate.has(id)) {
      for (const { k, fn } of this.origUpdate.get(id)!) {
        if (fn === undefined) delete h[k];
        else h[k] = fn;
      }
      this.origUpdate.delete(id);
    }
  }

  private applyPool(b: Bound, f: number): void {
    const m = b.pool!;
    const id = b.entry.id;
    if (!this.baseCount.has(id)) this.baseCount.set(id, m.count ?? 0);
    const base = this.baseCount.get(id)!;
    if (!this.settings[id]) {
      m.count = base;
      this.baseCount.delete(id);
      return;
    }
    m.count = Math.min(b.poolCap ?? base, Math.round(base * f));
  }

  /** Was this system's update suppressed? (tests/telemetry) */
  isSuspended(id: string): boolean {
    return this.origUpdate.has(id);
  }
}

/** Returned by a suspended system's update()/step(): does nothing and reports nothing. */
export function SANDBOX_NOOP(): undefined {
  return undefined;
}
