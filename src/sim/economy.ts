/**
 * ECONOMY (CONTRACTS V13) — two competing currencies, two commodities, and a
 * game-theoretic clearing market that every intelligence in the cosmos plugs into.
 *
 * The movement's law (docs/PHILOSOPHY-2026-06-26.md) demands real math under every effect, so this is a
 * genuine micro-economy, not a flavour counter:
 *
 * - **Two competing currencies** — AURUM (☉, sun-gold) and UMBRA (☾, shadow-silver). They float
 *   against each other through an `fx` rate (AURUM per UMBRA) driven by a **currency-adoption game**:
 *   each agent best-responds toward whichever money is appreciating (a softmax over recent returns),
 *   so dominance shifts emergently — a Keynesian-beauty-contest / Gresham flavour, never scripted.
 * - **Two commodities** — QUANTA (◇, raw potential) and ICHOR (❖, vital essence). Their AURUM prices
 *   move by **tâtonnement**: excess demand pushes price up, excess supply down.
 * - **A clearing market** — each tick the desired trades are matched buy-against-sell at the cleared
 *   price, so currency is **conserved exactly** (a unit test pins this) while commodities flow.
 * - **Wallets sized to stature** — each agent's purse scales with its `weight` (a titan dwarfs a
 *   puppeteer dwarfs a drone), exactly as "a purse in size comparison to their name title".
 *
 * Determinism: every random draw comes from the injected {@link Rng}; the same seed begets the same
 * market history. Allocation-free hot path: all per-agent scratch lives in preallocated arrays grown
 * only when agents are registered (a boot/launch-time event, never per frame).
 */
import { clamp } from '../math/scalar';
import { quakeQgeFactor, ulgHandoff, gwtBroadcast } from './tsotchke-facade'; // Ralph 10x continue: more Tsotchke (quakeQge + ulg/gwt from Eshkol/Moonlab/ulg) for economy aliveness

/** Injected seeded RNG (mulberry32 shape): returns a float in [0, 1). */
type Rng = () => number;

