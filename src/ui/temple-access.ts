/**
 * TEMPLE ACCESS (V124) — the SECOND access button: an "ultra trans-dimensional Box Window" that
 * cracks open the LV100 ascension temple early for the impatient. Where the ⛓ ACCESS terminal
 * ({@link ../ui/access-puzzle}) gates the 2nd super creature with a Roman-numeral cipher, THIS one is
 * a sparkly, shimmering, prismatic glass box whose password is simply the anime sigil **UwU** — so you
 * can peek at Stage 2 (the Monolith Temple) without grinding a super creature to level 100.
 *
 * On the correct sigil it dispatches `window` event **`cqm:force-ascension`** — the world listens and
 * calls its (idempotent, visual-only, determinism-neutral) `ascend()`, raising the temple immediately.
 * Self-mounts a `◈ STAGE II` button into the shared dock. Pure presentation; the shimmer is all CSS
 * (no `Math.random`), and the password check lives in the DOM-free, unit-tested {@link checkTempleCode}.
 */
import { injectPanelBaseCSS, wireClose } from './panel-shell';
import { mountToggle } from './panel-dock';
import { checkTempleCode } from './temple-code';

// The password check lives in the DOM-free, unit-tested ./temple-code (mirrors ./access-code).
export { TEMPLE_PASSWORD, checkTempleCode } from './temple-code';

