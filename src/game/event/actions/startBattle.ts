import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { getNpcParty } from "../../data/npcParties";
import { Monster } from "../../model/Monster";
import { session } from "../../session";
import { getLeadMonster } from "../../model/Monster";
import { debugBridge } from "../../debug";
import { getMapDef } from "../../data/maps";

/**
 * Tuxemon syntax:
 *   start_battle <npc_slug>
 *
 * Launches a trainer battle using the NPC's party from the registry.
 * Multi-frame action: stays `done: false` until CombatScene shuts down.
 * Stores the outcome in `session.battleOutcomes` keyed by NPC slug.
 */
class StartBattleAction implements EventAction {
  type = "start_battle";
  done = false;

  private npcSlug: string;

  constructor(args: string[]) {
    this.npcSlug = args[0] ?? "";
  }

  start(ctx: EventContext): void {
    const partyDef = getNpcParty(this.npcSlug);
    if (!partyDef) {
      console.warn(`start_battle: no party for NPC "${this.npcSlug}"`);
      this.done = true;
      return;
    }

    const lead = getLeadMonster(session.player.monsters);
    if (!lead) {
      console.warn("start_battle: player has no usable monsters");
      this.done = true;
      return;
    }

    const enemyParty = partyDef.monsters.map((e) => Monster.spawn(e.slug, e.level));
    const enemyLead = enemyParty[0];

    debugBridge.emit("trainer_battle_started", {
      npc: this.npcSlug,
      trainerName: partyDef.name,
      enemyParty: enemyParty.map((m) => ({ slug: m.slug, level: m.level })),
    });

    ctx.controls.locked = true;
    ctx.scene.scene.pause();
    // Get environment from the current map for battle background
    const mapKey = (ctx.scene as { mapKey?: string }).mapKey;
    const environment = mapKey ? getMapDef(mapKey).environment : undefined;
    ctx.scene.scene.launch("CombatScene", {
      playerMonster: lead,
      enemyMonster: enemyLead,
      party: session.player.monsters,
      inventory: session.player.inventory,
      isWild: false,
      enemyParty,
      trainerName: partyDef.name,
      goldReward: partyDef.goldReward,
      environment,
    });

    ctx.scene.scene.get("CombatScene").events.once("shutdown", () => {
      // Determine outcome from CombatScene data
      const combatScene = ctx.scene.scene.get("CombatScene");
      const outcome = combatScene?.data?.get("outcome") as string | undefined;

      // Store outcome — the CombatScene stores it before shutting down
      if (outcome === "win") {
        session.battleOutcomes.set(this.npcSlug, "won");
      } else if (outcome === "lose") {
        session.battleOutcomes.set(this.npcSlug, "lost");
      } else if (outcome === "fled") {
        session.battleOutcomes.set(this.npcSlug, "fled");
      }

      ctx.controls.locked = false;
      this.done = true;
    });
  }

  update(): void {
    // Waits for shutdown listener to set done
  }

  cleanup(): void {
    // nothing to clean up
  }
}

registerAction("start_battle", (args) => new StartBattleAction(args));
