import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

const SCENE_TO_STATE: Record<string, string> = {
  OverworldScene: "WorldState",
  CombatScene: "CombatState",
  JournalScene: "JournalState",
  MonsterInfoScene: "JournalInfoState",
  PauseMenuScene: "PauseState",
  PartyScreenScene: "PartyState",
};

class CurrentStateCondition implements EventCondition {
  type = "current_state";

  private expectedState: string;

  constructor(args: string[]) {
    // Syntax: current_state WorldState
    this.expectedState = args[0];
  }

  test(ctx: EventContext): boolean {
    const sceneKey = ctx.scene.scene?.key;
    if (!sceneKey) return false;
    const state = SCENE_TO_STATE[sceneKey] ?? sceneKey;
    return state === this.expectedState;
  }
}

registerCondition("current_state", (args) => new CurrentStateCondition(args));
