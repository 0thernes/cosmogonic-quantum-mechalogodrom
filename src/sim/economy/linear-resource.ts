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

  constructor(id: string) {
    this.id = id as ResourceId;
  }

  get alive(): boolean {
    return this.#alive;
  }

  /** Retire the token (measure / sink). */
  consume(): { classical: number } {
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

/** Move ownership; source is consumed. */
export function moveLinearResource(from: LinearResource): LinearResource {
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
    if (!r.alive) {
      throw new Error("RFC-D: put consumed resource");
    }
    if (this.#items.has(String(r.id))) {
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
    return r;
  }

  get size(): number {
    return this.#items.size;
  }

  /**
   * Explicitly unsupported. Linear bags are not copyable.
   * Prefer move via take/put between inventories.
   */
  copy(): Inventory {
    throw new Error("RFC-D: no-cloning — Inventory.copy is forbidden");
  }
}
