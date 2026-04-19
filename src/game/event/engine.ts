import type { EventContext, EventDef, ConditionDef } from "./types";
import { createCondition } from "./registry";
import { RunningEvent } from "./running";
import { debugBridge } from "../debug";

// Import conditions and actions to trigger their self-registration
import "./conditions/charFacingTile";
import "./conditions/buttonPressed";
import "./conditions/variableSet";
import "./conditions/charAt";
import "./conditions/charExists";
import "./conditions/charFacingChar";
import "./actions/dialog";
import "./actions/setVariable";
import "./actions/createNpc";
import "./actions/charFace";
import "./actions/lockControls";
import "./actions/unlockControls";
import "./actions/removeNpc";
import "./actions/wait";
import "./actions/pathfind";
import "./actions/translatedDialogChoice";
import "./actions/changeBg";
import "./actions/changeBgChar";
import "./actions/changeBgMonster";
import "./actions/endCutscene";
import "./actions/setCharAttribute";
import "./actions/setTemplate";
import "./actions/transitionTeleport";
import "./actions/translatedDialog";
import "./actions/screenTransition";
import "./actions/setMonsterHealth";
import "./actions/setMonsterStatus";
import "./actions/setTeleportFaint";
import "./actions/playMusic";
import "./actions/accessPc";
import "./conditions/musicPlaying";
import "./actions/clearVariable";
import "./actions/formatVariable";
import "./actions/addItem";
import "./actions/addMonster";
import "./actions/removeMonster";
import "./actions/renamePlayer";
import "./actions/charPosition";
import "./actions/charStop";
import "./actions/pathfindToChar";
import "./actions/playSound";
import "./actions/openJournal";
import "./actions/choiceMonster";
import "./actions/startBattle";
import "./actions/openShop";
import "./conditions/partySize";
import "./conditions/hasItem";
import "./conditions/hasMonster";
import "./conditions/charFacing";
import "./conditions/checkCharParameter";
import "./conditions/battleOutcome";
import "./conditions/charDefeated";
import "./conditions/currentState";

export class EventEngine {
  private events: EventDef[];
  private running: RunningEvent[] = [];
  private runningIds = new Set<number>();
  /** Events that just completed get a one-frame cooldown before re-evaluation. */
  private cooldownIds = new Set<number>();

  constructor(events: EventDef[]) {
    this.events = events;
  }

  /** Returns true if any running event has a blocking action (e.g. dialog). */
  get blocking(): boolean {
    return this.running.some((r) => r.blocking);
  }

  update(ctx: EventContext, dt: number): void {
    // Check conditions for non-running events and start new ones.
    // Skip if any running event is blocking (dialog/choice) to prevent
    // visual overlaps, and skip events on cooldown (just completed last frame).
    const anyBlocking = this.running.some((r) => r.blocking);

    if (!anyBlocking) {
      for (const def of this.events) {
        if (this.runningIds.has(def.id)) continue;
        if (this.cooldownIds.has(def.id)) continue;
        if (this.checkConditions(ctx, def)) {
          if (def.conditions.some((c) => c.type === "button_pressed")) {
            debugBridge.emit("npc_interact", { npc: def.name });
          }
          const running = new RunningEvent(def);
          this.running.push(running);
          this.runningIds.add(def.id);
        }
      }
    }

    // Clear cooldowns — they only block for one frame.
    this.cooldownIds.clear();

    // Step running events
    for (const running of this.running) {
      running.step(ctx, dt);
    }

    // Clean up completed events. Put them on one-frame cooldown so that
    // single-frame sibling events (variable setters) that also completed
    // this frame can update state before this event is re-evaluated.
    this.running = this.running.filter((r) => {
      if (r.done) {
        this.runningIds.delete(r.def.id);
        this.cooldownIds.add(r.def.id);
        return false;
      }
      return true;
    });
  }

  private checkConditions(ctx: EventContext, def: EventDef): boolean {
    for (const condDef of def.conditions) {
      const result = this.evaluateCondition(ctx, def, condDef);
      if (!result) return false;
    }
    return def.conditions.length > 0; // don't auto-trigger events with no conditions
  }

  private evaluateCondition(ctx: EventContext, def: EventDef, condDef: ConditionDef): boolean {
    const condition = createCondition(condDef.type, condDef.args);
    const result = condition.test(ctx, def);
    return condDef.operator === "is" ? result : !result;
  }
}
