import { describe, it, expect, beforeEach, vi } from "vitest";
import { DebugBridge, type DebugCommandHandler } from "../game/debug";

/** Minimal mock scene that implements DebugCommandHandler. */
function makeMockScene(
  overrides: Partial<DebugCommandHandler> = {},
): Phaser.Scene & DebugCommandHandler & { scene: { key: string } } {
  return {
    scene: { key: "MockScene" },
    ...overrides,
  } as unknown as Phaser.Scene & DebugCommandHandler & { scene: { key: string } };
}

function makeBridge(): DebugBridge {
  return new DebugBridge();
}

describe("DebugBridge commands", () => {
  let bridge: DebugBridge;

  beforeEach(() => {
    bridge = makeBridge();
  });

  describe("interact()", () => {
    it("calls debugSetInteract on the active scene", async () => {
      const setInteract = vi.fn();
      bridge.setScene(makeMockScene({ debugSetInteract: setInteract }));

      await bridge.interact();

      expect(setInteract).toHaveBeenCalledOnce();
    });

    it("resolves without error when scene has no handler", async () => {
      bridge.setScene(makeMockScene());
      await expect(bridge.interact()).resolves.toBeUndefined();
    });

    it("resolves without error when no scene is set", async () => {
      await expect(bridge.interact()).resolves.toBeUndefined();
    });
  });

  describe("face()", () => {
    it("calls debugFace with the given direction", async () => {
      const face = vi.fn();
      bridge.setScene(makeMockScene({ debugFace: face }));

      await bridge.face("up");

      expect(face).toHaveBeenCalledWith("up");
    });

    it("resolves without error when scene has no handler", async () => {
      bridge.setScene(makeMockScene());
      await expect(bridge.face("left")).resolves.toBeUndefined();
    });
  });

  describe("selectChoice()", () => {
    it("calls debugSelectChoice with the given index", async () => {
      const selectChoice = vi.fn();
      bridge.setScene(makeMockScene({ debugSelectChoice: selectChoice }));

      await bridge.selectChoice(2);

      expect(selectChoice).toHaveBeenCalledWith(2);
    });
  });

  describe("typeAnswer()", () => {
    it("calls debugTypeAnswer with the given text", async () => {
      const typeAnswer = vi.fn();
      bridge.setScene(makeMockScene({ debugTypeAnswer: typeAnswer }));

      await bridge.typeAnswer("42");

      expect(typeAnswer).toHaveBeenCalledWith("42");
    });
  });

  describe("submitAnswer()", () => {
    it("calls debugSubmitAnswer on the active scene", async () => {
      const submitAnswer = vi.fn();
      bridge.setScene(makeMockScene({ debugSubmitAnswer: submitAnswer }));

      await bridge.submitAnswer();

      expect(submitAnswer).toHaveBeenCalledOnce();
    });
  });

  describe("waitForEvent()", () => {
    it("resolves when matching event is emitted", async () => {
      const promise = bridge.waitForEvent("dialog_opened");

      // Emit the event after a microtask to let the listener register
      queueMicrotask(() => {
        bridge.emit("dialog_opened", { text: "Hello" });
      });

      const event = await promise;
      expect(event.type).toBe("dialog_opened");
      expect(event.data).toEqual({ text: "Hello" });
    });

    it("ignores non-matching events", async () => {
      const promise = bridge.waitForEvent("dialog_closed");

      queueMicrotask(() => {
        bridge.emit("dialog_opened", { text: "Hello" });
        bridge.emit("dialog_closed", {});
      });

      const event = await promise;
      expect(event.type).toBe("dialog_closed");
    });

    it("rejects on timeout", async () => {
      const promise = bridge.waitForEvent("never_happens", 50);
      await expect(promise).rejects.toThrow('waitForEvent("never_happens") timed out');
    });
  });

  describe("waitForIdle()", () => {
    it("resolves immediately when not blocking", async () => {
      bridge.setScene(makeMockScene({ debugIsBlocking: () => false }));

      // waitForIdle uses requestAnimationFrame, so it resolves on the next frame
      await bridge.waitForIdle();
    });

    it("resolves immediately when no scene is set (not blocking)", async () => {
      await bridge.waitForIdle();
    });

    it("waits until blocking clears", async () => {
      let blocking = true;
      bridge.setScene(makeMockScene({ debugIsBlocking: () => blocking }));

      const promise = bridge.waitForIdle(5000);

      // Simulate blocking clearing after a few frames
      setTimeout(() => {
        blocking = false;
      }, 50);

      await promise;
    });

    it("rejects on timeout when stuck blocking", async () => {
      bridge.setScene(makeMockScene({ debugIsBlocking: () => true }));
      const promise = bridge.waitForIdle(50);
      await expect(promise).rejects.toThrow("waitForIdle timed out");
    });
  });

  describe("all commands return promises", () => {
    it("interact returns a promise", () => {
      expect(bridge.interact()).toBeInstanceOf(Promise);
    });

    it("face returns a promise", () => {
      expect(bridge.face("down")).toBeInstanceOf(Promise);
    });

    it("selectChoice returns a promise", () => {
      expect(bridge.selectChoice(0)).toBeInstanceOf(Promise);
    });

    it("typeAnswer returns a promise", () => {
      expect(bridge.typeAnswer("1")).toBeInstanceOf(Promise);
    });

    it("submitAnswer returns a promise", () => {
      expect(bridge.submitAnswer()).toBeInstanceOf(Promise);
    });

    it("waitForIdle returns a promise", () => {
      const p = bridge.waitForIdle();
      expect(p).toBeInstanceOf(Promise);
    });

    it("waitForEvent returns a promise", () => {
      const p = bridge.waitForEvent("test", 50);
      expect(p).toBeInstanceOf(Promise);
      // Clean up: let it reject rather than hang
      p.catch(() => {});
    });
  });
});
