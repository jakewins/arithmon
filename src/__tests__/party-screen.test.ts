import { describe, it, expect, beforeEach } from "vitest";
import { Monster, PARTY_LIMIT } from "../game/model/Monster";

describe("Party reorder", () => {
  let party: Monster[];

  beforeEach(() => {
    party = [
      Monster.spawn("rockitten", 5),
      Monster.spawn("budaye", 7),
      Monster.spawn("ignibus", 3),
    ];
  });

  it("swaps two monsters in the party array", () => {
    const first = party[0];
    const third = party[2];

    // Swap index 0 and 2
    const temp = party[0];
    party[0] = party[2];
    party[2] = temp;

    expect(party[0]).toBe(third);
    expect(party[2]).toBe(first);
    expect(party[1].slug).toBe("budaye");
  });

  it("swap with same index is a no-op", () => {
    const original = [...party];
    const src = 1;
    const dst = 1;

    if (src !== dst) {
      const temp = party[src];
      party[src] = party[dst];
      party[dst] = temp;
    }

    expect(party[0]).toBe(original[0]);
    expect(party[1]).toBe(original[1]);
    expect(party[2]).toBe(original[2]);
  });

  it("preserves monster identity after swap", () => {
    const mon0 = party[0];
    const mon1 = party[1];

    const temp = party[0];
    party[0] = party[1];
    party[1] = temp;

    // Same objects, just different positions
    expect(party[0].id).toBe(mon1.id);
    expect(party[1].id).toBe(mon0.id);
    expect(party[0].currentHp).toBe(mon1.currentHp);
  });

  it("party limit is always 6 slots", () => {
    expect(PARTY_LIMIT).toBe(6);
  });

  it("reorder changes the lead monster", () => {
    // First non-fainted is party[0]
    const originalLead = party[0];
    expect(originalLead.slug).toBe("rockitten");

    // Swap 0 and 2
    const temp = party[0];
    party[0] = party[2];
    party[2] = temp;

    const newLead = party.find((m) => !m.fainted)!;
    expect(newLead.slug).toBe("ignibus");
  });
});
