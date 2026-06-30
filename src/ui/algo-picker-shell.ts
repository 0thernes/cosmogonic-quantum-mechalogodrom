/**
 * Early-mount the sorting-field list so #algo-list is never empty during WebGL boot (FOUC).
 * World.bindAlgoPicker() wires click handlers onto these rows when the sim starts.
 */
import { ALGOS, ALGO_GLYPHS } from '../sim/algorithms';

export function mountAlgoPickerShell(doc: Document = document): void {
  const listEl = doc.getElementById('algo-list');
  if (!listEl || listEl.childElementCount > 0) return;

  const n = ALGOS.length;
  const frag = doc.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const algo = ALGOS[i];
    if (!algo) continue;
    const row = doc.createElement('div');
    row.className = 'algo-row';
    row.dataset['algo'] = String(i);
    row.setAttribute('role', 'option');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', `Select ${algo.name} sorting field`);
    row.style.setProperty('--algo-hue', String(Math.round((i * 360) / n)));
    const glyph = doc.createElement('span');
    glyph.className = 'algo-glyph';
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = ALGO_GLYPHS[i % ALGO_GLYPHS.length] ?? '◆';
    const name = doc.createElement('span');
    name.className = 'algo-name';
    name.textContent = algo.name;
    const prog = document.createElement('div');
    prog.className = 'algo-prog';
    row.append(glyph, name, prog);
    frag.appendChild(row);
  }
  listEl.appendChild(frag);
}
