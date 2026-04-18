import { describe, it, expect } from "vitest";
import {
  createMonsterRegistry,
  markSeen,
  markCaught,
  getStatus,
} from "../game/model/monsterRegistry";

describe("MonsterRegistry", () => {
  it("starts with no seen or caught monsters", () => {
    const registry = createMonsterRegistry();
    expect(registry.seen.size).toBe(0);
    expect(registry.caught.size).toBe(0);
  });

  it("marks a monster as seen", () => {
    const registry = createMonsterRegistry();
    markSeen(registry, "rockitten");
    expect(getStatus(registry, "rockitten")).toBe("seen");
    expect(registry.seen.has("rockitten")).toBe(true);
  });

  it("marks a monster as caught (implies seen)", () => {
    const registry = createMonsterRegistry();
    markCaught(registry, "budaye");
    expect(getStatus(registry, "budaye")).toBe("caught");
    expect(registry.caught.has("budaye")).toBe(true);
    expect(registry.seen.has("budaye")).toBe(true);
  });

  it("returns unknown for unregistered monsters", () => {
    const registry = createMonsterRegistry();
    expect(getStatus(registry, "ignibus")).toBe("unknown");
  });

  it("catching upgrades from seen to caught", () => {
    const registry = createMonsterRegistry();
    markSeen(registry, "dollfin");
    expect(getStatus(registry, "dollfin")).toBe("seen");
    markCaught(registry, "dollfin");
    expect(getStatus(registry, "dollfin")).toBe("caught");
  });

  it("does not double-add to seen set", () => {
    const registry = createMonsterRegistry();
    markSeen(registry, "rockitten");
    markSeen(registry, "rockitten");
    expect(registry.seen.size).toBe(1);
  });

  it("tracks multiple species independently", () => {
    const registry = createMonsterRegistry();
    markSeen(registry, "rockitten");
    markCaught(registry, "budaye");
    markSeen(registry, "ignibus");

    expect(getStatus(registry, "rockitten")).toBe("seen");
    expect(getStatus(registry, "budaye")).toBe("caught");
    expect(getStatus(registry, "ignibus")).toBe("seen");
    expect(getStatus(registry, "dollfin")).toBe("unknown");
  });
});
