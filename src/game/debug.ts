import { session } from "./session";

/**
 * Scenes implement this to contribute their state to `A.getState()`.
 */
export interface DebugStateProvider {
  getDebugState(): Record<string, unknown>;
}

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

  /** True once a scene has registered itself. */
  get ready(): boolean {
    return this.activeScene !== null;
  }

  /** Called by each scene in its `create()` method. */
  setScene(scene: Phaser.Scene): void {
    this.activeScene = scene;
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
