import { describe, it, expect, beforeEach, vi } from "vitest";
import type { EventContext, EventDef, NpcState, Direction } from "../game/event/types";
import { EventEngine } from "../game/event/engine";
import { session } from "../game/session";
import { Monster } from "../game/model/Monster";
import { addItem, getItemCount } from "../game/item/inventory";
import { createInventory } from "../game/item/inventory";
import { getStatus } from "../game/model/monsterRegistry";

const gameVariables = session.player.gameVariables;

function stubScene(): Phaser.Scene {
  return {} as unknown as Phaser.Scene;
}

function stubSceneWithUI(): Phaser.Scene {
  const makeObj = (overrides: Record<string, unknown> = {}) => ({
    setDepth: vi.fn().mockReturnThis(),
    setScrollFactor: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setY: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    getWrappedText: vi.fn((text: string) => text.split("\n")),
    y: 192,
    height: 48,
    ...overrides,
  });
  return {
    add: {
      rectangle: vi.fn(() => makeObj()),
      text: vi.fn(() => makeObj()),
      nineslice: vi.fn(() => makeObj()),
    },
    input: {
      keyboard: {
        addKey: vi.fn(() => ({ isDown: false, _justDown: false })),
        removeKey: vi.fn(),
      },
    },
    scene: { launch: vi.fn(), key: "OverworldScene" },
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

function inZone(): { x: number; y: number; width: number; height: number } {
  return { x: 19, y: 18, width: 3, height: 3 };
}

function triggerEvent(event: EventDef, overrides: Partial<EventContext> = {}) {
  const engine = new EventEngine([event]);
  engine.update(makeCtx({ player: { tileX: 20, tileY: 19, facing: "down" }, ...overrides }), 0.016);
  return engine;
}

describe("clear_variable action", () => {
  it("removes a previously set variable", () => {
    gameVariables.set("to_clear", "value");
    triggerEvent({
      id: 100,
      name: "Clear",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "clear_variable", args: ["to_clear"] }],
      ...inZone(),
    });
    expect(gameVariables.has("to_clear")).toBe(false);
  });
});

describe("format_variable action", () => {
  beforeEach(() => gameVariables.remove("fmt_val"));

  it("converts a float string to int", () => {
    gameVariables.set("fmt_val", "3.7");
    triggerEvent({
      id: 101,
      name: "Format",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "format_variable", args: ["fmt_val", "int"] }],
      ...inZone(),
    });
    expect(gameVariables.get("fmt_val")).toBe("3");
  });

  it("converts an int string to float", () => {
    gameVariables.set("fmt_val", "5");
    triggerEvent({
      id: 102,
      name: "Format float",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "format_variable", args: ["fmt_val", "float"] }],
      ...inZone(),
    });
    expect(gameVariables.get("fmt_val")).toBe("5");
  });

  it("is a no-op for missing variable", () => {
    triggerEvent({
      id: 103,
      name: "Format missing",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "format_variable", args: ["fmt_val", "int"] }],
      ...inZone(),
    });
    expect(gameVariables.has("fmt_val")).toBe(false);
  });
});

describe("add_item action", () => {
  beforeEach(() => {
    session.player.inventory = createInventory();
  });

  it("adds items to player inventory", () => {
    triggerEvent({
      id: 110,
      name: "Add item",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "add_item", args: ["potion", "3"] }],
      ...inZone(),
    });
    expect(getItemCount(session.player.inventory, "potion")).toBe(3);
  });

  it("defaults to count 1", () => {
    triggerEvent({
      id: 111,
      name: "Add one",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "add_item", args: ["tuxeball"] }],
      ...inZone(),
    });
    expect(getItemCount(session.player.inventory, "tuxeball")).toBe(1);
  });
});

