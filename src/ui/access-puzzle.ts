/**
 * ACCESS PUZZLE (V34) — the wild cryptographic GUI that gates the SECOND super creature. A CIA/NSA/
 * alien-terminal modal: ten shimmering cipher lines whose tally-mark counts ARE the seed 3455456754,
 * a flashing **ACCESS DENIED** banner that rotates through **100 languages**, and a glyph field that
 * **re-scrambles every 5 seconds** — solvable by anyone who reads the hint ("ONLY THE ROMANS KNOW —
 * count each line, speak it I–X"). The check lives in the DOM-free + unit-tested [access-code.ts].
 *
 * On the correct answer it dispatches `window` event **`cqm:superhero-unlock`** (the world listens and
 * reveals the 2nd super creature) and shows ACCESS GRANTED. Self-mounts a `⛓ ACCESS` button into the
 * shared dock. Pure presentation; the decorative scramble uses a seeded {@link mulberry32} (no
 * `Math.random`), and the timers are plain UI intervals cleared on close/solve.
 */
import { mulberry32 } from '../math/rng';
import { ACCESS_SEED, seedRomans, checkAccessCode } from './access-code';
import { injectPanelBaseCSS } from './panel-shell';
import { mountToggle } from './panel-dock';

/** "ACCESS DENIED" in 100 tongues (the last few are cipher/alien, fitting the terminal's vibe). */
const DENIED = [
  'ACCESS DENIED',
  'ACCESO DENEGADO',
  'ACCÈS REFUSÉ',
  'ZUGRIFF VERWEIGERT',
  'ACCESSO NEGATO',
  'ACESSO NEGADO',
  'TOEGANG GEWEIGERD',
  'ДОСТУП ЗАПРЕЩЁН',
  'ДОСТУП ЗАБОРОНЕНО',
  'ODMOWA DOSTĘPU',
  'PŘÍSTUP ODEPŘEN',
  'PRÍSTUP ZAMIETNUTÝ',
  'ACCES INTERZIS',
  'HOZZÁFÉRÉS MEGTAGADVA',
  'ΠΡΟΣΒΑΣΗ ΑΠΟΡΡΙΦΘΗΚΕ',
  'ERİŞİM REDDEDİLDİ',
  'ÅTKOMST NEKAD',
  'TILGANG NEKTET',
  'ADGANG NÆGTET',
  'PÄÄSY EVÄTTY',
  'AÐGANGI HAFNAÐ',
  'JUURDEPÄÄS KEELATUD',
  'PIEKĻUVE LIEGTA',
  'PRIEIGA UŽDRAUSTA',
  'PRISTUP ODBIJEN',
  'ПРИСТУП ОДБИЈЕН',
  'ДОСТЪПЪТ Е ОТКАЗАН',
  'DOSTOP ZAVRNJEN',
  'QASJA U REFUZUA',
  'ПРИСТАПОТ Е ОДБИЕН',
  '拒绝访问',
  '拒絕存取',
  'アクセス拒否',
  '접근 거부됨',
  'TRUY CẬP BỊ TỪ CHỐI',
  'การเข้าถึงถูกปฏิเสธ',
  'ການເຂົ້າເຖິງຖືກປະຕິເສດ',
  'ការចូលដំណើរការត្រូវបានបដិសេធ',
  'ဝင်ရောက်ခွင့်ငြင်းပယ်သည်',
  'AKSES DITOLAK',
  'AKSES DINAFIKAN',
  'TINANGGIHAN ANG PAG-ACCESS',
  'पहुँच अस्वीकृत',
  'অ্যাক্সেস অস্বীকৃত',
  'ਪਹੁੰਚ ਰੱਦ ਕੀਤੀ',
  'ઍક્સેસ નકારી',
  'प्रवेश नाकारला',
  'அணுகல் மறுக்கப்பட்டது',
  'ప్రాప్యత నిరాకరించబడింది',
  'ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ',
  'ആക്സസ് നിഷേധിച്ചു',
  'ප්‍රවේශය ප්‍රතික්ෂේපිතයි',
  'पहुँच अस्वीकृत भयो',
  'رسائی مسترد',
  'تم رفض الوصول',
  'دسترسی رد شد',
  'لاسرسی رد شو',
  'הגישה נדחתה',
  'መዳረሻ ተከልክሏል',
  'UFIKIAJI UMEKATALIWA',
  'AN ƙI SHIGA',
  'WỌLE TI KỌ',
  'UKUFINYELELA KUNQATSHELWE',
  'TOEGANG GEWEIER',
  'GELITAANKA WAA LA DIIDAY',
  'წვდომა აკრძალულია',
  'ՄՈՒՏՔՆ ՄԵՐԺՎԱԾ Է',
  'GİRİŞ RƏDD EDİLDİ',
  'КІРУГЕ ТЫЙЫМ САЛЫНДЫ',
  'KIRISH RAD ETILDI',
  'ХАНДАЛТ ХААГДСАН',
  'འཛུལ་སྤྱོད་བཀག',
  'ALIRO MALPERMESITA',
  'ADITUS NEGATUS',
  'MYNEDIAD GWRTHODWYD',
  'ROCHTAIN DIÚLTAITHE',
  'INNTRIGEADH DIÙLTAICHTE',
  'SARBIDEA UKATUTA',
  'ACCÉS DENEGAT',
  'ACCESO DENEGADO',
  'AĊĊESS MIĊĦUD',
  'ZOUGRËFF VERWEIGERT',
  'TAGONG WEIGERE',
  'KUA WHAKAKAHORETIA TE URU',
  'UA HŌʻOLE ʻIA KE KOMO',
  'UA TEENA LE AVANOA',
  'HINDI PINAYAGAN',
  'GIDUMILIAN ANG PAG-ACCESS',
  'AKSES DITULAK',
  'YAYKUY HARKʼASQA',
  'AHMO HUELITI CALAQUI',
  'ᎤᏂᏲᏍᏗ ᎤᏴᏍᏗ',
  'ᐃᓯᕈᓐᓃᖅᑕᐅᔪᖅ',
  'צוגאַנג פאַרווערט',
  'प्रवेशः निषिद्धः',
  "nuqneH 'oH luSammeH",
  '⟁⟐⌖ ✶ ⌖⟐⟁',
  '01000100 01000101 01001110 01011001',
  '-.. . -. .. . -..',
];

