/**
 * ALife survey metric gallery — hero + full thumbnail grid with pan/zoom for docs.html + specs.html.
 * Nine-axis radar is the default hero; tabs / hero-click cycle; every chart is visible below with its own zoom.
 */
import { ALIFE_SVG_EMBED } from './generated/alife-svg-embed';

export interface AlifeMetric {
  id: string;
  label: string;
  file: string;
  alt: string;
}

/** GitHub Pages project subpath (e.g. `/cosmogonic-quantum-mechalogodrom`) or `` for root/dev. */
function siteBasePrefix(): string {
  if (typeof location === 'undefined') return '';
  const p = location.pathname;
  if (p === '/' || p === '/docs' || p === '/spec' || p === '/lab') return '';
  const repoHtml = p.match(/^(\/[^/]+)\/(?:specs|docs|index)\.html$/i);
  if (repoHtml) return repoHtml[1]!;
  const repoLab = p.match(/^(\/[^/]+)\/lab(?:\/index\.html?)?\/?$/i);
  if (repoLab) return repoLab[1]!;
  const nested = p.match(/^(\/[^/]+)\//);
  if (nested && !p.endsWith('.html') && p.split('/').filter(Boolean).length >= 2) {
    return nested[1]!;
  }
  return '';
}

/** Candidate URLs for an SVG (tried in order until one loads). */
function alifeMetricCandidates(file: string): string[] {
  const base = siteBasePrefix();
  const abs = (rel: string): string =>
    rel.startsWith('/') ? rel : `${base}/${rel}`.replace(/\/+/g, '/');
  if (typeof location === 'undefined') {
    return [abs('assets/alife/' + file), abs('docs/reports/assets/' + file)];
  }
  const p = location.pathname;
  const out: string[] = [abs(`docs/reports/assets/${file}`), abs(`assets/alife/${file}`)];
  if (p === '/docs' || p === '/spec') {
    out.unshift(`/docs/reports/assets/${file}`, `/assets/alife/${file}`);
  }
  if (p.includes('/lab')) {
    out.push(
      `../docs/reports/assets/${file}`,
      `../assets/alife/${file}`,
      '../../docs/reports/assets/' + file,
    );
  }
  try {
    out.push(new URL(`docs/reports/assets/${file}`, location.href).pathname);
    out.push(new URL(`assets/alife/${file}`, location.href).pathname);
  } catch {
    /* ignore */
  }
  return [...new Set(out.filter(Boolean))];
}

/** Resolve SVG URL for dev server, GitHub Pages project subpath, or lab subfolder. */
export function alifeMetricSrc(file: string): string {
  return alifeMetricCandidates(file)[0] ?? `docs/reports/assets/${file}`;
}

function imgFromUrl(img: HTMLImageElement, url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const onLoad = (): void => {
      cleanup();
      resolve(true);
    };
    const onErr = (): void => {
      cleanup();
      resolve(false);
    };
    const cleanup = (): void => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onErr);
    };
    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onErr, { once: true });
    img.src = url;
  });
}

/** Load an SVG — embedded bundle first, then fetch fallbacks for dev without rebuild. */
async function loadMetricImg(
  img: HTMLImageElement,
  file: string,
  onAllFailed?: () => void,
): Promise<void> {
  const embedded = ALIFE_SVG_EMBED[file];
  if (embedded) {
    const blob = new Blob([embedded], { type: 'image/svg+xml;charset=utf-8' });
    img.src = URL.createObjectURL(blob);
    img.classList.remove('error');
    return;
  }
  const cands = alifeMetricCandidates(file);
  for (const url of cands) {
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (res.ok) {
        const blob = await res.blob();
        img.src = URL.createObjectURL(blob);
        img.classList.remove('error');
        return;
      }
    } catch {
      /* try img tag next */
    }
    if (await imgFromUrl(img, url)) {
      img.classList.remove('error');
      return;
    }
  }
  onAllFailed?.();
}

