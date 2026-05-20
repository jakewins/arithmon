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
import "./actions/setMonsterAttribute";
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
import "./actions/copyVariable";
import "./actions/variableMath";
import "./actions/loadYaml";
import "./actions/modifyMoney";
import "./actions/setEconomy";
import "./actions/setBill";
import "./actions/modifyBill";
import "./conditions/moneyIs";
import "./conditions/billExists";
import "./conditions/billIs";
import "./actions/setLayer";
import "./actions/cameraPosition";
import "./actions/setBubble";
import "./conditions/checkWorld";
// Todo 04: environment and location
import "./actions/setEnvironment";
import "./conditions/environmentIs";
import "./conditions/locationInside";
import "./conditions/locationType";
// Todo 05: monster query and evolution
import "./actions/evolution";
import "./actions/getPlayerMonster";
import "./actions/getPartyMonster";
import "./actions/info";
import "./actions/modifyMonsterBond";
import "./conditions/checkEvolution";
import "./conditions/checkPartyParameter";
// Todo 06: kennel and storage
import "./actions/createKennel";
import "./actions/setKennelVisible";
import "./conditions/hasKennel";
import "./conditions/kennel";
// Todo 07: NPC speech and encounters
import "./actions/charTalk";
import "./actions/randomEncounter";
import "./conditions/charIn";
import "./conditions/charSprite";
// Todo 08: day/night cycle
import "./actions/updateTime";
import "./conditions/timeIs";
// Todo 09: remaining actions and conditions
import "./actions/teleportFaint";
import "./actions/removeTech";
import "./actions/setPartyStatus";
import "./actions/updateTileProperties";
import "./actions/stubs";
import "./conditions/hasTuxepedia";
import "./conditions/checkMaxTech";
import "./conditions/tilePropertyUpdated";
import "./conditions/stepTracker";
import "./conditions/charMoved";

export class EventEngine {
  private events: EventDef[];
  private running: RunningEvent[] = [];
  private runningIds = new Set<number>();
  /**
   * Events on cooldown stay suppressed until their conditions become false.
   * This makes spatial triggers edge-triggered: they fire when the player
   * enters the zone, but not again until the player leaves and re-enters.
   */
  private cooldownIds = new Set<number>();

  constructor(events: EventDef[]) {
    this.events = events;
  }

  /** Merge additional events (e.g. from load_yaml) into the engine, assigning new IDs. */
  mergeEvents(newEvents: EventDef[]): void {
    let maxId = this.events.reduce((max, e) => Math.max(max, e.id), 0);
    for (const ev of newEvents) {
      ev.id = ++maxId;
      this.events.push(ev);
    }
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
        const conditionsMet = this.checkConditions(ctx, def);
        if (this.cooldownIds.has(def.id)) {
          // Clear cooldown only once conditions become false (e.g. player
          // leaves the trigger zone), so the event can fire again on re-entry.
          if (!conditionsMet) {
            this.cooldownIds.delete(def.id);
          }
          continue;
        }
        if (conditionsMet) {
          if (def.conditions.some((c) => c.type === "button_pressed")) {
            debugBridge.emit("npc_interact", { npc: def.name });
          }
          const running = new RunningEvent(def);
          this.running.push(running);
          this.runningIds.add(def.id);
        }
      }
    }

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