/** Alien/CIA scramble glyphs for the cipher noise. */
const GLYPHS = 'ｦｱｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓ0123456789ΔΣΛΩΞΨαβγλψ⟁⟐⌖✶✷✦∴∷⋮⋰⊹';

const STYLE = `
#cqm-acc-toggle{border-color:rgba(80,255,170,.55);background:linear-gradient(180deg,rgba(6,20,12,.92),rgba(4,12,8,.88));color:#7dffc0;
  animation:cqm-acc-pulse 2.8s ease-in-out infinite}
  font:600 11px/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.12em;height:42px;padding:0 12px;
  border-radius:21px;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 2px 14px rgba(0,0,0,.5);
  transition:transform .15s,background .15s;animation:cqm-acc-flick 2.2s steps(2) infinite}
@keyframes cqm-acc-flick{0%,92%,100%{color:#7dffc0}94%{color:#ff5a6b}96%{color:#fff}}
#cqm-acc-toggle:hover{transform:scale(1.06);background:rgba(8,30,18,.95)}
#cqm-acc-toggle.solved{border-color:rgba(80,255,170,.85);background:rgba(8,40,24,.95);color:#c9ffe6;animation:none;box-shadow:0 0 14px rgba(80,255,170,.35)}
#cqm-acc-toggle.solved:hover{transform:scale(1.03);background:rgba(12,60,36,.98)}
#cqm-acc-modal{position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;
  background:radial-gradient(120% 120% at 50% 30%,rgba(2,10,8,.86),rgba(0,0,0,.96));backdrop-filter:blur(3px)}
#cqm-acc-modal.open{display:flex}
#cqm-acc-modal::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.18;
  background:repeating-linear-gradient(0deg,transparent 0 2px,rgba(0,255,160,.5) 2px 3px)}
.cqm-acc-box{position:relative;width:min(94vw,560px);max-height:92vh;overflow:auto;padding:18px 20px;
  border:1px solid rgba(80,255,170,.4);border-radius:12px;background:rgba(2,10,8,.93);
  box-shadow:0 0 60px rgba(40,255,170,.18),inset 0 0 40px rgba(0,40,24,.6);
  font:12px/1.5 var(--font-mono,ui-monospace,monospace);color:#9effd0;text-shadow:0 0 6px rgba(60,255,170,.35)}
.cqm-acc-top{display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(80,255,170,.22);padding-bottom:8px}
.cqm-acc-top b{font-size:12px;letter-spacing:.22em;color:#c9ffe6}
.cqm-acc-x{margin-left:auto;background:rgba(0,0,0,.5);color:#9effd0;border:1px solid rgba(80,255,170,.3);
  border-radius:5px;font:12px var(--font-mono,ui-monospace,monospace);padding:2px 8px;cursor:pointer}
.cqm-acc-denied{margin:12px 0 4px;text-align:center;font-size:18px;letter-spacing:.28em;font-weight:700;
  color:#ff4d63;text-shadow:0 0 12px rgba(255,60,90,.6);min-height:24px;animation:cqm-acc-blink 1.05s steps(2) infinite}
@keyframes cqm-acc-blink{0%,60%{opacity:1}61%,100%{opacity:.25}}
.cqm-acc-sub{text-align:center;font-size:9px;letter-spacing:.2em;color:#5fdfa6;opacity:.8;margin-bottom:10px}
.cqm-acc-cipher{display:flex;flex-direction:column;gap:3px;margin:8px 0;padding:10px;border-radius:8px;
  background:rgba(0,16,10,.55);border:1px solid rgba(80,255,170,.16)}
.cqm-acc-ln{display:grid;grid-template-columns:30px auto 1fr;align-items:center;gap:10px;white-space:nowrap}
.cqm-acc-ln .rk{color:#4fd39a;opacity:.7;font-size:10px;letter-spacing:.1em}
.cqm-acc-ln .ta{color:#d8ffe9;letter-spacing:2px;text-shadow:0 0 8px rgba(120,255,190,.55)}
.cqm-acc-ln .nz{color:#2f8f68;opacity:.6;overflow:hidden;text-overflow:clip;animation:cqm-acc-shim 2.6s linear infinite}
@keyframes cqm-acc-shim{0%{opacity:.35}50%{opacity:.7}100%{opacity:.35}}
.cqm-acc-hint{margin:10px 0 6px;font-size:10px;letter-spacing:.16em;color:#86ffc8;text-align:center}
.cqm-acc-row{display:flex;gap:8px;margin-top:8px}
.cqm-acc-in{flex:1;background:rgba(0,0,0,.55);border:1px solid rgba(80,255,170,.35);border-radius:6px;
  color:#d8ffe9;font:13px var(--font-mono,ui-monospace,monospace);letter-spacing:.16em;padding:8px 10px;outline:none}
.cqm-acc-in:focus{border-color:#5fffb0;box-shadow:0 0 10px rgba(60,255,170,.35)}
.cqm-acc-go{background:rgba(40,255,170,.14);border:1px solid rgba(80,255,170,.5);border-radius:6px;color:#c9ffe6;
  font:600 12px var(--font-mono,ui-monospace,monospace);letter-spacing:.14em;padding:8px 14px;cursor:pointer}
.cqm-acc-go:hover{background:rgba(40,255,170,.26)}
.cqm-acc-foot{margin-top:8px;display:flex;justify-content:space-between;font-size:9px;color:#4fd39a;opacity:.75}
.cqm-acc-box.bad{animation:cqm-acc-shake .4s}
@keyframes cqm-acc-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(3px)}}
.cqm-acc-grant{text-align:center;color:#7dffc0;font-size:20px;letter-spacing:.3em;font-weight:700;
  text-shadow:0 0 16px rgba(80,255,170,.7);padding:18px 0;animation:cqm-acc-glow 1.2s ease-in-out infinite}
@keyframes cqm-acc-glow{0%,100%{text-shadow:0 0 12px rgba(80,255,170,.5)}50%{text-shadow:0 0 26px rgba(120,255,200,.95)}}
`;

