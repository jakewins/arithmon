import { describe, it, expect, beforeEach, vi } from "vitest";
import type { EventContext, EventDef, NpcState, Direction } from "../game/event/types";
import { EventEngine } from "../game/event/engine";
import { gameVariables } from "../game/event/variables";
import { loadEventsFromYaml } from "../game/event/loader";

function stubScene(): Phaser.Scene {
  return {} as unknown as Phaser.Scene;
}

/** Scene stub with enough Phaser surface for dialog/choice actions. */
function stubSceneWithUI(): Phaser.Scene {
  const destroyed: { destroy: () => void }[] = [];
  const makeObj = (overrides: Record<string, unknown> = {}) => {
    const obj = {
      setDepth: vi.fn().mockReturnThis(),
      setScrollFactor: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      setY: vi.fn().mockReturnThis(),
      setText: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      y: 192,
      height: 48,
      ...overrides,
    };
    destroyed.push(obj);
    return obj;
  };
  const keyStubs = new Map<number, { isDown: boolean; _justDown: boolean }>();
  return {
    add: {
      rectangle: vi.fn(() => makeObj()),
      text: vi.fn(() => makeObj()),
    },
    input: {
      keyboard: {
        addKey: vi.fn((keyCode: number) => {
          const key = { isDown: false, _justDown: false, keyCode };
          keyStubs.set(keyCode, key);
          return key;
        }),
        removeKey: vi.fn(),
      },
    },
    _keyStubs: keyStubs,
    _destroyed: destroyed,
  } as unknown as Phaser.Scene;
}

function makeCtx(overrides: Partial<EventContext> = {}): EventContext {
  return {
    scene: stubScene(),
    player: { tileX: 20, tileY: 19, facing: "up" as Direction },
    variables: gameVariables,
    interactPressed: false,
    npcs: new Map<string, NpcState>(),
    controls: { locked: false },
    ...overrides,
  };
}

