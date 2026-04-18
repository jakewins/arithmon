import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

const RANDOM_NAMES = [
  "Ash",
  "Misty",
  "Brock",
  "Dawn",
  "May",
  "Max",
  "Iris",
  "Cilan",
  "Serena",
  "Clemont",
  "Bonnie",
  "Lillie",
  "Lana",
  "Kiawe",
  "Mallow",
  "Sophocles",
  "Goh",
  "Chloe",
];

class RenamePlayerAction implements EventAction {
  type = "rename_player";
  done = false;

  private name: string;

  constructor(args: string[]) {
    // Tuxemon syntax: rename_player player,random  (args[0]=target, args[1]=name/mode)
    // Also support single-arg: rename_player random
    this.name = args[1] ?? args[0] ?? "Player";
  }

  start(ctx: EventContext): void {
    if (this.name === "random") {
      ctx.session.player.name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    } else {
      ctx.session.player.name = this.name;
    }
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("rename_player", (args) => new RenamePlayerAction(args));
