/**
 * Left column layout (V85b): groups Telemetry + Sorting Fields + perf HUD into one flex stack so
 * the FPS chip sits directly under Sorting Fields instead of sharing a grid row with the tall
 * Control panel on the right (which created a large empty gap).
 */
export function initLeftColumn(doc: Document = document): void {
  const ui = doc.getElementById('ui');
  const sP = doc.getElementById('sP');
  const algoP = doc.getElementById('algoP');
  const perfSlot = doc.getElementById('perf-slot');
  if (!ui || !sP || !algoP || !perfSlot) return;

  let col = doc.getElementById('ui-col-left');
  if (!col) {
    col = doc.createElement('div');
    col.id = 'ui-col-left';
    col.className = 'ui-col-left';
    ui.insertBefore(col, ui.firstChild);
  }
  col.append(sP, algoP, perfSlot);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initLeftColumn(), { once: true });
  } else {
    initLeftColumn();
  }
}

export {};
