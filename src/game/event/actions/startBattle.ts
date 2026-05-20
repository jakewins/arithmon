import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { getNpcParty } from "../../data/npcParties";
import { Monster } from "../../model/Monster";
import { session } from "../../session";
import { getLeadMonster } from "../../model/Monster";
import { debugBridge } from "../../debug";
import { getMapDef } from "../../data/maps";
import { t } from "../../i18n";

/**
 * Tuxemon syntax:
 *
 *   start_battle <character1>,<character2>[,music]
 *
 * Either character may be "player"; the other is the NPC trainer. The NPC's
 * party is read from `session.npcParties` (populated dynamically by
 * `add_monster <slug>,<lvl>,<npc>`) first, then from the static `npcParties.ts`
 * registry. Multi-frame action: stays `done: false` until CombatScene shuts
 * down. Stores the outcome both in `session.battleOutcomes` keyed by NPC slug
 * AND in the `battle_last_result` game variable (matching upstream's
 * `combat/utils.set_var(session, "battle_last_result", ...)`).
 */
class StartBattleAction implements EventAction {
  type = "start_battle";
  done = false;

  private npcSlug: string;

  constructor(args: string[]) {
    // Tolerate both legacy 1-arg form (just the NPC slug) and the upstream
    // 2-arg form (<player>,<npc> in either order).
    const char1 = args[0] ?? "";
    const char2 = args[1] ?? "";
    if (char2 && char2 !== "player") {
      this.npcSlug = char2;
    } else if (char1 && char1 !== "player") {
      this.npcSlug = char1;
    } else {
      this.npcSlug = char1;
    }
  }

  start(ctx: EventContext): void {
    // Prefer the dynamic per-NPC party (e.g. Billie's slot set by
    // `add_monster billie_choice,5,spyder_billie,...`); fall back to the
    // static registry so trainers without a cutscene-driven party still work.
    const dynamicParty = ctx.session.npcParties.get(this.npcSlug);
    const partyDef = getNpcParty(this.npcSlug);

    let enemyParty: Monster[];
    let goldReward: number;

    if (dynamicParty && dynamicParty.length > 0) {
      enemyParty = dynamicParty;
      goldReward = partyDef?.goldReward ?? 0;
    } else if (partyDef) {
      enemyParty = partyDef.monsters.map((e) => Monster.spawn(e.slug, e.level));
      goldReward = partyDef.goldReward;
    } else {
      console.warn(`start_battle: no party for NPC "${this.npcSlug}"`);
      this.done = true;
      return;
    }

    // Display name resolution mirrors upstream: prefer the static
    // `NPC_PARTIES` entry (hand-written), fall back to the .po (`spyder_billie`
    // -> "Billie"), and only show the raw slug if neither has a translation —
    // in which case `t()` already title-cases as a last-ditch fallback.
    const trainerName = partyDef?.name ?? t(this.npcSlug);

    const lead = getLeadMonster(session.player.monsters);
    if (!lead) {
      console.warn("start_battle: player has no usable monsters");
      this.done = true;
      return;
    }

    const enemyLead = enemyParty[0];

    debugBridge.emit("trainer_battle_started", {
      npc: this.npcSlug,
      trainerName,
      enemyParty: enemyParty.map((m) => ({ slug: m.slug, level: m.level })),
    });

    ctx.controls.locked = true;
    ctx.scene.scene.pause();
    const mapKey = (ctx.scene as { mapKey?: string }).mapKey;
    const environment = mapKey ? getMapDef(mapKey).environment : undefined;
    ctx.scene.scene.launch("CombatScene", {
      playerMonster: lead,
      enemyMonster: enemyLead,
      party: session.player.monsters,
      inventory: session.player.inventory,
      isWild: false,
      enemyParty,
      trainerName,
      goldReward,
      environment,
    });

    ctx.scene.scene.get("CombatScene").events.once("shutdown", () => {
      const combatScene = ctx.scene.scene.get("CombatScene");
      const outcome = combatScene?.data?.get("outcome") as string | undefined;

      if (outcome === "win") {
        session.battleOutcomes.set(this.npcSlug, "won");
        ctx.variables.set("battle_last_result", "won");
        ctx.variables.set("battle_last_winner", "player");
        ctx.variables.set("battle_last_loser", this.npcSlug);
      } else if (outcome === "lose") {
        session.battleOutcomes.set(this.npcSlug, "lost");
        ctx.variables.set("battle_last_result", "lost");
        ctx.variables.set("battle_last_loser", "player");
        ctx.variables.set("battle_last_winner", this.npcSlug);
      } else if (outcome === "fled") {
        session.battleOutcomes.set(this.npcSlug, "fled");
      }

      // Clear the dynamic slot so a re-fight doesn't reuse stale state — the
      // cutscene that triggered the fight re-runs `add_monster` each time.
      ctx.session.npcParties.delete(this.npcSlug);

      ctx.controls.locked = false;
      this.done = true;
    });
  }

  update(): void {
    // Resolved by the shutdown listener.
  }

  cleanup(): void {}
}

registerAction("start_battle", (args) => new StartBattleAction(args));