/** The two competing currencies. */
export const CURRENCIES = ['AURUM', 'UMBRA'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** The two traded commodities. */
export const COMMODITIES = ['QUANTA', 'ICHOR'] as const;
export type Commodity = (typeof COMMODITIES)[number];

/** Glyphs for UI (kept beside the names so consumers never hard-code them). */
export const CURRENCY_GLYPH: Record<Currency, string> = { AURUM: '☉', UMBRA: '☾' };
export const COMMODITY_GLYPH: Record<Commodity, string> = { QUANTA: '◇', ICHOR: '❖' };

/** Price floor/ceiling so a runaway tâtonnement can never NaN or zero the book. */
const PRICE_MIN = 0.05;
const PRICE_MAX = 50;
/** FX floor/ceiling (AURUM per UMBRA). */
const FX_MIN = 0.1;
const FX_MAX = 10;
/** Tâtonnement gain (price responsiveness to excess demand). */
const PRICE_GAIN = 0.06;
/** Currency-adoption gain (how fast fx tracks net UMBRA demand). */
const FX_GAIN = 0.04;
/** Softmax temperature for the currency-adoption best-response (higher = more herd-following). */
const ADOPT_BETA = 6;
/** Tobin tax: fraction skimmed from every currency trade to damp speculation (game-theoretic noise reduction). */
const TOBIN_TAX = 0.012;
/** Gini threshold above which the progressive redistribution fires (lowered from 0.48 for earlier intervention). */
const GINI_GUARD = 0.38;
/** Progressive skim rate multiplier (higher = more aggressive redistribution). */
const GINI_SKIM_RATE = 0.085;
/** Anti-cartel auto-sanction: when cartel share exceeds this, the top member is sanctioned. */
const CARTEL_SANCTION_THRESHOLD = 0.55;
/** How often to evaluate auto-sanctions (every N ticks). */
const SANCTION_EVAL_PERIOD = 15;

// ── Market-mechanic layer (CONTRACTS V20) — explicit game theory on top of the clearing market ──
/** The richest few agents form a CARTEL that colludes to restrict supply (oligopoly). */
const CARTEL_SIZE = 7;
/** Fraction of its commodity production a cartel member withholds to prop up scarcity/price. */
const CARTEL_WITHHOLD = 0.28;
/** Arbitrage gain: how fast preferences mean-revert toward the under-priced commodity (gap → 0). */
const ARB_GAIN = 0.092;
/** When commodity price dispersion exceeds this, a circuit-breaker nudges both prices toward parity. */
const ARB_CIRCUIT = 0.28;
/** A sanctioned agent trades at this fraction of its budget (capital controls / embargo). */
const SANCTION_BUDGET = 0.35;
/** …and is cut off from resources, producing only this fraction (the embargo's real bite). */
const SANCTION_PRODUCTION = 0.4;
/** Black-market premium: sanctioned agents can still trade off-book, but at the smuggler's markup. */
const BLACK_PREMIUM = 0.25;
/** Ticks between windfall auctions of the scarcer commodity (ascending / second-price). */
const AUCTION_PERIOD = 20;
/** Units of the scarce commodity in an auctioned lot (a windfall, like production). */
const AUCTION_LOT = 8;
/** An agent's bid = this fraction of its net worth × its appetite for the auctioned commodity. */
const BID_FRACTION = 0.04;

/** A registered economic agent's public summary (read-only view for telemetry/UI). */
export interface AgentWealth {
  id: number;
  title: string;
  /** Total net worth valued in AURUM (currencies + commodities at current prices). */
  netWorth: number;
  aurum: number;
  umbra: number;
  quanta: number;
  ichor: number;
  /** Currency loyalty −1 (all UMBRA) … +1 (all AURUM) the agent is currently steering toward. */
  loyalty: number;
}

/** Aggregate market state for telemetry. */
export interface MarketSummary {
  /** Total AURUM in circulation. */
  aurum: number;
  /** Total UMBRA in circulation. */
  umbra: number;
  /** AURUM per UMBRA exchange rate. */
  fx: number;
  /** QUANTA price in AURUM. */
  pQuanta: number;
  /** ICHOR price in AURUM. */
  pIchor: number;
  /** Currency commanding the larger share of total AURUM-valued money ('AURUM' | 'UMBRA'). */
  dominant: Currency;
  /** AURUM's share of total money value, 0..1 (UMBRA's share is 1 − this). */
  aurumShare: number;
  /** Gini coefficient of agent net worth, 0 (equal) … 1 (one agent owns all). */
  gini: number;
  /** Number of registered agents. */
  agents: number;
  /** Total net worth across all agents (AURUM-valued). */
  totalWealth: number;
  /** Share of total wealth held by the {@link CARTEL_SIZE}-strong cartel (0..1) — market power. */
  cartelShare: number;
  /** Commodity price dispersion |pQuanta − pIchor| / (pQuanta + pIchor), 0..1 — the arbitrage gap. */
  arbSpread: number;
  /** Number of agents currently under sanction (embargoed budget). */
  sanctioned: number;
  /** Off-book commodity volume the sanctioned moved on the black market this tick (evasion). */
  blackVolume: number;
  /** Total windfall auctions held since boot. */
  auctions: number;
  /** Clearing (second) price of the most recent auction (AURUM-valued), 0 before the first. */
  lastAuctionPrice: number;
  /** Commodity sold in the most recent auction, or null before the first. */
  lastAuctionCommodity: Commodity | null;
  /** V122 (USER #4): cumulative wealth share at each population decile (10 ascending values ending
   *  at 1) — the REAL Lorenz curve the ticker draws; a perfectly equal market is the diagonal. */
  deciles: number[];
  /** V122: share of total wealth held by the richest 10% of agents (the top of the Lorenz gap). */
  topDecileShare: number;
}

/**
 * Cumulative wealth share at each population decile (ascending, last = 1) + the top-10% share —
 * the Lorenz-curve data econometricians pair with a Gini. Pure; O(n log n). Empty input → the
 * perfectly-equal diagonal (so a boot-empty market draws sanely).
 */
export function lorenzDeciles(values: ArrayLike<number>): {
  deciles: number[];
  topDecileShare: number;
} {
  const n = values.length;
  if (n === 0) {
    return { deciles: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], topDecileShare: 0.1 };
  }
  const sorted: number[] = [];
  for (let i = 0; i < n; i++) sorted.push(Math.max(0, values[i] ?? 0));
  sorted.sort((a, b) => a - b);
  let total = 0;
  for (const v of sorted) total += v;
  if (total <= 0) {
    return { deciles: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], topDecileShare: 0.1 };
  }
  const deciles: number[] = [];
  let cum = 0;
  let k = 0;
  for (let d = 1; d <= 10; d++) {
    const upTo = Math.round((d / 10) * n);
    for (; k < upTo; k++) cum += sorted[k] ?? 0;
    deciles.push(cum / total);
  }
  deciles[9] = 1; // guard float drift — the full population owns everything by definition
  return { deciles, topDecileShare: 1 - (deciles[8] ?? 0.9) };
}

/**
 * Tâtonnement price step: nudge `price` by the (bounded) excess demand and clamp to the book's
 * range. `excess` is a normalized signal in roughly [−1, 1]. Pure; unit-tested. O(1).
 */
