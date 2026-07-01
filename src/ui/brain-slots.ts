/**
 * Brain slot mini visualizers (V108) — live, compact previews of the three deep minds.
 *
 * Replaces the static text hints in the right-column brain slots with lightweight 2D canvas
 * readouts. The world dispatches a `cqm:brain-snapshots` window event at UI cadence; each
 * slot receives the shared payload and draws only the slice it owns.
 */

import type { ApexBrainSnapshot } from '../sim/apex-brain';
import type { MechalogodromBrainSnapshot } from '../sim/mechalogodrom-brain';
import type { GlyphBrainSnapshot } from '../sim/glyph-brain';

export interface BrainSlotPayload {
  apex: ApexBrainSnapshot | null;
  mecha: MechalogodromBrainSnapshot | null;
  glyphs: GlyphBrainSnapshot[] | null;
}

interface Slot {
  id: 'apex' | 'mecha' | 'glyph';
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  history: number[];
  color: string;
}

const MAX_HISTORY = 48;
const CANVAS_W = 320;
const CANVAS_H = 320;
const BRAIN_SLOTS_WIRED = 'cqmBrainSlotsWired';

function createCanvas(doc: Document, slotId: string): Slot | null {
  const wrap = doc.getElementById(slotId);
  if (!wrap) return null;
  wrap.replaceChildren();
  const canvas = doc.createElement('canvas');
  canvas.className = 'cqm-brain-canvas';
  const dpr = Math.max(1, Math.min(2, doc.defaultView?.devicePixelRatio ?? 1));
  canvas.width = Math.round(CANVAS_W * dpr);
  canvas.height = Math.round(CANVAS_H * dpr);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.aspectRatio = '1 / 1';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Brain visualizer booting');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  wrap.appendChild(canvas);
  const idMap: Record<string, Slot['id']> = {
    'brain-apex-slot': 'apex',
    'brain-mecha-slot': 'mecha',
    'brain-glyph-slot': 'glyph',
  };
  return {
    id: idMap[slotId] ?? 'apex',
    canvas,
    ctx,
    history: Array.from({ length: MAX_HISTORY }, () => 0),
    color: '#c79bff',
  };
}

function pushHistory(slot: Slot, value: number): void {
  slot.history.push(value);
  while (slot.history.length > MAX_HISTORY) slot.history.shift();
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 2, w * 0.5, h * 0.5, h * 0.78);
  bg.addColorStop(0, 'rgba(110, 70, 210, 0.55)');
  bg.addColorStop(0.4, 'rgba(20, 14, 48, 0.92)');
  bg.addColorStop(0.85, 'rgba(6, 5, 18, 0.98)');
  bg.addColorStop(1, 'rgba(2, 3, 12, 1)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // Soft vignette to focus the eye on the neural center.
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.25, w * 0.5, h * 0.5, h * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // USER #3: Very subtle grid for brains. Focus is on firing neurons and wavy connections, not bars.
  // For APEX especially, keep minimal so only the live graphs/lines of real neural firing are prominent.
  ctx.strokeStyle = 'rgba(100, 160, 255, 0.06)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = 32; x < w; x += 32) {
    // sparser
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 32; y < h; y += 32) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

/** A deterministic global pulse so the brain slots keep animating even between snapshots. */
function nowPulse(): number {
  return typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
}

