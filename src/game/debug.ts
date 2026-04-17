import type { Direction } from "./event/types";
import { session } from "./session";

/**
 * Scenes implement this to contribute their state to `A.getState()`.
 */
export interface DebugStateProvider {
  getDebugState(): Record<string, unknown>;
}

/**
 * Scenes implement the methods they support so the bridge can route debug
 * commands (interact, face, selectChoice, etc.) to the active scene.
 */
export interface DebugCommandHandler {
  debugSetInteract?(): void;
  debugFace?(direction: Direction): void;
  debugSelectChoice?(index: number): void;
  debugTypeAnswer?(text: string): void;
  debugSubmitAnswer?(): void;
  debugIsBlocking?(): boolean;
}

export interface DebugEvent {
  type: string;
  time: number;
  data: Record<string, unknown>;
}

export type DebugEventCallback = (event: DebugEvent) => void;

const MAX_EVENTS = 2000;
const DEFAULT_TIMEOUT = 10_000;

/** Use requestAnimationFrame when available (browser), fall back to setTimeout (Node/tests). */
const nextFrame =
  typeof requestAnimationFrame === "function"
    ? requestAnimationFrame
    : (cb: () => void) => setTimeout(cb, 16);

function isDebugStateProvider(scene: unknown): scene is DebugStateProvider {
  return (
    typeof scene === "object" &&
    scene !== null &&
    "getDebugState" in scene &&
    typeof (scene as DebugStateProvider).getDebugState === "function"
  );
}

function isDebugCommandHandler(scene: unknown): scene is DebugCommandHandler {
  return typeof scene === "object" && scene !== null;
}

export class DebugBridge {
  private activeScene: Phaser.Scene | null = null;
  private eventBuffer: DebugEvent[] = [];
  private listeners: DebugEventCallback[] = [];

  /** True once a scene has registered itself. */
  get ready(): boolean {
    return this.activeScene !== null;
  }

  /** Readonly array of recent events. */
  get events(): readonly DebugEvent[] {
    return this.eventBuffer;
  }

  /** Called by each scene in its `create()` method. */
  setScene(scene: Phaser.Scene): void {
    this.activeScene = scene;
  }

  /** Emit a debug event into the rolling buffer and notify listeners. */
  emit(type: string, data: Record<string, unknown>): void {
    const event: DebugEvent = { type, time: performance.now(), data };
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > MAX_EVENTS) {
      this.eventBuffer.splice(0, this.eventBuffer.length - MAX_EVENTS);
    }
    for (const cb of this.listeners) {
      cb(event);
    }
  }

  /** Register a callback fired for each event as it occurs. */
  onEvent(cb: DebugEventCallback): void {
    this.listeners.push(cb);
  }

  /** Clear the event buffer. */
  clearEvents(): void {
    this.eventBuffer.length = 0;
  }

  /** Returns a JSON-serializable snapshot of the current game state. */
  getState(): Record<string, unknown> {
    const sceneState = isDebugStateProvider(this.activeScene)
      ? this.activeScene.getDebugState()
      : {};

    const p = session.player;
    return {
      scene: this.activeScene?.scene.key ?? null,
      session: {
        name: p.name,
        gender: p.gender,
        template: p.template,
        variables: p.gameVariables.toRecord(),
        darkPower: session.skillEncounter,
        monsters: p.monsters.map((m) => ({
          slug: m.slug,
          level: m.level,
          currentHp: m.currentHp,
          maxHp: m.maxHp,
        })),
      },
      ...sceneState,
    };
  }

  // --- Debug commands ---

  /** Simulate pressing the interact button (spacebar/Z). Resolves immediately. */
  async interact(): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugSetInteract) {
      handler.debugSetInteract();
    }
  }

  /** Turn the player to face a direction. Resolves immediately. */
  async face(direction: Direction): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugFace) {
      handler.debugFace(direction);
    }
  }

  /** Select a dialog choice by 0-based index. Resolves immediately. */
  async selectChoice(index: number): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugSelectChoice) {
      handler.debugSelectChoice(index);
    }
  }

  /** Set the math problem input text. Resolves immediately. */
  async typeAnswer(text: string): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugTypeAnswer) {
      handler.debugTypeAnswer(text);
    }
  }

  /** Submit the current math problem answer. Resolves immediately. */
  async submitAnswer(): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugSubmitAnswer) {
      handler.debugSubmitAnswer();
    }
  }

  /** Wait until the event engine is no longer blocking. */
  async waitForIdle(timeout = DEFAULT_TIMEOUT): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = performance.now() + timeout;

      const check = () => {
        const handler = this.getCommandHandler();
        const blocking = handler?.debugIsBlocking?.() ?? false;
        if (!blocking) {
          resolve();
          return;
        }
        if (performance.now() > deadline) {
          reject(new Error("waitForIdle timed out"));
          return;
        }
        nextFrame(check);
      };

      nextFrame(check);
    });
  }

  /** Wait for a specific event type to appear in the log. */
  async waitForEvent(type: string, timeout = DEFAULT_TIMEOUT): Promise<DebugEvent> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`waitForEvent("${type}") timed out`));
      }, timeout);

      this.onEvent((event) => {
        if (event.type === type) {
          clearTimeout(timer);
          resolve(event);
        }
      });
    });
  }

  private getCommandHandler(): DebugCommandHandler | null {
    if (this.activeScene && isDebugCommandHandler(this.activeScene)) {
      return this.activeScene as DebugCommandHandler;
    }
    return null;
  }
}

/** Singleton instance — scenes call `debugBridge.setScene(this)` in create(). */
export const debugBridge = new DebugBridge();

declare global {
  interface Window {
    A?: DebugBridge;
  }
}
