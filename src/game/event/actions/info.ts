import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class InfoAction implements EventAction {
  type = "info";
  done = false;
  private monsterVar: string;
  private attribute: string;

  constructor(args: string[]) {
    // Format: monster_var,attribute
    this.monsterVar = args[0];
    this.attribute = args[1] ?? "level";
  }

  start(ctx: EventContext): void {
    const indexStr = ctx.variables.get(this.monsterVar);
    if (indexStr !== undefined) {
      const index = Number(indexStr);
      const mon = ctx.session.player.monsters[index];
      if (mon) {
        const value = String((mon as unknown as Record<string, unknown>)[this.attribute] ?? "");
        ctx.variables.set(this.attribute, value);
      }
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("info", (args) => new InfoAction(args));