function drawSynapses(
  ctx: CanvasRenderingContext2D,
  values: number[],
  w: number,
  h: number,
  hue: number,
  pulse: number,
): void {
  const cx = w * 0.5;
  const cy = h * 0.52;
  const radius = Math.min(w, h) * 0.34;

  // USER #3: wavy connected firing neurons (real activity drives waves, no heavy bars for APEX)
  ctx.strokeStyle = `hsla(${hue}, 80%, 45%, 0.15)`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i < values.length; i++) {
    const a1 = (i / values.length) * Math.PI * 2;
    const v1 = clamp01(values[i] ?? 0);
    const r1 = radius * (0.65 + v1 * 0.35);
    const x1 = cx + Math.cos(a1) * r1;
    const y1 = cy + Math.sin(a1) * r1 * (0.5 + v1 * 0.25);
    for (let j = i + 1; j < values.length; j++) {
      const a2 = (j / values.length) * Math.PI * 2;
      const v2 = clamp01(values[j] ?? 0);
      const r2 = radius * (0.65 + v2 * 0.35);
      const x2 = cx + Math.cos(a2) * r2;
      const y2 = cy + Math.sin(a2) * r2 * (0.5 + v2 * 0.25);
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const wave = Math.sin((i + j) * 0.8 + pulse * 4) * (6 + (v1 + v2) * 4);
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(mx + wave, my - wave * 0.4, x2, y2);
    }
  }
  ctx.stroke();

  ctx.lineWidth = 1.2;

  // Central firing node — expands and contracts with the pulse.
  const coreR = 2.5 + Math.sin(pulse * 2) * 0.8;
  const coreGlow = ctx.createRadialGradient(cx, cy, 1, cx, cy, coreR * 3);
  coreGlow.addColorStop(0, `hsla(${hue}, 90%, 80%, 0.85)`);
  coreGlow.addColorStop(0.5, `hsla(${hue}, 90%, 60%, 0.35)`);
  coreGlow.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 0.6, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < values.length; i++) {
    const a = (i / values.length) * Math.PI * 2;
    const v = clamp01(values[i] ?? 0);
    const reach = 0.65 + v * 0.35 + Math.sin(pulse * 1.5 + i) * 0.04;
    const x = cx + Math.cos(a) * radius * reach;
    const y = cy + Math.sin(a) * radius * (0.5 + v * 0.25);
    const cpX = cx + Math.sin(a) * radius * 0.35;
    const cpY = cy - Math.cos(a) * radius * 0.25;

    // Connection gradient: deep at centre, bright at node.
    const grad = ctx.createLinearGradient(cx, cy, x, y);
    grad.addColorStop(0, `hsla(${hue + i * 18}, 95%, 55%, ${0.12 + v * 0.2})`);
    grad.addColorStop(1, `hsla(${hue + i * 18}, 95%, ${60 + v * 25}%, ${0.35 + v * 0.5})`);
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cpX, cpY, x, y);
    ctx.stroke();

    // Peripheral node: expands and contracts as if "breathing".
    const nodeR = Math.max(1.5, 2 + v * 3 + Math.sin(pulse * 2.2 + i * 1.3) * 1.2);
    ctx.fillStyle = `hsla(${hue + i * 18}, 95%, 70%, ${0.5 + v * 0.5})`;
    ctx.beginPath();
    ctx.arc(x, y, nodeR, 0, Math.PI * 2);
    ctx.fill();

    // Traveling synaptic pulse: a bright dot moving along the curve.
    const travel = (pulse * (0.6 + v * 0.8) + i * 0.37) % 1;
    const t = travel;
    const oneMinusT = 1 - t;
    const px = oneMinusT * oneMinusT * cx + 2 * oneMinusT * t * cpX + t * t * x;
    const py = oneMinusT * oneMinusT * cy + 2 * oneMinusT * t * cpY + t * t * y;
    ctx.fillStyle = `hsla(${hue + i * 18 + 40}, 100%, 80%, ${0.6 + v * 0.4})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.4 + v * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Real-time animated glowing voltage spike moving along the curve from the shared UI pulse.
    const spikeTravel = (pulse * (0.7 + v * 0.6) + i * 0.37) % 1.0;
    const tSpike = spikeTravel;
    const oneMinusTSpike = 1 - tSpike;
    const spX =
      oneMinusTSpike * oneMinusTSpike * cx +
      2 * oneMinusTSpike * tSpike * cpX +
      tSpike * tSpike * x;
    const spY =
      oneMinusTSpike * oneMinusTSpike * cy +
      2 * oneMinusTSpike * tSpike * cpY +
      tSpike * tSpike * y;

    // Radial glow overlay for the voltage spike
    const spikeGlowR = 6 + v * 8;
    const spikeGlow = ctx.createRadialGradient(spX, spY, 1, spX, spY, spikeGlowR);
    spikeGlow.addColorStop(0, '#ffffff');
    spikeGlow.addColorStop(0.35, `hsla(${hue + i * 18 + 60}, 100%, 75%, 0.9)`);
    spikeGlow.addColorStop(0.7, `hsla(${hue + i * 18}, 95%, 55%, 0.3)`);
    spikeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = spikeGlow;
    ctx.beginPath();
    ctx.arc(spX, spY, spikeGlowR, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSparkline(
  ctx: CanvasRenderingContext2D,
  history: number[],
  w: number,
  h: number,
  color: string,
): void {
  if (history.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const step = w / (MAX_HISTORY - 1);
  for (let i = 0; i < history.length; i++) {
    const x = i * step;
    const y = h - (history[i] ?? 0) * (h - 4) - 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // glow
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  values: number[],
  w: number,
  h: number,
  pulse: number,
): void {
  const cols = 10;
  const rows = 10;
  const cellW = w / cols;
  const cellH = h / rows;
  for (let i = 0; i < values.length && i < cols * rows; i++) {
    const v = values[i] ?? 0;
    const cx = (i % cols) * cellW + cellW / 2;
    const cy = Math.floor(i / cols) * cellH + cellH / 2;
    const breath = 0.85 + 0.15 * Math.sin(pulse * 2.4 + i * 0.7);
    const r = Math.max(1, cellW * 0.35 * (0.3 + v * 0.7) * breath);
    const hue = 260 + v * 90 + Math.sin(pulse + i) * 10;
    const shimmer = 0.35 + v * 0.65 + 0.15 * Math.sin(pulse * 4 + i * 1.1);
    ctx.fillStyle = `hsla(${hue}, 90%, 65%, ${Math.min(1, shimmer)})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Electrode flash: small bright core when the value peaks.
    if (v > 0.75) {
      ctx.fillStyle = `hsla(${hue + 30}, 100%, 85%, ${0.4 + 0.6 * Math.sin(pulse * 6 + i)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function updateApex(slot: Slot, apex: ApexBrainSnapshot | null): void {
  const ctx = slot.ctx;
  const w = slot.canvas.width;
  const h = slot.canvas.height;
  drawBackground(ctx, w, h);
  if (!apex) {
    slot.canvas.setAttribute('aria-label', 'Apex brain visualizer booting');
    ctx.fillStyle = 'rgba(200, 180, 255, 0.4)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Apex booting…', 6, 23);
    return;
  }
  const t = apex.thought;
  const motor = Math.hypot(t.motor.x, t.motor.y, t.motor.z);
  // USER #4: richer authentic firing signature from the APEX organ telemetry (not clock-fabricated).
  const values = [
    t.transcendence,
    t.vitality,
    clamp01(1 - t.agony),
    t.superposed ? 1 : 0,
    clamp01(motor),
    apex.quantum.coherence,
    apex.meta.godelResidual,
    apex.thermo.paralysis,
  ];
  drawGrid(ctx, w, h);
  drawSynapses(ctx, values, w, h, 275, nowPulse());
  ctx.fillStyle = '#f3e9ff';
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.fillText(`APEX · ${t.plan}`, 6, 14);
  slot.canvas.setAttribute(
    'aria-label',
    `Apex brain plan ${t.plan}, vitality ${Math.round(t.vitality * 100)} percent`,
  );
}

function updateMecha(slot: Slot, mecha: MechalogodromBrainSnapshot | null): void {
  const ctx = slot.ctx;
  const w = slot.canvas.width;
  const h = slot.canvas.height;
  drawBackground(ctx, w, h);
  if (!mecha) {
    slot.canvas.setAttribute('aria-label', 'Mechalogodrom brain visualizer booting');
    ctx.fillStyle = 'rgba(200, 180, 255, 0.4)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Mecha booting…', 6, 23);
    return;
  }
  pushHistory(slot, mecha.activity ?? 0.5);
  drawGrid(ctx, w, h);
  drawSynapses(ctx, slot.history.slice(-9), w, h, 195, nowPulse());
  drawSparkline(ctx, slot.history, w, h, '#5cf0ff');
  ctx.fillStyle = '#e0fbff';
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.fillText(`MECHA · ${Math.round((mecha.liveParams / 1e6) * 10) / 10}M`, 6, 14);
  // Dominant sub-brain (0..9) — this is the SAME index whose physical variant shell blazes on the
  // fused body (Global Workspace made legible): the readout here must match the ignited shell there.
  ctx.fillStyle = '#ffd27a';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.fillText(
    `DOM·V${mecha.dominantVariant} Φ${Math.round((mecha.consciousnessProxy ?? 0) * 100)}`,
    6,
    h - 5,
  );
  slot.canvas.setAttribute(
    'aria-label',
    `Mechalogodrom brain activity ${Math.round((mecha.activity ?? 0.5) * 100)} percent, ${
      Math.round((mecha.liveParams / 1e6) * 10) / 10
    } million live parameters, dominant variant ${mecha.dominantVariant}`,
  );
}

function updateGlyph(slot: Slot, glyphs: GlyphBrainSnapshot[] | null): void {
  const ctx = slot.ctx;
  const w = slot.canvas.width;
  const h = slot.canvas.height;
  drawBackground(ctx, w, h);
  if (!glyphs || glyphs.length === 0) {
    slot.canvas.setAttribute('aria-label', 'Glyph brain visualizer booting');
    ctx.fillStyle = 'rgba(200, 180, 255, 0.4)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Glyph booting…', 6, 23);
    return;
  }
  const values = glyphs.map((g) => (g.activity + g.novelty + g.valence) / 3);
  drawGrid(ctx, w, h);
  drawSynapses(ctx, values.slice(0, 12), w, h, 315, nowPulse());
  drawDots(ctx, values, w, h, nowPulse());
  ctx.fillStyle = '#ffe8fb';
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.fillText(`GLYPH · ${glyphs.length} minds`, 6, 14);
  slot.canvas.setAttribute('aria-label', `Glyph brain swarm visualizer, ${glyphs.length} minds`);
}

function updateSlots(slots: Slot[], payload: BrainSlotPayload): void {
  for (const slot of slots) {
    if (slot.id === 'apex') updateApex(slot, payload.apex);
    else if (slot.id === 'mecha') updateMecha(slot, payload.mecha);
    else if (slot.id === 'glyph') updateGlyph(slot, payload.glyphs);
  }
}

export function initBrainSlotVisualizers(doc: Document = document): void {
  if (doc.documentElement.dataset[BRAIN_SLOTS_WIRED] === '1') return;
  const slots: Slot[] = [];
  for (const id of ['brain-apex-slot', 'brain-mecha-slot', 'brain-glyph-slot'] as const) {
    const s = createCanvas(doc, id);
    if (s) slots.push(s);
  }
  if (slots.length === 0) return;
  doc.documentElement.dataset[BRAIN_SLOTS_WIRED] = '1';
  window.addEventListener('cqm:brain-snapshots', (e) => {
    const payload = (e as CustomEvent).detail as BrainSlotPayload | undefined;
    if (!payload) return;
    updateSlots(slots, payload);
  });
  // Draw a placeholder frame immediately so the slots never look empty.
  updateSlots(slots, { apex: null, mecha: null, glyphs: null });
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
