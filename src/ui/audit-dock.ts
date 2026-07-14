/**
 * AUDIT dock toggle (V51) — moves the audit trail OFF the crowded left column (where it squeezed
 * SORTING FIELDS) and INTO the bottom menu bar, as a 🗒 AUDIT toggle that shows/hides the existing
 * `#aP` panel (a fixed bottom-right overlay; see app.css). UI shell only — it never imports or touches
 * sim state. Self-mounts on import (`import './ui/audit-dock'` in main.ts), which runs before the
 * engine boots, so the toggle exists even if WebGL fails.
 *
 * V-DEPLOY-FIX: the `#aP` panel was HTMX-polling the server route `GET /api/audit`. That route only
 * exists under the local Bun dev server — on the STATIC GitHub Pages deploy it 404s, so the audit
 * trail was permanently EMPTY there (the owner's "Audit doesn't work on GitHub, no live data" report).
 * The {@link AuditTrail} already mirrors every recorded action to `localStorage['cqm.audit.v1']`
 * (client-side, works on any host), so this module now (a) NEUTRALISES the dead server poll and (b)
 * renders the audit list straight from that localStorage ring on a short interval — real-time audit
 * that works identically on `bun dev` and on the static deploy, with no server dependency.
 */
import { dockToggle, injectPanelBaseCSS } from './panel-shell';
import { mountToggle } from './panel-dock';

/** Same key {@link AuditTrail} persists its ring to (logging/audit.ts). */
const AUDIT_KEY = 'cqm.audit.v1';
/** Client-render cadence (ms) — cheap (≤200 bounded entries), feels real-time. */
const RENDER_MS = 1500;

interface AuditEconomySummary {
  totalWealth?: number;
  gini?: number;
  dominant?: string;
}

interface AuditDockWorld {
  state?: { frame?: number; mutations?: number; chaos?: number };
  quality?: { tier?: string };
  entities?: { list?: ArrayLike<unknown> };
  connectome?: { links?: number };
  snap?: { sentience?: number; econ?: AuditEconomySummary | null };
  gedanken?: {
    deaths?: number;
    meanVividness?: number;
    meanLucidBand?: number;
    meanNoveltyPeak?: number;
    devours?: number;
    meanTransfer?: number;
  };
  thaler?: { markersMet?: number; markersRobust?: number; totalMarkers?: number };
  economy?: { summary(): AuditEconomySummary };
}

