import { describe, expect, test } from "bun:test";
import {
  Inventory,
  LinearResource,
  cloneLinearResource,
  moveLinearResource,
} from "../src/sim/economy/linear-resource";

describe("RFC-D linear resource economy (MVP v0)", () => {
  test("D1: cloneLinearResource is forbidden", () => {
    const r = new LinearResource("agent-0/q");
    expect(() => cloneLinearResource(r)).toThrow(/no-cloning/);
  });

  test("D2: consume then reuse throws", () => {
    const r = new LinearResource("agent-0/q");
    r.consume();
    expect(() => r.consume()).toThrow(/use-after-consume/);
  });

  test("D3: move transfers; source cannot be reused", () => {
    const a = new LinearResource("a");
    const b = moveLinearResource(a);
    expect(b.alive).toBe(true);
    expect(() => a.consume()).toThrow(/use-after-consume/);
    expect(b.consume().classical).toBe(1);
  });

  test("D4: Inventory.copy is forbidden", () => {
    const inv = new Inventory();
    inv.put(new LinearResource("x"));
    expect(() => inv.copy()).toThrow(/no-cloning/);
    expect(inv.size).toBe(1);
  });
});
