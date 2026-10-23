/**
 * Integration-ish: a forager-like agent must not park the same linear payload
 * in two bags (home cache + field pack).
 */
import { describe, expect, test } from "bun:test";
import { Inventory, LinearResource, transfer } from "../src/sim/economy/linear-resource";

type Forager = {
  home: Inventory;
  field: Inventory;
};

function makeForager(): Forager {
  return { home: new Inventory(), field: new Inventory() };
}

describe("RFC-D forager dual-hold", () => {
  test("agent cannot put one payload into home and field", () => {
    const agent = makeForager();
    const gene = new LinearResource("forager-gene-1");
    agent.home.put(gene);
    expect(() => agent.field.put(gene)).toThrow(/already held/);
  });

  test("agent moves payload home -> field via transfer", () => {
    const agent = makeForager();
    agent.home.put(new LinearResource("forager-gene-2"));
    transfer(agent.home, agent.field, "forager-gene-2");
    expect(agent.home.size).toBe(0);
    expect(agent.field.size).toBe(1);
  });
});