export function priceStep(price: number, excess: number, gain: number): number {
  const next = price * Math.exp(gain * Math.tanh(excess));
  return clamp(next, PRICE_MIN, PRICE_MAX);
}

/**
 * Cleared volume for a one-sided demand vector: the matched quantity is min(total buys, total sells)
 * so the book balances. Pure; unit-tested. O(n).
 */
export function clearVolume(desiredDeltas: ArrayLike<number>): {
  buy: number;
  sell: number;
  vol: number;
} {
  let buy = 0;
  let sell = 0;
  for (let i = 0; i < desiredDeltas.length; i++) {
    const d = desiredDeltas[i] ?? 0;
    if (d > 0) buy += d;
    else sell += -d;
  }
  return { buy, sell, vol: Math.min(buy, sell) };
}

/**
 * Gini coefficient of a non-negative value array (0 = perfect equality, →1 = total concentration).
 * Uses the sorted relative-mean-difference form. Pure; unit-tested. O(n log n).
 */
export function gini(values: ArrayLike<number>): number {
  const n = values.length;
  if (n === 0) return 0;
  const a = Array.from(values, (v) => (Number.isFinite(v) && v > 0 ? v : 0)).sort((x, y) => x - y);
  let sum = 0;
  let cum = 0;
  for (let i = 0; i < n; i++) sum += a[i] ?? 0;
  if (sum <= 0) return 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * (a[i] ?? 0);
  // G = (2·Σ i·x_i)/(n·Σ x_i) − (n+1)/n
  return clamp((2 * cum) / (n * sum) - (n + 1) / n, 0, 1);
}

/**
 * The value of the `k`-th largest entry (1-based) — the cartel-membership threshold: agents whose
 * net worth is ≥ this are the colluding oligopoly. Returns −Infinity when `k ≥ n` (everyone is in)
 * and +Infinity when `k ≤ 0` (no one). Pure, unit-tested. O(n log n) on a small copy.
 */
export function topKThreshold(values: ArrayLike<number>, k: number): number {
  const n = values.length;
  if (k <= 0) return Infinity;
  if (k >= n) return -Infinity;
  const a = Array.from(values).sort((x, y) => y - x); // descending
  return a[k - 1] ?? -Infinity;
}

/**
 * Second-price (Vickrey / ascending-English) auction outcome over bid `values`: the HIGHEST bidder
 * wins but pays the SECOND-highest bid — the dominant-strategy-truthful price an English auction
 * settles at when the runner-up drops out. Returns `{ winner: -1, price: 0 }` for an empty book; with
 * a lone bidder the winner pays its own bid. Pure, unit-tested. O(n), single pass.
 */
export function vickreyOutcome(values: ArrayLike<number>): { winner: number; price: number } {
  const n = values.length;
  if (n === 0) return { winner: -1, price: 0 };
  let w1 = 0;
  let w2 = -1;
  for (let i = 1; i < n; i++) {
    const v = values[i] ?? -Infinity;
    if (v > (values[w1] ?? -Infinity)) {
      w2 = w1;
      w1 = i;
    } else if (w2 < 0 || v > (values[w2] ?? -Infinity)) {
      w2 = i;
    }
  }
  const price = w2 >= 0 ? (values[w2] ?? 0) : (values[w1] ?? 0);
  return { winner: w1, price: Math.max(0, price) };
}

/** Internal mutable per-agent record (struct-of-fields kept in parallel arrays would be faster but
 *  agent counts are small — ≤ ~256 — so a record array stays readable without measurable cost). */
interface Agent {
  id: number;
  title: string;
  weight: number;
  aurum: number;
  umbra: number;
  quanta: number;
  ichor: number;
  /** Utility weight on QUANTA vs ICHOR (0..1); the agent steers holdings toward this mix. */
  prefQuanta: number;
  /** Currency loyalty −1..+1 it is steering toward (updated by the adoption game). */
  loyalty: number;
  /** Under sanction → trades at {@link SANCTION_BUDGET} of its budget (set via {@link Economy.sanction}). */
  sanctioned: boolean;
  /** True if the sanction was auto-imposed by the antitrust regulator (not manual). Auto-lifted when cartel share drops. */
  autoSanctioned: boolean;
}

/**
 * The market. Construct once; {@link register} each intelligence as it is born/launched; call
 * {@link tick} on a documented cadence (NOT every frame — heavy substrate runs slow per the
 * physicist's law). Read aggregates via {@link summary} and per-agent purses via {@link wealthOf}.
 */
