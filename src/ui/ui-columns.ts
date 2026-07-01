/**
 * UI column layout (V87): groups side panels into flex stacks so boxes stay stacked,
 * evenly sized, and never overlap when the opposite column is taller.
 *
 * Left:  Telemetry (50%) → Sorting Fields (50%) → perf HUD (anchored above dock)
 * Right: Observatory → Sorting readout → Sim Settings → brain viz slots (V108)
 * Control pad removed from the right column — keyboard legend lives in SET → Settings.
 */

import { initBrainSlotVisualizers } from './brain-slots';

function ensureBrainSlots(right: HTMLElement, doc: Document): void {
  if (doc.getElementById('brain-all-slot')) return;
  const slot = doc.createElement('div');
  slot.id = 'brain-all-slot';
  slot.className = 'cqm-brain-slot ui-readout-card ui-readout-card--purple';

  const head = doc.createElement('div');
  head.className = 'cqm-brain-slot__head';
  head.style.display = 'flex';
  head.style.alignItems = 'center';
  head.style.justifyContent = 'space-between';
  head.style.gap = '8px';

  const title = doc.createElement('span');
  title.textContent = '3 Live Brains';
  head.appendChild(title);

  const minBtn = doc.createElement('button');
  minBtn.type = 'button';
  minBtn.className = 'cqm-brain-slot__min';
  minBtn.textContent = '−';
  minBtn.title = 'Collapse Live Brains to side strip';
  minBtn.setAttribute('aria-label', 'Collapse Live Brains');
  minBtn.addEventListener('click', () => {
    const collapsed = slot.classList.toggle('cqm-brain-slot--collapsed');
    minBtn.textContent = collapsed ? '◧' : '−';
    minBtn.title = collapsed ? 'Expand Live Brains' : 'Collapse Live Brains to side strip';
    minBtn.setAttribute('aria-label', collapsed ? 'Expand Live Brains' : 'Collapse Live Brains');
  });
  head.appendChild(minBtn);

  const viz = doc.createElement('div');
  viz.className = 'cqm-brain-slot__viz';
  viz.id = 'brain-all-viz';
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
  slot.append(head, viz);
  right.appendChild(slot);
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
      left.className = 'ui-col ui-col-left';
      ui.prepend(left);
    }
    left.append(sP, algoP, perfSlot);
  }

  if (oP || alg || hudVsr) {
    let right = doc.getElementById('ui-col-right');
    if (!right) {
      right = doc.createElement('div');
      right.id = 'ui-col-right';
      right.className = 'ui-col ui-col-right';
      ui.appendChild(right);
    }
    if (oP) right.appendChild(oP);
    if (alg) right.appendChild(alg);
    if (hudVsr) right.appendChild(hudVsr);
    ensureBrainSlots(right, doc);
    initBrainSlotVisualizers(doc);
  }
}
