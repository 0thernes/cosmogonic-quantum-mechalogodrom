/**
 * ALife survey metric gallery — tabbed hero viewer with pan/zoom for docs.html + specs.html.
 * Nine-axis radar profile is the default hero; tabs cycle all 11 SVG reports.
 */

export interface AlifeMetric {
  id: string;
  label: string;
  src: string;
  alt: string;
}

/** Resolve SVG path for dev server, GitHub Pages flat site, or lab subfolder. */
function alifeAssetBase(): string {
  const p = typeof location !== 'undefined' ? location.pathname : '';
  if (p.includes('/lab')) return '../docs/reports/assets/';
  if (p === '/docs' || p === '/spec' || p.endsWith('/docs.html') || p.endsWith('/specs.html'))
    return '/docs/reports/assets/';
  return 'docs/reports/assets/';
}

/** Repo-relative asset paths (GitHub Pages after build-pages copies assets). */
export function alifeMetricSrc(file: string): string {
  return `${alifeAssetBase()}${file}`;
}

export const ALIFE_METRICS: readonly AlifeMetric[] = [
  {
    id: 'radar',
    label: 'Nine-axis profile',
    src: alifeMetricSrc('alife-radar-profile.svg'),
    alt: 'Nine-axis capability radar profile',
  },
  {
    id: 'pca',
    label: 'PCA',
    src: alifeMetricSrc('alife-pca.svg'),
    alt: 'PCA projection of ALife systems',
  },
  {
    id: 'pareto',
    label: 'Pareto',
    src: alifeMetricSrc('alife-pareto.svg'),
    alt: 'Pareto frontier',
  },
  {
    id: 'breadth',
    label: 'Breadth ranked',
    src: alifeMetricSrc('alife-breadth-ranked.svg'),
    alt: 'Breadth ranked',
  },
  {
    id: 'maturity',
    label: 'Breadth vs maturity',
    src: alifeMetricSrc('alife-breadth-vs-maturity.svg'),
    alt: 'Breadth vs maturity',
  },
  {
    id: 'heatmap',
    label: 'Axis heatmap',
    src: alifeMetricSrc('alife-axis-heatmap.svg'),
    alt: 'Axis heatmap',
  },
  {
    id: 'correlation',
    label: 'Correlation',
    src: alifeMetricSrc('alife-axis-correlation.svg'),
    alt: 'Axis correlation matrix',
  },
  {
    id: 'dendrogram',
    label: 'Dendrogram',
    src: alifeMetricSrc('alife-dendrogram.svg'),
    alt: 'Hierarchical dendrogram',
  },
  {
    id: 'distance',
    label: 'Distance matrix',
    src: alifeMetricSrc('alife-distance-matrix.svg'),
    alt: 'Distance matrix',
  },
  {
    id: 'neighbors',
    label: 'Nearest neighbors',
    src: alifeMetricSrc('alife-nearest-neighbors.svg'),
    alt: 'Nearest neighbors',
  },
  {
    id: 'entropy',
    label: 'Entropy',
    src: alifeMetricSrc('alife-entropy.svg'),
    alt: 'Entropy distribution',
  },
] as const;

const STYLE = `
.alife-gallery{margin:1.5rem 0 2.5rem}
.alife-gallery h2{margin-bottom:.35rem}
.alife-gallery .lead{color:#9fb6dd;font-size:.92rem;margin-bottom:.75rem}
.alife-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.alife-tab{border:1px solid rgba(120,160,255,.35);background:rgba(12,20,40,.7);color:#cfe0fb;
  border-radius:8px;padding:5px 10px;font:600 10px/1.2 var(--font-mono,ui-monospace,monospace);
  letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:border-color .12s,background .12s}
.alife-tab:hover,.alife-tab:focus-visible{border-color:rgba(0,238,255,.55);outline:none;background:rgba(30,50,90,.85)}
.alife-tab.active{border-color:rgba(0,238,255,.75);background:rgba(0,80,120,.35);color:#fff}
.alife-hero{position:relative;border:1px solid rgba(120,160,255,.28);border-radius:12px;
  background:rgba(4,8,18,.92);min-height:min(72vh,640px);overflow:hidden;touch-action:none}
.alife-stage{position:absolute;inset:0;display:grid;place-items:center;cursor:grab}
.alife-stage.dragging{cursor:grabbing}
.alife-stage img{max-width:none;max-height:none;user-select:none;-webkit-user-drag:none;transform-origin:0 0}
.alife-toolbar{position:absolute;top:8px;right:8px;display:flex;gap:6px;z-index:2}
.alife-tool{border:1px solid rgba(120,160,255,.4);background:rgba(8,14,30,.88);color:#cfe0fb;
  border-radius:6px;padding:4px 8px;font:600 10px var(--font-mono,monospace);cursor:pointer}
.alife-tool:hover{border-color:rgba(0,238,255,.6)}
.alife-caption{position:absolute;left:10px;bottom:8px;font:600 11px var(--font-ui,system-ui,sans-serif);
  color:#aaccff;letter-spacing:.04em;text-shadow:0 1px 8px rgba(0,0,0,.8);pointer-events:none}
.alife-hint{position:absolute;right:10px;bottom:8px;font:400 9px var(--font-mono,monospace);color:#7f93b8;
  opacity:.85;pointer-events:none}
`;

