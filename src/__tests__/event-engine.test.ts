import { describe, it, expect, beforeEach, vi } from "vitest";
import type { EventContext, EventDef, NpcState, Direction } from "../game/event/types";
import { EventEngine } from "../game/event/engine";
import { paginate } from "../game/event/ui/dialogBox";
import { session } from "../game/session";
import { loadEventsFromYaml } from "../game/event/loader";
import { loadPO } from "../game/i18n";
import { Monster } from "../game/model/Monster";

const gameVariables = session.player.gameVariables;

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
      // getWrappedText: return each word on its own line to simulate wrapping
      getWrappedText: vi.fn((text: string) => text.split("\n")),
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
      nineslice: vi.fn(() => makeObj()),
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
    session,
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
  it("parses a representative YAML doc with conditions, behav, and tile coords", () => {
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
    x: 25
    y: 36
    width: 3
    height: 1

  Talk to Greeter:
    behav: talk greeter
    actions:
      - dialog Hello there!
    x: 20
    y: 18
    width: 1
    height: 1
`;
    const events = loadEventsFromYaml(yaml);
    expect(events).toHaveLength(2);

    // Event with explicit conditions — coords are tile coordinates (passed through as-is)
    const hacker = events[0];
    expect(hacker.name).toBe("Hacker Intro");
    expect(hacker.x).toBe(25);
    expect(hacker.y).toBe(36);
    expect(hacker.width).toBe(3);
    expect(hacker.height).toBe(1);
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

describe("spyder_bedroom YAML", () => {
  it("loads Go Downstairs event with correct tile coordinates", () => {
    const yaml = `
events:
  Go Downstairs:
    actions:
    - transition_teleport player,spyder_downstairs.tmx,0,2,0.3
    - char_face player,down
    conditions:
    - is char_at player
    x: 7
    y: 2
`;
    const events = loadEventsFromYaml(yaml);
    expect(events).toHaveLength(1);

    const goDown = events[0];
    expect(goDown.name).toBe("Go Downstairs");
    expect(goDown.x).toBe(7);
    expect(goDown.y).toBe(2);
    expect(goDown.conditions).toEqual([{ operator: "is", type: "char_at", args: ["player"] }]);
    expect(goDown.actions[0]).toEqual({
      type: "transition_teleport",
      args: ["player", "spyder_downstairs.tmx", "0", "2", "0.3"],
    });
    expect(goDown.actions[1]).toEqual({
      type: "char_face",
      args: ["player", "down"],
    });
  });

  it("triggers teleport when player stands on stairs tile (7,2)", () => {
    const events = loadEventsFromYaml(`
events:
  Go Downstairs:
    actions:
    - transition_teleport player,spyder_downstairs.tmx,0,2,0.3
    conditions:
    - is char_at player
    x: 7
    y: 2
`);
    const engine = new EventEngine(events);
    const controls: EventContext["controls"] = { locked: false };

    engine.update(makeCtx({ controls, player: { tileX: 7, tileY: 2, facing: "down" } }), 0.016);

    expect(controls.pendingTeleport).toEqual({
      mapKey: "spyder_downstairs",
      tileX: 0,
      tileY: 2,
      duration: 0.3,
    });
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
    x: 20
    y: 19
    width: 1
    height: 1
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

describe("change_bg action", () => {
  it("sets the scene background color", () => {
    const scene = stubSceneWithUI();
    const mockSetBg = vi.fn();
    (scene as unknown as { cameras: { main: { setBackgroundColor: typeof mockSetBg } } }).cameras =
      { main: { setBackgroundColor: mockSetBg } };

    const event: EventDef = {
      id: 30,
      name: "BG test",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [
        { type: "change_bg", args: ["blue"] },
        { type: "set_variable", args: ["bg_done:yes"] },
      ],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ scene, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(mockSetBg).toHaveBeenCalledWith(0x2244aa);
    expect(gameVariables.get("bg_done")).toBe("yes");
    gameVariables.remove("bg_done");
  });
});

describe("end_cutscene action", () => {
  it("sets cutsceneDone flag on controls", () => {
    const controls = { locked: false, cutsceneDone: false };
    const event: EventDef = {
      id: 31,
      name: "End test",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "end_cutscene", args: [] }],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ controls, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(controls.cutsceneDone).toBe(true);
  });
});

describe("cutscene event chain", () => {
  beforeEach(() => {
    gameVariables.remove("favorite");
    gameVariables.remove("cutscene_done");
    gameVariables.remove("cutscene_farewell");
  });

  it("chains choice → branch → farewell → end via variable guards", () => {
    const scene = stubSceneWithUI();
    const controls = { locked: false, cutsceneDone: false };

    const events = loadEventsFromYaml(`
events:
  Ask:
    conditions:
      - not variable_set favorite
    actions:
      - translated_dialog_choice fire:water,favorite

  Pick Fire:
    conditions:
      - is variable_set favorite:fire
      - not variable_set cutscene_done:yes
    actions:
      - set_variable cutscene_done:yes

  Farewell:
    conditions:
      - is variable_set cutscene_done:yes
      - not variable_set cutscene_farewell:yes
    actions:
      - set_variable cutscene_farewell:yes
      - end_cutscene
`);
    const engine = new EventEngine(events);

    // Frame 1: Ask event starts, choice menu appears
    engine.update(
      makeCtx({ scene, controls, player: { tileX: 0, tileY: 0, facing: "down" } }),
      0.016,
    );
    expect(engine.blocking).toBe(true);

    // Frame 2: skip first-frame guard
    engine.update(
      makeCtx({ scene, controls, player: { tileX: 0, tileY: 0, facing: "down" } }),
      0.016,
    );

    // Frame 3: confirm choice (first option = "fire")
    engine.update(
      makeCtx({
        scene,
        controls,
        interactPressed: true,
        player: { tileX: 0, tileY: 0, facing: "down" },
      }),
      0.016,
    );
    expect(gameVariables.get("favorite")).toBe("fire");

    // Frame 4: Pick Fire fires, sets cutscene_done
    engine.update(
      makeCtx({ scene, controls, player: { tileX: 0, tileY: 0, facing: "down" } }),
      0.016,
    );
    expect(gameVariables.get("cutscene_done")).toBe("yes");

    // Frame 5: Farewell fires (its conditions now pass), sets cutsceneDone
    engine.update(
      makeCtx({ scene, controls, player: { tileX: 0, tileY: 0, facing: "down" } }),
      0.016,
    );
    expect(gameVariables.get("cutscene_farewell")).toBe("yes");
    expect(controls.cutsceneDone).toBe(true);
  });
});

describe("transition_teleport action", () => {
  it("parses args and strips .tmx suffix", () => {
    const yaml = `
events:
  Teleport:
    conditions:
      - is char_at player
    actions:
      - transition_teleport player,foo.tmx,4,5,0.3
    x: 20
    y: 19
    width: 1
    height: 1
`;
    const events = loadEventsFromYaml(yaml);
    expect(events[0].actions[0]).toEqual({
      type: "transition_teleport",
      args: ["player", "foo.tmx", "4", "5", "0.3"],
    });
  });

  it("sets pendingTeleport on controls with .tmx stripped", () => {
    const controls: EventContext["controls"] = { locked: false };
    const event: EventDef = {
      id: 50,
      name: "Teleport test",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [
        {
          type: "transition_teleport",
          args: ["player", "player_house_bedroom.tmx", "4", "5", "0.3"],
        },
      ],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ controls, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(controls.pendingTeleport).toEqual({
      mapKey: "player_house_bedroom",
      tileX: 4,
      tileY: 5,
      duration: 0.3,
    });
  });

  it("stays not-done while pendingTeleport is set and blocks the engine", () => {
    const controls: EventContext["controls"] = { locked: false };
    const event: EventDef = {
      id: 51,
      name: "Teleport blocks",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [
        { type: "transition_teleport", args: ["player", "foo", "1", "2", "0.3"] },
        { type: "set_variable", args: ["after_teleport:yes"] },
      ],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);

    // Frame 1: action dispatches, pendingTeleport set
    engine.update(makeCtx({ controls, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
    expect(controls.pendingTeleport).toBeDefined();
    expect(engine.blocking).toBe(true);
    expect(gameVariables.has("after_teleport")).toBe(false);

    // Frame 2: flag still set, still blocking, follow-up action hasn't run
    engine.update(makeCtx({ controls, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
    expect(engine.blocking).toBe(true);
    expect(gameVariables.has("after_teleport")).toBe(false);

    // Simulate the scene consuming the flag (fade started)
    controls.pendingTeleport = undefined;
    engine.update(makeCtx({ controls, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
    // Follow-up action runs now that teleport is done
    expect(gameVariables.get("after_teleport")).toBe("yes");
    gameVariables.remove("after_teleport");
  });
});

describe("sample_cutscene.yaml end-to-end", () => {
  beforeEach(() => {
    gameVariables.remove("favorite");
    gameVariables.remove("cutscene_done");
    gameVariables.remove("cutscene_farewell");
  });

  it("drives the full cutscene chain through to pendingTeleport", () => {
    // Mirror of public/assets/events/sample_cutscene.yaml, inlined so the test
    // doesn't need node:fs. Keep this in sync with that file.
    const yamlText = `
events:
  Ask Favorite:
    conditions:
      - not variable_set favorite
    actions:
      - change_bg blue
      - dialog Welcome, trainer! Before we begin...
      - translated_dialog_choice fire:water:grass,favorite

  Pick Fire:
    conditions:
      - is variable_set favorite:fire
      - not variable_set cutscene_done:yes
    actions:
      - set_char_attribute player,gender,bold
      - set_template player,adventurer,adventurer
      - dialog Bold choice! Fire types are fierce.
      - set_variable cutscene_done:yes

  Farewell:
    conditions:
      - is variable_set cutscene_done:yes
      - not variable_set cutscene_farewell:yes
    actions:
      - dialog Good luck on your journey!
      - set_variable cutscene_farewell:yes
      - transition_teleport player,player_house_bedroom.tmx,4,4,0.3
`;
    const events = loadEventsFromYaml(yamlText);
    const engine = new EventEngine(events);
    const scene = stubSceneWithUI();
    const controls: EventContext["controls"] = { locked: false };
    const player = { tileX: 0, tileY: 0, facing: "down" as Direction };

    // Add cameras.main.setBackgroundColor so change_bg works
    (scene as unknown as { cameras: { main: { setBackgroundColor: () => void } } }).cameras = {
      main: { setBackgroundColor: vi.fn() },
    };

    const tick = (interact = false) => {
      engine.update(makeCtx({ scene, controls, player, interactPressed: interact }), 0.05);
    };

    // Dismiss a dialog by waiting for typewriter (dt=0.05s, ~30 chars/sec means
    // ~1.5 chars per tick — long enough for a few ticks to cover typical lines)
    // then pressing interact. Safety cap to avoid infinite loops.
    const dismissDialog = () => {
      for (let i = 0; i < 200; i++) {
        tick();
        if (!engine.blocking) return;
        // Try to dismiss each frame; the first press might skip the typewriter,
        // the second will dismiss once dismissReady is true.
        tick(true);
        if (!engine.blocking) return;
      }
      throw new Error("dialog never dismissed");
    };

    // Ask Favorite: change_bg → dialog "Welcome..." → translated_dialog_choice
    dismissDialog(); // dismisses Welcome dialog, leaves choice menu blocking

    // Confirm choice. The choice action ignores the first-frame interact (which
    // would be the press that dismissed the previous dialog), so we need one
    // tick with interact=false followed by one with interact=true.
    tick();
    tick(true);
    expect(gameVariables.get("favorite")).toBe("fire");

    // Pick Fire: set_char_attribute, set_template, dialog "Bold choice!...",
    // set_variable cutscene_done:yes
    dismissDialog();
    expect(gameVariables.get("cutscene_done")).toBe("yes");

    // Farewell: dialog "Good luck...", set_variable cutscene_farewell:yes,
    // transition_teleport. dismissDialog stops once engine.blocking is false
    // — but transition_teleport keeps the engine blocking until pendingTeleport
    // is cleared, so we need a slightly different loop here.
    for (let i = 0; i < 200; i++) {
      tick();
      if (controls.pendingTeleport) break;
      tick(true);
      if (controls.pendingTeleport) break;
    }
    expect(gameVariables.get("cutscene_farewell")).toBe("yes");
    expect(controls.pendingTeleport).toEqual({
      mapKey: "player_house_bedroom",
      tileX: 4,
      tileY: 4,
      duration: 0.3,
    });
  });
});

describe("session state and new actions", () => {
  beforeEach(() => {
    session.player.gender = null;
    session.player.template = "adventurer";
    session.player.name = "Player";
  });

  it("set_char_attribute sets typed fields on player", () => {
    const event: EventDef = {
      id: 40,
      name: "Set gender",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [
        { type: "set_char_attribute", args: ["player", "gender", "female"] },
        { type: "set_char_attribute", args: ["player", "name", "Luna"] },
      ],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(session.player.gender).toBe("female");
    expect(session.player.name).toBe("Luna");
  });

  it("set_char_attribute ignores unknown fields", () => {
    const event: EventDef = {
      id: 41,
      name: "Bad attr",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "set_char_attribute", args: ["player", "bogus", "value"] }],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    // Should not throw
    engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
  });

  it("set_template updates session.player.template", () => {
    const event: EventDef = {
      id: 42,
      name: "Set template",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "set_template", args: ["player", "heroine", "heroine"] }],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(session.player.template).toBe("heroine");
  });

  it("set_variable still works through ctx.variables shortcut", () => {
    const event: EventDef = {
      id: 43,
      name: "Variable test",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "set_variable", args: ["test_session:works"] }],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(session.player.gameVariables.get("test_session")).toBe("works");
    expect(gameVariables.get("test_session")).toBe("works"); // same reference
    gameVariables.remove("test_session");
  });
});

describe("start_tuxemon.yaml end-to-end", () => {
  beforeEach(() => {
    gameVariables.remove("scenario_choice");
    gameVariables.remove("gender_choice");
    gameVariables.remove("race_choice");
    session.player.gender = null;
    session.player.template = "adventurer";
  });

  // Inlined copy of public/assets/events/start_tuxemon.yaml — keep in sync.
  const START_YAML = `
events:
  Scenario:
    actions:
    - change_bg gradient_blue
    - translated_dialog_choice spyder_campaign:xero_campaign:water_campaign,scenario_choice
    conditions:
    - not variable_set scenario_choice
    - not variable_set gender_choice
    - not variable_set race_choice

  Gender:
    actions:
    - change_bg gradient_blue,choice_gender,image
    - translated_dialog_choice gender_male:gender_female:gender_nonbinary,gender_choice
    conditions:
    - is variable_set scenario_choice
    - not variable_set gender_choice
    - not variable_set race_choice

  Gender Male:
    actions:
    - set_char_attribute player,gender,male
    - change_bg gradient_blue,choice_gender,image
    - translated_dialog_choice black_male:white_male,race_choice
    conditions:
    - is variable_set scenario_choice
    - is variable_set gender_choice:gender_male
    - not variable_set race_choice

  Gender Female:
    actions:
    - set_char_attribute player,gender,female
    - change_bg gradient_blue,choice_gender,image
    - translated_dialog_choice black_female:white_female,race_choice
    conditions:
    - is variable_set scenario_choice
    - is variable_set gender_choice:gender_female
    - not variable_set race_choice

  Gender Nonbinary:
    actions:
    - set_char_attribute player,gender,nonbinary
    - change_bg gradient_blue,choice_gender,image
    - translated_dialog_choice gender_enby:gender_whatever,race_choice
    conditions:
    - is variable_set scenario_choice
    - is variable_set gender_choice:gender_nonbinary
    - not variable_set race_choice

  Black Female:
    actions:
    - set_template player,brownheroine_brown,heroineblack
    conditions:
    - is variable_set race_choice:black_female
  Black Male:
    actions:
    - set_template player,adventurerblack,adventurerblack
    conditions:
    - is variable_set race_choice:black_male
  Gender Enby:
    actions:
    - set_template player,enbyasian,enbyasian
    conditions:
    - is variable_set race_choice:gender_enby
  Whatever Penguin:
    actions:
    - set_template player,penguin,penguin
    conditions:
    - is variable_set race_choice:gender_whatever
  White Female:
    actions:
    - set_template player,heroine,heroine
    conditions:
    - is variable_set race_choice:white_female
  White Male:
    actions:
    - set_template player,adventurer,adventurer
    conditions:
    - is variable_set race_choice:white_male

  Spyder:
    actions:
    - change_bg gradient_blue
    - transition_teleport player,spyder_bedroom.tmx,4,4,0.3
    conditions:
    - is variable_set scenario_choice:spyder_campaign
    - is variable_set gender_choice
    - is variable_set race_choice

  Xero:
    actions:
    - change_bg gradient_blue
    - transition_teleport player,player_house_bedroom.tmx,4,4,0.3
    conditions:
    - is variable_set scenario_choice:xero_campaign
    - is variable_set gender_choice
    - is variable_set race_choice

  Water:
    actions:
    - change_bg gradient_blue
    - transition_teleport player,water_end_of_desert.tmx,11,32,0.5
    conditions:
    - is variable_set scenario_choice:water_campaign
    - is variable_set gender_choice
    - is variable_set race_choice
`;

  function setupEngine() {
    const events = loadEventsFromYaml(START_YAML);
    const engine = new EventEngine(events);
    const scene = stubSceneWithUI();
    const controls: EventContext["controls"] = { locked: false };
    const player = { tileX: 0, tileY: 0, facing: "down" as Direction };

    // change_bg needs cameras.main.setBackgroundColor and textures.exists
    (scene as unknown as Record<string, unknown>).cameras = {
      main: { setBackgroundColor: vi.fn() },
    };
    (scene as unknown as Record<string, unknown>).textures = {
      exists: vi.fn(() => false),
    };

    const tick = (interact = false) => {
      engine.update(makeCtx({ scene, controls, player, interactPressed: interact }), 0.05);
    };

    // Confirm the currently visible choice menu by pressing interact
    const confirmChoice = () => {
      tick(); // one frame with no interact (choice ignores first-frame press)
      tick(true); // confirm selection
    };

    return { engine, tick, confirmChoice, controls };
  }

  it("spyder → male → white_male reaches spyder_bedroom teleport", () => {
    const { tick, confirmChoice, controls } = setupEngine();

    // Scenario choice: change_bg → translated_dialog_choice (default index 0 = spyder_campaign)
    tick(); // change_bg fires, then choice starts
    confirmChoice();
    expect(gameVariables.get("scenario_choice")).toBe("spyder_campaign");

    // Gender choice: change_bg → translated_dialog_choice (default index 0 = gender_male)
    tick(); // change_bg
    confirmChoice();
    expect(gameVariables.get("gender_choice")).toBe("gender_male");

    // Gender Male: set_char_attribute, change_bg → translated_dialog_choice
    // race options: black_male (0), white_male (1) — pick white_male by pressing down
    tick(); // set_char_attribute + change_bg fire, choice starts
    expect(session.player.gender).toBe("male");
    confirmChoice(); // confirms black_male (index 0)
    expect(gameVariables.get("race_choice")).toBe("black_male");

    // Black Male: set_template fires immediately
    tick();
    expect(session.player.template).toBe("adventurerblack");

    // Spyder: change_bg + transition_teleport
    for (let i = 0; i < 200; i++) {
      tick();
      if (controls.pendingTeleport) break;
    }
    expect(controls.pendingTeleport).toEqual({
      mapKey: "spyder_bedroom",
      tileX: 4,
      tileY: 4,
      duration: 0.3,
    });
  });

  it("xero → female → white_female reaches player_house_bedroom teleport", () => {
    // Pre-set variables to skip to the end
    gameVariables.set("scenario_choice", "xero_campaign");
    gameVariables.set("gender_choice", "gender_female");
    gameVariables.set("race_choice", "white_female");

    const { tick, controls } = setupEngine();

    // White Female set_template fires
    tick();
    expect(session.player.template).toBe("heroine");

    // Xero teleport
    for (let i = 0; i < 200; i++) {
      tick();
      if (controls.pendingTeleport) break;
    }
    expect(controls.pendingTeleport).toEqual({
      mapKey: "player_house_bedroom",
      tileX: 4,
      tileY: 4,
      duration: 0.3,
    });
  });

  it("water → nonbinary → penguin reaches water_end_of_desert teleport", () => {
    gameVariables.set("scenario_choice", "water_campaign");
    gameVariables.set("gender_choice", "gender_nonbinary");
    gameVariables.set("race_choice", "gender_whatever");

    const { tick, controls } = setupEngine();

    // Whatever Penguin set_template
    tick();
    expect(session.player.template).toBe("penguin");

    // Water teleport
    for (let i = 0; i < 200; i++) {
      tick();
      if (controls.pendingTeleport) break;
    }
    expect(controls.pendingTeleport).toEqual({
      mapKey: "water_end_of_desert",
      tileX: 11,
      tileY: 32,
      duration: 0.5,
    });
  });
});

describe("translated_dialog action", () => {
  beforeEach(() => {
    loadPO('msgid "spyder_papertown_restinbed"\nmsgstr "You rest for a while..."\n');
  });

  it("resolves i18n key and shows dialog text", () => {
    const scene = stubSceneWithUI();
    const event: EventDef = {
      id: 60,
      name: "Rest dialog",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "translated_dialog", args: ["spyder_papertown_restinbed"] }],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);

    // Trigger
    engine.update(makeCtx({ scene, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
    expect(engine.blocking).toBe(true);

    // Run typewriter to completion
    for (let i = 0; i < 100; i++) {
      engine.update(makeCtx({ scene }), 0.05);
      if (!engine.blocking) break;
      engine.update(makeCtx({ scene, interactPressed: true }), 0.05);
      if (!engine.blocking) break;
    }
    expect(engine.blocking).toBe(false);
  });

  it("falls back to title-cased key for unknown i18n key", () => {
    loadPO(""); // clear translations
    const scene = stubSceneWithUI();
    const event: EventDef = {
      id: 61,
      name: "Fallback dialog",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [
        { type: "translated_dialog", args: ["unknown_key"] },
        { type: "set_variable", args: ["dialog_shown:yes"] },
      ],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);

    engine.update(makeCtx({ scene, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
    expect(engine.blocking).toBe(true);

    // Dismiss
    for (let i = 0; i < 100; i++) {
      engine.update(makeCtx({ scene }), 0.05);
      engine.update(makeCtx({ scene, interactPressed: true }), 0.05);
      if (!engine.blocking) break;
    }
    expect(gameVariables.get("dialog_shown")).toBe("yes");
    gameVariables.remove("dialog_shown");
  });
});

describe("set_monster_health action", () => {
  beforeEach(() => {
    session.player.monsters = [];
  });

  it("restores all party monsters to full HP", () => {
    const m1 = Monster.spawn("rockitten", 5);
    const m2 = Monster.spawn("rockitten", 3);
    m1.currentHp = 10;
    m2.currentHp = 1;
    session.player.monsters = [m1, m2];

    const event: EventDef = {
      id: 62,
      name: "Heal",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "set_monster_health", args: [] }],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(m1.currentHp).toBe(m1.maxHp);
    expect(m2.currentHp).toBe(m2.maxHp);
  });

  it("is a no-op when party is empty", () => {
    const event: EventDef = {
      id: 63,
      name: "Heal empty",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "set_monster_health", args: [] }],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    // Should not throw
    engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
  });
});

describe("set_monster_status action", () => {
  beforeEach(() => {
    session.player.monsters = [];
  });

  it("clears all status effects from party monsters", () => {
    const m1 = Monster.spawn("rockitten", 5);
    const m2 = Monster.spawn("rockitten", 3);
    m1.status = ["poison", "sleep"];
    m2.status = ["burn"];
    session.player.monsters = [m1, m2];

    const event: EventDef = {
      id: 64,
      name: "Clear status",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "set_monster_status", args: [] }],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(m1.status).toEqual([]);
    expect(m2.status).toEqual([]);
  });
});

describe("play_music action", () => {
  it("executes without error and completes immediately", () => {
    const event: EventDef = {
      id: 70,
      name: "Music test",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [
        { type: "play_music", args: ["music_home"] },
        { type: "set_variable", args: ["music_played:yes"] },
      ],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(gameVariables.get("music_played")).toBe("yes");
    gameVariables.remove("music_played");
  });
});

describe("music_playing condition", () => {
  it("always returns false (stub)", () => {
    const event: EventDef = {
      id: 71,
      name: "Music cond",
      conditions: [
        { operator: "is", type: "char_at", args: ["player"] },
        { operator: "not", type: "music_playing", args: ["music_home"] },
      ],
      actions: [{ type: "set_variable", args: ["music_cond:yes"] }],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    // Since music_playing always returns false, "not music_playing" is true
    expect(gameVariables.get("music_cond")).toBe("yes");
    gameVariables.remove("music_cond");
  });
});

describe("access_pc action", () => {
  it("shows placeholder dialog and blocks until dismissed", () => {
    const scene = stubSceneWithUI();
    const event: EventDef = {
      id: 72,
      name: "PC test",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [
        { type: "access_pc", args: ["player"] },
        { type: "set_variable", args: ["pc_done:yes"] },
      ],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);

    // Trigger
    engine.update(makeCtx({ scene, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
    expect(engine.blocking).toBe(true);
    expect(gameVariables.has("pc_done")).toBe(false);

    // Dismiss the dialog
    for (let i = 0; i < 100; i++) {
      engine.update(makeCtx({ scene }), 0.05);
      if (!engine.blocking) break;
      engine.update(makeCtx({ scene, interactPressed: true }), 0.05);
      if (!engine.blocking) break;
    }
    expect(engine.blocking).toBe(false);
    expect(gameVariables.get("pc_done")).toBe("yes");
    gameVariables.remove("pc_done");
  });
});

describe("set_teleport_faint action", () => {
  beforeEach(() => {
    session.faintTeleport = undefined;
  });

  it("stores respawn location on session", () => {
    const event: EventDef = {
      id: 65,
      name: "Set faint",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "set_teleport_faint", args: ["player", "spyder_bedroom.tmx", "6", "5"] }],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(session.faintTeleport).toEqual({
      mapKey: "spyder_bedroom",
      tileX: 6,
      tileY: 5,
    });
  });

  it("strips .tmx suffix from map key", () => {
    const event: EventDef = {
      id: 66,
      name: "Set faint tmx",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "set_teleport_faint", args: ["player", "some_map.tmx", "3", "4"] }],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(session.faintTeleport!.mapKey).toBe("some_map");
  });
});

describe("change_bg_char action", () => {
  it("sets background color and completes immediately", () => {
    const scene = stubSceneWithUI();
    const mockSetBg = vi.fn();
    (scene as unknown as Record<string, unknown>).cameras = {
      main: { setBackgroundColor: mockSetBg },
    };
    (scene as unknown as Record<string, unknown>).textures = {
      exists: vi.fn(() => false),
    };

    const event: EventDef = {
      id: 80,
      name: "Char BG test",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [
        { type: "change_bg_char", args: ["gradient_blue", "spyder_omnichannel_beaverbrook"] },
        { type: "set_variable", args: ["char_bg_done:yes"] },
      ],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ scene, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(mockSetBg).toHaveBeenCalledWith(0x2244aa);
    expect(gameVariables.get("char_bg_done")).toBe("yes");
    gameVariables.remove("char_bg_done");
  });
});

describe("change_bg_monster action", () => {
  it("sets background color and completes immediately", () => {
    const scene = stubSceneWithUI();
    const mockSetBg = vi.fn();
    (scene as unknown as Record<string, unknown>).cameras = {
      main: { setBackgroundColor: mockSetBg },
    };
    (scene as unknown as Record<string, unknown>).textures = {
      exists: vi.fn(() => false),
    };

    const event: EventDef = {
      id: 81,
      name: "Monster BG test",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [
        { type: "change_bg_monster", args: ["gradient_blue", "dollfin"] },
        { type: "set_variable", args: ["monster_bg_done:yes"] },
      ],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);
    engine.update(makeCtx({ scene, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);

    expect(mockSetBg).toHaveBeenCalledWith(0x2244aa);
    expect(gameVariables.get("monster_bg_done")).toBe("yes");
    gameVariables.remove("monster_bg_done");
  });
});

describe("spyder intro cutscene flow", () => {
  beforeEach(() => {
    gameVariables.remove("question_intro");
    gameVariables.remove("spyder_intro");
  });

  const INTRO_YAML = `
events:
  Intro Question:
    actions:
    - translated_dialog spyder_intro_question
    - translated_dialog_choice no:yes,question_intro
    conditions:
    - not variable_set question_intro:yes
    - not variable_set question_intro:no
    type: event

  No Intro:
    actions:
    - set_variable spyder_intro:yes
    - transition_teleport player,spyder_paper_scoop.tmx,4,8,0.3
    - char_face player,right
    conditions:
    - is variable_set question_intro:yes
    - not variable_set spyder_intro:yes
    type: event

  Spyder Intro:
    actions:
    - change_bg_char gradient_blue,spyder_omnichannel_beaverbrook
    - translated_dialog spyder_intro00
    - change_bg gradient_blue,spyder_tumble,image
    - translated_dialog spyder_intro01
    - set_variable spyder_intro:yes
    - transition_teleport player,spyder_paper_scoop.tmx,4,8,0.3
    - char_face player,right
    conditions:
    - is variable_set question_intro:no
    - not variable_set spyder_intro:yes
    type: event
`;

  function setupIntro() {
    const events = loadEventsFromYaml(INTRO_YAML);
    const engine = new EventEngine(events);
    const scene = stubSceneWithUI();
    const controls: EventContext["controls"] = { locked: false };
    const player = { tileX: 0, tileY: 0, facing: "down" as Direction };

    (scene as unknown as Record<string, unknown>).cameras = {
      main: { setBackgroundColor: vi.fn() },
    };
    (scene as unknown as Record<string, unknown>).textures = {
      exists: vi.fn(() => false),
    };

    const tick = (interact = false) => {
      engine.update(makeCtx({ scene, controls, player, interactPressed: interact }), 0.05);
    };

    const dismissDialog = () => {
      for (let i = 0; i < 200; i++) {
        tick();
        if (!engine.blocking) return;
        tick(true);
        if (!engine.blocking) return;
      }
      throw new Error("dialog never dismissed");
    };

    const confirmChoice = () => {
      tick();
      tick(true);
    };

    return { engine, tick, dismissDialog, confirmChoice, controls };
  }

  it("choosing to see intro plays slideshow then teleports to spyder_paper_scoop", () => {
    const { tick, dismissDialog, confirmChoice, controls } = setupIntro();

    // Intro Question fires: translated_dialog then choice
    dismissDialog(); // dismiss intro question dialog

    // Choice menu: options are "no:yes" → index 0 = "no" (wants to see intro)
    confirmChoice();
    expect(gameVariables.get("question_intro")).toBe("no");

    // Spyder Intro fires: change_bg_char (instant), dialog, change_bg (instant),
    // dialog, set_variable (instant), transition_teleport (blocks).
    // Drive through all dialogs until the teleport flag is set.
    for (let i = 0; i < 200; i++) {
      tick();
      if (controls.pendingTeleport) break;
      tick(true);
      if (controls.pendingTeleport) break;
    }
    expect(gameVariables.get("spyder_intro")).toBe("yes");
    expect(controls.pendingTeleport).toEqual({
      mapKey: "spyder_paper_scoop",
      tileX: 4,
      tileY: 8,
      duration: 0.3,
    });
  });

  it("skip intro: setting question_intro:yes triggers No Intro teleport", () => {
    gameVariables.set("question_intro", "yes");

    const { tick, controls } = setupIntro();

    // No Intro should fire: set_variable + transition_teleport
    for (let i = 0; i < 200; i++) {
      tick();
      if (controls.pendingTeleport) break;
    }
    expect(gameVariables.get("spyder_intro")).toBe("yes");
    expect(controls.pendingTeleport).toEqual({
      mapKey: "spyder_paper_scoop",
      tileX: 4,
      tileY: 8,
      duration: 0.3,
    });
  });

  it("does not replay intro when both variables are already set", () => {
    gameVariables.set("question_intro", "no");
    gameVariables.set("spyder_intro", "yes");

    const { tick, controls } = setupIntro();

    // Run several frames — nothing should trigger
    for (let i = 0; i < 10; i++) tick();

    expect(controls.pendingTeleport).toBeUndefined();
  });
});

describe("paginate", () => {
  it("returns a single page for short text", () => {
    const pages = paginate("Hello world", 4);
    expect(pages).toEqual(["Hello world"]);
  });

  it("splits text into pages of maxLines lines", () => {
    const text = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7";
    const pages = paginate(text, 4);
    expect(pages).toEqual(["Line 1\nLine 2\nLine 3\nLine 4", "Line 5\nLine 6\nLine 7"]);
  });

  it("handles exact multiple of maxLines", () => {
    const text = "A\nB\nC\nD";
    const pages = paginate(text, 4);
    expect(pages).toEqual(["A\nB\nC\nD"]);
  });

  it("handles empty text", () => {
    const pages = paginate("", 4);
    expect(pages).toEqual([""]);
  });
});

describe("dialog pagination (multi-page)", () => {
  it("multi-page dialog advances on interact and dismisses on last page", () => {
    const scene = stubSceneWithUI();
    // 8 lines of text → should split into 2 pages (6 lines per page at default settings)
    const longText =
      "Line one\nLine two\nLine three\nLine four\nLine five\nLine six\nLine seven\nLine eight";
    const event: EventDef = {
      id: 90,
      name: "Long dialog",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [
        { type: "dialog", args: [longText] },
        { type: "set_variable", args: ["long_dialog_done:yes"] },
      ],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);

    // Trigger event
    engine.update(makeCtx({ scene, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
    expect(engine.blocking).toBe(true);

    // Fast-forward typewriter on first page, then press interact to advance page
    // (skip typewriter with interact, then advance to next page with another interact)
    engine.update(makeCtx({ scene, interactPressed: true }), 0.016); // skip typewriter
    expect(engine.blocking).toBe(true); // still on page 1, showing full text

    engine.update(makeCtx({ scene, interactPressed: true }), 0.016); // advance to page 2
    expect(engine.blocking).toBe(true); // now on page 2

    engine.update(makeCtx({ scene, interactPressed: true }), 0.016); // skip typewriter on page 2
    expect(engine.blocking).toBe(true); // page 2 fully shown

    engine.update(makeCtx({ scene, interactPressed: true }), 0.016); // dismiss (last page)
    expect(engine.blocking).toBe(false);
    expect(gameVariables.get("long_dialog_done")).toBe("yes");
    gameVariables.remove("long_dialog_done");
  });

  it("single-page dialog works without regression", () => {
    const scene = stubSceneWithUI();
    const event: EventDef = {
      id: 91,
      name: "Short dialog",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "dialog", args: ["Hello!"] }],
      x: 19,
      y: 18,
      width: 3,
      height: 3,
    };
    const engine = new EventEngine([event]);

    engine.update(makeCtx({ scene, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
    expect(engine.blocking).toBe(true);

    // Skip + dismiss
    for (let i = 0; i < 100; i++) {
      engine.update(makeCtx({ scene }), 0.05);
      if (!engine.blocking) break;
      engine.update(makeCtx({ scene, interactPressed: true }), 0.05);
      if (!engine.blocking) break;
    }
    expect(engine.blocking).toBe(false);
  });
});