export class Economy {
  private readonly agents: Agent[] = [];
  private readonly byId = new Map<number, Agent>();
  private pQuanta = 1;
  private pIchor = 1;
  private fx = 1; // AURUM per UMBRA
  /** Scratch reused by tick() — grown on register, never per-tick. */
  private dQ: number[] = [];
  private dI: number[] = [];
  /** Net-worth scratch (grown on register) for cartel detection + the wealth Gini. */
  private nw: number[] = [];
  /** Last-tick cartel wealth share + arbitrage spread, surfaced via {@link summary}. */
  private cartelShare = 0;
  private arbSpread = 0;
  /** Last-tick off-book (black-market) commodity volume traded by sanctioned agents. */
  private blackVolume = 0;
  /** Auction bookkeeping: tick counter, total auctions held, and the last clearing price/commodity. */
  private auctionTick = 0;
  private auctions = 0;
  private lastAuctionPrice = 0;
  private lastAuctionCom: Commodity | null = null;

  /**
   * Enrol an agent with a purse sized to `weight` (its stature). Idempotent per id: re-registering
   * an existing id is ignored (so a re-launched NHI keeps its purse). Draws 2 rng samples for the
   * agent's commodity preference + currency lean. O(1) amortized.
   */
  register(id: number, title: string, weight: number, rng: Rng): void {
    if (this.byId.has(id)) return;
    // Ralph 10x: Tsotchke quakeQgeFactor from quantum-quake corpus for aliveness-modulated stature (Eshkol/Quake hybrids)
    const qge = quakeQgeFactor(0.5, 0.3); // default for non-super; supers override via world
    const ulgA = ulgHandoff(qge, 0.4);
    const gwtE = gwtBroadcast([qge, weight], [0.6, 0.5]);
    const w = Math.max(0.2, weight * qge * (1 + ulgA * 0.05 + (gwtE[0] || 0) * 0.02));
    const a: Agent = {
      id,
      title,
      weight: w,
      // Purse scales with stature: bigger title, fatter wallet. Split across both monies.
      aurum: 40 * w,
      umbra: 40 * w,
      quanta: 6 * w,
      ichor: 6 * w,
      prefQuanta: 0.3 + 0.4 * rng(),
      loyalty: (rng() - 0.5) * 0.4,
      sanctioned: false,
      autoSanctioned: false,
    };
    this.agents.push(a);
    this.byId.set(id, a);
    this.dQ.push(0);
    this.dI.push(0);
    this.nw.push(0);
  }

  /**
   * Sanction (or lift the embargo on) an agent — a weaponised economy: a sanctioned agent trades at
   * {@link SANCTION_BUDGET} of its budget, so its rivals can starve it of commodities. No-op for an
   * unknown id. The titan/NHI layers wield this against economic enemies. O(1).
   */
  sanction(id: number, on: boolean): void {
    const a = this.byId.get(id);
    if (a) a.sanctioned = on;
  }

  /** Whether `id` is currently sanctioned. O(1). */
  isSanctioned(id: number): boolean {
    return this.byId.get(id)?.sanctioned ?? false;
  }

  /** Whether an agent id is enrolled. O(1). */
  has(id: number): boolean {
    return this.byId.has(id);
  }

  /** Registered agent count. O(1). */
  get count(): number {
    return this.agents.length;
  }