/** Mount the interactive gallery into `#alife-metrics` (replaces static grid if present). */
export function mountAlifeMetricsGallery(root: HTMLElement | null): void {
  if (!root) return;
  let style = document.getElementById('alife-gallery-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'alife-gallery-style';
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  root.className = 'alife-gallery';
  root.innerHTML =
    `<h2>ALife survey metric visuals</h2>` +
    `<p class="lead">Interactive SVG reports from <code>docs/reports/assets/</code> — click a tab or the chart to cycle; drag to pan, wheel to zoom.</p>` +
    `<div class="alife-tabs" role="tablist" aria-label="ALife metric charts"></div>` +
    `<div class="alife-hero" role="tabpanel"><div class="alife-toolbar">` +
    `<button type="button" class="alife-tool" data-zoom-in title="Zoom in">+</button>` +
    `<button type="button" class="alife-tool" data-zoom-out title="Zoom out">−</button>` +
    `<button type="button" class="alife-tool" data-fit title="Fit">Fit</button>` +
    `</div><div class="alife-stage"></div>` +
    `<div class="alife-caption"></div><span class="alife-hint">Click chart · next tab</span></div>`;

  const tabs = root.querySelector('.alife-tabs') as HTMLElement;
  const stage = root.querySelector('.alife-stage') as HTMLElement;
  const caption = root.querySelector('.alife-caption') as HTMLElement;
  const img = document.createElement('img');
  img.draggable = false;
  stage.appendChild(img);

  let idx = 0;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let drag = false;
  let lx = 0;
  let ly = 0;

  const clamp = (s: number): number => Math.min(12, Math.max(0.08, s));
  const apply = (): void => {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };
  const fit = (): void => {
    const vp = stage.getBoundingClientRect();
    const iw = img.naturalWidth || 800;
    const ih = img.naturalHeight || 600;
    if (!vp.width || !iw) return;
    scale = clamp(Math.min(vp.width / iw, vp.height / ih) * 0.96);
    tx = (vp.width - iw * scale) / 2;
    ty = (vp.height - ih * scale) / 2;
    apply();
  };
  const show = (i: number): void => {
    idx = ((i % ALIFE_METRICS.length) + ALIFE_METRICS.length) % ALIFE_METRICS.length;
    const m = ALIFE_METRICS[idx]!;
    img.src = m.src;
    img.alt = m.alt;
    caption.textContent = m.label;
    tabs.querySelectorAll('.alife-tab').forEach((el, j) => {
      el.classList.toggle('active', j === idx);
      el.setAttribute('aria-selected', j === idx ? 'true' : 'false');
    });
  };

  ALIFE_METRICS.forEach((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'alife-tab' + (i === 0 ? ' active' : '');
    b.textContent = m.label;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    b.addEventListener('click', () => {
      show(i);
      fit();
    });
    tabs.appendChild(b);
  });

  img.addEventListener('load', () => fit());
  stage.addEventListener('click', (e) => {
    if (drag) return;
    if ((e.target as HTMLElement).closest('.alife-toolbar')) return;
    show(idx + 1);
    fit();
  });
  stage.addEventListener('pointerdown', (e) => {
    drag = false;
    lx = e.clientX;
    ly = e.clientY;
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!stage.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - lx;
    const dy = e.clientY - ly;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag = true;
    tx += dx;
    ty += dy;
    lx = e.clientX;
    ly = e.clientY;
    apply();
  });
  stage.addEventListener('pointerup', () => stage.classList.remove('dragging'));
  stage.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const ns = clamp(scale * f);
      const k = ns / scale;
      tx = px - k * (px - tx);
      ty = py - k * (py - ty);
      scale = ns;
      apply();
    },
    { passive: false },
  );

  root.querySelector('[data-zoom-in]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = clamp(scale * 1.2);
    apply();
  });
  root.querySelector('[data-zoom-out]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = clamp(scale / 1.2);
    apply();
  });
  root.querySelector('[data-fit]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    fit();
  });

  show(0);
  window.addEventListener('resize', () => fit(), { passive: true });
}