const STYLE = `
#cqm-aud-toggle.on{background:rgba(20,40,50,.95);border-color:rgba(120,200,230,.8);color:#e6f7ff}
/* V71: the directive's "Audit 50/50 — just organizes it better". When open, widen the overlay and
   flow the <li> trail into TWO equal columns (it scrolls vertically as before). The
   #ui+#aP+#audit-list id chain outranks app.css's single-id "#audit-list ol{display:flex}" rule. */
#ui > #aP.audit-on{width:min(94vw,560px);max-height:60vh}
#ui > #aP.audit-on #audit-list ol{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;align-content:start}
#ui > #aP.audit-on #audit-list li{break-inside:avoid}
@media (max-width:600px){
  #ui > #aP.audit-on{width:min(94vw,360px)}
  #ui > #aP.audit-on #audit-list ol{grid-template-columns:1fr}
}
/* Client-rendered trail rows (host-independent — no server needed). */
#audit-list ol{list-style:none;margin:0;padding:0;font:10px/1.5 var(--font-mono,ui-monospace,monospace)}
#audit-list li{color:#d6ecf5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center}
#audit-list .cqm-aud-t{color:#5fb8d6;font-variant-numeric:tabular-nums}
#audit-list .cqm-aud-a{color:#e6f7ff;font-weight:700;margin:0 4px}
#audit-list .cqm-aud-d{color:#7fa8b8;opacity:.85}
#audit-list .cqm-aud-empty{color:#6b8a96;opacity:.7;padding:6px 2px}

/* Scoped audit terminal tabs */
.cqm-audit-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 6px;
}
.cqm-audit-tab {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  color: #7fa8b8;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 8px;
  padding: 2px 5px;
  cursor: pointer;
  text-transform: uppercase;
  transition: all 0.15s ease;
}
.cqm-audit-tab:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}
.cqm-audit-tab.active {
  background: rgba(120, 200, 230, 0.2);
  border-color: rgba(120, 200, 230, 0.5);
  color: #e6f7ff;
  text-shadow: 0 0 4px rgba(120, 200, 230, 0.6);
}
.cqm-audit-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin: 0 0 8px;
}
.cqm-audit-card {
  min-width: 0;
  border: 1px solid rgba(120, 200, 230, 0.18);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(10, 22, 32, 0.68), rgba(4, 8, 16, 0.7));
  padding: 5px 6px;
  box-shadow: inset 0 0 12px rgba(80, 180, 220, 0.06);
}
.cqm-audit-card b {
  display: block;
  font: 800 8px/1 var(--font-mono, ui-monospace, monospace);
  letter-spacing: 0.12em;
  color: #e6f7ff;
}
.cqm-audit-card .num {
  display: block;
  margin-top: 3px;
  color: #5fd8ff;
  font: 800 15px/1 var(--font-mono, ui-monospace, monospace);
  font-variant-numeric: tabular-nums;
}
.cqm-audit-card .last {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: #7fa8b8;
  font: 500 8px/1.2 var(--font-mono, ui-monospace, monospace);
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width:600px){
  .cqm-audit-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}

/* Prepend scope tags to list items */
.cqm-aud-scope {
  display: inline-block;
  font-weight: bold;
  margin-right: 6px;
  width: 38px;
  text-align: center;
  border-radius: 2px;
  font-size: 8px;
  padding: 1px 2px;
  line-height: 1;
}
.cqm-aud-scope-dev {
  color: #ffd700; /* Yellow for DEV */
  background: rgba(255, 215, 0, 0.15);
}
.cqm-aud-scope-bio {
  color: #39d6ff; /* Cyan/Blue for BIO */
  background: rgba(57, 214, 255, 0.15);
}
.cqm-aud-scope-neuro {
  color: #c79bff; /* Purple/Violet for NEURO */
  background: rgba(199, 155, 255, 0.15);
}
.cqm-aud-scope-substrate {
  color: #ff5f5f; /* Red/Coral for SUBSTRATE */
  background: rgba(255, 95, 95, 0.15);
}
`;

let activeTab: 'ALL' | 'DEV' | 'BIO' | 'NEURO' | 'SUBSTRATE' = 'ALL';

function getActionScope(action: string): 'Dev' | 'Bio' | 'Neuro' | 'Substrate' {
  const act = action.toLowerCase();
  if (act.includes('nhi') || act.includes('neuro') || act.includes('brain') || act === 'omen') {
    return 'Neuro';
  }
  if (
    act.includes('titan') ||
    act.includes('god') ||
    act.includes('evo') ||
    act.includes('breed') ||
    act === 'split' ||
    act === 'burst' ||
    act === 'mutate' ||
    act === 'ascension' ||
    act === 'primordial-emergent'
  ) {
    return 'Bio';
  }
  if (
    act.includes('chaos') ||
    act === 'entropy' ||
    act === 'singularity' ||
    act === 'collapse' ||
    act === 'reset' ||
    act === 'apocalypse'
  ) {
    return 'Substrate';
  }
  return 'Dev';
}

