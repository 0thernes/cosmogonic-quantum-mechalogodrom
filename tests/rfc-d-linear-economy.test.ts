import { describe, expect, test } from "bun:test";
import {
  Inventory,
  LinearResource,
  cloneLinearResource,
  moveLinearResource,
  transfer,
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

  test("D5: same live resource cannot sit in two inventories", () => {
    const r = new LinearResource("shared");
    const a = new Inventory();
    const b = new Inventory();
    a.put(r);
    expect(() => b.put(r)).toThrow(/already held/);
    expect(a.size).toBe(1);
    expect(b.size).toBe(0);
  });

  test("D6: transfer moves without clone", () => {
    const a = new Inventory();
    const b = new Inventory();
    a.put(new LinearResource("g"));
    transfer(a, b, "g");
    expect(a.size).toBe(0);
    expect(b.size).toBe(1);
    expect(b.take("g").id).toBe("g");
  });

  test("D7: structuredClone of a held bag is not a supported API path", () => {
    // Regression: callers must not treat JSON/structured clones as ownership forks.
    const inv = new Inventory();
    inv.put(new LinearResource("z"));
    expect(() => inv.copy()).toThrow(/no-cloning/);
    // There is no public entries()/values() dump by design — size + take/put/transfer only.
    expect(inv.size).toBe(1);
  });

  test("D8: transfer to self is forbidden", () => {
    const a = new Inventory();
    a.put(new LinearResource("self"));
    expect(() => transfer(a, a, "self")).toThrow(/transfer to self/);
    expect(a.size).toBe(1);
  });

  test("D9: transfer of missing id throws", () => {
    const a = new Inventory();
    const b = new Inventory();
    expect(() => transfer(a, b, "missing")).toThrow(/missing resource/);
    expect(a.size).toBe(0);
    expect(b.size).toBe(0);
  });
});