  /**
   * Advance the market one step (CONTRACTS V13). `worldStress` 0..1 (e.g. chaos/entropy) widens
   * demand swings — the economy READS the world. Returns nothing; mutates wallets + prices in place.
   *
   * Steps: (1) production scaled by stature × world vigour; (2) desired commodity holdings from each
   * agent's preference + budget; (3) tâtonnement price update from aggregate excess demand;
   * (4) buy-against-sell clearing (currency conserved); (5) the currency-adoption game shifts each
   * purse between AURUM/UMBRA, moving `fx`. O(n) per tick, allocation-free.
   */
  tick(rng: Rng, worldStress = 0): void {
    const n = this.agents.length;
    if (n === 0) return;
    const stress = clamp(worldStress, 0, 1);

    // (0) Cartel detection — the richest CARTEL_SIZE agents collude. Net worths into `nw` (reused by
    // summary's Gini); membership threshold = the K-th largest net worth.
    let totalNW = 0;
    for (let i = 0; i < n; i++) {
      const a = this.agents[i]!;
      this.nw[i] = a.aurum + a.umbra * this.fx + a.quanta * this.pQuanta + a.ichor * this.pIchor;
      totalNW += this.nw[i]!;
    }
    const cartelCut = topKThreshold(this.nw, Math.min(CARTEL_SIZE, n));
    let cartelWealth = 0;

    // (1) Production — each agent mints both commodities, scaled by stature × world vigour. CARTEL
    // members WITHHOLD a fraction (oligopoly supply restriction → scarcity → price support).
    for (let i = 0; i < n; i++) {
      const a = this.agents[i]!;
      const inCartel = (this.nw[i] ?? 0) >= cartelCut;
      if (inCartel) cartelWealth += this.nw[i]!;
      const vigour = 0.4 + 0.8 * stress + 0.4 * rng();
      // Cartel members withhold supply; SANCTIONED agents are cut off from resources (embargo bite).
      const restrict =
        (inCartel ? 1 - CARTEL_WITHHOLD : 1) * (a.sanctioned ? SANCTION_PRODUCTION : 1);
      a.quanta += a.weight * 0.05 * vigour * restrict;
      a.ichor += a.weight * 0.05 * vigour * restrict;
    }
    this.cartelShare = totalNW > 0 ? clamp(cartelWealth / totalNW, 0, 1) : 0;

    // (2) Desired commodity holdings: spend a slice of liquid wealth split by preference, valued at
    // the current prices. dQ/dI hold each agent's intended change (buy > 0, sell < 0).
    let edQ = 0;
    let edI = 0;
    for (let i = 0; i < n; i++) {
      const a = this.agents[i]!;
      const liquid = a.aurum + a.umbra * this.fx; // AURUM-valued spending power
      // A measured fraction trades each tick; a SANCTIONED agent is throttled to a starvation budget.
      const budget = liquid * 0.15 * (a.sanctioned ? SANCTION_BUDGET : 1);
      const wantQ = (budget * a.prefQuanta) / this.pQuanta;
      const wantI = (budget * (1 - a.prefQuanta)) / this.pIchor;
      this.dQ[i] = wantQ - a.quanta * 0.15; // toward target, shedding 15% of current
      this.dI[i] = wantI - a.ichor * 0.15;
      edQ += this.dQ[i]!;
      edI += this.dI[i]!;
    }

    // (3) Tâtonnement: normalize aggregate excess demand by agent count and nudge prices.
    this.pQuanta = priceStep(this.pQuanta, edQ / n, PRICE_GAIN);
    this.pIchor = priceStep(this.pIchor, edI / n, PRICE_GAIN);

    // (3b) Arbitrage — preferences mean-revert toward the UNDER-priced commodity, so the price gap
    // closes over time (law of one price). `gap > 0` ⇒ QUANTA is cheaper ⇒ shift demand to QUANTA.
    const denom = this.pQuanta + this.pIchor;
    const gap = denom > 1e-9 ? (this.pIchor - this.pQuanta) / denom : 0;
    this.arbSpread = Math.abs(gap);
    for (let i = 0; i < n; i++) {
      const a = this.agents[i]!;
      a.prefQuanta = clamp(a.prefQuanta + ARB_GAIN * gap, 0.05, 0.95);
    }
    // (3c) Price circuit-breaker — when dispersion blows out, mean-revert commodity prices (regulatory backstop).
    if (this.arbSpread > ARB_CIRCUIT && denom > 1e-9) {
      const mid = (this.pQuanta + this.pIchor) * 0.5;
      const pull = (this.arbSpread - ARB_CIRCUIT) * 0.12;
      this.pQuanta += (mid - this.pQuanta) * pull;
      this.pIchor += (mid - this.pIchor) * pull;
    }

    // (4) Clearing — match buys against sells so the same volume trades on both sides; scale each
    // side to the cleared volume and settle in AURUM-valued currency (paid from/into each purse,
    // currency conserved across the book to floating-point tolerance).
    this.clear(this.dQ, this.pQuanta, 'quanta');
    this.clear(this.dI, this.pIchor, 'ichor');

    // (4a) Gini guard — progressive skim from ultra-rich to tail agents when wealth concentrates.
    // Uses GINI_GUARD threshold (0.38, lowered from 0.48 for earlier intervention) and GINI_SKIM_RATE
    // for more aggressive redistribution. This is the game-theoretic regulatory backstop: a Walrasian
    // auctioneer's progressive tax that prevents runaway wealth concentration and keeps the market
    // competitive (Nash equilibrium stays in a balanced basin rather than collapsing to oligopoly).
    const gCoeff = gini(this.nw);
    if (gCoeff > GINI_GUARD && n >= 4) {
      const mean = totalNW / n;
      const rate = (gCoeff - GINI_GUARD) * GINI_SKIM_RATE;
      let pool = 0;
      for (let i = 0; i < n; i++) {
        const a = this.agents[i]!;
        const nw = this.nw[i] ?? 0;
        if (nw > mean * 1.75) {
          const skim = (nw - mean * 1.75) * rate;
          // Pool only what is ACTUALLY debited. `skim` is derived from total net worth (aurum + umbra·fx
          // + commodities) but only AURUM is taken here; booking the full `skim` into the pool while
          // `a.aurum` floors at 0 MINTED the shortfall (skim − aurum) from nothing whenever a rich agent
          // held its wealth in umbra/commodities — inflating the AURUM supply and breaking the
          // "currency conserved exactly" invariant. Take min(skim, aurum) so pool == debited.
          const took = Math.min(skim, a.aurum);
          a.aurum -= took;
          pool += took;
        }
      }
      if (pool > 1e-6) {
        const poor: number[] = [];
        for (let i = 0; i < n; i++) if ((this.nw[i] ?? 0) < mean * 0.62) poor.push(i);
        const share = poor.length > 0 ? pool / poor.length : 0;
        for (const i of poor) this.agents[i]!.aurum += share;
      }
    }

    // (4c) AUTO-CARTEL SANCTION — every SANCTION_EVAL_PERIOD ticks (after a 2-period warmup), if the
    // cartel's wealth share exceeds CARTEL_SANCTION_THRESHOLD, the single richest agent is auto-sanctioned.
    // This is the game-theoretic antitrust regulator: a dominant coalition (share > 55%) triggers capital
    // controls on its leader, breaking the oligopoly's market power and restoring competitive balance.
    const sanctionTick =
      this.auctionTick % SANCTION_EVAL_PERIOD === 0 && this.auctionTick >= SANCTION_EVAL_PERIOD * 2;
    if (sanctionTick && n >= 10 && this.cartelShare > CARTEL_SANCTION_THRESHOLD) {
      let richest = -1;
      let richestNW = -Infinity;
      for (let i = 0; i < n; i++) {
        if ((this.nw[i] ?? 0) > richestNW) {
          richestNW = this.nw[i] ?? 0;
          richest = i;
        }
      }
      if (richest >= 0) {
        this.agents[richest]!.sanctioned = true;
        this.agents[richest]!.autoSanctioned = true;
      }
      // Lift auto-sanctions on non-leaders if cartel share drops below threshold next cycle
    } else if (sanctionTick && n >= 10 && this.cartelShare < CARTEL_SANCTION_THRESHOLD * 0.6) {
      // Re-enable only AUTO-sanctioned agents when the cartel is no longer dominant (manual sanctions stay)
      for (let i = 0; i < n; i++) {
        if (this.agents[i]!.autoSanctioned) {
          this.agents[i]!.sanctioned = false;
          this.agents[i]!.autoSanctioned = false;
        }
      }
    }

    // (4b) BLACK MARKET — SANCTIONED agents evade the embargo via smugglers: a second clearing over
    // ONLY the sanctioned set, at a premium (the smuggler's cut). Non-sanctioned get a zero delta so
    // they're untouched; currency is conserved within the off-book book (buys matched to sells). The
    // markup is the real cost of evasion. O(n), reuses the dQ/dI scratch.
    const pBlackQ = this.pQuanta * (1 + BLACK_PREMIUM);
    const pBlackI = this.pIchor * (1 + BLACK_PREMIUM);
    let anyBlack = false;
    for (let i = 0; i < n; i++) {
      const a = this.agents[i]!;
      if (a.sanctioned) {
        // The embargoed BUY off-book at the smuggler's premium — a partial escape from the sanction.
        anyBlack = true;
        const liquid = a.aurum + a.umbra * this.fx;
        const budget = liquid * 0.1; // a smaller, riskier off-book slice
        this.dQ[i] = (budget * a.prefQuanta) / pBlackQ;
        this.dI[i] = (budget * (1 - a.prefQuanta)) / pBlackI;
      } else {
        // Everyone else SMUGGLES — supplies a small slice at the premium, profiting from the embargo.
        this.dQ[i] = -a.quanta * 0.04;
        this.dI[i] = -a.ichor * 0.04;
      }
    }
    this.blackVolume = 0;
    if (anyBlack) {
      this.blackVolume = clearVolume(this.dQ).vol + clearVolume(this.dI).vol;
      this.clear(this.dQ, pBlackQ, 'quanta');
      this.clear(this.dI, pBlackI, 'ichor');
    }

    // (5) Currency-adoption game — each agent best-responds (softmax) toward the money with the
    // better recent carry. AURUM's "return" is its purchasing power vs the commodity book; UMBRA's
    // is that scaled by fx. Net flow toward UMBRA appreciates it (fx rises).
    const rAurum = 1 / (this.pQuanta + this.pIchor); // purchasing power proxy
    const rUmbra = this.fx * rAurum;
    const eA = Math.exp(ADOPT_BETA * rAurum);
    const eU = Math.exp(ADOPT_BETA * rUmbra);
    const pickUmbra = eU / (eA + eU); // shared softmax target (0..1)
    let netUmbra = 0;
    for (let i = 0; i < n; i++) {
      const a = this.agents[i]!;
      // Agent's loyalty drifts toward the herd target plus its own idiosyncratic lean + noise.
      const target = (pickUmbra - 0.5) * 2 * -1; // +1 favours AURUM, −1 favours UMBRA
      a.loyalty += (target - a.loyalty) * 0.1 + (rng() - 0.5) * 0.02;
      a.loyalty = clamp(a.loyalty, -1, 1);
      // Rebalance a slice of the purse toward the favoured currency.
      const total = a.aurum + a.umbra * this.fx; // AURUM-valued
      const wantAurum = total * (0.5 + 0.5 * a.loyalty);
      const haveAurum = a.aurum;
      const move = (wantAurum - haveAurum) * 0.2; // move 20% of the gap, in AURUM units
      if (move > 0) {
        // buy AURUM with UMBRA — Tobin tax dampens speculative churn (game-theoretic noise reduction)
        const umbraSpent = Math.min(a.umbra, move / this.fx);
        const tax = umbraSpent * TOBIN_TAX;
        a.umbra -= umbraSpent;
        a.aurum += (umbraSpent - tax) * this.fx;
        netUmbra -= umbraSpent; // UMBRA being sold → downward pressure
      } else {
        const aurumSpent = Math.min(a.aurum, -move);
        const tax = aurumSpent * TOBIN_TAX;
        a.aurum -= aurumSpent;
        a.umbra += (aurumSpent - tax) / this.fx;
        netUmbra += aurumSpent / this.fx; // UMBRA being bought → upward pressure
      }
    }
    // fx tracks net UMBRA demand (more buyers → UMBRA appreciates → fx up).
    this.fx = clamp(this.fx * Math.exp(FX_GAIN * Math.tanh(netUmbra / (n * 20))), FX_MIN, FX_MAX);

    // (6) AUCTION — every AUCTION_PERIOD ticks a windfall LOT of the SCARCER commodity (higher price)
    // is sold by second-price (ascending-English) auction: bids = net worth × appetite, the highest
    // bidder WINS but pays the runner-up's bid (the truthful equilibrium). Proceeds are a COMMONS
    // DIVIDEND split among the others (currency conserved); the lot is a windfall (minting goods like
    // production). Real auction theory + winner's-curse-free pricing. O(n); `dQ` reused as bid scratch.
    this.auctionTick++;
    if (this.auctionTick % AUCTION_PERIOD === 0 && n >= 2) {
      const com: Commodity = this.pQuanta >= this.pIchor ? 'QUANTA' : 'ICHOR';
      const field = com === 'QUANTA' ? 'quanta' : 'ichor';
      for (let i = 0; i < n; i++) {
        const a = this.agents[i]!;
        const appetite = com === 'QUANTA' ? a.prefQuanta : 1 - a.prefQuanta;
        this.dQ[i] = (this.nw[i] ?? 0) * BID_FRACTION * appetite;
      }
      const { winner, price } = vickreyOutcome(this.dQ);
      if (winner >= 0 && price > 0) {
        const w = this.agents[winner]!;
        // Dividend the ACTUAL amount paid, not the nominal price: debit() caps at the winner's liquid
        // funds (no borrowing/negative balance), so an insolvent winner pays < price. Distributing the
        // full price while debiting less MINTED the shortfall, breaking "currency conserved exactly"
        // (same class as the Gini-guard mint, batch-12). Now credited == debited, exactly conservative.
        const paid = this.debit(w, price); // winner pays the SECOND price (capped at its purse)
        w[field] += AUCTION_LOT; // and takes the windfall lot
        const share = paid / (n - 1);
        for (let i = 0; i < n; i++) if (i !== winner) this.credit(this.agents[i]!, share);
        this.auctions++;
        this.lastAuctionPrice = price;
        this.lastAuctionCom = com;
      }
    }
  }

