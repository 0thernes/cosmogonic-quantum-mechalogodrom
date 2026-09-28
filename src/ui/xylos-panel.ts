/** Xylos observation surface: borrowed telemetry, bounded drawing, explicit experiment controls. */
import type { XylosSessionStatus } from '../core/xylos-session';
import type { XylosView } from '../sim/xylos-mind';
import { mountToggle } from './panel-dock';
import { dockToggle, injectCSS, injectPanelBaseCSS, panelHeader } from './panel-shell';

/** Actions are owned by World and its Xylos session; the inspector never mutates the brain. */
export interface XylosPanelActions {
  focus: () => void;
  setMode: (mode: 'live' | 'seeded') => void;
  startRecording: () => void;
  replay: () => void;
}

interface Target {
  id: string;
  title: string;
  mechanism: string;
  experiment: string;
}

// Titles paraphrase Butlin et al., Table 1. Mechanism mappings and proposed experiments are ours.
const TARGETS: readonly Target[] = [
  {
    id: 'RPT-1',
    title: 'Recurrent sensing',
    mechanism: 'Sparse recurrent foci retain and transform recent sensory activity.',
    experiment:
      'Replay matched inputs with recurrence removed; measure loss of temporal discrimination.',
  },
  {
    id: 'RPT-2',
    title: 'Integrated percepts',
    mechanism:
      'Local chemistry and gradients meet in one neural manifold; object-level integration remains untested.',
    experiment:
      'Present spatially different scenes with matched average chemistry; test relational discrimination.',
  },
  {
    id: 'GWT-1',
    title: 'Parallel specialists',
    mechanism:
      'Six groups share each cognitive step, with differentiated sensory and internal drives.',
    experiment:
      'Lesion each group separately and test for selective, reproducible functional deficits.',
  },
  {
    id: 'GWT-2',
    title: 'Selective bottleneck',
    mechanism: 'Two workspace slots select from six competing module signals.',
    experiment:
      'Increase distractor strength and verify limited occupancy plus task-relevant selection.',
  },
  {
    id: 'GWT-3',
    title: 'Shared broadcast',
    mechanism: 'Selected workspace activity returns to all specialist groups.',
    experiment:
      'Hold sensory input fixed; change one broadcast and measure downstream effects in every group.',
  },
  {
    id: 'GWT-4',
    title: 'Sequential workspace queries',
    mechanism:
      'Internal state biases attention; extended multi-stage task competence is not established.',
    experiment:
      'Add and test a held subgoal requiring successive module queries; compare with broadcast disabled.',
  },
  {
    id: 'HOT-1',
    title: 'Constructive perception',
    mechanism:
      'Injected noise, recurrence and feedback alter sensory activity beyond immediate input.',
    experiment:
      'Compare predictable, omitted and corrupted signals to isolate internally driven reconstruction.',
  },
  {
    id: 'HOT-2',
    title: 'Reliability monitoring',
    mechanism:
      'Forecast residual variance drives a confidence proxy; calibration against sensory truth is still required.',
    experiment:
      'Vary corruption independently of signal strength; test whether confidence predicts correctness.',
  },
  {
    id: 'HOT-3',
    title: 'Monitored belief and action',
    mechanism:
      'Confidence participates in control; a general, validated belief-update system is not established.',
    experiment:
      'Train conflicting cue contingencies and test whether measured reliability changes learned choices.',
  },
  {
    id: 'HOT-4',
    title: 'Structured feature geometry',
    mechanism:
      'Soft-thresholded channel codes and disk coupling provide candidate geometry; a perceptual quality space is unproven.',
    experiment:
      'Learn stimulus codes and test sparsity, continuity and discriminability under small perturbations.',
  },
  {
    id: 'AST-1',
    title: 'Attention self-model',
    mechanism:
      'Learned attention-transition probabilities bias the next selection; usefulness requires controlled intervention.',
    experiment:
      'Mislead only the attention model and compare selection accuracy against an intact matched run.',
  },
  {
    id: 'PP-1',
    title: 'Prediction-led sensing',
    mechanism:
      'Sensory forecasts and their errors feed subsequent activity; hierarchical predictive coding remains a target.',
    experiment:
      'Compare learned forecasts against persistence baselines, then lesion error feedback and measure degradation.',
  },
  {
    id: 'AE-1',
    title: 'Adaptive goal pursuit',
    mechanism:
      'Energy, hazard and learned consequences influence autonomous movement and substrate disturbance.',
    experiment:
      'Reverse resource and hazard contingencies; test adaptation against frozen-learning controls.',
  },
  {
    id: 'AE-2',
    title: 'Learned sensorimotor consequences',
    mechanism:
      'A compact action-consequence model links movement to later sensation in the shared substrate.',
    experiment:
      'Reverse movement or substrate response; test relearning and failure when the consequence model is frozen.',
  },
];