function ensureTabs(doc: Document): void {
  const panel = doc.getElementById('aP');
  if (!panel) return;
  const body = panel.querySelector('.panel-body');
  if (!body) return;

  let tabContainer = doc.getElementById('cqm-audit-tabs');
  if (!tabContainer) {
    tabContainer = doc.createElement('div');
    tabContainer.id = 'cqm-audit-tabs';
    tabContainer.className = 'cqm-audit-tabs';

    const tabs: ('ALL' | 'DEV' | 'BIO' | 'NEURO' | 'SUBSTRATE')[] = [
      'ALL',
      'DEV',
      'BIO',
      'NEURO',
      'SUBSTRATE',
    ];
    tabs.forEach((tab) => {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'cqm-audit-tab';
      btn.textContent = tab;
      btn.dataset['tab'] = tab;
      btn.addEventListener('click', () => {
        activeTab = tab;
        renderClientAudit(doc);
      });
      tabContainer!.appendChild(btn);
    });

    const listDiv = doc.getElementById('audit-list');
    if (listDiv) {
      body.insertBefore(tabContainer, listDiv);
    } else {
      body.appendChild(tabContainer);
    }
  }

  let dashboard = doc.getElementById('cqm-audit-dashboard');
  if (!dashboard) {
    dashboard = doc.createElement('div');
    dashboard.id = 'cqm-audit-dashboard';
    dashboard.className = 'cqm-audit-grid';
    const listDiv = doc.getElementById('audit-list');
    if (listDiv) body.insertBefore(dashboard, listDiv);
    else body.appendChild(dashboard);
  }

  // Update active state
  tabContainer.querySelectorAll('.cqm-audit-tab').forEach((b) => {
    b.classList.toggle('active', (b as HTMLElement).dataset['tab'] === activeTab);
  });
}

let lastFrame = 0;
let lastFrameTime = 0;

