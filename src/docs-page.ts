/**
 * Entry module for docs.html — initializes mermaid and renders the inline
 * architecture / ERD / sequence diagrams.
 *
 * Lives as an external entry (not an inline `<script>`) because Bun's HTML
 * bundler does not process inline script bodies (verified on Bun 1.3.11), so a
 * bare `import 'mermaid'` inline would never resolve in the browser. The
 * diagram sources themselves stay inline in docs.html.
 */
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#030612',
    primaryColor: '#08243a',
    primaryTextColor: '#cfe9ff',
    primaryBorderColor: '#0ef',
    lineColor: '#3da9c9',
    secondaryColor: '#1a0f2e',
    tertiaryColor: '#050a1c',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '12px',
  },
});

import { mountAlifeMetricsGallery } from './alife-metrics-gallery';
import './satellite-music';

// Mount the gallery FIRST — never let mermaid issues block it.
mountAlifeMetricsGallery(document.getElementById('alife-metrics'));

// Mermaid is non-blocking — if it fails, the gallery is already up.
try {
  await mermaid.run({ querySelector: 'pre.mermaid' });
} catch (e) {
  console.warn('[docs] mermaid render skipped:', e);
}

// ── Interactive diagrams: pan (drag) + zoom (wheel) + fullscreen on every rendered mermaid SVG,
// so the architecture / ERD / sequence diagrams are actually viewable and explorable (the user
// reported they could not be clicked, zoomed, or viewed). Dependency-free (owned facade) per the
// project's lean-deps philosophy — no svg-pan-zoom added.
enhanceDiagrams();

function enhanceDiagrams(): void {
  document.querySelectorAll<HTMLElement>('pre.mermaid').forEach((pre) => {
    const svg = pre.querySelector('svg');
    if (svg) makeZoomable(pre, svg);
  });
}

function makeZoomable(pre: HTMLElement, svg: SVGSVGElement): void {
  // Intrinsic diagram size (mermaid always emits a viewBox); pin it so our transform owns scaling.
  const vb = svg.viewBox.baseVal;
  const measured = svg.getBoundingClientRect();
  const w = (vb && vb.width > 0 ? vb.width : measured.width) || 800;
  const h = (vb && vb.height > 0 ? vb.height : measured.height) || 400;
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.width = `${w}px`;
  svg.style.height = `${h}px`;
  svg.style.maxWidth = 'none';

  const viewport = document.createElement('div');
  viewport.className = 'diagram-zoom';
  const stage = document.createElement('div');
  stage.className = 'diagram-stage';
  stage.appendChild(svg);

  let scale = 1;
  let tx = 0;
  let ty = 0;
  const clamp = (s: number): number => Math.min(8, Math.max(0.04, s));
  const apply = (): void => {
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };
  const fit = (): void => {
    const vp = viewport.getBoundingClientRect();
    if (!vp.width || !vp.height) {
      requestAnimationFrame(fit);
      return;
    }
    scale = clamp(Math.min(vp.width / w, vp.height / h) * 0.94);
    tx = (vp.width - w * scale) / 2;
    ty = (vp.height - h * scale) / 2;
    apply();
  };
  const fitSoon = (): void => {
    fit();
    setTimeout(fit, 60);
    setTimeout(fit, 250);
    setTimeout(fit, 600);
    setTimeout(fit, 1200);
  };
  const zoomAt = (px: number, py: number, factor: number): void => {
    const ns = clamp(scale * factor);
    const k = ns / scale;
    tx = px - k * (px - tx);
    ty = py - k * (py - ty);
    scale = ns;
    apply();
  };

  viewport.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = viewport.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    },
    { passive: false },
  );

  let drag = false;
  let lx = 0;
  let ly = 0;
  viewport.addEventListener('pointerdown', (e) => {
    drag = true;
    lx = e.clientX;
    ly = e.clientY;
    viewport.classList.add('dragging');
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!drag) return;
    tx += e.clientX - lx;
    ty += e.clientY - ly;
    lx = e.clientX;
    ly = e.clientY;
    apply();
  });
  const end = (e: PointerEvent): void => {
    drag = false;
    viewport.classList.remove('dragging');
    try {
      viewport.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);

  const ctrls = document.createElement('div');
  ctrls.className = 'diagram-ctrls';
  const mkBtn = (label: string, title: string, fn: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
    return b;
  };
  const center = (factor: number): void => {
    const r = viewport.getBoundingClientRect();
    zoomAt(r.width / 2, r.height / 2, factor);
  };
  ctrls.append(
    mkBtn('+', 'Zoom in', () => center(1.25)),
    mkBtn('−', 'Zoom out', () => center(1 / 1.25)),
    mkBtn('⟳', 'Reset / fit', fitSoon),
    mkBtn('⛶', 'Fullscreen', () => {
      if (document.fullscreenElement === viewport) {
        void document.exitFullscreen();
      } else if (viewport.requestFullscreen) {
        void viewport
          .requestFullscreen()
          .then(() => setTimeout(fit, 80))
          .catch(() => {
            /* fullscreen denied — pan/zoom still works inline */
          });
      }
    }),
  );

  const hint = document.createElement('div');
  hint.className = 'diagram-hint';
  hint.textContent = 'scroll = zoom · drag = pan · ⛶ fullscreen';

  viewport.append(stage, ctrls, hint);
  pre.replaceWith(viewport);
  fitSoon();
  document.addEventListener('fullscreenchange', () => fitSoon());
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => fitSoon());
    ro.observe(viewport);
  }
}
