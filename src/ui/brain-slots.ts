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

function createCanvas(doc: Document, slotId: string): Slot | null {
  const wrap = doc.getElementById(slotId);
  if (!wrap) return null;
  wrap.replaceChildren();
  const canvas = doc.createElement('canvas');
  canvas.className = 'cqm-brain-canvas';
  canvas.width = 120;
  canvas.height = 36;
  canvas.setAttribute('role', 'img');
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
  ctx.fillStyle = 'rgba(10, 8, 24, 0.55)';
  ctx.fillRect(0, 0, w, h);
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.strokeStyle = 'rgba(150, 120, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 10; x < w; x += 10) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 9; y < h; y += 9) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
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

function drawBars(
  ctx: CanvasRenderingContext2D,
  values: number[],
  w: number,
  h: number,
  colors: string[],
): void {
  const n = values.length;
  const gap = 2;
  const barW = (w - gap * (n + 1)) / n;
  for (let i = 0; i < n; i++) {
    const v = values[i] ?? 0;
    const x = gap + i * (barW + gap);
    const bh = Math.max(2, v * (h - 6));
    const y = h - bh - 2;
    ctx.fillStyle = colors[i % colors.length] ?? colors[0]!;
    ctx.fillRect(x, y, barW, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, barW, 1);
  }
}

function drawDots(ctx: CanvasRenderingContext2D, values: number[], w: number, h: number): void {
  const cols = 10;
  const rows = 10;
  const cellW = w / cols;
  const cellH = h / rows;
  for (let i = 0; i < values.length && i < cols * rows; i++) {
    const v = values[i] ?? 0;
    const cx = (i % cols) * cellW + cellW / 2;
    const cy = Math.floor(i / cols) * cellH + cellH / 2;
    const r = Math.max(1, cellW * 0.35 * (0.3 + v * 0.7));
    const hue = 260 + v * 90;
    ctx.fillStyle = `hsla(${hue}, 90%, 65%, ${0.35 + v * 0.65})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateApex(slot: Slot, apex: ApexBrainSnapshot | null): void {
  const ctx = slot.ctx;
  const w = slot.canvas.width;
  const h = slot.canvas.height;
  drawBackground(ctx, w, h);
  if (!apex) {
    ctx.fillStyle = 'rgba(200, 180, 255, 0.4)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Apex booting…', 6, 23);
    return;
  }
  const t = apex.thought;
  const motor = Math.hypot(t.motor.x, t.motor.y, t.motor.z);
  const values = [
    t.transcendence,
    t.vitality,
    clamp01(1 - t.agony),
    t.superposed ? 1 : 0,
    clamp01(motor),
  ];
  const colors = ['#9f6bff', '#6bff9e', '#ff5a6b', '#39d6ff', '#ff9f43'];
  drawBars(ctx, values, w, h, colors);
  drawGrid(ctx, w, h);
  ctx.fillStyle = '#e6dcff';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.fillText(`Apex · ${t.plan}`, 4, 10);
}

function updateMecha(slot: Slot, mecha: MechalogodromBrainSnapshot | null): void {
  const ctx = slot.ctx;
  const w = slot.canvas.width;
  const h = slot.canvas.height;
  drawBackground(ctx, w, h);
  if (!mecha) {
    ctx.fillStyle = 'rgba(200, 180, 255, 0.4)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Mecha booting…', 6, 23);
    return;
  }
  pushHistory(slot, mecha.activity ?? 0.5);
  drawSparkline(ctx, slot.history, w, h, '#39d6ff');
  drawGrid(ctx, w, h);
  ctx.fillStyle = '#b8f5ff';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.fillText(`Mecha · ${Math.round((mecha.liveParams / 1e6) * 10) / 10}M`, 4, 10);
}

function updateGlyph(slot: Slot, glyphs: GlyphBrainSnapshot[] | null): void {
  const ctx = slot.ctx;
  const w = slot.canvas.width;
  const h = slot.canvas.height;
  drawBackground(ctx, w, h);
  if (!glyphs || glyphs.length === 0) {
    ctx.fillStyle = 'rgba(200, 180, 255, 0.4)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Glyph booting…', 6, 23);
    return;
  }
  const values = glyphs.map((g) => (g.activity + g.novelty + g.valence) / 3);
  drawDots(ctx, values, w, h);
  drawGrid(ctx, w, h);
  ctx.fillStyle = '#e6dcff';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.fillText(`Glyph · ${glyphs.length} minds`, 4, 10);
}

function updateSlots(slots: Slot[], payload: BrainSlotPayload): void {
  for (const slot of slots) {
    if (slot.id === 'apex') updateApex(slot, payload.apex);
    else if (slot.id === 'mecha') updateMecha(slot, payload.mecha);
    else if (slot.id === 'glyph') updateGlyph(slot, payload.glyphs);
  }
}

export function initBrainSlotVisualizers(doc: Document = document): void {
  const slots: Slot[] = [];
  for (const id of ['brain-apex-slot', 'brain-mecha-slot', 'brain-glyph-slot'] as const) {
    const s = createCanvas(doc, id);
    if (s) slots.push(s);
  }
  if (slots.length === 0) return;
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
