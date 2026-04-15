import type { EventContext, EventDef, ConditionDef } from "./types";
import { createCondition } from "./registry";
import { RunningEvent } from "./running";

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
import "./actions/endCutscene";

export class EventEngine {
  private events: EventDef[];
  private running: RunningEvent[] = [];
  private runningIds = new Set<number>();

  constructor(events: EventDef[]) {
    this.events = events;
  }

  /** Returns true if any running event has a blocking action (e.g. dialog). */
  get blocking(): boolean {
    return this.running.some((r) => r.blocking);
  }

  update(ctx: EventContext, dt: number): void {
    // Check conditions for non-running events and start new ones
    for (const def of this.events) {
      if (this.runningIds.has(def.id)) continue;
      if (this.checkConditions(ctx, def)) {
        const running = new RunningEvent(def);
        this.running.push(running);
        this.runningIds.add(def.id);
      }
    }

    // Step running events
    for (const running of this.running) {
      running.step(ctx, dt);
    }

    // Clean up completed events
    this.running = this.running.filter((r) => {
      if (r.done) {
        this.runningIds.delete(r.def.id);
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
