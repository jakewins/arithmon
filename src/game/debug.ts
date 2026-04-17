import { session } from "./session";

/**
 * Scenes implement this to contribute their state to `A.getState()`.
 */
export interface DebugStateProvider {
  getDebugState(): Record<string, unknown>;
}

export interface DebugEvent {
  type: string;
  time: number;
  data: Record<string, unknown>;
}

export type DebugEventCallback = (event: DebugEvent) => void;

const MAX_EVENTS = 2000;

function isDebugStateProvider(scene: unknown): scene is DebugStateProvider {
  return (
    typeof scene === "object" &&
    scene !== null &&
    "getDebugState" in scene &&
    typeof (scene as DebugStateProvider).getDebugState === "function"
  );
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
}

/** Singleton instance — scenes call `debugBridge.setScene(this)` in create(). */
export const debugBridge = new DebugBridge();

declare global {
  interface Window {
    A?: DebugBridge;
  }
}