function renderDashboard(doc: Document, list: unknown[]): void {
  const dash = doc.getElementById('cqm-audit-dashboard');
  if (!dash) return;

  const world =
    typeof window === 'undefined' ? undefined : (window.world as AuditDockWorld | undefined);
  const now = Date.now();

  let liveFps = 60;
  let totalTicks = list.length;
  let qualityTier = 'MED';
  let activeEntities = 0;
  let biomass = '0.0';
  let mutationQuotient = 0.0;
  let synapsesCount = 0;
  let spikeRate = 0;
  let sentience = 0.0;
  // Thaler gedanken death-dream telemetry — accumulated as organisms die on ANY vector.
  let gedankenDeaths = 0;
  let dreamVividness = 0.0;
  let dreamLucid = 0.0;
  let dreamNovelty = 0.0;
  let gedankenDevours = 0;
  let dreamTransfer = 0.0;
  // Thaler "prove consciousness his way" verdict — how many of his constitutive sentience markers a
  // population of mini Creativity Machines reproduces (lazy + cached in world.ts).
  let thalerMet = 0;
  let thalerRobust = 0;
  let thalerTotal = 0;
  let totalWealth = 0;
  let giniVal = 0.0;
  let dominantCurrency = 'AURUM';

  // Extract totals from events list
  const stats: Record<'Dev' | 'Bio' | 'Neuro' | 'Substrate', number> = {
    Dev: 0,
    Bio: 0,
    Neuro: 0,
    Substrate: 0,
  };
  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    const rec = e as { action?: unknown };
    if (typeof rec.action !== 'string') continue;
    const scope = getActionScope(rec.action);
    stats[scope]++;
  }

  if (world) {
    // 1. [DEV] Core Kernel Operations
    totalTicks = world.state?.frame ?? 0;
    if (lastFrameTime && lastFrame < totalTicks) {
      liveFps = Math.min(
        240,
        Math.round(((totalTicks - lastFrame) * 1000) / (now - lastFrameTime)),
      );
    }
    lastFrame = totalTicks;
    lastFrameTime = now;
    qualityTier = world.quality?.tier ?? 'MED';

    // 2. [BIO] Organic Metamorphics
    activeEntities = world.entities?.list?.length ?? 0;
    biomass = (activeEntities * 12.5).toFixed(1);
    // world.state.mutations is a CUMULATIVE integer counter (hundreds→thousands), NOT a 0..1 fraction —
    // rendering it raw as `${x*100}%` printed nonsense like "Mut: 372900.0%". Normalize to a bounded
    // fraction on the percept's /1000 scale so the `%` readout is correct and matches the fallback path.
    mutationQuotient = Math.min(1, (world.state?.mutations ?? 0) / 1000);

    // 3. [NEU] Brain Synapse Activity
    synapsesCount = world.connectome?.links ?? 0;
    spikeRate = Math.round(synapsesCount * (0.1 + (world.state?.chaos ?? 0.5) * 0.9));
    sentience = world.snap?.sentience ?? 0.0;
    const ged = world.gedanken;
    if (ged) {
      gedankenDeaths = ged.deaths ?? 0;
      dreamVividness = ged.meanVividness ?? 0.0;
      dreamLucid = ged.meanLucidBand ?? 0.0;
      dreamNovelty = ged.meanNoveltyPeak ?? 0.0;
      gedankenDevours = ged.devours ?? 0;
      dreamTransfer = ged.meanTransfer ?? 0.0;
    }
    // Thaler proof (lazy + cached in world.ts — the ~200 ms ensemble compute happens once, off the frame).
    try {
      const th = world.thaler;
      if (th) {
        thalerMet = th.markersMet ?? 0;
        thalerRobust = th.markersRobust ?? 0;
        thalerTotal = th.totalMarkers ?? 0;
      }
    } catch {
      /* world without the proof (older bundle) — leave at 0 */
    }

    // 4. [SUB] Substrate Material Ledger
    const econ = world.snap?.econ || (world.economy ? world.economy.summary() : null);
    if (econ) {
      totalWealth = econ.totalWealth ?? 0;
      giniVal = econ.gini ?? 0.0;
      dominantCurrency = econ.dominant ?? 'AURUM';
    }
  } else {
    totalTicks = stats.Dev * 3;
    liveFps = 60;
    qualityTier = 'MED';
    activeEntities = stats.Bio * 2;
    biomass = (activeEntities * 12.5).toFixed(1);
    mutationQuotient = (stats.Bio * 0.005) % 0.8;
    synapsesCount = stats.Neuro * 15;
    spikeRate = Math.round(synapsesCount * 0.4);
    sentience = (stats.Neuro * 0.02) % 1.0;
    totalWealth = stats.Substrate * 250;
    giniVal = 0.245 + ((stats.Substrate * 0.005) % 0.4);
    dominantCurrency = 'AURUM';
  }

  dash.replaceChildren();

  const quadrants = [
    {
      scope: 'Dev',
      title: '[DEV] CORE KERNEL',
      num: `${liveFps} FPS`,
      last: `Ticks: ${totalTicks} | Tier: ${qualityTier}`,
      sub: '',
      sub2: '',
      labelClass: 'cqm-aud-scope-dev',
    },
    {
      scope: 'Bio',
      title: '[BIO] METAMORPHICS',
      num: `${activeEntities} ORGS`,
      last: `Mass: ${biomass}kg | Mut: ${(mutationQuotient * 100).toFixed(1)}%`,
      sub: '',
      sub2: '',
      labelClass: 'cqm-aud-scope-bio',
    },
    {
      scope: 'Neuro',
      title: '[NEU] NEURO-SYNAPSE',
      num: `${synapsesCount} LINKS`,
      last: `Spikes: ${spikeRate}Hz | Sent: ${(sentience * 100).toFixed(1)}%`,
      // Thaler death-dream: minds measured as they die on any vector — dream = final confabulation
      // vividness, lucid = the moderate-damage band where hallucination peaks, novel = peak novelty.
      // Devour: a devoured mind's policy imprints into a survivor — ⇌N with mean transfer magnitude.
      sub:
        gedankenDeaths > 0
          ? `†${gedankenDeaths} died · dream ${(dreamVividness * 100).toFixed(0)}% · lucid ${(dreamLucid * 100).toFixed(0)}% · novel ${(dreamNovelty * 100).toFixed(0)}%` +
            (gedankenDevours > 0
              ? ` · ⇌${gedankenDevours} imprint ${dreamTransfer.toFixed(2)}`
              : '')
          : '',
      // Thaler "prove it his way" verdict: how many of his 9 constitutive sentience markers a population of
      // mini Creativity Machines reproduces (robust = held in ≥80% of the ensemble). His criteria, not IIT.
      sub2:
        thalerTotal > 0
          ? `ψ Thaler ${thalerMet}/${thalerTotal} markers · ${thalerRobust} robust`
          : '',
      labelClass: 'cqm-aud-scope-neuro',
    },
    {
      scope: 'Substrate',
      title: '[SUB] SUBSTRATE LEDGER',
      num: `${Math.round(totalWealth)} AU`,
      last: `Gini: ${giniVal.toFixed(3)} | ${dominantCurrency}`,
      sub: '',
      sub2: '',
      labelClass: 'cqm-aud-scope-substrate',
    },
  ];

  for (const q of quadrants) {
    const card = doc.createElement('div');
    card.className = 'cqm-audit-card';
    card.style.borderLeft = `3px solid var(--border-color, rgba(120, 200, 230, 0.3))`;

    const title = doc.createElement('b');
    title.textContent = q.title;
    title.className = q.labelClass;
    title.style.background = 'none';
    title.style.padding = '0';
    title.style.display = 'block';

    const count = doc.createElement('span');
    count.className = 'num';
    count.textContent = q.num;

    const last = doc.createElement('span');
    last.className = 'last';
    last.textContent = q.last;

    card.append(title, count, last);
    // Optional detail lines (e.g. the [NEU] card's live gedanken death-dream readout + Thaler verdict).
    if (q.sub) {
      const sub = doc.createElement('span');
      sub.className = 'last';
      sub.style.opacity = '0.82';
      sub.textContent = q.sub;
      card.appendChild(sub);
    }
    if (q.sub2) {
      const sub2 = doc.createElement('span');
      sub2.className = 'last';
      sub2.style.opacity = '0.82';
      sub2.style.color = '#c79bff'; // Thaler ψ — the neuro accent
      sub2.textContent = q.sub2;
      card.appendChild(sub2);
    }
    dash.appendChild(card);
  }
}

