import { describe, it, expect, beforeEach } from "vitest";
import { DebugBridge, type DebugCommandHandler } from "../game/debug";
import type { Direction } from "../game/event/types";

/** Minimal mock scene — no walkTo handler. */
function makeMockScene(
  overrides: Partial<DebugCommandHandler> = {},
): Phaser.Scene & DebugCommandHandler & { scene: { key: string } } {
  return {
    scene: { key: "MockScene" },
    ...overrides,
  } as unknown as Phaser.Scene & DebugCommandHandler & { scene: { key: string } };
}

describe("DebugBridge.walkTo()", () => {
  let bridge: DebugBridge;

  beforeEach(() => {
    bridge = new DebugBridge();
  });

  it("delegates to debugWalkTo on the active scene", async () => {
    let calledWith: [number, number, Direction | undefined] | null = null;
    const scene = makeMockScene({
      debugWalkTo: (x, y, f) => {
        calledWith = [x, y, f];
        return Promise.resolve();
      },
    });
    bridge.setScene(scene);

    await bridge.walkTo(5, 3, "up");

    expect(calledWith).toEqual([5, 3, "up"]);
  });

  it("resolves without error when scene has no handler", async () => {
    bridge.setScene(makeMockScene());
    await expect(bridge.walkTo(1, 2)).resolves.toBeUndefined();
  });

  it("resolves without error when no scene is set", async () => {
    await expect(bridge.walkTo(1, 2)).resolves.toBeUndefined();
  });

  it("propagates rejection from the handler", async () => {
    const scene = makeMockScene({
      debugWalkTo: () => Promise.reject(new Error("no path")),
    });
    bridge.setScene(scene);

    await expect(bridge.walkTo(99, 99)).rejects.toThrow("no path");
  });

  it("returns a promise", () => {
    const scene = makeMockScene({
      debugWalkTo: () => Promise.resolve(),
    });
    bridge.setScene(scene);
    expect(bridge.walkTo(1, 1)).toBeInstanceOf(Promise);
  });

  it("passes facing as undefined when not provided", async () => {
    let receivedFacing: Direction | undefined = "down";
    const scene = makeMockScene({
      debugWalkTo: (_x, _y, f) => {
        receivedFacing = f;
        return Promise.resolve();
      },
    });
    bridge.setScene(scene);

    await bridge.walkTo(3, 4);

    expect(receivedFacing).toBeUndefined();
  });
});
