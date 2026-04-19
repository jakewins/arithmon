import { Scene } from "phaser";
import { EventEngine } from "../event/engine";
import { loadEventsFromYaml } from "../event/loader";
import type { EventContext, NpcState, PendingTeleport } from "../event/types";
import { session } from "../session";
import type { OverworldInitData } from "./OverworldScene";
import { debugBridge, type DebugCommandHandler, type DebugStateProvider } from "../debug";

export class CutsceneScene extends Scene implements DebugStateProvider, DebugCommandHandler {
  private eventEngine!: EventEngine;
  private interactPressed = false;
  private controlsState: {
    locked: boolean;
    cutsceneDone: boolean;
    pendingTeleport?: PendingTeleport;
  } = { locked: false, cutsceneDone: false };
  private callerScene = "";
  private teleporting = false;
  private pendingChoiceOverride?: number;

  constructor() {
    super("CutsceneScene");
  }

  init(data: { yamlKey: string; callerScene: string }) {
    this.callerScene = data.callerScene;
    const yamlText = this.cache.text.get(data.yamlKey) as string;
    const events = loadEventsFromYaml(yamlText);
    this.eventEngine = new EventEngine(events);
    this.controlsState = { locked: false, cutsceneDone: false };
    this.interactPressed = false;
    this.teleporting = false;
  }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);

    this.input.keyboard!.on("keydown-SPACE", () => {
      this.interactPressed = true;
    });
    this.input.keyboard!.on("keydown-Z", () => {
      this.interactPressed = true;
    });

    debugBridge.setScene(this);
    debugBridge.emit("scene_started", { scene: "CutsceneScene" });

    this.events.once("shutdown", () => {
      debugBridge.emit("scene_stopped", { scene: "CutsceneScene" });
    });
  }

  getDebugState(): Record<string, unknown> {
    return {
      cutscene: {
        callerScene: this.callerScene,
        blocking: this.eventEngine.blocking,
        cutsceneDone: this.controlsState.cutsceneDone,
      },
    };
  }

  // --- DebugCommandHandler ---

  debugSetInteract(): void {
    this.interactPressed = true;
  }

  debugSelectChoice(index: number): void {
    this.pendingChoiceOverride = index;
  }

  debugIsBlocking(): boolean {
    return this.eventEngine.blocking;
  }

  update(_time: number, delta: number) {
    if (this.teleporting) return;

    const ctx: EventContext = {
      scene: this,
      session,
      player: { tileX: 0, tileY: 0, facing: "down" },
      variables: session.player.gameVariables,
      interactPressed: this.interactPressed,
      npcs: new Map<string, NpcState>(),
      controls: this.controlsState,
      debugChoiceOverride: this.pendingChoiceOverride,
      addEvents: (events) => this.eventEngine.mergeEvents(events),
    };

    this.eventEngine.update(ctx, delta / 1000);

    this.interactPressed = false;
    this.pendingChoiceOverride = undefined;

    // Teleport request: fade, stop the cutscene, and hand off to the overworld
    // with the target map + spawn instead of resuming the caller scene.
    if (this.controlsState.pendingTeleport) {
      this.beginTeleport(this.controlsState.pendingTeleport);
      this.controlsState.pendingTeleport = undefined;
      return;
    }

    if (this.controlsState.cutsceneDone) {
      this.scene.stop();
      this.scene.resume(this.callerScene);
    }
  }

  private beginTeleport(teleport: PendingTeleport) {
    this.teleporting = true;
    const durationMs = Math.max(1, Math.round(teleport.duration * 1000));
    this.cameras.main.fadeOut(durationMs, 0, 0, 0);
    // Use the scene's timer rather than the camera's FADE_OUT_COMPLETE event.
    // The timer is tied to the scene update loop and fires reliably regardless
    // of camera effect state. scene.start queues a stop for this scene and a
    // stop+start for the paused caller (OverworldScene), so we don't need to
    // call scene.stop ourselves.
    this.time.delayedCall(durationMs, () => {
      this.scene.start("OverworldScene", {
        mapKey: teleport.mapKey,
        spawnTileX: teleport.tileX,
        spawnTileY: teleport.tileY,
      } satisfies OverworldInitData);
    });
  }
}