const STYLE = `
#cqm-tka-toggle{position:relative;border:0;height:42px;padding:0 14px;border-radius:21px;cursor:pointer;
  font:700 11px/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.16em;color:#eafcff;
  background:linear-gradient(180deg,rgba(10,6,26,.94),rgba(4,4,16,.9));
  box-shadow:0 2px 16px rgba(0,0,0,.55),0 0 18px rgba(150,110,255,.35);
  backdrop-filter:blur(6px);overflow:hidden;transition:transform .15s}
#cqm-tka-toggle::before{content:'';position:absolute;inset:-2px;border-radius:23px;padding:2px;z-index:-1;
  background:conic-gradient(from 0deg,#7df9ff,#b388ff,#ff9ce6,#ffe08a,#8affc1,#7df9ff);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;animation:cqm-tka-spin 4s linear infinite}
#cqm-tka-toggle::after{content:'';position:absolute;inset:0;border-radius:21px;pointer-events:none;
  background:linear-gradient(115deg,transparent 20%,rgba(255,255,255,.55) 48%,transparent 62%);
  background-size:250% 100%;animation:cqm-tka-shine 2.6s ease-in-out infinite}
@keyframes cqm-tka-spin{to{transform:rotate(360deg)}}
@keyframes cqm-tka-shine{0%{background-position:180% 0}60%,100%{background-position:-80% 0}}
#cqm-tka-toggle:hover{transform:scale(1.06)}
#cqm-tka-toggle.solved{color:#c8ffe6;box-shadow:0 0 20px rgba(120,255,190,.5)}
#cqm-tka-modal{position:fixed;inset:0;z-index:210;display:none;align-items:center;justify-content:center;
  background:radial-gradient(130% 130% at 50% 32%,rgba(10,6,26,.82),rgba(0,0,4,.96));backdrop-filter:blur(4px)}
#cqm-tka-modal.open{display:flex}
#cqm-tka-modal::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.5;
  background:radial-gradient(2px 2px at 20% 30%,#fff,transparent),radial-gradient(1.5px 1.5px at 70% 20%,#bfe,transparent),
  radial-gradient(2px 2px at 80% 70%,#e9f,transparent),radial-gradient(1.5px 1.5px at 35% 80%,#fff,transparent),
  radial-gradient(1.5px 1.5px at 55% 55%,#ffd,transparent),radial-gradient(2px 2px at 12% 62%,#adf,transparent);
  animation:cqm-tka-twinkle 3.4s ease-in-out infinite}
@keyframes cqm-tka-twinkle{0%,100%{opacity:.25}50%{opacity:.7}}
.cqm-tka-box{position:relative;width:min(92vw,460px);padding:26px 26px 22px;border-radius:18px;
  transform:perspective(900px) rotateX(3deg);
  background:linear-gradient(160deg,rgba(20,12,44,.82),rgba(6,6,22,.9));
  box-shadow:0 0 70px rgba(150,110,255,.3),inset 0 0 60px rgba(80,40,160,.28),inset 0 1px 0 rgba(255,255,255,.14);
  border:1px solid rgba(180,150,255,.28);
  font:12px/1.6 var(--font-mono,ui-monospace,monospace);color:#dbe8ff;overflow:hidden}
.cqm-tka-box::before{content:'';position:absolute;inset:0;border-radius:18px;padding:1px;pointer-events:none;
  background:conic-gradient(from 0deg,rgba(125,249,255,.9),rgba(179,136,255,.9),rgba(255,156,230,.9),rgba(255,224,138,.9),rgba(138,255,193,.9),rgba(125,249,255,.9));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;opacity:.6;animation:cqm-tka-spin 7s linear infinite}
.cqm-tka-box::after{content:'';position:absolute;top:-60%;left:-30%;width:60%;height:220%;pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);transform:rotate(18deg);
  animation:cqm-tka-sweep 3.8s ease-in-out infinite}
@keyframes cqm-tka-sweep{0%{left:-40%}55%,100%{left:130%}}
.cqm-tka-top{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.cqm-tka-top b{font-size:12px;letter-spacing:.24em;
  background:linear-gradient(90deg,#7df9ff,#b388ff,#ff9ce6,#ffe08a);-webkit-background-clip:text;background-clip:text;color:transparent}
.cqm-tka-x{margin-left:auto;background:rgba(0,0,0,.4);color:#cbd6ff;border:1px solid rgba(180,150,255,.3);
  border-radius:6px;font:12px var(--font-mono,ui-monospace,monospace);padding:2px 8px;cursor:pointer}
.cqm-tka-x:hover{background:rgba(40,24,80,.6)}
.cqm-tka-sig{text-align:center;font-size:34px;letter-spacing:.12em;margin:14px 0 6px;
  text-shadow:0 0 18px rgba(180,150,255,.7);animation:cqm-tka-float 3s ease-in-out infinite}
@keyframes cqm-tka-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.cqm-tka-sub{text-align:center;font-size:9px;letter-spacing:.24em;color:#a8b6ff;opacity:.85;margin-bottom:14px}
.cqm-tka-hint{text-align:center;font-size:10px;letter-spacing:.14em;color:#c7b6ff;margin:6px 0 12px;opacity:.9}
.cqm-tka-row{display:flex;gap:8px}
.cqm-tka-in{flex:1;background:rgba(4,2,16,.6);border:1px solid rgba(180,150,255,.4);border-radius:8px;
  color:#eafcff;font:16px var(--font-mono,ui-monospace,monospace);letter-spacing:.3em;text-align:center;padding:9px 10px;outline:none}
.cqm-tka-in:focus{border-color:#b9a3ff;box-shadow:0 0 14px rgba(150,110,255,.45)}
.cqm-tka-go{background:linear-gradient(180deg,rgba(150,110,255,.35),rgba(90,50,180,.35));
  border:1px solid rgba(180,150,255,.55);border-radius:8px;color:#f0eaff;
  font:700 12px var(--font-mono,ui-monospace,monospace);letter-spacing:.14em;padding:9px 16px;cursor:pointer}
.cqm-tka-go:hover{background:linear-gradient(180deg,rgba(170,130,255,.5),rgba(110,60,210,.5))}
.cqm-tka-box.bad{animation:cqm-tka-shake .4s}
@keyframes cqm-tka-shake{0%,100%{transform:perspective(900px) rotateX(3deg) translateX(0)}20%{transform:perspective(900px) rotateX(3deg) translateX(-9px)}40%{transform:perspective(900px) rotateX(3deg) translateX(8px)}60%{transform:perspective(900px) rotateX(3deg) translateX(-5px)}80%{transform:perspective(900px) rotateX(3deg) translateX(3px)}}
.cqm-tka-grant{text-align:center;font-size:19px;letter-spacing:.22em;font-weight:700;padding:16px 0 6px;
  background:linear-gradient(90deg,#7df9ff,#b388ff,#ff9ce6,#ffe08a,#8affc1);-webkit-background-clip:text;background-clip:text;color:transparent;
  animation:cqm-tka-glow 1.3s ease-in-out infinite}
@keyframes cqm-tka-glow{0%,100%{filter:drop-shadow(0 0 8px rgba(180,150,255,.5))}50%{filter:drop-shadow(0 0 20px rgba(255,180,240,.9))}}
`;

