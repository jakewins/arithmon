import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { Monster, PARTY_LIMIT } from "../../model/Monster";
import { markCaught } from "../../model/monsterRegistry";

class AddMonsterAction implements EventAction {
  type = "add_monster";
  done = false;

  private slug: string;
  private level: number;

  constructor(args: string[]) {
    this.slug = args[0];
    this.level = parseInt(args[1] ?? "5", 10) || 5;
  }

  start(ctx: EventContext): void {
    const monster = Monster.spawn(this.slug, this.level);
    if (ctx.session.player.monsters.length < PARTY_LIMIT) {
      ctx.session.player.monsters.push(monster);
    } else {
      ctx.session.monsterStorage.push(monster);
    }
    markCaught(ctx.session.monsterRegistry, this.slug);
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("add_monster", (args) => new AddMonsterAction(args));
