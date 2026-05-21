import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

const OUTCOMES = new Set(["won", "lost", "draw", "fled"]);

/**
 * Upstream:
 *   is battle_outcome <fighter>,<outcome>,<opponent>      e.g. player,won,npc_maple
 *
 * Some of our hand-written YAMLs predate the upstream port and use
 * `player,<opponent>,<outcome>` instead. Both forms are accepted: if arg[1] is
 * a known outcome we treat the args as upstream; otherwise we fall back to the
 * legacy ordering. New content should follow the upstream form.
 */
class BattleOutcomeCondition implements EventCondition {
  type = "battle_outcome";

  private npcSlug: string;
  private expectedOutcome: string;

  constructor(args: string[]) {
    const [, second, third] = args;
    if (second && OUTCOMES.has(second)) {
      this.expectedOutcome = second;
      this.npcSlug = third ?? "";
    } else {
      this.npcSlug = second ?? "";
      this.expectedOutcome = third ?? "";
    }
  }

  test(ctx: EventContext): boolean {
    const outcome = ctx.session.battleOutcomes.get(this.npcSlug);
    return outcome === this.expectedOutcome;
  }
}

registerCondition("battle_outcome", (args) => new BattleOutcomeCondition(args));
