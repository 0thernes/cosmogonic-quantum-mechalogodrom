/**
 * ECONOMY (CONTRACTS V13) — two competing currencies, two commodities, and a
 * game-theoretic clearing market that every intelligence in the cosmos plugs into.
 *
 * The movement's law (docs/PHILOSOPHY.md) demands real math under every effect, so this is a
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

// ── Market-mechanic layer (CONTRACTS V20) — explicit game theory on top of the clearing market ──
/** The richest few agents form a CARTEL that colludes to restrict supply (oligopoly). */
const CARTEL_SIZE = 5;
/** Fraction of its commodity production a cartel member withholds to prop up scarcity/price. */
const CARTEL_WITHHOLD = 0.45;
/** Arbitrage gain: how fast preferences mean-revert toward the under-priced commodity (gap → 0). */
const ARB_GAIN = 0.05;
/** A sanctioned agent trades at this fraction of its budget (capital controls / embargo). */
const SANCTION_BUDGET = 0.35;
/** …and is cut off from resources, producing only this fraction (the embargo's real bite). */
const SANCTION_PRODUCTION = 0.4;

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

  /**
   * Enrol an agent with a purse sized to `weight` (its stature). Idempotent per id: re-registering
   * an existing id is ignored (so a re-launched NHI keeps its purse). Draws 2 rng samples for the
   * agent's commodity preference + currency lean. O(1) amortized.
   */
  register(id: number, title: string, weight: number, rng: Rng): void {
    if (this.byId.has(id)) return;
    const w = Math.max(0.2, weight);
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

    // (4) Clearing — match buys against sells so the same volume trades on both sides; scale each
    // side to the cleared volume and settle in AURUM-valued currency (paid from/into each purse,
    // currency conserved across the book to floating-point tolerance).
    this.clear(this.dQ, this.pQuanta, 'quanta');
    this.clear(this.dI, this.pIchor, 'ichor');

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
        // buy AURUM with UMBRA
        const umbraSpent = Math.min(a.umbra, move / this.fx);
        a.umbra -= umbraSpent;
        a.aurum += umbraSpent * this.fx;
        netUmbra -= umbraSpent; // UMBRA being sold → downward pressure
      } else {
        const aurumSpent = Math.min(a.aurum, -move);
        a.aurum -= aurumSpent;
        a.umbra += aurumSpent / this.fx;
        netUmbra += aurumSpent / this.fx; // UMBRA being bought → upward pressure
      }
    }
    // fx tracks net UMBRA demand (more buyers → UMBRA appreciates → fx up).
    this.fx = clamp(this.fx * Math.exp(FX_GAIN * Math.tanh(netUmbra / (n * 20))), FX_MIN, FX_MAX);
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

  /** Remove `aurumValue` of money from a purse, preferring its less-favoured currency first. */
  private debit(a: Agent, aurumValue: number): void {
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
    return {
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
    };
  }
}
