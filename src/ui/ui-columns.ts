/**
 * UI column layout (V86): groups side panels into flex stacks so boxes stay stacked,
 * evenly sized, and never overlap when the opposite column is taller.
 *
 * Left:  Telemetry → Sorting Fields → perf HUD
 * Right: Observatory → Control → sorting readout → Sim Settings (compact)
 */
export function initUiColumns(doc: Document = document): void {
  const ui = doc.getElementById('ui');
  if (!ui) return;

  const sP = doc.getElementById('sP');
  const algoP = doc.getElementById('algoP');
  const perfSlot = doc.getElementById('perf-slot');
  const oP = doc.getElementById('oP');
  const cP = doc.getElementById('cP');
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

  if (oP && cP && alg && hudVsr) {
    let right = doc.getElementById('ui-col-right');
    if (!right) {
      right = doc.createElement('div');
      right.id = 'ui-col-right';
      right.className = 'ui-col-right';
      ui.appendChild(right);
    }
    right.append(oP, cP, alg, hudVsr);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initUiColumns(), { once: true });
  } else {
    initUiColumns();
  }
}