const PANEL_ID = 'cqm-xylos-panel';
const TOGGLE_ID = 'cqm-xylos-toggle';
const STYLE_ID = 'cqm-xylos-style';
const COLORS = ['#5af0da', '#d78fff', '#99c8ff', '#ffe38a', '#ff9ba9', '#90efb5'];
const GROUPS = ['Nutrient', 'Hazard', 'Field signal', 'X gradient', 'Z gradient', 'Homeostasis'];
const STYLE = `
#${TOGGLE_ID}{border-color:#56d8cc88;color:#affff0;background:linear-gradient(135deg,#092a2c,#21102d)}
#${PANEL_ID}{position:fixed;right:16px;bottom:calc(var(--cqm-bottom-h,108px) + 130px);z-index:71;
 display:none;flex-direction:column;width:min(92vw,640px);max-height:min(78vh,820px);overflow:hidden;
 border:1px solid #67e3d052;border-radius:15px;background:linear-gradient(145deg,rgba(5,23,29,.97),rgba(19,10,31,.97));
 box-shadow:0 16px 54px #000a,inset 0 0 50px #53d1cb08;backdrop-filter:blur(15px);color:#e1f5f2;
 font:12px/1.5 var(--font-sans,system-ui,sans-serif)}
#${PANEL_ID}.open{display:flex}
#${PANEL_ID} .cqm-panel-top{margin:0;padding:12px 16px;border-bottom:1px solid #7edbd323;flex-shrink:0}
#${PANEL_ID} .cqm-panel-top b{color:#a0ffe9;letter-spacing:.15em;font-size:14px}
#${PANEL_ID} .cqm-panel-x{min-width:40px;min-height:36px}
#${PANEL_ID} .xy-body{padding:14px 16px;overflow:auto;min-height:0;overscroll-behavior:contain}
#${PANEL_ID} p{margin:0 0 10px}
#${PANEL_ID} .xy-kicker{color:#bdabdc;font:10px/1.5 var(--font-mono,monospace);letter-spacing:.15em;text-transform:uppercase}
#${PANEL_ID} .xy-intro{color:#c1d7dc;max-width:65ch}
#${PANEL_ID} .xy-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}
#${PANEL_ID} button.xy-button,#${PANEL_ID} select{min-height:42px;border:1px solid #6accc84d;border-radius:8px;
 padding:8px 12px;background:#122a30;color:#e1fff8;font:600 12px var(--font-sans,system-ui,sans-serif);cursor:pointer}
#${PANEL_ID} button.xy-primary{background:linear-gradient(120deg,#176052,#352346);border-color:#80e7ca;color:#edfff9;flex:1}
#${PANEL_ID} button:disabled{opacity:.45;cursor:default}
#${PANEL_ID} button:not(:disabled):hover,#${PANEL_ID} select:hover{border-color:#acfff0}
#${PANEL_ID} :is(button,select,summary,a):focus-visible{outline:2px solid #bc9dff;outline-offset:3px}
#${PANEL_ID} .xy-mode-label{display:flex;align-items:center;gap:7px;color:#c1d7dc}
#${PANEL_ID} .xy-note{color:#a8bacb;font-size:11px}
#${PANEL_ID} .xy-source{color:#a1f4d7;font:11px/1.6 var(--font-mono,monospace)}
#${PANEL_ID} .xy-status{border-left:2px solid #9371c6;padding:6px 10px;background:#b898ff08;color:#d2c5ed;overflow-wrap:anywhere}
#${PANEL_ID} .xy-error{color:#ffcc99;overflow-wrap:anywhere}
#${PANEL_ID} .xy-error:empty{display:none}
#${PANEL_ID} .xy-live-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(170px,1fr);gap:12px;margin:14px 0}
#${PANEL_ID} .xy-disk{margin:0;background:radial-gradient(ellipse,#153c3b55,#080f1a);border:1px solid #8dd1c32b;border-radius:12px;overflow:hidden}
#${PANEL_ID} canvas{display:block;width:100%;height:auto;aspect-ratio:440/280}
#${PANEL_ID} figcaption{padding:0 10px 10px;color:#9cbaba;font-size:10px}
#${PANEL_ID} .xy-legend{display:flex;flex-wrap:wrap;gap:3px 10px;padding:0 10px 8px;font-size:10px}
#${PANEL_ID} .xy-meters{display:grid;gap:7px;align-content:center}
#${PANEL_ID} .xy-meter{display:grid;grid-template-columns:1fr auto;column-gap:8px;align-items:center}
#${PANEL_ID} .xy-meter label{color:#c4d6dd;font-size:11px}
#${PANEL_ID} .xy-meter output{font:11px/1.5 var(--font-mono,monospace);color:#d9fff4;font-variant-numeric:tabular-nums}
#${PANEL_ID} progress{grid-column:1/-1;width:100%;height:5px;accent-color:#6ce5cc;border:0;border-radius:4px;overflow:hidden;background:#324351}
#${PANEL_ID} progress::-webkit-progress-bar{background:#324351}
#${PANEL_ID} progress::-webkit-progress-value{background:linear-gradient(90deg,#57c9bc,#b195e9)}
#${PANEL_ID} .xy-facts{display:grid;grid-template-columns:auto 1fr;gap:3px 14px;margin:0 0 14px;padding:10px 12px;border:1px solid #a3c8d323;border-radius:10px}
#${PANEL_ID} dt{color:#9db5bf}#${PANEL_ID} dd{margin:0;text-align:right;font:11px/1.6 var(--font-mono,monospace);overflow-wrap:anywhere}
#${PANEL_ID} .xy-targets{border-top:1px solid #8fadc333;padding-top:10px}
#${PANEL_ID} summary{cursor:pointer;min-height:36px;padding:7px 0;color:#d6c4f4}
#${PANEL_ID} .xy-target{padding:1px 10px;border-bottom:1px solid #8fadc31c}
#${PANEL_ID} .xy-target p{font-size:11px;color:#b5c9d0}
#${PANEL_ID} .xy-target b{color:#dbd6ee}
#${PANEL_ID} a{color:#a4e8e1;text-underline-offset:3px}
@media(max-width:560px){#${PANEL_ID}{right:8px;width:calc(100vw - 16px);max-height:74vh}
 #${PANEL_ID} .xy-body{padding:12px}#${PANEL_ID} .xy-live-grid{grid-template-columns:1fr}
 #${PANEL_ID} .xy-meters{grid-template-columns:1fr 1fr;gap:10px 16px}#${PANEL_ID} canvas{max-height:220px}
 #${PANEL_ID} .xy-mode-label{flex:1}#${PANEL_ID} select{flex:1}}
`;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createMeter(
  label: string,
  index: number,
): {
  root: HTMLElement;
  bar: HTMLProgressElement;
  value: HTMLOutputElement;
} {
  const root = element('div', 'xy-meter');
  const bar = element('progress', '');
  bar.id = `xy-meter-${index}`;
  bar.max = 1;
  const caption = element('label', '', label);
  caption.htmlFor = bar.id;
  const value = element('output', '', '—');
  root.append(caption, value, bar);
  return { root, bar, value };
}