describe("add_monster action", () => {
  beforeEach(() => {
    session.player.monsters = [];
    session.monsterStorage = [];
  });

  it("adds a monster to the party", () => {
    triggerEvent({
      id: 120,
      name: "Add monster",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "add_monster", args: ["rockitten", "5"] }],
      ...inZone(),
    });
    expect(session.player.monsters).toHaveLength(1);
    expect(session.player.monsters[0].slug).toBe("rockitten");
    expect(session.player.monsters[0].level).toBe(5);
    expect(getStatus(session.monsterRegistry, "rockitten")).toBe("caught");
  });

  it("sends to storage when party is full", () => {
    for (let i = 0; i < 6; i++) {
      session.player.monsters.push(Monster.spawn("rockitten", 3));
    }
    triggerEvent({
      id: 121,
      name: "Add overflow",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "add_monster", args: ["rockitten", "10"] }],
      ...inZone(),
    });
    expect(session.player.monsters).toHaveLength(6);
    expect(session.monsterStorage).toHaveLength(1);
    expect(session.monsterStorage[0].level).toBe(10);
  });
});

describe("remove_monster action", () => {
  beforeEach(() => {
    session.player.monsters = [];
  });

  it("removes a monster by slot index", () => {
    session.player.monsters = [Monster.spawn("rockitten", 5), Monster.spawn("rockitten", 3)];
    triggerEvent({
      id: 130,
      name: "Remove by slot",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "remove_monster", args: ["0"] }],
      ...inZone(),
    });
    expect(session.player.monsters).toHaveLength(1);
    expect(session.player.monsters[0].level).toBe(3);
  });
});

describe("rename_player action", () => {
  beforeEach(() => {
    session.player.name = "Player";
  });

  it("sets the player name", () => {
    triggerEvent({
      id: 140,
      name: "Rename",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "rename_player", args: ["Luna"] }],
      ...inZone(),
    });
    expect(session.player.name).toBe("Luna");
  });

  it("handles two-arg syntax (target, name)", () => {
    triggerEvent({
      id: 141,
      name: "Rename two-arg",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "rename_player", args: ["player", "Sparky"] }],
      ...inZone(),
    });
    expect(session.player.name).toBe("Sparky");
  });
});

describe("char_position action", () => {
  it("teleports NPC to exact tile coordinates", () => {
    const sprite = {
      x: 0,
      y: 0,
      setFrame: vi.fn(),
    } as unknown as Phaser.GameObjects.Sprite;
    const npcs = new Map<string, NpcState>();
    npcs.set("guard", { slug: "guard", tileX: 0, tileY: 0, facing: "down", sprite });

    triggerEvent(
      {
        id: 150,
        name: "Position",
        conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
        actions: [{ type: "char_position", args: ["guard", "5", "10"] }],
        ...inZone(),
      },
      { npcs },
    );

    const npc = npcs.get("guard")!;
    expect(npc.tileX).toBe(5);
    expect(npc.tileY).toBe(10);
    expect(npc.sprite.x).toBe(5 * 16 + 8);
    expect(npc.sprite.y).toBe(10 * 16);
  });
});

describe("char_stop action", () => {
  it("resets NPC sprite frame to standing", () => {
    const setFrame = vi.fn();
    const sprite = { x: 0, y: 0, setFrame } as unknown as Phaser.GameObjects.Sprite;
    const npcs = new Map<string, NpcState>();
    npcs.set("guard", { slug: "guard", tileX: 5, tileY: 5, facing: "left", sprite });

    triggerEvent(
      {
        id: 160,
        name: "Stop",
        conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
        actions: [{ type: "char_stop", args: ["guard"] }],
        ...inZone(),
      },
      { npcs },
    );

    expect(setFrame).toHaveBeenCalledWith(4); // left facing frame
  });
});

describe("play_sound action", () => {
  it("completes immediately (stub)", () => {
    const event: EventDef = {
      id: 170,
      name: "Sound",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [
        { type: "play_sound", args: ["sfx_click"] },
        { type: "set_variable", args: ["sound_done:yes"] },
      ],
      ...inZone(),
    };
    triggerEvent(event);
    expect(gameVariables.get("sound_done")).toBe("yes");
    gameVariables.remove("sound_done");
  });
});

