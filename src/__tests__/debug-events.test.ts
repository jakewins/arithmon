import { describe, it, expect, beforeEach, vi } from "vitest";
import { DebugBridge } from "../game/debug";

// Create a fresh bridge per test (not the singleton, to avoid cross-test pollution)
function makeBridge(): DebugBridge {
  return new DebugBridge();
}

describe("DebugBridge event log", () => {
  let bridge: DebugBridge;

  beforeEach(() => {
    bridge = makeBridge();
  });

  it("buffers emitted events in order", () => {
    bridge.emit("scene_started", { scene: "OverworldScene" });
    bridge.emit("player_moved", { fromX: 0, fromY: 0, toX: 1, toY: 0 });

    expect(bridge.events).toHaveLength(2);
    expect(bridge.events[0].type).toBe("scene_started");
    expect(bridge.events[1].type).toBe("player_moved");
    expect(bridge.events[1].data).toEqual({ fromX: 0, fromY: 0, toX: 1, toY: 0 });
  });

  it("sets time from performance.now()", () => {
    bridge.emit("test", {});
    expect(bridge.events[0].time).toBeGreaterThan(0);
  });

  it("rolls over at the buffer limit", () => {
    for (let i = 0; i < 2050; i++) {
      bridge.emit("tick", { i });
    }

    expect(bridge.events).toHaveLength(2000);
    // Oldest remaining should be event #50 (0-indexed)
    expect(bridge.events[0].data.i).toBe(50);
    expect(bridge.events[bridge.events.length - 1].data.i).toBe(2049);
  });

  it("clearEvents empties the buffer", () => {
    bridge.emit("a", {});
    bridge.emit("b", {});
    bridge.clearEvents();
    expect(bridge.events).toHaveLength(0);
  });

  it("onEvent fires callback for each emitted event", () => {
    const cb = vi.fn();
    bridge.onEvent(cb);

    bridge.emit("dialog_opened", { text: "Hello" });
    bridge.emit("dialog_closed", {});

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb.mock.calls[0][0].type).toBe("dialog_opened");
    expect(cb.mock.calls[1][0].type).toBe("dialog_closed");
  });

  it("supports multiple listeners", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    bridge.onEvent(cb1);
    bridge.onEvent(cb2);

    bridge.emit("test", {});

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});
