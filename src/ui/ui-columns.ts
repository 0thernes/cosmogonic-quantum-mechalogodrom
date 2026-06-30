/**
 * UI column layout (V87): groups side panels into flex stacks so boxes stay stacked,
 * evenly sized, and never overlap when the opposite column is taller.
 *
 * Left:  Telemetry (50%) → Sorting Fields (50%) → perf HUD (anchored above dock)
 * Right: Observatory → Sorting readout → Sim Settings → brain viz slots (V108)
 * Control pad removed from the right column — keyboard legend lives in SET → Settings.
 */

import { initBrainSlotVisualizers } from './brain-slots';

interface Neuron {
  x: number;
  y: number;
  connections: number[];
  pulseProgress: number[];
  pulseSpeed: number[];
}

function startNeuronAnimation(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const ctx2d: CanvasRenderingContext2D = ctx;

  const width = (canvas.width = 160);
  const height = (canvas.height = 120);

  const neurons: Neuron[] = [];
  const count = 12;
  for (let i = 0; i < count; i++) {
    neurons.push({
      x: 15 + Math.random() * (width - 30),
      y: 15 + Math.random() * (height - 30),
      connections: [],
      pulseProgress: [],
      pulseSpeed: [],
    });
  }

  for (let i = 0; i < count; i++) {
    const n1 = neurons[i]!;
    const sorted = neurons
      .map((n, idx) => ({ idx, dist: Math.hypot(n.x - n1.x, n.y - n1.y) }))
      .filter((item) => item.idx !== i)
      .sort((a, b) => a.dist - b.dist);

    const connectionsCount = 2 + Math.floor(Math.random() * 2);
    for (let c = 0; c < connectionsCount; c++) {
      const item = sorted[c];
      if (item && !n1.connections.includes(item.idx)) {
        n1.connections.push(item.idx);
        n1.pulseProgress.push(Math.random());
        n1.pulseSpeed.push(0.008 + Math.random() * 0.012);
      }
    }
  }

  function animate(): void {
    if (!canvas.isConnected) return;
    ctx2d.clearRect(0, 0, width, height);

    ctx2d.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      const n1 = neurons[i]!;
      for (let j = 0; j < n1.connections.length; j++) {
        const n2 = neurons[n1.connections[j]!]!;
        const grad = ctx2d.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
        grad.addColorStop(0, 'rgba(159, 107, 255, 0.2)');
        grad.addColorStop(0.5, 'rgba(57, 214, 255, 0.2)');
        grad.addColorStop(1, 'rgba(255, 215, 0, 0.2)');
        ctx2d.strokeStyle = grad;
        ctx2d.beginPath();
        ctx2d.moveTo(n1.x, n1.y);
        ctx2d.lineTo(n2.x, n2.y);
        ctx2d.stroke();

        n1.pulseProgress[j]! += n1.pulseSpeed[j]!;
        if (n1.pulseProgress[j]! > 1) {
          n1.pulseProgress[j] = 0;
          n1.pulseSpeed[j] = 0.008 + Math.random() * 0.012;
        }

        const p = n1.pulseProgress[j]!;
        const px = n1.x + (n2.x - n1.x) * p;
        const py = n1.y + (n2.y - n1.y) * p;

        ctx2d.fillStyle = p < 0.33 ? '#9f6bff' : p < 0.66 ? '#39d6ff' : '#ffd700';
        ctx2d.beginPath();
        ctx2d.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx2d.fill();
      }
    }

    for (const n of neurons) {
      ctx2d.fillStyle = 'rgba(159, 107, 255, 0.4)';
      ctx2d.beginPath();
      ctx2d.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
      ctx2d.fill();

      ctx2d.fillStyle = '#ffffff';
      ctx2d.beginPath();
      ctx2d.arc(n.x, n.y, 1, 0, Math.PI * 2);
      ctx2d.fill();
    }

    requestAnimationFrame(animate);
  }
  animate();
}

function ensureBrainSlots(right: HTMLElement, doc: Document): void {
  if (doc.getElementById('brain-all-slot')) return;
  const slot = doc.createElement('div');
  slot.id = 'brain-all-slot';
  slot.className = 'cqm-brain-slot ui-readout-card ui-readout-card--purple';
  slot.style.position = 'relative';
  slot.style.overflow = 'hidden';

  const canvas = doc.createElement('canvas');
  canvas.id = 'cqm-neuron-viz';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.opacity = '0.35';
  canvas.style.zIndex = '1';

  const head = doc.createElement('div');
  head.className = 'cqm-brain-slot__head';
  head.textContent = '3 Live Brains';
  head.style.position = 'relative';
  head.style.zIndex = '2';

  const viz = doc.createElement('div');
  viz.className = 'cqm-brain-slot__viz';
  viz.id = 'brain-all-viz';
  viz.style.position = 'relative';
  viz.style.zIndex = '2';
  viz.style.display = 'grid';
  viz.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
  viz.style.gap = '6px';
  viz.style.minHeight = '94px';

  const apexSlot = doc.createElement('div');
  apexSlot.id = 'brain-apex-slot';
  apexSlot.className = 'cqm-brain-mini cqm-brain-mini--apex';
  apexSlot.dataset['label'] = 'APEX';
  const mechaSlot = doc.createElement('div');
  mechaSlot.id = 'brain-mecha-slot';
  mechaSlot.className = 'cqm-brain-mini cqm-brain-mini--mecha';
  mechaSlot.dataset['label'] = 'MECHA';
  const glyphSlot = doc.createElement('div');
  glyphSlot.id = 'brain-glyph-slot';
  glyphSlot.className = 'cqm-brain-mini cqm-brain-mini--glyph';
  glyphSlot.dataset['label'] = 'GLYPH';

  viz.append(apexSlot, mechaSlot, glyphSlot);
  slot.append(canvas, head, viz);
  right.appendChild(slot);

  startNeuronAnimation(canvas);
}

export function initUiColumns(doc: Document = document): void {
  const ui = doc.getElementById('ui');
  if (!ui) return;

  const sP = doc.getElementById('sP');
  const algoP = doc.getElementById('algoP');
  const perfSlot = doc.getElementById('perf-slot');
  const oP = doc.getElementById('oP');
  const alg = doc.getElementById('alg');
  const hudVsr = doc.getElementById('hud-vsr');

  if (sP && algoP && perfSlot) {
    let left = doc.getElementById('ui-col-left');
    if (!left) {
      left = doc.createElement('div');
      left.id = 'ui-col-left';
      left.className = 'ui-col-left';
      ui.insertBefore(left, ui.firstChild);
    }
    left.append(sP, algoP, perfSlot);
  }

  if (oP && alg && hudVsr) {
    let right = doc.getElementById('ui-col-right');
    if (!right) {
      right = doc.createElement('div');
      right.id = 'ui-col-right';
      right.className = 'ui-col-right';
      ui.appendChild(right);
    }
    right.append(oP, alg, hudVsr);
    ensureBrainSlots(right, doc);
    initBrainSlotVisualizers(doc);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initUiColumns(), { once: true });
  } else {
    initUiColumns();
  }
}
