import { describe, it, expect, beforeEach } from "vitest";
import type { EventContext, EventDef, NpcState, Direction } from "../game/event/types";
import { EventEngine } from "../game/event/engine";
import { gameVariables } from "../game/event/variables";

// Minimal Phaser scene stub — only what actions/conditions need
function stubScene(): Phaser.Scene {
  return {} as unknown as Phaser.Scene;
}

function makeCtx(overrides: Partial<EventContext> = {}): EventContext {
  return {
    scene: stubScene(),
    player: { tileX: 20, tileY: 19, facing: "up" as Direction },
    variables: gameVariables,
    interactPressed: false,
    npcs: new Map<string, NpcState>(),
    ...overrides,
  };
}

const TEST_EVENT: EventDef = {
  id: 1,
  name: "Test Talk",
  x: 20,
  y: 18,
  width: 1,
  height: 1,
  conditions: [
    { operator: "is", type: "char_facing_tile", args: ["player"] },
    { operator: "is", type: "button_pressed", args: ["INTERACT"] },
  ],
  actions: [{ type: "set_variable", args: ["test_key:test_value"] }],
};

describe("EventEngine", () => {
  beforeEach(() => {
    gameVariables.remove("test_key");
    gameVariables.remove("greeted");
  });

  it("does not start event when conditions are not met", () => {
    const engine = new EventEngine([TEST_EVENT]);
    const ctx = makeCtx(); // facing up at (20,19) → facing tile (20,18) ✓, but interact not pressed

    engine.update(ctx, 0.016);

    expect(gameVariables.has("test_key")).toBe(false);
  });

  it("starts event when all conditions are met", () => {
    const engine = new EventEngine([TEST_EVENT]);
    const ctx = makeCtx({ interactPressed: true });

    engine.update(ctx, 0.016);

    expect(gameVariables.get("test_key")).toBe("test_value");
  });

  it("does not re-fire event while already running", () => {
    // Use a dialog action that takes multiple frames
    const dialogEvent: EventDef = {
      id: 2,
      name: "Dialog Test",
      x: 20,
      y: 18,
      width: 1,
      height: 1,
      conditions: [
        { operator: "is", type: "char_facing_tile", args: ["player"] },
        { operator: "is", type: "button_pressed", args: ["INTERACT"] },
      ],
      actions: [
        { type: "set_variable", args: ["fire_count:1"] },
        { type: "set_variable", args: ["fire_count:2"] },
      ],
    };
    const engine = new EventEngine([dialogEvent]);

    // First frame: trigger event — both set_variable actions complete in one frame
    const ctx1 = makeCtx({ interactPressed: true });
    engine.update(ctx1, 0.016);
    expect(gameVariables.get("fire_count")).toBe("2");
  });

  it("respects 'not' operator on conditions", () => {
    const notEvent: EventDef = {
      id: 3,
      name: "Not greeted",
      x: 20,
      y: 18,
      width: 1,
      height: 1,
      conditions: [
        { operator: "is", type: "char_facing_tile", args: ["player"] },
        { operator: "is", type: "button_pressed", args: ["INTERACT"] },
        { operator: "not", type: "variable_set", args: ["greeted:yes"] },
      ],
      actions: [{ type: "set_variable", args: ["greeted:yes"] }],
    };

    const engine = new EventEngine([notEvent]);

    // First trigger: greeted not set → conditions pass
    engine.update(makeCtx({ interactPressed: true }), 0.016);
    expect(gameVariables.get("greeted")).toBe("yes");

    // Second trigger: greeted is set → "not variable_set" fails
    engine.update(makeCtx({ interactPressed: true }), 0.016);
    // Should still be "yes" (no change, event didn't re-fire to change it)
    expect(gameVariables.get("greeted")).toBe("yes");
  });

  it("char_facing_tile fails when player faces wrong direction", () => {
    const engine = new EventEngine([TEST_EVENT]);
    const ctx = makeCtx({
      interactPressed: true,
      player: { tileX: 20, tileY: 19, facing: "down" }, // facing (20,20), not (20,18)
    });

    engine.update(ctx, 0.016);

    expect(gameVariables.has("test_key")).toBe(false);
  });

  it("events with no conditions do not auto-trigger", () => {
    const noCondEvent: EventDef = {
      id: 4,
      name: "No conditions",
      conditions: [],
      actions: [{ type: "set_variable", args: ["auto:fired"] }],
    };

    const engine = new EventEngine([noCondEvent]);
    engine.update(makeCtx(), 0.016);

    expect(gameVariables.has("auto")).toBe(false);
  });
});

describe("GameVariables", () => {
  beforeEach(() => {
    gameVariables.remove("a");
  });

  it("set/get/has/remove", () => {
    expect(gameVariables.has("a")).toBe(false);
    expect(gameVariables.get("a")).toBeUndefined();

    gameVariables.set("a", "1");
    expect(gameVariables.has("a")).toBe(true);
    expect(gameVariables.get("a")).toBe("1");

    gameVariables.remove("a");
    expect(gameVariables.has("a")).toBe(false);
  });
});
