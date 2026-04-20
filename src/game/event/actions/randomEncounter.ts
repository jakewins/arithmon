import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { getEncounterTable, rollEncounter } from "../../data/encounters";
import { Monster, getLeadMonster } from "../../model/Monster";
import { session } from "../../session";
import { debugBridge } from "../../debug";
import { getMapDef } from "../../data/maps";

/**
 * Tuxemon syntax:
 *   random_encounter <encounter_slug>,<total_probability>
 *
 * Rolls a random number 0-100. If the roll is under the probability,
 * picks a monster from the encounter table using weighted selection
 * and starts a wild combat.
 *
 * Single-frame when no encounter triggers. Multi-frame when combat starts
 * (stays done=false until CombatScene shuts down).
 */
class RandomEncounterAction implements EventAction {
  type = "random_encounter";
  done = false;
  private encounterSlug: string;
  private probability: number;

  constructor(args: string[]) {
    // Format: encounter_table_slug,probability
    this.encounterSlug = args[0] ?? "";
    this.probability = Number(args[1] ?? "10");
  }

  start(ctx: EventContext): void {
    // Roll against probability
    const roll = Math.random() * 100;
    if (roll >= this.probability) {
      this.done = true;
      return;
    }

    const table = getEncounterTable(this.encounterSlug);
    if (!table) {
      console.warn(`random_encounter: no encounter table for "${this.encounterSlug}"`);
      this.done = true;
      return;
    }

    const lead = getLeadMonster(session.player.monsters);
    if (!lead) {
      console.warn("random_encounter: player has no usable monsters");
      this.done = true;
      return;
    }

    const { slug: enemySlug, level: enemyLevel } = rollEncounter(table);
    const enemyMonster = Monster.spawn(enemySlug, enemyLevel);
    debugBridge.emit("encounter_started", { monster: enemySlug, level: enemyLevel });

    ctx.controls.locked = true;
    ctx.scene.scene.pause();
    const mapKey = (ctx.scene as { mapKey?: string }).mapKey;
    const environment = mapKey ? getMapDef(mapKey).environment : undefined;
    ctx.scene.scene.launch("CombatScene", {
      playerMonster: lead,
      enemyMonster,
      party: session.player.monsters,
      inventory: session.player.inventory,
      environment,
    });

    ctx.scene.scene.get("CombatScene").events.once("shutdown", () => {
      ctx.controls.locked = false;
      this.done = true;

      // Check for whiteout — all party monsters fainted
      const allFainted = session.player.monsters.every((m) => m.fainted);
      if (allFainted) {
        (ctx.scene as { triggerWhiteout?: () => void }).triggerWhiteout?.();
      }
    });
  }

  update(): void {
    // Waits for CombatScene shutdown
  }

  cleanup(): void {}
}

registerAction("random_encounter", (args) => new RandomEncounterAction(args));
