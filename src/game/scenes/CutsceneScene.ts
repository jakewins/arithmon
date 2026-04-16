import { Scene } from "phaser";
import { EventEngine } from "../event/engine";
import { loadEventsFromYaml } from "../event/loader";
import type { EventContext, NpcState } from "../event/types";
import { session } from "../session";

export class CutsceneScene extends Scene {
  private eventEngine!: EventEngine;
  private interactPressed = false;
  private controlsState = { locked: false, cutsceneDone: false };
  private callerScene = "";

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
  }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);

    this.input.keyboard!.on("keydown-SPACE", () => {
      this.interactPressed = true;
    });
    this.input.keyboard!.on("keydown-Z", () => {
      this.interactPressed = true;
    });
  }

  update(_time: number, delta: number) {
    const ctx: EventContext = {
      scene: this,
      session,
      player: { tileX: 0, tileY: 0, facing: "down" },
      variables: session.player.gameVariables,
      interactPressed: this.interactPressed,
      npcs: new Map<string, NpcState>(),
      controls: this.controlsState,
    };

    this.eventEngine.update(ctx, delta / 1000);

    this.interactPressed = false;

    if (this.controlsState.cutsceneDone) {
      this.scene.stop();
      this.scene.resume(this.callerScene);
    }
  }
}