class TempleAccess {
  private readonly modal: HTMLElement;
  private readonly box: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly toggle: HTMLButtonElement;
  private cracked = false;

  constructor(doc: Document = document) {
    doc.getElementById('cqm-tka-toggle')?.remove();
    doc.getElementById('cqm-tka-modal')?.remove();
    injectPanelBaseCSS(doc);
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);

    this.toggle = doc.createElement('button');
    this.toggle.id = 'cqm-tka-toggle';
    this.toggle.type = 'button';
    this.toggle.className = 'cqm-dock-toggle';
    this.toggle.textContent = '◈ STAGE II';
    this.toggle.title =
      'Trans-dimensional access — crack the box to raise the Monolith Temple early';
    this.toggle.setAttribute('aria-label', 'Open the trans-dimensional temple access box');
    this.toggle.addEventListener('click', () => this.open());
    mountToggle(this.toggle, doc);

    this.modal = doc.createElement('div');
    this.modal.id = 'cqm-tka-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-label', 'Trans-dimensional temple access');
    this.modal.tabIndex = -1;
    this.modal.innerHTML =
      `<div class="cqm-tka-box">` +
      `<div class="cqm-tka-top"><b>◈ TRANS-DIMENSIONAL BOX WINDOW</b>` +
      `<button class="cqm-tka-x" data-x aria-label="Close">✕</button></div>` +
      `<div class="cqm-tka-sig">◡ ⟡ ◡</div>` +
      `<div class="cqm-tka-sub">STAGE II · THE MONOLITH TEMPLE · SEALED UNTIL LEVEL 100</div>` +
      `<div class="cqm-tka-hint">whisper the soft anime sigil of adoration · ( ｡◕‿◕｡ )</div>` +
      `<div class="cqm-tka-row"><input class="cqm-tka-in" data-in placeholder="• • •" ` +
      `autocomplete="off" spellcheck="false" maxlength="12" aria-label="Trans-dimensional passphrase" />` +
      `<button class="cqm-tka-go" data-go>CRACK</button></div>` +
      `</div>`;
    doc.body.appendChild(this.modal);

    this.box = this.modal.querySelector('.cqm-tka-box') as HTMLElement;
    this.input = this.modal.querySelector('[data-in]') as HTMLInputElement;
    (this.modal.querySelector('[data-x]') as HTMLElement).addEventListener('click', () =>
      this.close(),
    );
    (this.modal.querySelector('[data-go]') as HTMLElement).addEventListener('click', () =>
      this.submit(),
    );
    this.input.addEventListener('keydown', (ev) => {
      if ((ev as KeyboardEvent).key === 'Enter') this.submit();
    });
    wireClose(this.modal, () => this.close());
  }

  private open(): void {
    if (this.modal.classList.contains('open')) return;
    this.modal.classList.add('open');
    this.input.value = '';
    this.input.focus();
  }

  private close(): void {
    this.modal.classList.remove('open');
    this.toggle.focus();
  }

  private submit(): void {
    if (checkTempleCode(this.input.value)) {
      this.crack();
      return;
    }
    this.box.classList.remove('bad');
    void this.box.offsetWidth; // reflow → replay the shake
    this.box.classList.add('bad');
  }

  /** Correct sigil — raise the temple (force ascension) and show the crack-open state. */
  private crack(): void {
    this.toggle.classList.add('solved');
    this.toggle.textContent = '◈ DIMENSION CRACKED';
    this.box.innerHTML =
      `<div class="cqm-tka-grant">UwU · DIMENSION CRACKED</div>` +
      `<div class="cqm-tka-sub">THE MONOLITH TEMPLE RISES · STAGE II REVEALED</div>` +
      `<div class="cqm-tka-row" style="justify-content:center;margin-top:12px">` +
      `<button class="cqm-tka-go" data-done>WITNESS IT</button></div>`;
    (this.box.querySelector('[data-done]') as HTMLElement).addEventListener('click', () =>
      this.close(),
    );
    if (!this.cracked) {
      this.cracked = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cqm:force-ascension', { detail: { via: 'uwu' } }));
      }
    }
  }
}

/** Self-mount the trans-dimensional temple access box (idempotent). Called from the client entry. */
export function mountTempleAccess(doc: Document = document): void {
  new TempleAccess(doc);
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  mountTempleAccess(document);
}