export const ALIFE_METRICS: readonly AlifeMetric[] = [
  {
    id: 'radar',
    label: 'Nine-axis profile',
    file: 'alife-radar-profile.svg',
    alt: 'Nine-axis capability radar profile',
  },
  {
    id: 'pca',
    label: 'PCA',
    file: 'alife-pca.svg',
    alt: 'PCA projection of ALife systems',
  },
  {
    id: 'pareto',
    label: 'Pareto',
    file: 'alife-pareto.svg',
    alt: 'Pareto frontier',
  },
  {
    id: 'breadth',
    label: 'Breadth ranked',
    file: 'alife-breadth-ranked.svg',
    alt: 'Breadth ranked',
  },
  {
    id: 'maturity',
    label: 'Breadth vs maturity',
    file: 'alife-breadth-vs-maturity.svg',
    alt: 'Breadth vs maturity',
  },
  {
    id: 'heatmap',
    label: 'Axis heatmap',
    file: 'alife-axis-heatmap.svg',
    alt: 'Axis heatmap',
  },
  {
    id: 'correlation',
    label: 'Correlation',
    file: 'alife-axis-correlation.svg',
    alt: 'Axis correlation matrix',
  },
  {
    id: 'dendrogram',
    label: 'Dendrogram',
    file: 'alife-dendrogram.svg',
    alt: 'Hierarchical dendrogram',
  },
  {
    id: 'distance',
    label: 'Distance matrix',
    file: 'alife-distance-matrix.svg',
    alt: 'Distance matrix',
  },
  {
    id: 'neighbors',
    label: 'Nearest neighbors',
    file: 'alife-nearest-neighbors.svg',
    alt: 'Nearest neighbors',
  },
  {
    id: 'entropy',
    label: 'Entropy',
    file: 'alife-entropy.svg',
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
  background:rgba(4,8,18,.92);width:100%;height:min(70vh,1200px);min-height:min(52vh,420px);overflow:hidden;touch-action:none;margin-bottom:14px}
.alife-stage{position:absolute;inset:0;display:grid;place-items:center;cursor:grab}
.alife-stage.dragging{cursor:grabbing}
.alife-stage img{max-width:none;max-height:none;user-select:none;-webkit-user-drag:none;transform-origin:0 0;object-fit:contain;width:100%;height:100%}
.alife-stage img.error{display:none}
.alife-loaderr{position:absolute;inset:0;display:grid;place-items:center;color:#7f93b8;font:600 14px var(--font-mono,monospace);text-align:center;padding:2rem;pointer-events:none}
.alife-toolbar{position:absolute;top:8px;right:8px;display:flex;gap:6px;z-index:2}
.alife-tool{border:1px solid rgba(120,160,255,.4);background:rgba(8,14,30,.88);color:#cfe0fb;
  border-radius:6px;padding:4px 8px;font:600 10px var(--font-mono,monospace);cursor:pointer}
.alife-tool:hover{border-color:rgba(0,238,255,.6)}
.alife-caption{position:absolute;left:10px;bottom:8px;font:600 12px var(--font-ui,system-ui,sans-serif);
  color:#aaccff;letter-spacing:.04em;text-shadow:0 1px 8px rgba(0,0,0,.8);pointer-events:none}
.alife-hint{position:absolute;right:10px;bottom:8px;font:400 9px var(--font-mono,monospace);color:#7f93b8;
  opacity:.85;pointer-events:none}
.alife-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:10px;margin-top:4px}
.alife-card{position:relative;border:1px solid rgba(120,160,255,.22);border-radius:10px;
  background:rgba(4,8,18,.88);overflow:hidden;display:flex;flex-direction:column}
.alife-card.active{border-color:rgba(0,238,255,.65);box-shadow:0 0 0 1px rgba(0,238,255,.25)}
.alife-card-label{font:600 9px var(--font-mono,monospace);letter-spacing:.08em;text-transform:uppercase;
  color:#9fb6dd;padding:6px 8px 4px;border-bottom:1px solid rgba(120,160,255,.12)}
.alife-thumb-wrap{position:relative;height:min(28vh,220px);min-height:140px;touch-action:none}
.alife-thumb-stage{position:absolute;inset:0;cursor:grab}
.alife-thumb-stage.dragging{cursor:grabbing}
.alife-thumb-stage img{max-width:none;max-height:none;user-select:none;-webkit-user-drag:none;transform-origin:0 0;object-fit:contain}
.alife-thumb-stage img.error{display:none}
.alife-thumb-loaderr{position:absolute;inset:0;display:grid;place-items:center;color:#7f93b8;font:600 9px var(--font-mono,monospace);text-align:center;padding:1rem;pointer-events:none}
.alife-thumb-toolbar{position:absolute;top:4px;right:4px;display:flex;gap:3px;z-index:2}
.alife-thumb-tool{border:1px solid rgba(120,160,255,.35);background:rgba(8,14,30,.9);color:#cfe0fb;
  border-radius:4px;padding:2px 5px;font:600 8px var(--font-mono,monospace);cursor:pointer;line-height:1}
@media (max-width:768px){
  .alife-hero{height:min(58vh,520px);min-height:min(50vh,280px);margin-bottom:8px}
  .alife-tabs{gap:3px;margin-bottom:6px;max-height:72px;overflow-y:auto}
  .alife-tab{padding:3px 6px;font-size:7px;letter-spacing:.04em}
  .alife-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
  .alife-thumb-wrap{height:min(14vh,96px);min-height:72px}
  .alife-card-label{padding:3px 5px 2px;font-size:6px;line-height:1.2}
  .alife-thumb-toolbar{top:2px;right:2px;gap:2px}
  .alife-thumb-tool{padding:1px 3px;font-size:6px}
  .alife-hint{display:none}
}
`;

interface ZoomView {
  img: HTMLImageElement;
  stage: HTMLElement;
  scale: number;
  tx: number;
  ty: number;
  drag: boolean;
  lx: number;
  ly: number;
  fit: () => void;
  apply: () => void;
}

function clampScale(s: number): number {
  return Math.min(12, Math.max(0.08, s));
}

function scheduleZoomFit(view: ZoomView): void {
  const run = (): void => {
    const vp = view.stage.getBoundingClientRect();
    if (vp.width > 4 && vp.height > 4) view.fit();
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
}

/** Wire pan/zoom on a stage; returns controls for toolbar buttons. */
function mountZoomView(stage: HTMLElement, onTap?: () => void): ZoomView {
  const img = document.createElement('img');
  img.draggable = false;
  // Error overlay — only shown when loadMetricImg exhausts ALL candidate paths.
  const errEl = document.createElement('div');
  errEl.className = stage.classList.contains('alife-thumb-stage')
    ? 'alife-thumb-loaderr'
    : 'alife-loaderr';
  errEl.textContent = 'SVG failed to load';
  errEl.style.display = 'none';
  img.addEventListener('load', () => {
    img.classList.remove('error');
    errEl.style.display = 'none';
  });
  stage.append(img, errEl);

  const view: ZoomView = {
    img,
    stage,
    scale: 1,
    tx: 0,
    ty: 0,
    drag: false,
    lx: 0,
    ly: 0,
    apply: () => {
      img.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;
    },
    fit: () => {
      const vp = stage.getBoundingClientRect();
      const iw = img.naturalWidth || img.width || 800;
      const ih = img.naturalHeight || img.height || 600;
      if (!vp.width || !iw) return;
      view.scale = clampScale(Math.min(vp.width / iw, vp.height / ih) * 0.96);
      view.tx = (vp.width - iw * view.scale) / 2;
      view.ty = (vp.height - ih * view.scale) / 2;
      view.apply();
    },
  };

  img.addEventListener('load', () => {
    void img.decode?.().then(() => scheduleZoomFit(view)).catch(() => scheduleZoomFit(view));
  });
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => scheduleZoomFit(view));
    ro.observe(stage);
  }
  stage.addEventListener('click', (e) => {
    if (view.drag) return;
    if ((e.target as HTMLElement).closest('.alife-toolbar, .alife-thumb-toolbar')) return;
    onTap?.();
  });
  stage.addEventListener('pointerdown', (e) => {
    view.drag = false;
    view.lx = e.clientX;
    view.ly = e.clientY;
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!stage.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - view.lx;
    const dy = e.clientY - view.ly;
    if (Math.abs(dx) + Math.abs(dy) > 4) view.drag = true;
    view.tx += dx;
    view.ty += dy;
    view.lx = e.clientX;
    view.ly = e.clientY;
    view.apply();
  });
  stage.addEventListener('pointerup', () => stage.classList.remove('dragging'));
  stage.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const r = stage.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const ns = clampScale(view.scale * f);
      const k = ns / view.scale;
      view.tx = px - k * (px - view.tx);
      view.ty = py - k * (py - view.ty);
      view.scale = ns;
      view.apply();
    },
    { passive: false },
  );

  return view;
}

function wireToolbar(root: ParentNode, sel: string, view: ZoomView, stopProp = true): void {
  root.querySelector(`${sel}[data-zoom-in]`)?.addEventListener('click', (e) => {
    if (stopProp) e.stopPropagation();
    view.scale = clampScale(view.scale * 1.2);
    view.apply();
  });
  root.querySelector(`${sel}[data-zoom-out]`)?.addEventListener('click', (e) => {
    if (stopProp) e.stopPropagation();
    view.scale = clampScale(view.scale / 1.2);
    view.apply();
  });
  root.querySelector(`${sel}[data-fit]`)?.addEventListener('click', (e) => {
    if (stopProp) e.stopPropagation();
    view.fit();
  });
}

/** Mount the interactive gallery into `#alife-metrics`. Idempotent — safe if boot script runs twice. */
export function mountAlifeMetricsGallery(root: HTMLElement | null): void {
  if (!root || root.dataset.alifeMounted === '1') return;
  root.dataset.alifeMounted = '1';
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
    `<p class="lead">Eleven SVG reports from <code>docs/reports/assets/</code> — the hero fills the space; click a tab, the hero, or any thumbnail below to focus. Drag to pan, wheel or +/- to zoom.</p>` +
    `<div class="alife-hero" role="tabpanel"><div class="alife-toolbar">` +
    `<button type="button" class="alife-tool" data-zoom-in title="Zoom in">+</button>` +
    `<button type="button" class="alife-tool" data-zoom-out title="Zoom out">−</button>` +
    `<button type="button" class="alife-tool" data-fit title="Fit">Fit</button>` +
    `</div><div class="alife-stage"></div>` +
    `<div class="alife-caption"></div><span class="alife-hint">Click hero · next chart</span></div>` +
    `<div class="alife-tabs" role="tablist" aria-label="ALife metric charts"></div>` +
    `<div class="alife-grid" aria-label="All metric charts"></div>`;

  const tabs = root.querySelector('.alife-tabs') as HTMLElement;
  const grid = root.querySelector('.alife-grid') as HTMLElement;
  const heroStage = root.querySelector('.alife-stage') as HTMLElement;
  const caption = root.querySelector('.alife-caption') as HTMLElement;
  const hero = root.querySelector('.alife-hero') as HTMLElement;

  let idx = 0;
  const thumbViews: ZoomView[] = [];
  const cardEls: HTMLElement[] = [];

  const heroView = mountZoomView(heroStage, () => {
    show(idx + 1);
  });
  wireToolbar(hero, '.alife-tool', heroView);

  const show = (i: number): void => {
    idx = ((i % ALIFE_METRICS.length) + ALIFE_METRICS.length) % ALIFE_METRICS.length;
    const m = ALIFE_METRICS[idx]!;
    void loadMetricImg(heroView.img, m.file, () => {
      heroView.img.classList.add('error');
      const err = heroStage.querySelector('.alife-loaderr') as HTMLElement | null;
      if (err) err.style.display = 'grid';
    }).then(() => heroView.fit());
    heroView.img.alt = m.alt;
    caption.textContent = m.label;
    tabs.querySelectorAll('.alife-tab').forEach((el, j) => {
      el.classList.toggle('active', j === idx);
      el.setAttribute('aria-selected', j === idx ? 'true' : 'false');
    });
    cardEls.forEach((el, j) => el.classList.toggle('active', j === idx));
  };

  ALIFE_METRICS.forEach((m, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'alife-tab' + (i === 0 ? ' active' : '');
    tab.textContent = m.label;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    tab.addEventListener('click', () => show(i));
    tabs.appendChild(tab);

    const card = document.createElement('article');
    card.className = 'alife-card' + (i === 0 ? ' active' : '');
    card.innerHTML =
      `<div class="alife-card-label">${m.label}</div>` +
      `<div class="alife-thumb-wrap">` +
      `<div class="alife-thumb-toolbar">` +
      `<button type="button" class="alife-thumb-tool" data-zoom-in title="Zoom in">+</button>` +
      `<button type="button" class="alife-thumb-tool" data-zoom-out title="Zoom out">−</button>` +
      `<button type="button" class="alife-thumb-tool" data-fit title="Fit">Fit</button>` +
      `</div><div class="alife-thumb-stage"></div></div>`;
    const thumbStage = card.querySelector('.alife-thumb-stage') as HTMLElement;
    const tv = mountZoomView(thumbStage, () => show(i));
    void loadMetricImg(tv.img, m.file, () => {
      tv.img.classList.add('error');
      const err = thumbStage.querySelector('.alife-thumb-loaderr') as HTMLElement | null;
      if (err) err.style.display = 'grid';
    }).then(() => tv.fit());
    tv.img.alt = m.alt;
    wireToolbar(card, '.alife-thumb-tool', tv);
    thumbViews.push(tv);
    cardEls.push(card);
    grid.appendChild(card);
  });

  show(0);
  window.addEventListener(
    'resize',
    () => {
      heroView.fit();
      for (const tv of thumbViews) tv.fit();
    },
    { passive: true },
  );
}
