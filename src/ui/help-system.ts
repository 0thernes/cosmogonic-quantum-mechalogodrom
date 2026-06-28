/**
 * HELP ME NOW (V36) — the in-world help system the directive asks for, beside DOCS / SPECS / ✦ AI.
 * A self-mounting **❓ HELP** panel that answers "Explain this / What is that? / I'm confused" and any
 * typed question INSTANTLY from the repo-grounded knowledge base ([help-knowledge.ts]) — no network,
 * so it works even when the external AI is rate-limited. A footer states the safety constitution and
 * hands off to the ✦ Copilot for freeform / web questions. UI shell only; pure presentation.
 */
import { HELP_KB, findHelp, type HelpEntry } from './help-knowledge';
import { dockToggle, injectPanelBaseCSS, panelHeader, wireClose } from './panel-shell';
import { mountToggle } from './panel-dock';

/** The quick chips — the directive's named entry points + a few common topics → seed queries. */
const CHIPS: { label: string; q: string }[] = [
  { label: 'Explain this', q: 'overview what is this explain' },
  { label: 'What is that?', q: 'what are these creatures entities' },
  { label: "I'm confused", q: 'how to play controls confused start' },
  { label: 'Controls', q: 'keyboard controls movement camera how to play' },
  { label: 'Observatory', q: 'what do the observatory charts graphs show' },
  { label: 'Sorting field', q: 'how does sorting algorithm bubble field work' },
  { label: 'Super creature', q: 'what is the super creature' },
  { label: 'Access puzzle', q: 'how do I solve the access puzzle' },
  { label: 'Economy', q: 'how does the economy and money work' },
  { label: 'Mechalogodrom', q: 'what is the mechalogodrom center monster' },
  { label: 'Alphabet dome', q: 'what are the 100 alphabet creatures' },
  { label: 'Temple', q: 'what is the ascension shadow core temple' },
  { label: 'NHSI / Neural', q: 'what is NHSI neural hierarchy observatory' },
  { label: 'Archons', q: 'what are archon pantheons minds' },
  { label: 'Architecture', q: '101 super creatures architecture pantheon brood' },
  { label: 'Dock panels', q: 'AI help audit neural market architect panels dock' },
  { label: 'Performance', q: 'fps quality render tiers phone laptop desktop' },
  { label: 'Reset & seed', q: 'deterministic seed rng reset sessions' },
  { label: 'Docs & specs', q: 'where are docs module contracts specifications' },
  { label: 'The math', q: 'what math science powers this quantum tsotchke' },
];

const STYLE = `
/* V71: "down the middle 50/50" — the answer fills the LEFT half, the topic chips + search box + AI
   hand-off live on the RIGHT half. Wider so both halves breathe; stacks on narrow screens. */
#cqm-help-panel{position:fixed;right:10px;bottom:128px;z-index:59;width:min(94vw,720px);height:min(74vh,560px);display:none;
  flex-direction:column;border:1px solid rgba(120,220,160,.32);border-radius:12px;background:rgba(6,12,10,.96);
  backdrop-filter:blur(12px);box-shadow:0 10px 46px rgba(0,0,0,.66);font:12px/1.55 var(--font-ui,system-ui,sans-serif);
  color:#e6f6ec;overflow:hidden}
#cqm-help-panel.open{display:flex}
.cqm-help-head{margin-bottom:0 !important;padding:8px 11px;border-bottom:1px solid rgba(120,220,160,.22);background:rgba(10,26,18,.8);flex:0 0 auto}
.cqm-help-head b{font-size:11px;letter-spacing:.14em;color:#aaffd2;font-family:var(--font-mono,monospace)}
.cqm-help-head .cqm-panel-x{color:#9bffce}
.cqm-help-body{flex:1 1 auto;min-height:0;display:flex}
.cqm-help-left{flex:1 1 50%;min-width:0;display:flex;flex-direction:column}
.cqm-help-right{flex:1 1 50%;min-width:0;display:flex;flex-direction:column;border-left:1px solid rgba(120,220,160,.2);background:rgba(8,18,13,.45)}
.cqm-help-colhead{font:600 9px var(--font-mono,monospace);letter-spacing:.14em;color:#7fcea6;text-transform:uppercase;padding:7px 11px 3px;opacity:.85}
.cqm-help-chips{display:flex;flex-wrap:wrap;gap:5px;padding:3px 11px 9px}
.cqm-help-chip{border:1px solid rgba(120,220,160,.35);background:rgba(16,40,28,.5);color:#cdfce0;border-radius:14px;
  font:11px var(--font-ui,system-ui,sans-serif);padding:4px 10px;cursor:pointer;transition:background .12s}
.cqm-help-chip:hover{background:rgba(30,70,48,.75)}
.cqm-help-search{display:flex;gap:6px;padding:4px 11px 9px}
.cqm-help-in{flex:1;min-width:0;background:rgba(0,0,0,.4);border:1px solid rgba(120,220,160,.3);border-radius:7px;color:#e6f6ec;
  font:12px var(--font-ui,system-ui,sans-serif);padding:7px 9px;outline:none}
.cqm-help-in:focus{border-color:#66e0a0;box-shadow:0 0 9px rgba(80,220,150,.3)}
.cqm-help-go{background:rgba(40,200,130,.16);border:1px solid rgba(120,220,160,.5);border-radius:7px;color:#cdfce0;
  font:600 11px var(--font-mono,monospace);padding:7px 11px;cursor:pointer}
.cqm-help-go:hover{background:rgba(40,200,130,.3)}
.cqm-help-ans{flex:1 1 auto;min-height:0;padding:4px 11px 10px;overflow-y:auto}
.cqm-help-card{border:1px solid rgba(120,220,160,.18);border-radius:9px;background:rgba(10,22,16,.6);padding:9px 11px;margin-top:8px}
.cqm-help-card h4{margin:0 0 4px;font:600 12px var(--font-mono,monospace);letter-spacing:.04em;color:#aaffd2}
.cqm-help-card p{margin:0;color:#d6ecdd}
.cqm-help-card .see{margin-top:6px;font-size:10px;color:#6fbf92;font-family:var(--font-mono,monospace)}
.cqm-help-foot{margin-top:auto;padding:8px 11px;border-top:1px solid rgba(120,220,160,.18);background:rgba(8,18,13,.7);
  font-size:10px;color:#7fcea6;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cqm-help-foot .note{color:#8fcfa8;flex:1;min-width:160px}
.cqm-help-ai{border:1px solid rgba(120,160,220,.5);background:rgba(20,28,52,.6);color:#cfe0ff;border-radius:7px;
  font:600 10px var(--font-mono,monospace);padding:5px 9px;cursor:pointer}
.cqm-help-ai:hover{background:rgba(34,46,86,.8)}
@media (max-width:560px){.cqm-help-body{flex-direction:column}.cqm-help-right{border-left:none;border-top:1px solid rgba(120,220,160,.2)}}
`;

