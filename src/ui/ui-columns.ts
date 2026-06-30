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
  slot.innerHTML = `<div class="cqm-brain-slot__viz" id="brain-all-viz"></div>`;
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
