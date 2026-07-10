/**
 * PANEL EDGE TOGGLES (V98) — small side buttons that let the user hide/show the
 * left and right panel columns on desktop/tablet. The panels already collapse
 * individually via [data-panel-toggle] headers, and slide out as sheets on phones.
 * This adds COLUMN-level show/hide: click the ◀/▶ edge button to tuck the entire
 * left or right column away, reclaiming screen space for the 3D world. Click again
 * to bring it back. The buttons sit OUTSIDE the grid columns (on the #ui padding
 * gap) so they never overlap panel content.
 *
 * Self-mounting, idempotent, hot-reload-safe. Hidden in sheet mode (phones) where
 * the sheet handles already serve this purpose.
 */

const STYLE_ID = 'cqm-edge-toggles-style';

const STYLE = `
/* Edge toggle buttons — fixed to the viewport edge, vertically centered.
   They live in the #ui padding gap so they don't overlap panel content.
   Hidden on phones (sheet mode handles it) and when the column is hidden. */
.cqm-edge-btn {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 60;
  width: 18px;
  height: 44px;
  display: none;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(120, 160, 220, 0.35);
  background: rgba(8, 14, 30, 0.88);
  backdrop-filter: blur(8px);
  color: #cfe0fb;
  font: 600 12px/1 var(--font-mono, ui-monospace, monospace);
  cursor: pointer;
  pointer-events: auto;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s, left 0.2s, right 0.2s;
  user-select: none;
  padding: 0;
  line-height: 1;
  opacity: 0.7;
}
.cqm-edge-btn:hover {
  background: rgba(20, 32, 58, 0.95);
  border-color: rgba(120, 180, 255, 0.55);
  opacity: 1;
}
.cqm-edge-btn:focus-visible {
  outline: 2px solid rgba(120, 180, 255, 0.75);
  outline-offset: 1px;
}
/* Left button: sits just inside the left column's left edge (in the #ui padding gap).
   When the column is visible, offset by the column width so it's at the boundary. */
.cqm-edge-btn--left {
  left: 0;
  border-radius: 0 8px 8px 0;
  border-left: none;
}
.cqm-edge-btn--right {
  right: 0;
  border-radius: 8px 0 0 8px;
  border-right: none;
}
/* When a column is hidden, its button stays at the very edge and flips its arrow. */
#ui.col-hidden-left .cqm-edge-btn--left {
  left: 0;
}
/* Column hiding only applies on the desktop/tablet grid (min-width: 769px). Below that,
   app.css sheet mode (max-width: 768px) surfaces these columns via display:contents; an
   unscoped display:none !important beat that rule and hid the panels permanently — and the
   restore button is itself hidden below 599px, so shrinking/rotating into sheet mode left them
   unreachable until a full reload. */
@media (min-width: 769px) {
  #ui.col-hidden-left .ui-col-left {
    display: none !important;
  }
  #ui.col-hidden-right .ui-col-right {
    display: none !important;
  }
}
/* Show the buttons only on desktop/tablet grid layout (not phone sheet mode).
   Match the same breakpoints app.css uses to switch to sheet mode. */
@media (min-width: 769px) and (pointer: fine) and (orientation: landscape) {
  .cqm-edge-btn { display: flex; }
  /* Offset buttons to sit at the column boundary, not overlapping content */
  .cqm-edge-btn--left { left: calc(clamp(200px, 20vw, 280px) - 1px); }
  .cqm-edge-btn--right { right: calc(clamp(260px, 26vw, 400px) - 1px); }
}
/* Tablet 8-12" landscape (600-1400px): match app.css tablet grid columns */
@media (min-width: 600px) and (max-width: 1400px) and (min-height: 521px) and (orientation: landscape) {
  .cqm-edge-btn { display: flex; }
  .cqm-edge-btn--left { left: calc(clamp(120px, 20vw, 190px) - 1px); }
  .cqm-edge-btn--right { right: calc(clamp(120px, 22vw, 210px) - 1px); }
}
/* Tablet portrait (600-1400px, coarse): match app.css tablet portrait grid columns */
@media (min-width: 600px) and (max-width: 1400px) and (pointer: coarse) and (orientation: portrait) {
  .cqm-edge-btn { display: flex; }
  .cqm-edge-btn--left { left: calc(50% - 1px); }
  .cqm-edge-btn--right { right: calc(50% - 1px); }
}
/* Phones: sheet handles only — edge toggles overlap TEL/OBS handles if shown. */
@media (max-width: 599px) {
  .cqm-edge-btn {
    display: none !important;
  }
}
/* When a column is hidden, expand the center to fill the space.
   Values MUST match the active grid breakpoint. */
#ui.col-hidden-left {
  grid-template-columns: 0 1fr clamp(260px, 26vw, 400px) !important;
}
#ui.col-hidden-right {
  grid-template-columns: clamp(200px, 20vw, 280px) 1fr 0 !important;
}
#ui.col-hidden-left.col-hidden-right {
  grid-template-columns: 0 1fr 0 !important;
}
/* Tablet grid override when a column is hidden */
@media (min-width: 600px) and (max-width: 1400px) and (min-height: 521px) {
  #ui.col-hidden-left {
    grid-template-columns: 0 1fr clamp(120px, 22vw, 210px) !important;
  }
  #ui.col-hidden-right {
    grid-template-columns: clamp(120px, 20vw, 190px) 1fr 0 !important;
  }
  #ui.col-hidden-left.col-hidden-right {
    grid-template-columns: 0 1fr 0 !important;
  }
}
/* When a column is hidden, its edge button moves to the viewport edge */
#ui.col-hidden-left .cqm-edge-btn--left,
#ui.col-hidden-left:not(.col-hidden-right) .cqm-edge-btn--left {
  left: 0 !important;
}
#ui.col-hidden-right .cqm-edge-btn--right,
#ui.col-hidden-right:not(.col-hidden-left) .cqm-edge-btn--right {
  right: 0 !important;
}
`;