function stubNpc(slug: string, tileX: number, tileY: number): NpcState {
  return {
    slug,
    tileX,
    tileY,
    facing: "down",
    sprite: {} as Phaser.GameObjects.Sprite,
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
    engine.update(makeCtx(), 0.016);
    expect(gameVariables.has("test_key")).toBe(false);
  });

  it("starts event when all conditions are met", () => {
    const engine = new EventEngine([TEST_EVENT]);
    engine.update(makeCtx({ interactPressed: true }), 0.016);
    expect(gameVariables.get("test_key")).toBe("test_value");
  });

  it("does not re-fire event while already running", () => {
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
    engine.update(makeCtx({ interactPressed: true }), 0.016);
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

    engine.update(makeCtx({ interactPressed: true }), 0.016);
    expect(gameVariables.get("greeted")).toBe("yes");

    // Second trigger: "not variable_set" now fails → event doesn't re-fire
    engine.update(makeCtx({ interactPressed: true }), 0.016);
    expect(gameVariables.get("greeted")).toBe("yes");
  });

  it("char_facing_tile fails when player faces wrong direction", () => {
    const engine = new EventEngine([TEST_EVENT]);
    const ctx = makeCtx({
      interactPressed: true,
      player: { tileX: 20, tileY: 19, facing: "down" },
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

describe("YAML loader", () => {
  it("parses a representative YAML doc with conditions, behav, and pixel coords", () => {
    const yaml = `
events:
  Hacker Intro:
    conditions:
      - is char_at player
      - not variable_set spoken:yes
    actions:
      - lock_controls
      - create_npc hacker,25,30
      - dialog Welcome to Cotton Town!
      - set_variable spoken:yes
      - unlock_controls
    x: 400
    y: 576
    width: 48
    height: 16

  Talk to Greeter:
    behav: talk greeter
    actions:
      - dialog Hello there!
    x: 320
    y: 288
    width: 16
    height: 16
`;
    const events = loadEventsFromYaml(yaml);
    expect(events).toHaveLength(2);

    // Event with explicit conditions — verify condition/action parsing + pixel→tile
    const hacker = events[0];
    expect(hacker.name).toBe("Hacker Intro");
    expect(hacker.x).toBe(25); // 400 / 16
    expect(hacker.y).toBe(36); // 576 / 16
    expect(hacker.width).toBe(3); // 48 / 16
    expect(hacker.height).toBe(1); // 16 / 16
    expect(hacker.conditions).toEqual([
      { operator: "is", type: "char_at", args: ["player"] },
      { operator: "not", type: "variable_set", args: ["spoken:yes"] },
    ]);
    expect(hacker.actions[0]).toEqual({ type: "lock_controls", args: [] });
    expect(hacker.actions[1]).toEqual({ type: "create_npc", args: ["hacker", "25", "30"] });
    expect(hacker.actions[2]).toEqual({ type: "dialog", args: ["Welcome to Cotton Town!"] });

    // Event with behav — verify talk expansion prepends char_face and adds conditions
    const greeter = events[1];
    expect(greeter.name).toBe("Talk to Greeter");
    expect(greeter.conditions).toEqual([
      { operator: "is", type: "char_facing_char", args: ["player", "greeter"] },
      { operator: "is", type: "button_pressed", args: ["INTERACT"] },
    ]);
    expect(greeter.actions[0]).toEqual({ type: "char_face", args: ["greeter", "player"] });
    expect(greeter.actions[1]).toEqual({ type: "dialog", args: ["Hello there!"] });
  });
});

describe("new conditions", () => {
  beforeEach(() => {
    gameVariables.remove("result");
  });

  it("char_at triggers inside bounding box and rejects outside", () => {
    const event: EventDef = {
      id: 10,
      name: "Zone",
      x: 19,
      y: 18,
      width: 3,
      height: 3,
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    };

    // Inside: player at (20,19) is within [19..22, 18..21]
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
    expect(gameVariables.get("result")).toBe("yes");

    // Outside: player at (5,5) is not in the box
    gameVariables.remove("result");
    const engine2 = new EventEngine([{ ...event, id: 11 }]);
    engine2.update(makeCtx({ player: { tileX: 5, tileY: 5, facing: "down" } }), 0.016);
    expect(gameVariables.has("result")).toBe(false);
  });

  it("char_exists checks NPC presence", () => {
    const event: EventDef = {
      id: 12,
      name: "NPC check",
      conditions: [{ operator: "is", type: "char_exists", args: ["greeter"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    };

    // Present
    const npcs = new Map<string, NpcState>();
    npcs.set("greeter", stubNpc("greeter", 10, 10));
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ npcs }), 0.016);
    expect(gameVariables.get("result")).toBe("yes");

    // Absent
    gameVariables.remove("result");
    const engine2 = new EventEngine([{ ...event, id: 13 }]);
    engine2.update(makeCtx(), 0.016);
    expect(gameVariables.has("result")).toBe(false);
  });

  it("char_facing_char checks player is facing adjacent NPC", () => {
    const event: EventDef = {
      id: 14,
      name: "Facing NPC",
      conditions: [{ operator: "is", type: "char_facing_char", args: ["player", "greeter"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    };
    const npcs = new Map<string, NpcState>();
    npcs.set("greeter", stubNpc("greeter", 20, 18));

    // Facing up at (20,19) → facing tile (20,18) = NPC ✓
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ npcs, player: { tileX: 20, tileY: 19, facing: "up" } }), 0.016);
    expect(gameVariables.get("result")).toBe("yes");

    // Facing down at (20,19) → facing tile (20,20) ≠ NPC
    gameVariables.remove("result");
    const engine2 = new EventEngine([{ ...event, id: 15 }]);
    engine2.update(makeCtx({ npcs, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
    expect(gameVariables.has("result")).toBe(false);
  });
});

describe("wait action", () => {
  beforeEach(() => {
    gameVariables.remove("waited");
  });

  it("blocks until elapsed time then completes", () => {
    const event: EventDef = {
      id: 16,
      name: "Wait test",
      x: 20,
      y: 18,
      width: 1,
      height: 1,
      conditions: [
        { operator: "is", type: "char_facing_tile", args: [] },
        { operator: "is", type: "button_pressed", args: ["INTERACT"] },
      ],
      actions: [
        { type: "wait", args: ["0.5"] },
        { type: "set_variable", args: ["waited:yes"] },
      ],
    };

    const engine = new EventEngine([event]);

    // Trigger the event
    engine.update(makeCtx({ interactPressed: true }), 0.016);
    expect(gameVariables.has("waited")).toBe(false);

    // Not enough time yet
    engine.update(makeCtx(), 0.2);
    expect(gameVariables.has("waited")).toBe(false);

    // Past the 0.5s mark
    engine.update(makeCtx(), 0.4);
    expect(gameVariables.get("waited")).toBe("yes");
  });
});

describe("translated_dialog_choice action", () => {
  beforeEach(() => {
    gameVariables.remove("greeter_mood");
  });

  it("parses options and variable from YAML-style args", () => {
    const yaml = `
events:
  Test Choice:
    conditions:
      - is char_at player
    actions:
      - translated_dialog_choice good:bad:meh,test_var
    x: 320
    y: 304
    width: 16
    height: 16
`;
    const events = loadEventsFromYaml(yaml);
    expect(events[0].actions[0]).toEqual({
      type: "translated_dialog_choice",
      args: ["good:bad:meh", "test_var"],
    });
  });

  it("sets the variable to the selected option on confirm", () => {
    const scene = stubSceneWithUI();
    const event: EventDef = {
      id: 20,
      name: "Choice test",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [
        { type: "translated_dialog_choice", args: ["good:bad", "greeter_mood"] },
        { type: "set_variable", args: ["choice_done:yes"] },
      ],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);

    // Trigger — player is inside the zone
    engine.update(makeCtx({ scene, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    // Choice menu is blocking, variable not set yet
    expect(engine.blocking).toBe(true);
    expect(gameVariables.has("greeter_mood")).toBe(false);

    // First frame after start is ignored (absorbs residual interact press)
    engine.update(makeCtx({ scene }), 0.016);
    expect(gameVariables.has("greeter_mood")).toBe(false);

    // Confirm (default selection = first option "good")
    engine.update(makeCtx({ scene, interactPressed: true }), 0.016);
    expect(gameVariables.get("greeter_mood")).toBe("good");

    // Follow-up action should have run
    expect(gameVariables.get("choice_done")).toBe("yes");
  });

  it("condition-driven branching works after choice", () => {
    const goodEvent: EventDef = {
      id: 21,
      name: "Good branch",
      conditions: [{ operator: "is", type: "variable_set", args: ["greeter_mood:good"] }],
      actions: [{ type: "set_variable", args: ["branch:good_path"] }],
    };
    const badEvent: EventDef = {
      id: 22,
      name: "Bad branch",
      conditions: [{ operator: "is", type: "variable_set", args: ["greeter_mood:bad"] }],
      actions: [{ type: "set_variable", args: ["branch:bad_path"] }],
    };

    gameVariables.set("greeter_mood", "bad");
    const engine = new EventEngine([goodEvent, badEvent]);
    engine.update(makeCtx(), 0.016);

    expect(gameVariables.get("branch")).toBe("bad_path");

    gameVariables.remove("branch");
    gameVariables.remove("greeter_mood");
  });
});
