import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { Monster, PARTY_LIMIT } from "../../model/Monster";
import { markCaught } from "../../model/monsterRegistry";
import { MONSTERS } from "../../data/monsters";

/**
 * Upstream `add_monster`:
 *
 *   add_monster <mon_slug>,<level>[,npc_slug][,exp_mod][,money_mod]
 *
 *   - `mon_slug` is either a literal monster slug from the db OR the name of a
 *     game variable that holds one (e.g. `billie_choice` in paper_town's
 *     First Fight Start, which resolves to the player's scoop pick).
 *   - `npc_slug` defaults to "player". When it's an NPC slug we attach the
 *     monster to `session.npcParties` for that NPC; `start_battle` reads from
 *     there before falling back to the static `npcParties.ts` registry.
 *
 * After spawning, the new monster's id is stored in the `add_monster` game
 * variable so the immediately-following `set_monster_attribute add_monster,...`
 * call can target it.
 */
class AddMonsterAction implements EventAction {
  type = "add_monster";
  done = false;

  private rawSlug: string;
  private level: number;
  private npcSlug: string;

  constructor(args: string[]) {
    this.rawSlug = args[0];
    this.level = parseInt(args[1] ?? "5", 10) || 5;
    this.npcSlug = args[2] ?? "player";
    // args[3] (exp_mod) and args[4] (money_mod) are accepted but unused —
    // they only affect upstream's per-monster reward math.
  }

  start(ctx: EventContext): void {
    // Resolve mon_slug — either a real monster slug or a variable name that
    // holds one (e.g. `billie_choice` -> "rockitten"). Mirrors upstream's
    // `if not in db: lookup var` fallback.
    let monsterSlug = this.rawSlug;
    if (!MONSTERS[monsterSlug]) {
      const fromVar = ctx.variables.get(this.rawSlug);
      if (fromVar && MONSTERS[fromVar]) {
        monsterSlug = fromVar;
      } else {
        console.warn(
          `add_monster: "${this.rawSlug}" is neither a monster slug nor a variable holding one`,
        );
        this.done = true;
        return;
      }
    }

    const monster = Monster.spawn(monsterSlug, this.level);

    if (this.npcSlug === "player") {
      if (ctx.session.player.monsters.length < PARTY_LIMIT) {
        ctx.session.player.monsters.push(monster);
      } else {
        ctx.session.monsterStorage.push(monster);
      }
      markCaught(ctx.session.monsterRegistry, monsterSlug);
    } else {
      const party = ctx.session.npcParties.get(this.npcSlug) ?? [];
      party.push(monster);
      ctx.session.npcParties.set(this.npcSlug, party);
    }

    // Upstream stores the new monster's id in the `add_monster` variable so
    // a follow-up `set_monster_attribute add_monster,...` can target it.
    ctx.variables.set("add_monster", monster.id);
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("add_monster", (args) => new AddMonsterAction(args));