/**
 * Mount the edge toggle buttons. Idempotent + hot-reload-safe.
 * Call after the #ui grid and its children exist (end of boot).
 */
export function mountPanelEdgeToggles(doc: Document = document): void {
  doc.getElementById(STYLE_ID)?.remove();
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  doc.head.appendChild(style);

  // Remove any existing buttons (hot-reload safe).
  doc.getElementById('cqm-edge-left')?.remove();
  doc.getElementById('cqm-edge-right')?.remove();

  const ui = doc.getElementById('ui');
  if (!ui) return;

  const mkBtn = (id: string, side: 'left' | 'right', hideLabel: string): HTMLButtonElement => {
    const btn = doc.createElement('button');
    btn.id = id;
    btn.type = 'button';
    btn.className = `cqm-edge-btn cqm-edge-btn--${side}`;
    btn.textContent = hideLabel;
    btn.setAttribute('aria-label', `Toggle ${side} panels`);
    btn.title = `Hide/show ${side} panels`;
    return btn;
  };

  const leftBtn = mkBtn('cqm-edge-left', 'left', '◀');
  const rightBtn = mkBtn('cqm-edge-right', 'right', '▶');

  leftBtn.addEventListener('click', () => {
    const hidden = ui.classList.toggle('col-hidden-left');
    leftBtn.textContent = hidden ? '▶' : '◀';
    leftBtn.setAttribute('aria-expanded', hidden ? 'false' : 'true');
  });

  rightBtn.addEventListener('click', () => {
    const hidden = ui.classList.toggle('col-hidden-right');
    rightBtn.textContent = hidden ? '◀' : '▶';
    rightBtn.setAttribute('aria-expanded', hidden ? 'false' : 'true');
  });

  doc.body.appendChild(leftBtn);
  doc.body.appendChild(rightBtn);
}

if (typeof document !== 'undefined') {
  // Auto-mount after DOM is ready.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountPanelEdgeToggles());
  } else {
    mountPanelEdgeToggles();
  }
}
