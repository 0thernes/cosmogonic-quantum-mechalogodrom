/**
 * Runtime linear resource tokens for CQM simulations (RFC-D MVP v0).
 *
 * Simulation / economic invariant only — not a cryptographic or physics claim.
 * See docs/rfcs/RFC-D.md.
 */
export type ResourceId = string & { readonly __brand: "ResourceId" };

export class LinearResource {
  readonly id: ResourceId;
  #alive = true;
  #held = false;

  constructor(id: string) {
    this.id = id as ResourceId;
  }

  get alive(): boolean {
    return this.#alive;
  }

  /** True while this token sits in exactly one Inventory. */
  get held(): boolean {
    return this.#held;
  }

  /** @internal Inventory.put */
  _markHeld(): void {
    if (this.#held) {
      throw new Error("RFC-D: resource already held by an inventory");
    }
    if (!this.#alive) {
      throw new Error("RFC-D: put consumed resource");
    }
    this.#held = true;
  }

  /** @internal Inventory.take */
  _markUnheld(): void {
    this.#held = false;
  }

  /** Retire the token (measure / sink). Must not be inventory-held. */
  consume(): { classical: number } {
    if (this.#held) {
      throw new Error("RFC-D: consume while held — take() from inventory first");
    }
    if (!this.#alive) {
      throw new Error("RFC-D: use-after-consume on LinearResource");
    }
    this.#alive = false;
    return { classical: 1 };
  }
}

/** Forbidden: no-cloning at the sim layer. */
export function cloneLinearResource(_r: LinearResource): LinearResource {
  throw new Error("RFC-D: no-cloning — cloneLinearResource is forbidden");
}

/** Move ownership; source is consumed. Source must not be inventory-held. */
export function moveLinearResource(from: LinearResource): LinearResource {
  if (from.held) {
    throw new Error("RFC-D: move while held — take() from inventory first");
  }
  if (!from.alive) {
    throw new Error("RFC-D: move from consumed resource");
  }
  const next = new LinearResource(`${String(from.id)}->moved`);
  from.consume();
  return next;
}

/** Bag of linear resources. Wholesale copy is rejected. */
export class Inventory {
  #items = new Map<string, LinearResource>();

  put(r: LinearResource): void {
    r._markHeld();
    if (this.#items.has(String(r.id))) {
      r._markUnheld();
      throw new Error("RFC-D: duplicate id in inventory");
    }
    this.#items.set(String(r.id), r);
  }

  take(id: string): LinearResource {
    const r = this.#items.get(id);
    if (!r) {
      throw new Error(`RFC-D: missing resource ${id}`);
    }
    this.#items.delete(id);
    r._markUnheld();
    return r;
  }

  get size(): number {
    return this.#items.size;
  }

  /**
   * Explicitly unsupported. Linear bags are not copyable.
   * Prefer transfer() / take()+put() between inventories.
   */
  copy(): Inventory {
    throw new Error("RFC-D: no-cloning — Inventory.copy is forbidden");
  }
}

/** Move one id from `from` to `to` (no clone). Rejects self-transfer. */
export function transfer(from: Inventory, to: Inventory, id: string): void {
  if (from === to) {
    throw new Error("RFC-D: transfer to self is forbidden");
  }
  to.put(from.take(id));
}
