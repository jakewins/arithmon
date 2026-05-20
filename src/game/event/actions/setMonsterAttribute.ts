import type { EventAction } from "../types";
import { registerAction } from "../registry";

/**
 * Upstream `set_monster_attribute <monster_var_or_id>,<attr>,<value>`.
 *
 * In paper_town's First Fight Start this is only used to set Billie's monster
 * gender for the intro line — none of our combat/portrait code reads gender,
 * and the encounter is one-and-done, so we treat this as a no-op pending a
 * real per-attribute implementation.
 */
class SetMonsterAttributeAction implements EventAction {
  type = "set_monster_attribute";
  done = false;
  private monsterRef: string;
  private attr: string;
  private value: string;

  constructor(args: string[]) {
    this.monsterRef = args[0] ?? "";
    this.attr = args[1] ?? "";
    this.value = args[2] ?? "";
  }

  start(): void {
    console.log(
      `[set_monster_attribute] ${this.monsterRef}.${this.attr} = ${this.value} (stub — attribute unused by engine)`,
    );
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("set_monster_attribute", (args) => new SetMonsterAttributeAction(args));