class AccessPuzzle {
  private readonly modal: HTMLElement;
  private readonly box: HTMLElement;
  private readonly deniedEl: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly attemptsEl: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly noiseEls: HTMLElement[] = [];
  private deniedIdx = 0;
  private attempts = 0;
  private solved = false;
  private rngN = 0; // seeds the deterministic scramble (no Math.random)
  private langTimer: ReturnType<typeof setInterval> | null = null;
  private scrambleTimer: ReturnType<typeof setInterval> | null = null;

  constructor(doc: Document = document) {
    doc.getElementById('cqm-acc-toggle')?.remove();
    doc.getElementById('cqm-acc-modal')?.remove();
    injectPanelBaseCSS(doc);
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);

    this.toggle = doc.createElement('button');
    this.toggle.id = 'cqm-acc-toggle';
    this.toggle.type = 'button';
    this.toggle.className = 'cqm-dock-toggle';
    this.toggle.textContent = '⛓ ACCESS';
    this.toggle.title = 'Cryptographic access terminal — unlock the 2nd super creature';
    this.toggle.setAttribute('aria-label', 'Open the access terminal');
    this.toggle.addEventListener('click', () => this.open());
    mountToggle(this.toggle, doc);

    this.modal = doc.createElement('div');
    this.modal.id = 'cqm-acc-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-label', 'Cryptographic access terminal');
    this.modal.innerHTML =
      `<div class="cqm-acc-box">` +
      `<div class="cqm-acc-top"><b>⌖ COSMOGONIC ACCESS TERMINAL · LEVEL Ω</b>` +
      `<button class="cqm-acc-x" data-x aria-label="Close">✕</button></div>` +
      `<div class="cqm-acc-denied" data-denied>ACCESS DENIED</div>` +
      `<div class="cqm-acc-sub">SECOND SUPER CREATURE · BIOMETRIC LOCK · ONLY THE ROMANS KNOW</div>` +
      `<div class="cqm-acc-cipher" data-cipher></div>` +
      `<div class="cqm-acc-hint">COUNT EACH LINE · SPEAK IT IN THE OLD TONGUE · I … X</div>` +
      `<div class="cqm-acc-row"><input class="cqm-acc-in" data-in placeholder="e.g.  III IV V …" ` +
      `autocomplete="off" spellcheck="false" aria-label="Access code" />` +
      `<button class="cqm-acc-go" data-go>TRANSMIT</button></div>` +
      `<div class="cqm-acc-foot"><span data-att>ATTEMPTS: 0</span><span>SEED ████████ · RETRY 5s</span></div>` +
      `</div>`;
    doc.body.appendChild(this.modal);

    this.box = this.modal.querySelector('.cqm-acc-box') as HTMLElement;
    this.deniedEl = this.modal.querySelector('[data-denied]') as HTMLElement;
    this.input = this.modal.querySelector('[data-in]') as HTMLInputElement;
    this.attemptsEl = this.modal.querySelector('[data-att]') as HTMLElement;
    (this.modal.querySelector('[data-x]') as HTMLElement).addEventListener('click', () =>
      this.close(),
    );
    (this.modal.querySelector('[data-go]') as HTMLElement).addEventListener('click', () =>
      this.submit(),
    );
    this.input.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') this.submit();
    });
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    this.buildCipher(this.modal.querySelector('[data-cipher]') as HTMLElement, doc);
  }

  /** Build the ten cipher lines: a rank, `digit` tally marks (the answer), and a scramble field. */
  private buildCipher(host: HTMLElement, doc: Document): void {
    const romans = seedRomans(); // ['III','IV',...] — purely for the rank label flavour
    for (let i = 0; i < ACCESS_SEED.length; i++) {
      const digit = Number(ACCESS_SEED[i]);
      const ln = doc.createElement('div');
      ln.className = 'cqm-acc-ln';
      const rk = doc.createElement('span');
      rk.className = 'rk';
      rk.textContent = `L${String(i + 1).padStart(2, '0')}`;
      const ta = doc.createElement('span');
      ta.className = 'ta';
      ta.textContent = '▮'.repeat(digit); // the tally count IS the digit (the line-count logic)
      ta.title = romans[i] ?? ''; // hover reveals the Roman, for the curious
      const nz = doc.createElement('span');
      nz.className = 'nz';
      ln.append(rk, ta, nz);
      host.appendChild(ln);
      this.noiseEls.push(nz);
    }
    this.scramble();
  }

  /** Fill the noise fields with deterministic glyph garbage (re-rolled every 5s while open). */
  private scramble(): void {
    const rng = mulberry32(0x5eed ^ (this.rngN++ * 2654435761));
    for (const nz of this.noiseEls) {
      let s = '';
      const len = 14 + Math.floor(rng() * 16);
      for (let i = 0; i < len; i++) s += GLYPHS[Math.floor(rng() * GLYPHS.length)] ?? '·';
      nz.textContent = s;
    }
  }

  private open(): void {
    if (this.solved) return; // already unlocked — stays granted
    if (this.modal.classList.contains('open')) return; // re-entry guard — a 2nd open() would leak a 2nd timer pair
    this.modal.classList.add('open');
    this.input.focus();
    this.deniedIdx = 0;
    this.langTimer = setInterval(() => {
      this.deniedIdx = (this.deniedIdx + 1) % DENIED.length;
      this.deniedEl.textContent = DENIED[this.deniedIdx] ?? 'ACCESS DENIED';
    }, 1400);
    this.scrambleTimer = setInterval(() => this.scramble(), 5000); // "retry every 5 seconds"
  }

  private close(): void {
    this.modal.classList.remove('open');
    if (this.langTimer) clearInterval(this.langTimer);
    if (this.scrambleTimer) clearInterval(this.scrambleTimer);
    this.langTimer = this.scrambleTimer = null;
  }

  private submit(): void {
    if (this.solved) return;
    if (checkAccessCode(this.input.value)) {
      this.grant();
      return;
    }
    this.attempts++;
    this.attemptsEl.textContent = `ATTEMPTS: ${this.attempts}`;
    this.box.classList.remove('bad');
    void this.box.offsetWidth; // reflow → replay the shake
    this.box.classList.add('bad');
  }

  /** Correct code — stop the denial loop, show ACCESS GRANTED, and signal the world to reveal #2. */
  private grant(): void {
    this.solved = true;
    this.toggle.classList.add('solved');
    this.toggle.textContent = '✓ ACCESS GRANTED';
    this.toggle.title = 'Access already granted — the 2nd super creature is active';
    this.toggle.setAttribute('aria-label', 'Access already granted');
    if (this.langTimer) clearInterval(this.langTimer);
    if (this.scrambleTimer) clearInterval(this.scrambleTimer);
    this.deniedEl.textContent = 'ACCESS GRANTED';
    this.deniedEl.style.color = '#7dffc0';
    this.deniedEl.style.animation = 'none';
    const box = this.box;
    box.innerHTML =
      `<div class="cqm-acc-grant">ACCESS GRANTED</div>` +
      `<div class="cqm-acc-sub">SECOND SUPER CREATURE RELEASED · SUPERHERO PROTOCOL ARMED</div>` +
      `<div class="cqm-acc-row" style="justify-content:center"><button class="cqm-acc-go" data-done>ENTER THE WORLD</button></div>`;
    (box.querySelector('[data-done]') as HTMLElement).addEventListener('click', () => this.close());
    window.dispatchEvent(
      new CustomEvent('cqm:superhero-unlock', { detail: { seed: ACCESS_SEED } }),
    );
  }
}

/** Self-mount the access terminal (idempotent). Called from the client entry. */
export function mountAccessPuzzle(doc: Document = document): void {
  new AccessPuzzle(doc);
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  mountAccessPuzzle(document);
}
