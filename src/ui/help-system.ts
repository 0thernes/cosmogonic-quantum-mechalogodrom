/**
 * HELP ME NOW (V36) — the in-world help system the directive asks for, beside DOCS / SPECS / ✦ AI.
 * A self-mounting **❓ HELP** panel that answers "Explain this / What is that? / I'm confused" and any
 * typed question INSTANTLY from the repo-grounded knowledge base ([help-knowledge.ts]) — no network,
 * so it works even when the external AI is rate-limited. A footer states the safety constitution and
 * hands off to the ✦ Copilot for freeform / web questions. UI shell only; pure presentation.
 */
import { HELP_KB, findHelp, type HelpEntry } from './help-knowledge';
import { mountToggle } from './panel-dock';

/** The quick chips — the directive's named entry points + a few common topics → seed queries. */
const CHIPS: { label: string; q: string }[] = [
  { label: 'Explain this', q: 'overview what is this explain' },
  { label: 'What is that?', q: 'what are these creatures entities' },
  { label: "I'm confused", q: 'how to play controls confused start' },
  { label: 'Super creature', q: 'what is the super creature' },
  { label: 'Access puzzle', q: 'how do I solve the access puzzle' },
  { label: 'Economy', q: 'how does the economy and money work' },
  { label: 'Mechalogodrom', q: 'what is the mechalogodrom center monster' },
  { label: 'Alphabet dome', q: 'what are the 100 alphabet creatures' },
  { label: 'Temple', q: 'what is the ascension shadow core temple' },
  { label: 'The math', q: 'what math science powers this' },
];

const STYLE = `
#cqm-help-toggle{border:1px solid rgba(120,220,160,.5);background:rgba(6,18,12,.86);color:#9bffce;
  font:600 11px/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.1em;height:42px;padding:0 12px;
  border-radius:21px;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 2px 14px rgba(0,0,0,.5);
  transition:transform .15s,background .15s}
#cqm-help-toggle:hover{transform:scale(1.06);background:rgba(12,34,22,.95)}
#cqm-help-toggle:focus-visible{outline:2px solid #66e0a0;outline-offset:2px}
/* V71: "down the middle 50/50" — the answer fills the LEFT half, the topic chips + search box + AI
   hand-off live on the RIGHT half. Wider so both halves breathe; stacks on narrow screens. */
#cqm-help-panel{position:fixed;right:10px;bottom:128px;z-index:59;width:min(94vw,720px);height:min(74vh,560px);display:none;
  flex-direction:column;border:1px solid rgba(120,220,160,.32);border-radius:12px;background:rgba(6,12,10,.96);
  backdrop-filter:blur(12px);box-shadow:0 10px 46px rgba(0,0,0,.66);font:12px/1.55 var(--font-ui,system-ui,sans-serif);
  color:#e6f6ec;overflow:hidden}
#cqm-help-panel.open{display:flex}
.cqm-help-head{display:flex;align-items:center;gap:8px;padding:8px 11px;border-bottom:1px solid rgba(120,220,160,.22);background:rgba(10,26,18,.8);flex:0 0 auto}
.cqm-help-head b{font-size:11px;letter-spacing:.14em;color:#aaffd2;font-family:var(--font-mono,monospace)}
.cqm-help-x{margin-left:auto;background:rgba(4,10,8,.9);color:#9bffce;border:1px solid rgba(120,220,160,.3);border-radius:5px;
  font:11px var(--font-mono,monospace);padding:2px 7px;cursor:pointer}
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
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);

    const toggle = doc.createElement('button');
    toggle.id = 'cqm-help-toggle';
    toggle.type = 'button';
    toggle.textContent = '❓ HELP ME NOW';
    toggle.title = 'Repo-grounded help — ask anything about this world';
    toggle.setAttribute('aria-label', 'Open help');
    toggle.addEventListener('click', () => this.setOpen(!this.open));
    mountToggle(toggle, doc);

    this.panel = doc.createElement('section');
    this.panel.id = 'cqm-help-panel';
    this.panel.setAttribute('aria-label', 'Help me now');
    this.panel.innerHTML =
      `<div class="cqm-help-head"><b>❓ HELP ME NOW</b><button class="cqm-help-x" data-x aria-label="Close">✕</button></div>` +
      `<div class="cqm-help-body">` +
      `<div class="cqm-help-left"><div class="cqm-help-colhead">Answer</div><div class="cqm-help-ans" data-ans></div></div>` +
      `<div class="cqm-help-right">` +
      `<div class="cqm-help-colhead">Topics</div><div class="cqm-help-chips" data-chips></div>` +
      `<div class="cqm-help-colhead">Ask anything</div>` +
      `<div class="cqm-help-search"><input class="cqm-help-in" data-in placeholder="e.g. how does the economy work?" autocomplete="off" /><button class="cqm-help-go" data-go>ASK</button></div>` +
      `<div class="cqm-help-foot"><span class="note">Grounded in public project knowledge only — no secrets or private data. For freeform / web questions:</span><button class="cqm-help-ai" data-ai>Ask the ✦ AI</button></div>` +
      `</div></div>`;
    doc.body.appendChild(this.panel);

    this.ansEl = this.panel.querySelector('[data-ans]') as HTMLElement;
    this.input = this.panel.querySelector('[data-in]') as HTMLInputElement;
    (this.panel.querySelector('[data-x]') as HTMLElement).addEventListener('click', () =>
      this.setOpen(false),
    );
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