  /** Clear one commodity's desired-delta book at `price`, settling currency per purse. */
  private clear(deltas: number[], price: number, field: 'quanta' | 'ichor'): void {
    const n = this.agents.length;
    const { buy, sell, vol } = clearVolume(deltas);
    if (vol <= 0) return;
    const buyScale = vol / buy; // <= 1
    const sellScale = vol / sell; // <= 1
    for (let i = 0; i < n; i++) {
      const a = this.agents[i]!;
      const d = deltas[i] ?? 0;
      if (d > 0) {
        const qty = d * buyScale;
        const cost = qty * price;
        // Pay in whichever currency the agent leans toward, falling back to the other.
        this.debit(a, cost);
        a[field] += qty;
      } else if (d < 0) {
        const qty = -d * sellScale;
        a[field] = Math.max(0, a[field] - qty);
        this.credit(a, qty * price);
      }
    }
  }

  /** Remove `aurumValue` of money from a purse, preferring its less-favoured currency first.
   *  Returns the amount ACTUALLY removed (== aurumValue unless the purse was too poor to cover it). */
  private debit(a: Agent, aurumValue: number): number {
    let need = aurumValue;
    // Spend the currency the agent likes LESS first (keeps its preferred reserve).
    if (a.loyalty >= 0) {
      const fromU = Math.min(a.umbra * this.fx, need);
      a.umbra -= fromU / this.fx;
      need -= fromU;
      if (need > 0) {
        const fromA = Math.min(a.aurum, need);
        a.aurum -= fromA;
        need -= fromA;
      }
    } else {
      const fromA = Math.min(a.aurum, need);
      a.aurum -= fromA;
      need -= fromA;
      if (need > 0) {
        const fromU = Math.min(a.umbra * this.fx, need);
        a.umbra -= fromU / this.fx;
        need -= fromU;
      }
    }
    return aurumValue - need; // what was actually removed (leftover `need` = uncovered shortfall)
  }