describe("choice_monster action", () => {
  beforeEach(() => gameVariables.remove("starter"));

  it("stores selected monster slug in variable", () => {
    const scene = stubSceneWithUI();
    const event: EventDef = {
      id: 180,
      name: "Choose monster",
      conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
      actions: [{ type: "choice_monster", args: ["rockitten:dollfin", "starter"] }],
      ...inZone(),
    };
    const engine = new EventEngine([event]);

    // Trigger
    engine.update(makeCtx({ scene, player: { tileX: 20, tileY: 19, facing: "down" } }), 0.016);
    expect(engine.blocking).toBe(true);

    // Skip first frame
    engine.update(makeCtx({ scene }), 0.016);

    // Confirm (default = first option)
    engine.update(makeCtx({ scene, interactPressed: true }), 0.016);
    expect(gameVariables.get("starter")).toBe("rockitten");
  });
});

describe("open_journal action", () => {
  it("launches JournalScene and marks monster as seen", () => {
    const scene = stubSceneWithUI();
    const launchSpy = (scene as unknown as { scene: { launch: ReturnType<typeof vi.fn> } }).scene
      .launch;

    triggerEvent(
      {
        id: 190,
        name: "Open journal",
        conditions: [{ operator: "is", type: "char_at", args: ["player"] }],
        actions: [{ type: "open_journal", args: ["dollfin"] }],
        ...inZone(),
      },
      { scene },
    );

    expect(launchSpy).toHaveBeenCalledWith("JournalScene");
    expect(session.monsterRegistry.seen.has("dollfin")).toBe(true);
  });
});

// --- Conditions ---