export class HelpSystem {
  private readonly panel: HTMLElement;
  private readonly ansEl: HTMLElement;
  private readonly input: HTMLInputElement;
  private open = false;

  constructor(doc: Document = document) {
    doc.getElementById('cqm-help-toggle')?.remove();
    doc.getElementById('cqm-help-panel')?.remove();
    injectPanelBaseCSS(doc);
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);

    const toggle = dockToggle({
      id: 'cqm-help-toggle',
      label: '❓ HELP ME NOW',
      title: 'Repo-grounded help — ask anything about this world',
      ariaLabel: 'Open help',
      onClick: () => this.setOpen(!this.open),
      doc,
    });
    mountToggle(toggle, doc);

    this.panel = doc.createElement('section');
    this.panel.id = 'cqm-help-panel';
    this.panel.setAttribute('aria-label', 'Help me now');
    const head = panelHeader({ title: '❓ HELP ME NOW', onClose: () => this.setOpen(false), doc });
    head.classList.add('cqm-help-head');
    this.panel.appendChild(head);
    const body = doc.createElement('div');
    body.className = 'cqm-help-body';
    body.innerHTML =
      `<div class="cqm-help-left"><div class="cqm-help-colhead">Answer</div><div class="cqm-help-ans" data-ans></div></div>` +
      `<div class="cqm-help-right">` +
      `<div class="cqm-help-colhead">Topics</div><div class="cqm-help-chips" data-chips></div>` +
      `<div class="cqm-help-colhead">Ask anything</div>` +
      `<div class="cqm-help-search"><input class="cqm-help-in" data-in placeholder="e.g. how does the economy work?" autocomplete="off" /><button class="cqm-help-go" data-go>ASK</button></div>` +
      `<div class="cqm-help-foot"><span class="note">Grounded in public project knowledge only — no secrets or private data. For freeform / web questions:</span><button class="cqm-help-ai" data-ai>Ask the ✦ AI</button></div>` +
      `</div>`;
    this.panel.appendChild(body);
    doc.body.appendChild(this.panel);

    this.ansEl = this.panel.querySelector('[data-ans]') as HTMLElement;
    this.input = this.panel.querySelector('[data-in]') as HTMLInputElement;
    wireClose(this.panel, () => this.setOpen(false));
    (this.panel.querySelector('[data-go]') as HTMLElement).addEventListener('click', () =>
      this.ask(this.input.value),
    );
    this.input.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') this.ask(this.input.value);
    });
    (this.panel.querySelector('[data-ai]') as HTMLElement).addEventListener('click', () => {
      doc
        .getElementById('cqm-cop-toggle')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const chips = this.panel.querySelector('[data-chips]') as HTMLElement;
    for (const c of CHIPS) {
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'cqm-help-chip';
      b.textContent = c.label;
      b.addEventListener('click', () => {
        this.input.value = c.label;
        this.ask(c.q);
      });
      chips.appendChild(b);
    }
  }

  private setOpen(v: boolean): void {
    this.open = v;
    this.panel.classList.toggle('open', v);
    if (v && this.ansEl.childElementCount === 0) this.render(HELP_KB.slice(0, 1)); // seed with the overview
  }

  /** Run a query through the grounded retriever and render the answer cards (overview on no match). */
  private ask(query: string): void {
    const hits = findHelp(query);
    this.render(hits.length ? hits : HELP_KB.slice(0, 1));
  }

  /** Paint answer cards via textContent (never innerHTML for the body — safe by construction). */
  private render(entries: readonly HelpEntry[]): void {
    const doc = this.panel.ownerDocument;
    this.ansEl.textContent = '';
    for (const e of entries) {
      const card = doc.createElement('div');
      card.className = 'cqm-help-card';
      const h = doc.createElement('h4');
      h.textContent = e.title;
      const p = doc.createElement('p');
      p.textContent = e.body;
      card.append(h, p);
      if (e.see && e.see.length) {
        const see = doc.createElement('div');
        see.className = 'see';
        see.textContent = 'see · ' + e.see.join(' · ');
        card.appendChild(see);
      }
      this.ansEl.appendChild(card);
    }
  }
}

/** Self-mount the help system (idempotent). Called from the client entry. */
export function mountHelpSystem(doc: Document = document): void {
  new HelpSystem(doc);
}

if (typeof document !== 'undefined') {
  mountHelpSystem(document);
}