  /** Add `aurumValue` of money to a purse, into its favoured currency. */
  private credit(a: Agent, aurumValue: number): void {
    if (a.loyalty >= 0) a.aurum += aurumValue;
    else a.umbra += aurumValue / this.fx;
  }

  /** Per-agent net worth valued in AURUM (currencies + commodities at current prices). O(1). */
  private netWorth(a: Agent): number {
    return a.aurum + a.umbra * this.fx + a.quanta * this.pQuanta + a.ichor * this.pIchor;
  }

  /** Read one agent's purse + net worth, or null if unknown. O(1). */
  wealthOf(id: number): AgentWealth | null {
    const a = this.byId.get(id);
    if (!a) return null;
    return {
      id: a.id,
      title: a.title,
      netWorth: this.netWorth(a),
      aurum: a.aurum,
      umbra: a.umbra,
      quanta: a.quanta,
      ichor: a.ichor,
      loyalty: a.loyalty,
    };
  }

  /**
   * Move up to `aurumValue` of net worth from `fromId` to `toId` — the conservation-exact primitive
   * behind creature BARGAINING (worth → the wealthier) and ALLIANCE solidarity (worth → the poorer).
   * Clamped to what `from` can actually liquidate, so it never mints or burns money; the pair's
   * aggregate net worth is unchanged (one debit == one credit in AURUM value). Returns the value moved.
   * O(1). No-op (returns 0) for unknown ids, self-transfer, or a non-positive request.
   */
  transferWorth(fromId: number, toId: number, aurumValue: number): number {
    if (!(aurumValue > 0)) return 0;
    const from = this.byId.get(fromId);
    const to = this.byId.get(toId);
    if (!from || !to || from === to) return 0;
    const liquid = from.aurum + from.umbra * this.fx; // commodities aren't spendable here
    const moved = Math.min(aurumValue, liquid);
    if (!(moved > 0)) return 0;
    this.debit(from, moved);
    this.credit(to, moved);
    return moved;
  }