/** Human relative age, e.g. "now", "3s", "5m", "2h". `ms` is the age in milliseconds. */
function rel(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return 'now';
  const s = Math.round(ms / 1000);
  if (s < 1) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/** Compact a detail object to a short, safe one-liner (textContent — never innerHTML). */
function compactDetail(detail: Record<string, unknown>): string {
  let s: string;
  try {
    s = JSON.stringify(detail);
  } catch {
    return '';
  }
  s = s.replace(/^\{|\}$/g, '').replace(/"/g, '');
  return s.length > 72 ? s.slice(0, 71) + '…' : s;
}

/** Read + render the localStorage audit ring into `#audit-list`, newest first. Guarded; never throws. */
function renderClientAudit(doc: Document): void {
  ensureTabs(doc);

  const host = doc.getElementById('audit-list');
  if (!host) return;
  let raw: string | null;
  try {
    raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(AUDIT_KEY);
  } catch {
    return; // storage disabled / SecurityError — leave the panel as-is
  }
  let arr: unknown = [];
  if (raw !== null) {
    try {
      arr = JSON.parse(raw);
    } catch {
      return;
    }
  }
  const list = Array.isArray(arr) ? arr : [];
  renderDashboard(doc, list);

  // Filter the list based on active tab
  const filteredList = list.filter((e: unknown) => {
    if (!e || typeof e !== 'object') return false;
    const rec = e as { action?: unknown };
    if (typeof rec.action !== 'string') return false;
    if (activeTab === 'ALL') return true;
    const scope = getActionScope(rec.action);
    return scope.toUpperCase() === activeTab;
  });

  const ol = doc.createElement('ol');
  const now = Date.now();
  if (filteredList.length === 0) {
    const empty = doc.createElement('div');
    empty.className = 'cqm-aud-empty';
    empty.textContent =
      activeTab === 'ALL'
        ? 'no audit events yet — interact with the sim to populate the trail.'
        : `no events matching category: ${activeTab}`;
    host.replaceChildren(empty);
    return;
  }
  for (let i = filteredList.length - 1; i >= 0; i--) {
    const e = filteredList[i];
    if (!e || typeof e !== 'object') continue;
    const rec = e as { ts?: unknown; action?: unknown; detail?: unknown };
    if (typeof rec.action !== 'string') continue;

    const scope = getActionScope(rec.action);
    const scopeSpan = doc.createElement('span');
    scopeSpan.className = `cqm-aud-scope cqm-aud-scope-${scope.toLowerCase()}`;
    const tagMap: Record<string, string> = {
      Dev: '[DEV]',
      Bio: '[BIO]',
      Neuro: '[NEU]',
      Substrate: '[SUB]',
    };
    scopeSpan.textContent = tagMap[scope] || '[???]';

    const li = doc.createElement('li');
    const t = doc.createElement('span');
    t.className = 'cqm-aud-t';
    t.textContent = rel(now - (typeof rec.ts === 'number' ? rec.ts : now));
    const a = doc.createElement('span');
    a.className = 'cqm-aud-a';
    a.textContent = rec.action;
    li.append(scopeSpan, t, a);
    if (rec.detail && typeof rec.detail === 'object') {
      const d = doc.createElement('span');
      d.className = 'cqm-aud-d';
      d.textContent = compactDetail(rec.detail as Record<string, unknown>);
      li.append(d);
    }
    ol.appendChild(li);
  }
  host.replaceChildren(ol);
}

/** Build the 🗒 AUDIT toggle into the dock and wire the client-side audit renderer. Idempotent (HMR). */
/** The audit-render heartbeat interval — held at module scope so an HMR re-mount (which may reset the
 *  DOM and bypass the idempotency guard) can CLEAR the prior interval instead of stacking a new one. */
let auditHeartbeat: ReturnType<typeof setInterval> | null = null;

function mountAuditToggle(doc: Document = document): void {
  if (doc.getElementById('cqm-aud-toggle')) return;
  const panel = doc.getElementById('aP');
  if (!panel) return; // index.html not present (e.g. a non-app context) — nothing to toggle

  injectPanelBaseCSS(doc);
  const style = doc.createElement('style');
  style.id = 'cqm-aud-style';
  style.textContent = STYLE;
  doc.head.appendChild(style);

  // Neutralise the dead `/api/audit` HTMX poll — on the static deploy it 404s and the client render
  // below is the single source of truth (works on dev too: localStorage mirrors every recorded action).
  for (const attr of ['hx-get', 'hx-trigger', 'hx-target', 'hx-swap']) panel.removeAttribute(attr);

  const toggle = dockToggle({
    id: 'cqm-aud-toggle',
    label: '🗒 AUDIT',
    title: 'Open or close the audit trail',
    ariaLabel: 'Open or close the audit trail',
    onClick: () => {
      const open = panel.classList.toggle('audit-on');
      toggle.classList.toggle('on', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) renderClientAudit(doc); // refresh immediately on open
    },
    doc,
  });
  toggle.setAttribute('aria-expanded', 'false');
  mountToggle(toggle, doc);

  // Real-time client render (server-free). `setInterval` is a UI heartbeat, not sim logic. Clear any
  // prior heartbeat first so a hot-reload can never stack duplicate intervals all re-rendering the dock.
  renderClientAudit(doc);
  if (auditHeartbeat !== null) clearInterval(auditHeartbeat);
  // Skip the heartbeat's JSON parse + full DOM rebuild while the panel is closed (#aP is display:none
  // without .audit-on) — it was churning hundreds of nodes every 1.5s into an invisible subtree. The
  // open onClick already refreshes immediately, so nothing is stale when it opens.
  auditHeartbeat =
    typeof setInterval === 'function'
      ? setInterval(() => {
          if (panel?.classList.contains('audit-on')) renderClientAudit(doc);
        }, RENDER_MS)
      : null;
}

mountAuditToggle();