/** A nonmodal inspector integrated with the shared center-HUD/dock; safe to dispose repeatedly. */
export class XylosPanel {
  private readonly panel: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly style: HTMLElement | null;
  private readonly abort = new AbortController();
  private readonly mode: HTMLSelectElement;
  private readonly source: HTMLElement;
  private readonly status: HTMLElement;
  private readonly error: HTMLElement;
  private readonly record: HTMLButtonElement;
  private readonly replay: HTMLButtonElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D | null;
  private readonly meters: ReturnType<typeof createMeter>[] = [];
  private readonly facts: HTMLElement[] = [];
  private lastView: XylosView | null = null;
  private lastSession: XylosSessionStatus | null = null;
  private lastPaintTick = -4;
  private paintedMode = '';
  private paintedRecording = false;
  private paintedReplayComplete = false;
  private paintedError: string | null = null;
  private restoreFocus: HTMLElement | null = null;
  private disposed = false;

  /** Mount closed; callers supply borrowed view/status in update, with no panel-owned timer. */
  constructor(actions: XylosPanelActions) {
    injectPanelBaseCSS();
    injectCSS(STYLE, STYLE_ID);
    this.style = document.getElementById(STYLE_ID);
    this.panel = element('section', '');
    this.panel.id = PANEL_ID;
    this.panel.setAttribute('aria-label', 'Xylos autonomous creature inspector');
    const header = panelHeader({
      title: 'XYLOS / LIVING MANIFOLD',
      closeLabel: 'Close Xylos inspector',
      onClose: () => this.close(),
    });
    header.querySelector('button')?.setAttribute('data-close', '');
    this.panel.appendChild(header);
    const body = element('div', 'xy-body');
    this.panel.appendChild(body);
    body.append(
      element('p', 'xy-kicker', 'One organism · autonomous numerical life'),
      element(
        'p',
        'xy-intro',
        'A shifting neural membrane senses the substrate, predicts what comes next, and changes the world as it moves.',
      ),
    );
    const controls = element('div', 'xy-actions');
    const focus = element('button', 'xy-button xy-primary', '◎ Observe Xylos');
    focus.type = 'button';
    focus.addEventListener('click', actions.focus, { signal: this.abort.signal });
    const modeLabel = element('label', 'xy-mode-label', 'Life mode');
    this.mode = element('select', '');
    this.mode.setAttribute('aria-label', 'Xylos randomness mode');
    for (const [value, label] of [
      ['live', 'Live'],
      ['seeded', 'Seeded'],
      ['replay', 'Replay'],
    ]) {
      const option = element('option', '', label);
      option.value = value ?? '';
      option.disabled = value === 'replay';
      this.mode.appendChild(option);
    }
    this.mode.addEventListener(
      'change',
      () => {
        if (this.mode.value === 'live' || this.mode.value === 'seeded')
          actions.setMode(this.mode.value);
      },
      { signal: this.abort.signal },
    );
    modeLabel.appendChild(this.mode);
    controls.append(focus, modeLabel);
    this.source = element('p', 'xy-source', 'Waiting for the first cognitive step…');
    this.source.setAttribute('aria-live', 'polite');
    body.append(controls, this.source);

    const live = element('div', 'xy-live-grid');
    const figure = element('figure', 'xy-disk');
    this.canvas = element('canvas', '');
    this.canvas.width = 440;
    this.canvas.height = 280;
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute(
      'aria-label',
      'Live projection of Xylos neural coordinates, connections and activity',
    );
    this.context = this.canvas.getContext('2d');
    figure.append(
      this.canvas,
      element(
        'figcaption',
        '',
        'Poincaré disk · actual foci and weighted links. Color marks six groups; brightness follows activity.',
      ),
    );
    const legend = element('div', 'xy-legend');
    for (let group = 0; group < GROUPS.length; group++) {
      const label = element('span', '', GROUPS[group]);
      label.style.color = COLORS[group] ?? '#ffffff';
      legend.appendChild(label);
    }
    figure.appendChild(legend);
    const meterGrid = element('div', 'xy-meters');
    for (const label of [
      'Energy',
      'Coherence',
      'Prediction error',
      'Confidence proxy',
      'Substrate pulse',
      'Valence proxy',
    ]) {
      const meter = createMeter(label, this.meters.length);
      this.meters.push(meter);
      meterGrid.appendChild(meter.root);
    }
    live.append(figure, meterGrid);
    body.appendChild(live);
    const facts = element('dl', 'xy-facts');
    for (const label of [
      'Cognitive step',
      'Attention',
      'Workspace lead',
      'Rewired links',
      'Substrate position',
      'Dropped steps',
    ]) {
      const value = element('dd', '', '—');
      this.facts.push(value);
      facts.append(element('dt', '', label), value);
    }
    body.appendChild(facts);

    const experiments = element('div', 'xy-actions');
    this.record = element('button', 'xy-button', 'Record new life');
    this.record.type = 'button';
    this.record.addEventListener('click', actions.startRecording, { signal: this.abort.signal });
    this.replay = element('button', 'xy-button', 'Replay recording');
    this.replay.type = 'button';
    this.replay.disabled = true;
    this.replay.addEventListener(
      'click',
      () => {
        // Synthetic events bypass disabled controls; a reset may also precede the next repaint.
        if (!this.replay.disabled && (this.lastSession?.recordedSteps ?? 0) > 0) actions.replay();
      },
      { signal: this.abort.signal },
    );
    experiments.append(this.record, this.replay);
    this.status = element('p', 'xy-status', 'No local recording yet.');
    this.error = element('p', 'xy-error');
    this.error.setAttribute('role', 'status');
    body.append(
      experiments,
      element(
        'p',
        'xy-note',
        'Record starts a fresh mind and replaces the local capture. Replay repeats its captured inputs; the surrounding world keeps its own history.',
      ),
      this.status,
      this.error,
    );

    const targets = element('details', 'xy-targets');
    targets.appendChild(element('summary', '', 'Research targets · all 14 Butlin indicators'));
    targets.appendChild(
      element(
        'p',
        'xy-note',
        'Candidate mechanisms and acceptance experiments below are our implementation map. They are not certified indicators or evidence of subjective experience.',
      ),
    );
    const sourceLink = element('a', '', 'Butlin et al. · original Table 1');
    sourceLink.href = 'https://arxiv.org/html/2308.08708v3#S0.T1';
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    targets.appendChild(sourceLink);
    for (const target of TARGETS) {
      const row = element('details', 'xy-target');
      row.appendChild(element('summary', '', `${target.id} · ${target.title}`));
      const mechanism = element('p', '');
      mechanism.append(element('b', '', 'Candidate: '), document.createTextNode(target.mechanism));
      const experiment = element('p', '');
      experiment.append(
        element('b', '', 'Required experiment: '),
        document.createTextNode(target.experiment),
      );
      row.append(mechanism, experiment);
      targets.appendChild(row);
    }
    body.append(
      targets,
      element(
        'p',
        'xy-note',
        'Coherence, confidence and valence are operational measurements. Xylos runs without prompts, tokens or network inference.',
      ),
    );
    document.body.appendChild(this.panel);
    this.toggle = dockToggle({
      id: TOGGLE_ID,
      label: '◈ XYLOS',
      title: 'Observe Xylos — autonomous manifold creature',
      ariaLabel: 'Open Xylos inspector',
      onClick: () => {
        if (this.panel.classList.contains('open')) this.close();
        else {
          this.restoreFocus =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          this.panel.classList.add('open');
          this.toggle.setAttribute('aria-expanded', 'true');
          this.lastPaintTick = -4;
          if (this.lastView && this.lastSession) this.paint(this.lastView, this.lastSession);
          focus.focus({ preventScroll: true });
        }
      },
    });
    this.toggle.setAttribute('aria-controls', PANEL_ID);
    this.toggle.setAttribute('aria-expanded', 'false');
    mountToggle(this.toggle);
    this.panel.addEventListener(
      'keydown',
      (event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          this.close();
        }
      },
      { signal: this.abort.signal },
    );
  }

  /** Borrow state in O(1); repaint at most every four cognition steps, or on a mode/error change. */
  update(view: XylosView, session: XylosSessionStatus): void {
    if (this.disposed) return;
    this.lastView = view;
    this.lastSession = session;
    if (!this.panel.classList.contains('open')) return;
    if (
      view.tick - this.lastPaintTick >= 4 ||
      view.tick < this.lastPaintTick ||
      session.mode !== this.paintedMode ||
      session.recording !== this.paintedRecording ||
      (session.mode === 'replay' && session.replayStep === session.recordedSteps) !==
        this.paintedReplayComplete ||
      session.error !== this.paintedError
    )
      this.paint(view, session);
  }

  /** Release the mounted controls and their event handlers; no timers or GPU objects are owned. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    this.panel.remove();
    this.toggle.remove();
    this.style?.remove();
    this.lastView = null;
    this.lastSession = null;
    this.restoreFocus = null;
  }

  private close(): void {
    this.panel.classList.remove('open');
    this.toggle.setAttribute('aria-expanded', 'false');
    if (this.restoreFocus?.isConnected) this.restoreFocus.focus({ preventScroll: true });
  }

  // O(48 + 192), at 5 Hz while open. Text formatting is confined to this UI cadence.
  private paint(view: XylosView, session: XylosSessionStatus): void {
    this.lastPaintTick = view.tick;
    this.paintedMode = session.mode;
    this.paintedRecording = session.recording;
    this.paintedReplayComplete =
      session.mode === 'replay' && session.replayStep === session.recordedSteps;
    this.paintedError = session.error;
    this.mode.value = session.mode;
    const source = `Input source: ${session.source}`;
    if (this.source.textContent !== source) this.source.textContent = source;
    this.setMeter(0, view.energy);
    this.setMeter(1, view.coherence);
    this.setMeter(2, view.predictionError);
    this.setMeter(3, view.confidence);
    this.setMeter(4, view.pulse);
    this.setMeter(5, view.valence, true);
    this.setFact(0, String(view.tick));
    this.setFact(1, GROUPS[view.attention] ?? 'Unresolved');
    this.setFact(2, GROUPS[view.workspaceWinner] ?? 'Unresolved');
    this.setFact(3, String(view.rewires));
    this.setFact(4, `${view.x.toFixed(3)}, ${view.z.toFixed(3)}`);
    this.setFact(5, String(session.droppedSteps));
    this.record.textContent = session.recording ? 'Restart recording' : 'Record new life';
    this.replay.disabled = session.recordedSteps === 0;
    if (session.mode === 'replay') {
      this.status.textContent = this.paintedReplayComplete
        ? `Replay complete · ${session.recordedSteps} steps · choose Live or Seeded to continue`
        : `Replay ${session.replayStep} / ${session.recordedSteps} · world writes disabled`;
    } else if (session.recording) {
      this.status.textContent = `Recording ${session.recordedSteps} / ${session.capacity} steps · stops automatically at capacity`;
    } else if (session.recordedSteps >= session.capacity) {
      this.status.textContent = `Recording full · ${session.recordedSteps} steps saved · autonomous life continues`;
    } else {
      this.status.textContent =
        session.recordedSteps > 0
          ? `${session.recordedSteps} steps captured locally · ready to replay`
          : 'No local recording yet.';
    }
    this.error.textContent = session.error ?? '';
    this.drawDisk(view);
  }

  private setMeter(index: number, value: number, signed = false): void {
    const meter = this.meters[index];
    if (!meter) return;
    if (!Number.isFinite(value)) {
      meter.bar.removeAttribute('value');
      meter.value.textContent = 'invalid';
      return;
    }
    meter.bar.value = signed ? (value + 1) / 2 : value;
    meter.value.textContent = value.toFixed(2);
  }

  private setFact(index: number, value: string): void {
    const target = this.facts[index];
    if (target) target.textContent = value;
  }

  // O(48 + 192), no temporary arrays, object allocations or dynamic colors.
  private drawDisk(view: XylosView): void {
    const ctx = this.context;
    if (!ctx) return;
    const cx = 220;
    const cy = 140;
    const radius = 118;
    ctx.clearRect(0, 0, 440, 280);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#70d9c946';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#779caf20';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    for (let edge = 0; edge < view.sources.length; edge++) {
      const source = view.sources[edge] ?? 0;
      const target = Math.floor(edge / 4);
      const weight = view.weights[edge] ?? 0;
      ctx.strokeStyle = weight >= 0 ? '#67e3ce' : '#c58fff';
      ctx.globalAlpha = Math.min(0.55, 0.06 + Math.abs(weight) * 0.3);
      ctx.beginPath();
      ctx.moveTo(
        cx + (view.coordinates[source * 2] ?? 0) * radius,
        cy + (view.coordinates[source * 2 + 1] ?? 0) * radius,
      );
      ctx.lineTo(
        cx + (view.coordinates[target * 2] ?? 0) * radius,
        cy + (view.coordinates[target * 2 + 1] ?? 0) * radius,
      );
      ctx.stroke();
    }
    for (let node = 0; node < view.activity.length; node++) {
      const group = Math.floor(node / 8);
      const magnitude = Math.min(1, Math.abs(view.activity[node] ?? 0));
      const x = cx + (view.coordinates[node * 2] ?? 0) * radius;
      const y = cy + (view.coordinates[node * 2 + 1] ?? 0) * radius;
      ctx.fillStyle = COLORS[group] ?? '#ffffff';
      ctx.globalAlpha = 0.28 + magnitude * 0.72;
      ctx.beginPath();
      ctx.arc(x, y, 2 + magnitude * 3, 0, Math.PI * 2);
      ctx.fill();
      if (group === view.workspaceWinner) {
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = '#f0fffa';
        ctx.beginPath();
        ctx.arc(x, y, 6 + magnitude * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}