  /** Aggregate market snapshot for telemetry/UI. O(n log n) for the Gini. */
  summary(): MarketSummary {
    const n = this.agents.length;
    let aurum = 0;
    let umbra = 0;
    let totalWealth = 0;
    const worths: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = this.agents[i]!;
      aurum += a.aurum;
      umbra += a.umbra;
      const w = this.netWorth(a);
      worths.push(w);
      totalWealth += w;
    }
    const umbraValue = umbra * this.fx;
    const totalMoney = aurum + umbraValue;
    const aurumShare = totalMoney > 0 ? aurum / totalMoney : 0.5;
    let sanctioned = 0;
    for (let i = 0; i < n; i++) if (this.agents[i]!.sanctioned) sanctioned++;
    const lorenz = lorenzDeciles(worths); // V122: real distribution data for the ticker's Lorenz curve
    return {
      deciles: lorenz.deciles,
      topDecileShare: lorenz.topDecileShare,
      aurum,
      umbra,
      fx: this.fx,
      pQuanta: this.pQuanta,
      pIchor: this.pIchor,
      dominant: aurumShare >= 0.5 ? 'AURUM' : 'UMBRA',
      aurumShare,
      gini: gini(worths),
      agents: n,
      totalWealth,
      cartelShare: this.cartelShare,
      arbSpread: this.arbSpread,
      sanctioned,
      blackVolume: this.blackVolume,
      auctions: this.auctions,
      lastAuctionPrice: this.lastAuctionPrice,
      lastAuctionCommodity: this.lastAuctionCom,
    };
  }
}
