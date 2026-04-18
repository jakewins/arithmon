import { describe, it, expect } from "vitest";
import { Monster, getLeadMonster, PARTY_LIMIT } from "../game/model/Monster";

describe("Monster ID", () => {
  it("assigns unique IDs to each monster instance", () => {
    const a = Monster.spawn("rockitten", 5);
    const b = Monster.spawn("rockitten", 5);
    expect(a.id).toBeTruthy();
    expect(b.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });
});

describe("Monster.fainted", () => {
  it("returns false when HP > 0", () => {
    const m = Monster.spawn("rockitten", 5);
    expect(m.fainted).toBe(false);
  });

  it("returns true when HP is 0", () => {
    const m = Monster.spawn("rockitten", 5);
    m.currentHp = 0;
    expect(m.fainted).toBe(true);
  });
});

describe("getLeadMonster", () => {
  it("returns the first non-fainted monster", () => {
    const a = Monster.spawn("rockitten", 5);
    const b = Monster.spawn("budaye", 5);
    a.currentHp = 0; // fainted
    expect(getLeadMonster([a, b])).toBe(b);
  });

  it("returns the first monster when none are fainted", () => {
    const a = Monster.spawn("rockitten", 5);
    const b = Monster.spawn("budaye", 5);
    expect(getLeadMonster([a, b])).toBe(a);
  });

  it("returns null when all monsters are fainted", () => {
    const a = Monster.spawn("rockitten", 5);
    const b = Monster.spawn("budaye", 5);
    a.currentHp = 0;
    b.currentHp = 0;
    expect(getLeadMonster([a, b])).toBeNull();
  });

  it("returns null for an empty party", () => {
    expect(getLeadMonster([])).toBeNull();
  });
});

describe("PARTY_LIMIT", () => {
  it("is 6", () => {
    expect(PARTY_LIMIT).toBe(6);
  });
});

describe("new monster definitions", () => {
  it("can spawn budaye", () => {
    const m = Monster.spawn("budaye", 5);
    expect(m.name).toBe("Budaye");
    expect(m.techniques.length).toBeGreaterThanOrEqual(1);
  });

  it("can spawn ignibus", () => {
    const m = Monster.spawn("ignibus", 5);
    expect(m.name).toBe("Ignibus");
    expect(m.techniques.length).toBeGreaterThanOrEqual(1);
  });

  it("can spawn grintot", () => {
    const m = Monster.spawn("grintot", 5);
    expect(m.name).toBe("Grintot");
    expect(m.techniques.length).toBeGreaterThanOrEqual(1);
  });

  it("can spawn dollfin", () => {
    const m = Monster.spawn("dollfin", 5);
    expect(m.name).toBe("Dollfin");
    expect(m.techniques.length).toBeGreaterThanOrEqual(1);
  });
});

describe("HP persistence", () => {
  it("monster HP is mutable and persists on the same instance", () => {
    const party = [Monster.spawn("rockitten", 5)];
    const lead = getLeadMonster(party)!;
    const originalHp = lead.currentHp;
    lead.currentHp -= 10;
    // The party monster is the same reference — HP change persists
    expect(party[0].currentHp).toBe(originalHp - 10);
  });
});

describe("whiteout logic", () => {
  it("detects all-fainted party for whiteout trigger", () => {
    const party = [Monster.spawn("rockitten", 5), Monster.spawn("budaye", 5)];
    expect(party.every((m) => m.fainted)).toBe(false);

    for (const m of party) m.currentHp = 0;
    expect(party.every((m) => m.fainted)).toBe(true);

    // Heal all — simulates whiteout recovery
    for (const m of party) m.currentHp = m.maxHp;
    expect(party.every((m) => m.fainted)).toBe(false);
    expect(getLeadMonster(party)).toBe(party[0]);
  });
});