describe("party_size condition", () => {
  beforeEach(() => {
    session.player.monsters = [Monster.spawn("rockitten", 5)];
    gameVariables.remove("result");
  });

  it("equals matches exact size", () => {
    triggerEvent({
      id: 200,
      name: "Size equals",
      conditions: [{ operator: "is", type: "party_size", args: ["player", "equals", "1"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.get("result")).toBe("yes");
    gameVariables.remove("result");
  });

  it("greater_than checks correctly", () => {
    triggerEvent({
      id: 201,
      name: "Size gt",
      conditions: [{ operator: "is", type: "party_size", args: ["player", "greater_than", "0"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.get("result")).toBe("yes");
    gameVariables.remove("result");
  });

  it("less_than rejects when not met", () => {
    triggerEvent({
      id: 202,
      name: "Size lt",
      conditions: [{ operator: "is", type: "party_size", args: ["player", "less_than", "1"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.has("result")).toBe(false);
  });
});

describe("has_item condition", () => {
  beforeEach(() => {
    session.player.inventory = createInventory();
    gameVariables.remove("result");
  });

  it("returns true when player has the item", () => {
    addItem(session.player.inventory, "potion", 3);
    triggerEvent({
      id: 210,
      name: "Has item",
      conditions: [{ operator: "is", type: "has_item", args: ["player", "potion"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.get("result")).toBe("yes");
    gameVariables.remove("result");
  });

  it("returns false when player lacks the item", () => {
    triggerEvent({
      id: 211,
      name: "No item",
      conditions: [{ operator: "is", type: "has_item", args: ["player", "potion"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.has("result")).toBe(false);
  });
});

describe("has_monster condition", () => {
  beforeEach(() => {
    session.player.monsters = [Monster.spawn("rockitten", 5)];
    gameVariables.remove("result");
  });

  it("returns true when party contains the species", () => {
    triggerEvent({
      id: 220,
      name: "Has monster",
      conditions: [{ operator: "is", type: "has_monster", args: ["player", "rockitten"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.get("result")).toBe("yes");
    gameVariables.remove("result");
  });

  it("returns false when species is absent", () => {
    triggerEvent({
      id: 221,
      name: "No monster",
      conditions: [{ operator: "is", type: "has_monster", args: ["player", "dollfin"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.has("result")).toBe(false);
  });
});

describe("char_facing condition", () => {
  beforeEach(() => gameVariables.remove("result"));

  it("matches player facing direction", () => {
    // triggerEvent sets player facing to "down"
    triggerEvent({
      id: 230,
      name: "Facing down",
      conditions: [{ operator: "is", type: "char_facing", args: ["player", "down"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.get("result")).toBe("yes");
    gameVariables.remove("result");
  });

  it("rejects wrong direction", () => {
    // triggerEvent sets player facing to "down", so "up" should not match
    triggerEvent({
      id: 231,
      name: "Not facing up",
      conditions: [{ operator: "is", type: "char_facing", args: ["player", "up"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.has("result")).toBe(false);
  });
});

describe("check_char_parameter condition", () => {
  beforeEach(() => {
    session.player.name = "Luna";
    session.player.gender = "female";
    gameVariables.remove("result");
  });

  it("matches player name", () => {
    triggerEvent({
      id: 240,
      name: "Check name",
      conditions: [
        { operator: "is", type: "check_char_parameter", args: ["player", "name", "Luna"] },
      ],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.get("result")).toBe("yes");
    gameVariables.remove("result");
  });

  it("matches player gender", () => {
    triggerEvent({
      id: 241,
      name: "Check gender",
      conditions: [
        { operator: "is", type: "check_char_parameter", args: ["player", "gender", "female"] },
      ],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.get("result")).toBe("yes");
    gameVariables.remove("result");
  });
});

describe("battle_outcome condition", () => {
  beforeEach(() => {
    session.battleOutcomes.clear();
    gameVariables.remove("result");
  });

  it("matches stored outcome", () => {
    session.battleOutcomes.set("dante", "won");
    triggerEvent({
      id: 250,
      name: "Battle won",
      conditions: [{ operator: "is", type: "battle_outcome", args: ["player", "dante", "won"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.get("result")).toBe("yes");
    gameVariables.remove("result");
  });

  it("rejects wrong outcome", () => {
    session.battleOutcomes.set("dante", "lost");
    triggerEvent({
      id: 251,
      name: "Battle not won",
      conditions: [{ operator: "is", type: "battle_outcome", args: ["player", "dante", "won"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.has("result")).toBe(false);
  });
});

describe("char_defeated condition", () => {
  beforeEach(() => {
    session.player.monsters = [];
    gameVariables.remove("result");
  });

  it("returns true when all party monsters are fainted", () => {
    const m = Monster.spawn("rockitten", 5);
    m.currentHp = 0;
    session.player.monsters = [m];

    triggerEvent({
      id: 260,
      name: "Defeated",
      conditions: [{ operator: "is", type: "char_defeated", args: ["player"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.get("result")).toBe("yes");
    gameVariables.remove("result");
  });

  it("returns false when some monsters are alive", () => {
    session.player.monsters = [Monster.spawn("rockitten", 5)];

    triggerEvent({
      id: 261,
      name: "Not defeated",
      conditions: [{ operator: "is", type: "char_defeated", args: ["player"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.has("result")).toBe(false);
  });

  it("returns false when party is empty", () => {
    triggerEvent({
      id: 262,
      name: "Empty party",
      conditions: [{ operator: "is", type: "char_defeated", args: ["player"] }],
      actions: [{ type: "set_variable", args: ["result:yes"] }],
    });
    expect(gameVariables.has("result")).toBe(false);
  });
});

describe("current_state condition", () => {
  beforeEach(() => gameVariables.remove("result"));

  it("matches scene key mapped to state name", () => {
    const scene = stubSceneWithUI();
    triggerEvent(
      {
        id: 270,
        name: "World state",
        conditions: [{ operator: "is", type: "current_state", args: ["WorldState"] }],
        actions: [{ type: "set_variable", args: ["result:yes"] }],
      },
      { scene },
    );
    expect(gameVariables.get("result")).toBe("yes");
    gameVariables.remove("result");
  });
});
